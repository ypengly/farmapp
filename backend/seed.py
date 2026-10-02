"""Populate the database with a realistic sample farm so the app looks alive on first launch."""
import datetime
from db import init_db, query, DB_PATH
from auth import hash_password
import os

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
init_db()

today = datetime.date.today()


def d(days_offset):
    return (today + datetime.timedelta(days=days_offset)).isoformat()


farm_id = query("INSERT INTO farms (name, location, total_area, area_unit) VALUES (?,?,?,?)",
                 ("Green Valley Farm", "Kandal Province, Cambodia", 25.5, "ha"), commit=True)

owner_id = query("INSERT INTO users (name, email, password_hash, role, farm_id) VALUES (?,?,?,?,?)",
                  ("Sok Dara", "owner@greenvalley.farm", hash_password("password123"), "owner", farm_id), commit=True)
query("UPDATE farms SET owner_id=? WHERE id=?", (owner_id, farm_id), commit=True)

manager_id = query("INSERT INTO users (name, email, password_hash, role, farm_id) VALUES (?,?,?,?,?)",
                    ("Chenda Ly", "manager@greenvalley.farm", hash_password("password123"), "manager", farm_id), commit=True)
worker_user_id = query("INSERT INTO users (name, email, password_hash, role, farm_id) VALUES (?,?,?,?,?)",
                        ("Vibol Chan", "worker@greenvalley.farm", hash_password("password123"), "worker", farm_id), commit=True)

# Fields
field_data = [
    ("North Rice Paddy", 8.0, "Riverside plot", "Clay Loam", "Flood", 20, 20),
    ("East Corn Field", 5.5, "East boundary", "Sandy Loam", "Drip", 70, 20),
    ("South Tomato Plot", 2.0, "Near greenhouse", "Loam", "Drip", 20, 65),
    ("West Vegetable Beds", 1.5, "Behind barn", "Loam", "Sprinkler", 70, 65),
    ("Mango Orchard", 4.0, "Hillside", "Red Soil", "Drip", 45, 42),
]
field_ids = {}
for name, area, loc, soil, irrig, mx, my in field_data:
    fid = query("INSERT INTO fields (farm_id, name, area, location, soil_type, irrigation_type, status, map_x, map_y) "
                "VALUES (?,?,?,?,?,?,?,?,?)",
                (farm_id, name, area, loc, soil, irrig, "Active", mx, my), commit=True)
    field_ids[name] = fid

# Crops
crop_data = [
    ("Rice", "IR64", "North Rice Paddy", d(-60), d(20), 150, 300, "Flowering", "Good"),
    ("Corn", "Sweet Corn Hybrid", "East Corn Field", d(-45), d(5), 40, 180, "Fruit Development", "Good"),
    ("Tomato", "Roma", "South Tomato Plot", d(-30), d(-2), 5000, 220, "Harvest", "Fair"),
    ("Lettuce", "Iceberg", "West Vegetable Beds", d(-20), d(10), 2, 60, "Growth", "Good"),
    ("Mango", "Keo Savoy", "Mango Orchard", d(-900), d(45), 0, 0, "Fruit Development", "Good"),
]
crop_ids = {}
for name, variety, field_name, plant_date, harvest_date, seed_qty, seed_cost, stage, health in crop_data:
    cid = query("INSERT INTO crops (farm_id, field_id, name, variety, planting_date, expected_harvest_date, "
                "seed_quantity, seed_cost, stage, health, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (farm_id, field_ids[field_name], name, variety, plant_date, harvest_date, seed_qty, seed_cost, stage, health, "Active"),
                commit=True)
    crop_ids[name] = cid
    query("UPDATE fields SET current_crop_id=? WHERE id=?", (cid, field_ids[field_name]), commit=True)

# Workers
worker_data = [
    ("Vibol Chan", "012 345 678", "Field Worker", d(-400), 8),
    ("Sreymom Kim", "012 555 111", "Field Worker", d(-200), 8),
    ("Ratanak Pov", "012 777 222", "Irrigation Specialist", d(-600), 10),
    ("Sophea Heng", "012 999 333", "Equipment Operator", d(-300), 12),
]
worker_ids = {}
for name, contact, role, hire, rate in worker_data:
    wid = query("INSERT INTO workers (farm_id, name, contact, role, hire_date, pay_rate, status) VALUES (?,?,?,?,?,?,?)",
                (farm_id, name, contact, role, hire, rate, "Active"), commit=True)
    worker_ids[name] = wid

