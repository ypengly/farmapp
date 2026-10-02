import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "farm.db")

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner','manager','worker')),
    farm_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS farms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    total_area REAL,
    area_unit TEXT DEFAULT 'ha',
    owner_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    area REAL,
    area_unit TEXT DEFAULT 'ha',
    location TEXT,
    soil_type TEXT,
    irrigation_type TEXT,
    current_crop_id INTEGER,
    previous_crop TEXT,
    status TEXT DEFAULT 'Idle',
    map_x REAL DEFAULT 50,
    map_y REAL DEFAULT 50,
    FOREIGN KEY(farm_id) REFERENCES farms(id)
);

CREATE TABLE IF NOT EXISTS crops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    field_id INTEGER,
    name TEXT NOT NULL,
    variety TEXT,
    planting_date TEXT,
    expected_harvest_date TEXT,
    seed_quantity REAL,
    seed_cost REAL DEFAULT 0,
    stage TEXT DEFAULT 'Planning',
    health TEXT DEFAULT 'Good',
    notes TEXT,
    status TEXT DEFAULT 'Active',
    FOREIGN KEY(farm_id) REFERENCES farms(id),
    FOREIGN KEY(field_id) REFERENCES fields(id)
);

CREATE TABLE IF NOT EXISTS crop_stage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_id INTEGER NOT NULL,
    stage TEXT NOT NULL,
    note TEXT,
    logged_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(crop_id) REFERENCES crops(id)
);

CREATE TABLE IF NOT EXISTS irrigation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    field_id INTEGER,
    date TEXT,
    water_amount REAL,
    method TEXT,
    duration_minutes REAL,
    worker_id INTEGER,
    notes TEXT,
    status TEXT DEFAULT 'Scheduled'
);

CREATE TABLE IF NOT EXISTS fertilizer_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    field_id INTEGER,
    crop_id INTEGER,
    fert_type TEXT,
    quantity REAL,
    cost REAL DEFAULT 0,
    application_date TEXT,
    worker_id INTEGER,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS pest_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    field_id INTEGER,
    crop_id INTEGER,
    date TEXT,
    description TEXT,
    severity TEXT DEFAULT 'Low',
    treatment TEXT,
    status TEXT DEFAULT 'Reported'
);

CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    contact TEXT,
    role TEXT,
    hire_date TEXT,
    pay_rate REAL,
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'Present',
    FOREIGN KEY(worker_id) REFERENCES workers(id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    task_type TEXT,
    field_id INTEGER,
    worker_id INTEGER,
    priority TEXT DEFAULT 'Medium',
    due_date TEXT,
    status TEXT DEFAULT 'Pending',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS livestock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    animal_type TEXT,
    breed TEXT,
    tag_id TEXT,
    birth_date TEXT,
    gender TEXT,
    weight REAL,
    health TEXT DEFAULT 'Healthy',
    purchase_date TEXT,
    purchase_price REAL,
    status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS livestock_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    livestock_id INTEGER NOT NULL,
    event_type TEXT,
    date TEXT,
    notes TEXT,
    cost REAL DEFAULT 0,
    FOREIGN KEY(livestock_id) REFERENCES livestock(id)
);

CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    quantity REAL DEFAULT 0,
    unit TEXT,
    cost REAL DEFAULT 0,
    supplier TEXT,
    min_stock REAL DEFAULT 0,
    expiration_date TEXT
);

CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    equip_type TEXT,
    purchase_date TEXT,
    purchase_price REAL,
    current_value REAL,
    fuel_usage REAL DEFAULT 0,
    operating_hours REAL DEFAULT 0,
    next_service_date TEXT,
    status TEXT DEFAULT 'Operational'
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income','expense')),
    category TEXT,
    amount REAL NOT NULL,
    date TEXT,
    field_id INTEGER,
    crop_id INTEGER,
    description TEXT
);

CREATE TABLE IF NOT EXISTS harvests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    crop_id INTEGER,
    field_id INTEGER,
    date TEXT,
    quantity REAL,
    unit TEXT DEFAULT 'kg',
    quality TEXT DEFAULT 'Good',
    labor_cost REAL DEFAULT 0,
    production_cost REAL DEFAULT 0,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    location TEXT
);

CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    customer_id INTEGER,
    product TEXT,
    quantity REAL,
    price REAL,
    total REAL,
    date TEXT,
    payment_status TEXT DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    level TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id INTEGER NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    caption TEXT,
    data_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


def query(sql, params=(), fetchone=False, commit=False):
    conn = get_db()
    cur = conn.execute(sql, params)
    result = None
    if commit:
        conn.commit()
        result = cur.lastrowid
    else:
        result = cur.fetchone() if fetchone else cur.fetchall()
    conn.close()
    return result


def rows_to_list(rows):
    return [dict(r) for r in rows]
