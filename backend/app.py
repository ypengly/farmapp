import os
import datetime
from flask import Flask, request, jsonify, send_from_directory
from db import init_db, query, rows_to_list, DB_PATH
from auth import hash_password, verify_password, issue_token, login_required, roles_required

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

app = Flask(__name__, static_folder=os.path.join(FRONTEND_DIR, "static"))


@app.after_request
def add_cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    return resp


# ---------- Frontend serving ----------

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/static/<path:path>")
def static_files(path):
    return send_from_directory(os.path.join(FRONTEND_DIR, "static"), path)


# ---------- Helpers ----------

def farm_id():
    return request.user["farm_id"]


def body():
    return request.get_json(force=True, silent=True) or {}


def now_notify(fid, message, level="info"):
    query("INSERT INTO notifications (farm_id, message, level) VALUES (?,?,?)",
          (fid, message, level), commit=True)


# ---------- Auth ----------

@app.route("/api/auth/register", methods=["POST"])
def register():
    d = body()
    required = ["name", "email", "password", "role"]
    if not all(d.get(k) for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    if d["role"] not in ("owner", "manager", "worker"):
        return jsonify({"error": "Invalid role"}), 400
    existing = query("SELECT id FROM users WHERE email=?", (d["email"],), fetchone=True)
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    farm_id_val = d.get("farm_id")
    if d["role"] == "owner" and not farm_id_val:
        fid = query("INSERT INTO farms (name, location, total_area) VALUES (?,?,?)",
                    (d.get("farm_name", d["name"] + "'s Farm"), d.get("location", ""), d.get("total_area", 0)),
                    commit=True)
        farm_id_val = fid

    uid = query(
        "INSERT INTO users (name, email, password_hash, role, farm_id) VALUES (?,?,?,?,?)",
        (d["name"], d["email"], hash_password(d["password"]), d["role"], farm_id_val),
        commit=True,
    )
    if d["role"] == "owner":
        query("UPDATE farms SET owner_id=? WHERE id=?", (uid, farm_id_val), commit=True)

    user = query("SELECT * FROM users WHERE id=?", (uid,), fetchone=True)
    token = issue_token(dict(user))
    return jsonify({"token": token, "user": {"id": uid, "name": d["name"], "role": d["role"], "farm_id": farm_id_val}})


@app.route("/api/auth/login", methods=["POST"])
def login():
    d = body()
    user = query("SELECT * FROM users WHERE email=?", (d.get("email"),), fetchone=True)
    if not user or not verify_password(d.get("password", ""), user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401
    token = issue_token(dict(user))
    return jsonify({"token": token, "user": {"id": user["id"], "name": user["name"], "role": user["role"], "farm_id": user["farm_id"]}})


@app.route("/api/auth/me", methods=["GET"])
@login_required
def me():
    return jsonify(request.user)


# ---------- Dashboard ----------

@app.route("/api/dashboard", methods=["GET"])
@login_required
def dashboard():
    fid = farm_id()
    farm = query("SELECT * FROM farms WHERE id=?", (fid,), fetchone=True)
    fields_count = query("SELECT COUNT(*) c FROM fields WHERE farm_id=?", (fid,), fetchone=True)["c"]
    active_crops = query("SELECT COUNT(*) c FROM crops WHERE farm_id=? AND status='Active'", (fid,), fetchone=True)["c"]
    livestock_count = query("SELECT COUNT(*) c FROM livestock WHERE farm_id=? AND status='Active'", (fid,), fetchone=True)["c"]
    workers_count = query("SELECT COUNT(*) c FROM workers WHERE farm_id=? AND status='Active'", (fid,), fetchone=True)["c"]
    today = datetime.date.today().isoformat()
    today_tasks = query("SELECT COUNT(*) c FROM tasks WHERE farm_id=? AND due_date=? ", (fid, today), fetchone=True)["c"]
    upcoming_harvests = rows_to_list(query(
        "SELECT c.*, f.name as field_name FROM crops c LEFT JOIN fields f ON c.field_id=f.id "
        "WHERE c.farm_id=? AND c.status='Active' AND c.expected_harvest_date >= ? ORDER BY c.expected_harvest_date LIMIT 5",
        (fid, today)))

    income = query("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE farm_id=? AND type='income'", (fid,), fetchone=True)["s"]
    expenses = query("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE farm_id=? AND type='expense'", (fid,), fetchone=True)["s"]

    month_start = datetime.date.today().replace(day=1).isoformat()
    monthly_income = query("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE farm_id=? AND type='income' AND date>=?", (fid, month_start), fetchone=True)["s"]
    monthly_expense = query("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE farm_id=? AND type='expense' AND date>=?", (fid, month_start), fetchone=True)["s"]

    ready_for_harvest = query(
        "SELECT COUNT(*) c FROM crops WHERE farm_id=? AND status='Active' AND stage IN ('Fruit Development','Harvest')",
        (fid,), fetchone=True)["c"]

    alerts = build_alerts(fid)

    return jsonify({
        "farm": dict(farm) if farm else None,
        "overview": {
            "total_area": farm["total_area"] if farm else 0,
            "fields": fields_count,
            "active_crops": active_crops,
            "livestock": livestock_count,
            "workers": workers_count,
            "today_tasks": today_tasks,
            "ready_for_harvest": ready_for_harvest,
        },
        "financial": {
            "total_revenue": income,
            "total_expenses": expenses,
            "net_profit": income - expenses,
            "monthly_income": monthly_income,
            "monthly_expense": monthly_expense,
        },
        "upcoming_harvests": upcoming_harvests,
        "alerts": alerts,
    })


def build_alerts(fid):
    alerts = []
    low_stock = rows_to_list(query("SELECT * FROM inventory WHERE farm_id=? AND quantity <= min_stock", (fid,)))
    for item in low_stock:
        alerts.append({"type": "low_inventory", "message": f"Low stock: {item['name']} ({item['quantity']} {item['unit']} left)"})

    today = datetime.date.today().isoformat()
    overdue = rows_to_list(query("SELECT * FROM tasks WHERE farm_id=? AND status NOT IN ('Completed') AND due_date < ?", (fid, today)))
    for t in overdue:
        alerts.append({"type": "overdue_task", "message": f"Task overdue: {t['title']}"})

    soon = (datetime.date.today() + datetime.timedelta(days=7)).isoformat()
    harvest_soon = rows_to_list(query(
        "SELECT * FROM crops WHERE farm_id=? AND status='Active' AND expected_harvest_date BETWEEN ? AND ?",
        (fid, today, soon)))
    for c in harvest_soon:
        alerts.append({"type": "harvest_approaching", "message": f"Harvest approaching: {c['name']} ({c['expected_harvest_date']})"})

    pests = rows_to_list(query("SELECT * FROM pest_reports WHERE farm_id=? AND status NOT IN ('Resolved')", (fid,)))
    for p in pests:
        alerts.append({"type": "pest", "message": f"Pest/disease issue open: {p['description'][:40]}"})

    equip_due = rows_to_list(query("SELECT * FROM equipment WHERE farm_id=? AND next_service_date <= ?", (fid, soon)))
    for e in equip_due:
        alerts.append({"type": "maintenance", "message": f"Maintenance due: {e['name']}"})

    return alerts


# ---------- Generic CRUD factory ----------

def crud_routes(name, table, fields, scoped=True, extra_get=None):
    """Register standard list/create/update/delete routes for a table."""

    @app.route(f"/api/{name}", methods=["GET"], endpoint=f"list_{name}")
    @login_required
    def list_items():
        fid = farm_id()
        sql = f"SELECT * FROM {table}" + (" WHERE farm_id=?" if scoped else "")
        params = (fid,) if scoped else ()
        sql += " ORDER BY id DESC"
        return jsonify(rows_to_list(query(sql, params)))

    @app.route(f"/api/{name}", methods=["POST"], endpoint=f"create_{name}")
    @login_required
    def create_item():
        d = body()
        cols = [f for f in fields if f in d]
        if scoped:
            cols = ["farm_id"] + cols
            vals = [farm_id()] + [d[c] for c in cols[1:]]
        else:
            vals = [d[c] for c in cols]
        placeholders = ",".join(["?"] * len(cols))
        sql = f"INSERT INTO {table} ({','.join(cols)}) VALUES ({placeholders})"
        new_id = query(sql, vals, commit=True)
        item = query(f"SELECT * FROM {table} WHERE id=?", (new_id,), fetchone=True)
        return jsonify(dict(item)), 201

    @app.route(f"/api/{name}/<int:item_id>", methods=["PUT"], endpoint=f"update_{name}")
    @login_required
    def update_item(item_id):
        d = body()
        cols = [f for f in fields if f in d]
        if not cols:
            return jsonify({"error": "No valid fields to update"}), 400
        set_clause = ",".join([f"{c}=?" for c in cols])
        vals = [d[c] for c in cols] + [item_id]
        sql = f"UPDATE {table} SET {set_clause} WHERE id=?"
        query(sql, vals, commit=True)
        item = query(f"SELECT * FROM {table} WHERE id=?", (item_id,), fetchone=True)
        return jsonify(dict(item) if item else {})

    @app.route(f"/api/{name}/<int:item_id>", methods=["DELETE"], endpoint=f"delete_{name}")
    @login_required
    def delete_item(item_id):
        query(f"DELETE FROM {table} WHERE id=?", (item_id,), commit=True)
        return jsonify({"deleted": True})


crud_routes("farms", "farms", ["name", "location", "total_area", "area_unit"], scoped=False)
crud_routes("fields", "fields", ["name", "area", "area_unit", "location", "soil_type", "irrigation_type",
                                  "current_crop_id", "previous_crop", "status", "map_x", "map_y"])
crud_routes("crops", "crops", ["field_id", "name", "variety", "planting_date", "expected_harvest_date",
                                "seed_quantity", "seed_cost", "stage", "health", "notes", "status"])
crud_routes("irrigation", "irrigation_logs", ["field_id", "date", "water_amount", "method", "duration_minutes",
                                               "worker_id", "notes", "status"])
crud_routes("fertilizer", "fertilizer_logs", ["field_id", "crop_id", "fert_type", "quantity", "cost",
                                               "application_date", "worker_id", "notes"])
crud_routes("pests", "pest_reports", ["field_id", "crop_id", "date", "description", "severity", "treatment", "status"])
crud_routes("workers", "workers", ["name", "contact", "role", "hire_date", "pay_rate", "status"])
crud_routes("attendance", "attendance", ["worker_id", "date", "status"], scoped=False)
crud_routes("tasks", "tasks", ["title", "task_type", "field_id", "worker_id", "priority", "due_date", "status", "notes"])
crud_routes("livestock", "livestock", ["animal_type", "breed", "tag_id", "birth_date", "gender", "weight",
                                        "health", "purchase_date", "purchase_price", "status"])
crud_routes("livestock_events", "livestock_events", ["livestock_id", "event_type", "date", "notes", "cost"], scoped=False)
crud_routes("inventory", "inventory", ["name", "category", "quantity", "unit", "cost", "supplier", "min_stock", "expiration_date"])
crud_routes("equipment", "equipment", ["name", "equip_type", "purchase_date", "purchase_price", "current_value",
                                        "fuel_usage", "operating_hours", "next_service_date", "status"])
crud_routes("transactions", "transactions", ["type", "category", "amount", "date", "field_id", "crop_id", "description"])
crud_routes("harvests", "harvests", ["crop_id", "field_id", "date", "quantity", "unit", "quality",
                                      "labor_cost", "production_cost", "notes"])
crud_routes("customers", "customers", ["name", "phone", "location"])
crud_routes("sales", "sales", ["customer_id", "product", "quantity", "price", "total", "date", "payment_status"])


# ---------- Notifications ----------

@app.route("/api/notifications", methods=["GET"])
@login_required
def list_notifications():
    return jsonify(rows_to_list(query(
        "SELECT * FROM notifications WHERE farm_id=? ORDER BY created_at DESC LIMIT 50", (farm_id(),))))


@app.route("/api/notifications/<int:nid>/read", methods=["PUT"])
@login_required
def mark_read(nid):
    query("UPDATE notifications SET is_read=1 WHERE id=?", (nid,), commit=True)
    return jsonify({"ok": True})


# ---------- Weather (mock, offline-safe) ----------

@app.route("/api/weather", methods=["GET"])
@login_required
def weather():
    import random
    random.seed(datetime.date.today().toordinal() + farm_id())
    conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Heavy Rain", "Windy"]
    today = datetime.date.today()
    forecast = []
    for i in range(7):
        d = today + datetime.timedelta(days=i)
        cond = random.choice(conditions)
        forecast.append({
            "date": d.isoformat(),
            "condition": cond,
            "temp_high": round(random.uniform(24, 36), 1),
            "temp_low": round(random.uniform(14, 22), 1),
            "humidity": random.randint(40, 90),
            "rain_probability": random.randint(0, 100) if "Rain" in cond else random.randint(0, 30),
            "wind_kph": round(random.uniform(5, 30), 1),
        })
    advisories = []
    if any(f["condition"] == "Heavy Rain" for f in forecast[:2]):
        advisories.append("Heavy rain expected soon — consider delaying irrigation, fertilizer application, and spraying.")
    return jsonify({
        "current": forecast[0],
        "forecast": forecast,
        "advisories": advisories,
        "note": "Demo data generated locally (no live weather API connected in this environment).",
    })


# ---------- Analytics ----------

@app.route("/api/analytics/crop-performance", methods=["GET"])
@login_required
def crop_performance():
    fid = farm_id()
    crops = rows_to_list(query("SELECT * FROM crops WHERE farm_id=?", (fid,)))
    result = []
    for c in crops:
        harvest_qty = query("SELECT COALESCE(SUM(quantity),0) s FROM harvests WHERE crop_id=?", (c["id"],), fetchone=True)["s"]
        revenue = query("SELECT COALESCE(SUM(total),0) s FROM sales WHERE product=?", (c["name"],), fetchone=True)["s"]
        cost = query("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE crop_id=? AND type='expense'", (c["id"],), fetchone=True)["s"]
        cost += c["seed_cost"] or 0
        field = query("SELECT area FROM fields WHERE id=?", (c["field_id"],), fetchone=True) if c["field_id"] else None
        area = field["area"] if field else None
        result.append({
            "crop": c["name"], "variety": c["variety"], "area": area,
            "yield": harvest_qty, "revenue": revenue, "cost": cost, "profit": revenue - cost,
        })
    return jsonify(result)


@app.route("/api/analytics/financial-trend", methods=["GET"])
@login_required
def financial_trend():
    fid = farm_id()
    rows = rows_to_list(query(
        "SELECT strftime('%Y-%m', date) ym, type, COALESCE(SUM(amount),0) total "
        "FROM transactions WHERE farm_id=? GROUP BY ym, type ORDER BY ym", (fid,)))
    months = {}
    for r in rows:
        m = months.setdefault(r["ym"], {"month": r["ym"], "income": 0, "expense": 0})
        m[r["type"]] = r["total"]
    return jsonify(list(months.values()))


# ---------- Calendar ----------

@app.route("/api/calendar", methods=["GET"])
@login_required
def calendar():
    fid = farm_id()
    events = []
    for t in rows_to_list(query("SELECT * FROM tasks WHERE farm_id=? AND due_date IS NOT NULL", (fid,))):
        events.append({"date": t["due_date"], "title": t["title"], "type": "task", "status": t["status"]})
    for c in rows_to_list(query("SELECT * FROM crops WHERE farm_id=? AND expected_harvest_date IS NOT NULL", (fid,))):
        events.append({"date": c["expected_harvest_date"], "title": f"Harvest: {c['name']}", "type": "harvest"})
    for c in rows_to_list(query("SELECT * FROM crops WHERE farm_id=? AND planting_date IS NOT NULL", (fid,))):
        events.append({"date": c["planting_date"], "title": f"Planting: {c['name']}", "type": "planting"})
    for i in rows_to_list(query("SELECT * FROM irrigation_logs WHERE farm_id=? AND date IS NOT NULL", (fid,))):
        events.append({"date": i["date"], "title": "Irrigation", "type": "irrigation", "status": i["status"]})
    for e in rows_to_list(query("SELECT * FROM equipment WHERE farm_id=? AND next_service_date IS NOT NULL", (fid,))):
        events.append({"date": e["next_service_date"], "title": f"Service: {e['name']}", "type": "maintenance"})
    return jsonify(events)


# ---------- Reports ----------

@app.route("/api/reports/<report_type>", methods=["GET"])
@login_required
def reports(report_type):
    fid = farm_id()
    fmt = request.args.get("format", "json")
    data = []
    if report_type == "financial":
        data = rows_to_list(query("SELECT * FROM transactions WHERE farm_id=? ORDER BY date DESC", (fid,)))
    elif report_type == "harvest":
        data = rows_to_list(query(
            "SELECT h.*, c.name as crop_name, f.name as field_name FROM harvests h "
            "LEFT JOIN crops c ON h.crop_id=c.id LEFT JOIN fields f ON h.field_id=f.id "
            "WHERE h.farm_id=? ORDER BY h.date DESC", (fid,)))
    elif report_type == "inventory":
        data = rows_to_list(query("SELECT * FROM inventory WHERE farm_id=?", (fid,)))
    elif report_type == "worker":
        data = rows_to_list(query("SELECT * FROM workers WHERE farm_id=?", (fid,)))
    elif report_type == "livestock":
        data = rows_to_list(query("SELECT * FROM livestock WHERE farm_id=?", (fid,)))
    elif report_type == "crop":
        data = rows_to_list(query("SELECT * FROM crops WHERE farm_id=?", (fid,)))
    else:
        return jsonify({"error": "Unknown report type"}), 404

    if fmt == "csv":
        import csv, io
        buf = io.StringIO()
        if data:
            writer = csv.DictWriter(buf, fieldnames=list(data[0].keys()))
            writer.writeheader()
            writer.writerows(data)
        from flask import Response
        return Response(buf.getvalue(), mimetype="text/csv",
                         headers={"Content-Disposition": f"attachment;filename={report_type}_report.csv"})
    return jsonify(data)


# ---------- AI Assistant (rule-based, over local data — no external API) ----------

@app.route("/api/assistant/ask", methods=["POST"])
@login_required
def assistant_ask():
    d = body()
    q = (d.get("question") or "").lower()
    fid = farm_id()
    answer = None

    if "ready for harvest" in q or "harvest" in q and "which" in q:
        rows = rows_to_list(query(
            "SELECT c.name, f.name as field_name FROM crops c LEFT JOIN fields f ON c.field_id=f.id "
            "WHERE c.farm_id=? AND c.status='Active' AND c.stage IN ('Fruit Development','Harvest')", (fid,)))
        if rows:
            answer = "Fields ready or nearing harvest: " + "; ".join(f"{r['name']} ({r['field_name'] or 'unassigned field'})" for r in rows)
        else:
            answer = "No crops are currently in the Fruit Development or Harvest stage."

    elif "overdue" in q:
        today = datetime.date.today().isoformat()
        rows = rows_to_list(query("SELECT title, due_date FROM tasks WHERE farm_id=? AND status!='Completed' AND due_date<?", (fid, today)))
        answer = ("Overdue tasks: " + "; ".join(f"{r['title']} (due {r['due_date']})" for r in rows)) if rows else "No overdue tasks. Nice work!"

    elif "fertilizer" in q and ("spend" in q or "cost" in q or "much" in q):
        month_start = datetime.date.today().replace(day=1).isoformat()
        total = query("SELECT COALESCE(SUM(cost),0) s FROM fertilizer_logs WHERE farm_id=? AND application_date>=?", (fid, month_start), fetchone=True)["s"]
        answer = f"Fertilizer spending this month (from logged data): ${total:,.2f}."

    elif "most revenue" in q or ("crop" in q and "revenue" in q):
        rows = rows_to_list(query("SELECT product, SUM(total) rev FROM sales WHERE farm_id=? GROUP BY product ORDER BY rev DESC LIMIT 1", (fid,)))
        answer = f"{rows[0]['product']} has generated the most recorded sales revenue (${rows[0]['rev']:,.2f})." if rows else "No sales recorded yet."

    elif "expense" in q or "spend" in q:
        month_start = datetime.date.today().replace(day=1).isoformat()
        total = query("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE farm_id=? AND type='expense' AND date>=?", (fid, month_start), fetchone=True)["s"]
        answer = f"Total recorded expenses this month: ${total:,.2f}."

    elif "profit" in q:
        income = query("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE farm_id=? AND type='income'", (fid,), fetchone=True)["s"]
        expense = query("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE farm_id=? AND type='expense'", (fid,), fetchone=True)["s"]
        answer = f"Net profit to date: ${income - expense:,.2f} (revenue ${income:,.2f} − expenses ${expense:,.2f})."

    else:
        answer = ("I can answer questions about your farm's recorded data — try asking about tasks that are overdue, "
                   "which crops are ready for harvest, fertilizer or general spending, or which crop earned the most revenue. "
                   "I only report on data already entered in the system; I don't give agronomic recommendations here.")

    return jsonify({"answer": answer, "grounded_in": "farm_data"})


if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        init_db()
    else:
        init_db()  # idempotent, CREATE TABLE IF NOT EXISTS
    app.run(host="0.0.0.0", port=5055, debug=False)