# Attendance (last 5 days)
for i in range(5, 0, -1):
    for wname, wid in worker_ids.items():
        status = "Present" if i != 3 else "Absent"
        query("INSERT INTO attendance (worker_id, date, status) VALUES (?,?,?)", (wid, d(-i), status), commit=True)

# Tasks
task_data = [
    ("Apply fertilizer - North Rice Paddy", "Fertilizing", "North Rice Paddy", "Ratanak Pov", "High", d(1), "Pending"),
    ("Weed East Corn Field", "Weeding", "East Corn Field", "Vibol Chan", "Medium", d(-1), "Overdue"),
    ("Harvest South Tomato Plot", "Harvesting", "South Tomato Plot", "Sreymom Kim", "High", d(2), "Pending"),
    ("Service irrigation pump", "Equipment maintenance", None, "Sophea Heng", "Medium", d(3), "Pending"),
    ("Water West Vegetable Beds", "Watering", "West Vegetable Beds", "Vibol Chan", "Low", d(0), "In Progress"),
    ("Inspect Mango Orchard for pests", "Spraying", "Mango Orchard", "Sreymom Kim", "Medium", d(-3), "Completed"),
]
for title, ttype, field_name, wname, priority, due, status in task_data:
    query("INSERT INTO tasks (farm_id, title, task_type, field_id, worker_id, priority, due_date, status) "
          "VALUES (?,?,?,?,?,?,?,?)",
          (farm_id, title, ttype, field_ids.get(field_name), worker_ids.get(wname), priority, due, status), commit=True)

# Inventory
inv_data = [
    ("Urea Fertilizer", "Fertilizer", 120, "kg", 0.9, "AgroSupply Co", 100, d(400)),
    ("NPK 15-15-15", "Fertilizer", 40, "kg", 1.1, "AgroSupply Co", 50, d(400)),
    ("Rice Seed IR64", "Seeds", 30, "kg", 2.0, "Seed Bank", 20, d(300)),
    ("Pesticide - General", "Pesticides", 8, "L", 12.0, "AgroChem Ltd", 10, d(200)),
    ("Chicken Feed", "Animal Feed", 200, "kg", 0.5, "FeedMart", 100, d(90)),
    ("Packaging Crates", "Packaging", 15, "unit", 3.0, "PackPro", 20, None),
    ("Diesel Fuel", "Spare Parts", 60, "L", 1.2, "Fuel Depot", 50, None),
]
for name, cat, qty, unit, cost, supplier, minstock, exp in inv_data:
    query("INSERT INTO inventory (farm_id, name, category, quantity, unit, cost, supplier, min_stock, expiration_date) "
          "VALUES (?,?,?,?,?,?,?,?,?)", (farm_id, name, cat, qty, unit, cost, supplier, minstock, exp), commit=True)

# Equipment
equip_data = [
    ("Kubota Tractor", "Tractor", d(-800), 15000, 9000, 1200, d(15)),
    ("Irrigation Pump A", "Pump", d(-400), 800, 600, 300, d(-2)),
    ("Delivery Truck", "Truck", d(-1000), 12000, 6000, 4000, d(30)),
]
for name, etype, pdate, price, value, hours, service in equip_data:
    query("INSERT INTO equipment (farm_id, name, equip_type, purchase_date, purchase_price, current_value, "
          "operating_hours, next_service_date, status) VALUES (?,?,?,?,?,?,?,?,?)",
          (farm_id, name, etype, pdate, price, value, hours, service, "Operational"), commit=True)

# Livestock
livestock_data = [
    ("Chicken", "Layer Hen", "CH-001", "Female", 1.8, "Healthy"),
    ("Chicken", "Layer Hen", "CH-002", "Female", 1.7, "Healthy"),
    ("Cow", "Zebu", "CW-001", "Female", 320, "Healthy"),
    ("Pig", "Landrace", "PG-001", "Male", 85, "Monitoring"),
]
for atype, breed, tag, gender, weight, health in livestock_data:
    query("INSERT INTO livestock (farm_id, animal_type, breed, tag_id, gender, weight, health, purchase_date, status) "
          "VALUES (?,?,?,?,?,?,?,?,?)", (farm_id, atype, breed, tag, gender, weight, health, d(-300), "Active"), commit=True)

# Transactions (income/expense over last 4 months)
tx_data = [
    ("expense", "Seeds", 300, d(-60), "North Rice Paddy"),
    ("expense", "Fertilizer", 180, d(-50), "East Corn Field"),
    ("expense", "Labor", 640, d(-45), None),
    ("expense", "Fuel", 120, d(-40), None),
    ("income", "Crop sales", 2100, d(-15), "South Tomato Plot"),
    ("expense", "Pesticides", 96, d(-25), "Mango Orchard"),
    ("income", "Crop sales", 850, d(-10), "West Vegetable Beds"),
    ("expense", "Repairs", 210, d(-8), None),
    ("income", "Livestock sales", 450, d(-5), None),
    ("expense", "Transportation", 75, d(-3), None),
    ("expense", "Seeds", 220, d(-90), "South Tomato Plot"),
    ("income", "Crop sales", 1600, d(-95), "North Rice Paddy"),
    ("expense", "Labor", 600, d(-100), None),
    ("expense", "Fertilizer", 140, d(-110), None),
    ("income", "Crop sales", 1200, d(-120), "East Corn Field"),
]
for ttype, cat, amt, date, field_name in tx_data:
    query("INSERT INTO transactions (farm_id, type, category, amount, date, field_id, description) VALUES (?,?,?,?,?,?,?)",
          (farm_id, ttype, cat, amt, date, field_ids.get(field_name) if field_name else None, f"{cat} - {date}"), commit=True)

# Harvests
harvest_data = [
    ("Rice", "North Rice Paddy", d(-95), 6200, "kg", "Good", 200, 480),
    ("Corn", "East Corn Field", d(-120), 3800, "kg", "Good", 150, 320),
    ("Tomato", "South Tomato Plot", d(-10), 1800, "kg", "Excellent", 180, 220),
]
for crop, field_name, date, qty, unit, quality, labor, prod in harvest_data:
    query("INSERT INTO harvests (farm_id, crop_id, field_id, date, quantity, unit, quality, labor_cost, production_cost) "
          "VALUES (?,?,?,?,?,?,?,?,?)",
          (farm_id, crop_ids.get(crop), field_ids[field_name], date, qty, unit, quality, labor, prod), commit=True)

# Customers
cust_data = [
    ("Phnom Penh Market Co.", "017 111 222", "Phnom Penh"),
    ("Green Grocer", "017 333 444", "Kandal"),
    ("Riverside Restaurant", "017 555 666", "Phnom Penh"),
]
cust_ids = {}
for name, phone, loc in cust_data:
    cid = query("INSERT INTO customers (farm_id, name, phone, location) VALUES (?,?,?,?)", (farm_id, name, phone, loc), commit=True)
    cust_ids[name] = cid

# Sales
sales_data = [
    ("Phnom Penh Market Co.", "Tomato", 500, 0.6, d(-9), "Paid"),
    ("Green Grocer", "Rice", 800, 0.5, d(-14), "Paid"),
    ("Riverside Restaurant", "Lettuce", 60, 1.2, d(-4), "Pending"),
    ("Phnom Penh Market Co.", "Corn", 400, 0.4, d(-16), "Partially Paid"),
]
for cust, product, qty, price, date, status in sales_data:
    total = qty * price
    query("INSERT INTO sales (farm_id, customer_id, product, quantity, price, total, date, payment_status) "
          "VALUES (?,?,?,?,?,?,?,?)", (farm_id, cust_ids[cust], product, qty, price, total, date, status), commit=True)

# Pest reports
query("INSERT INTO pest_reports (farm_id, field_id, crop_id, date, description, severity, treatment, status) "
      "VALUES (?,?,?,?,?,?,?,?)",
      (farm_id, field_ids["Mango Orchard"], crop_ids["Mango"], d(-6), "Aphids spotted on new leaves", "Medium",
       "Neem oil spray applied", "Treatment Applied"), commit=True)

# Notifications
notif_data = [
    ("Low stock: Pesticide - General nearing minimum", "warning"),
    ("Harvest approaching for Corn in ~5 days", "info"),
    ("Task overdue: Weed East Corn Field", "warning"),
]
for msg, level in notif_data:
    query("INSERT INTO notifications (farm_id, message, level) VALUES (?,?,?)", (farm_id, msg, level), commit=True)

print("Seed complete.")
print("Login as owner: owner@greenvalley.farm / password123")
print("Login as manager: manager@greenvalley.farm / password123")
print("Login as worker: worker@greenvalley.farm / password123")
