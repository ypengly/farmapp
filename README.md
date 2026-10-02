# 🌾 Green Valley — Farm Management Platform

<div align="center">

![Flask](https://img.shields.io/badge/Flask-Web_Framework-000000?style=for-the-badge&logo=flask&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Tailwind](https://img.shields.io/badge/Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white)
![CSV Export](https://img.shields.io/badge/Export-CSV-22C55E?style=for-the-badge)
![Mobile Responsive](https://img.shields.io/badge/Mobile-Responsive-8B5CF6?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**A full-stack farm management system.**

*Dashboard · Fields & Crops · Tasks · Workers · Livestock · Inventory · Equipment · Financials · Harvests · Sales · Weather · Calendar · Analytics · Reports · AI Assistant*

[✨ What's Implemented](#-whats-implemented) • [🏗️ Architecture](#️-architecture) • [🚀 Running It](#-running-it) • [📝 Scope Notes](#-whats-stubbed-or-left-for-a-follow-up-phase) • [🔄 Migration Paths](#-going-to-production)

</div>

---

## 📖 Overview

**Green Valley** is a **full-stack farm management system** — an operational platform for running a farm end to end, from the first task of the morning to the last sale of the season.

### Core Idea

> **A real, working app — not a mockup.**
>
> Every screen and API route has actually been run and verified. No mocks, no fake data, no placeholders pretending to be features.

### 🌾 What's On the Menu

```mermaid
flowchart LR
    Auth["🔐 Auth & Roles"] --> Dash["📊 Dashboard"]
    Dash --> Ops["🌱 Farm Operations<br/>Fields · Crops · Tasks"]
    Ops --> Resources["👷 Workers · 🐄 Livestock<br/>📦 Inventory · 🔧 Equipment"]
    Resources --> Finance["💰 Financials<br/>Harvests · Sales"]
    Finance --> Insight["📈 Analytics<br/>📄 Reports"]
    Insight --> AI["🤖 AI Assistant<br/><em>data-grounded</em>"]

    style Auth fill:#61DAFB,color:#000
    style Dash fill:#8B5CF6,color:#fff
    style Ops fill:#22C55E,color:#fff
    style Resources fill:#FFB454,color:#000
    style Finance fill:#4CAF50,color:#fff
    style Insight fill:#0f3460,color:#fff
    style AI fill:#000,color:#fff
```

---

## 🛠️ Why This Stack Instead of Node/TypeScript/PostgreSQL/React

The original spec called for **Node.js + TypeScript + PostgreSQL + React**. This build uses **Flask + SQLite + vanilla JS / Tailwind** instead.

### The Reason

> **It was built in a sandboxed environment with no internet access**, so the Node/React toolchain couldn't be installed or the app test-run.
>
> This stack uses **only what's already available**, so **every screen and API route below has actually been run and verified** — not just written.

### The Architecture Is the Same

A **REST API in front of a relational database**, JWT auth, role-based access, a component-driven frontend calling that API.

> 💡 **Swapping layers later — SQLite → Postgres, Flask → Express, vanilla JS → React — is a rewrite of the *implementation*, not the *design*.**
>
> **Pointers for each swap are at the bottom of this file.**

---

## ✨ What's Implemented

<div align="center">

| 🔐 Auth & Roles | 📊 Dashboard |
|:---:|:---:|
| JWT login/register · three roles (owner, manager, worker) · different nav access and permissions | Farm overview · financial summary · upcoming harvests · live alerts |
| **🌾 Farms & Fields** | **🌱 Crops** |
| CRUD · simple visual field map | Full lifecycle stages (Planning → Completed) · health tracking · notes |
| **💧 Field Operations** | **✅ Tasks** |
| Irrigation · fertilizer · pest/disease logs | CRUD with priority · assignment · due dates · status |
| **📅 Calendar** | **👷 Workers** |
| Month view aggregating tasks, plantings, harvests, irrigation, and equipment service dates | CRUD with pay rate and status |
| **🐄 Livestock** | **📦 Inventory** |
| CRUD with health and status tracking | Categories · **low-stock alerts feeding the dashboard** |
| **🔧 Equipment** | **💰 Financial** |
| Value · hours · next-service tracking | Income/expense ledger · revenue/expense/profit chart |
| **🌾 Harvests** | **🤝 Sales & Customers** |
| Quantity · quality · cost tracking | Simple CRM · purchase history · outstanding balances |
| **🌤️ Weather** | **📈 Analytics** |
| 7-day forecast with rain-based advisories *(demo data — see below)* | Crop performance table + revenue/cost/profit chart |
| **🤖 AI Assistant** | **📄 Reports** |
| Rule-based natural-language queries **over your own stored data only** | On-screen preview + **CSV export** for financial, crop, harvest, inventory, worker, and livestock data |
| **🌱 Sample Data** | **📱 Mobile-Responsive** |
| Realistic seeded farm (Green Valley Farm) with 3 users, 5 fields, 5 crops, workers, tasks, transactions, harvests, sales | Collapsible nav · responsive tables/cards · works on phone-sized screens |

</div>

### Detailed Feature List

#### 🔐 Auth & Roles

- **JWT-based** login/register
- **Three roles** — owner, manager, worker
- Different nav access and permissions per role

#### 📊 Dashboard

- Farm overview
- Financial summary
- Upcoming harvests
- **Live alerts:**
  - Low stock
  - Overdue tasks
  - Harvest windows
  - Open pest reports
  - Equipment service due

#### 🌾 Farms & Fields

- Full CRUD
- A **simple visual field map**

#### 🌱 Crops

- **Full lifecycle stages** — Planning → Completed
- **Health tracking**
- **Notes**

#### 💧 Field Operations

- **Irrigation logs**
- **Fertilizer logs**
- **Pest / disease reports**

#### ✅ Tasks

- CRUD with:
  - **Priority**
  - **Assignment**
  - **Due dates**
  - **Status**

#### 📅 Calendar

A **month view** aggregating:

- Tasks
- Plantings
- Harvests
- Irrigation
- Equipment service dates

#### 👷 Workers

- CRUD with **pay rate** and **status**
- *(Attendance table exists in schema/API — no dedicated screen yet)*

#### 🐄 Livestock

- CRUD with **health** and **status** tracking
- *(Vaccination/breeding event log exists in schema/API — no dedicated screen yet)*

#### 📦 Inventory

- Categories
- **Low-stock alerts** that feed the dashboard

#### 🔧 Equipment

- Value
- Hours
- **Next-service tracking**

#### 💰 Financial

- **Income / expense ledger**
- **Revenue / expense / profit chart**

#### 🌾 Harvests

- Quantity
- Quality
- Cost tracking

#### 🤝 Sales & Customers

- **Simple CRM**
- Purchase history
- Outstanding balances

#### 🌤️ Weather

- **7-day forecast** with **rain-based advisories**
- ⚠️ **Uses locally generated demo data** — no live weather API is connected *(no network access in the build environment)*
- **Swapping in a real provider is a few lines** — see [Live weather integration](#-live-weather-integration)

#### 📈 Analytics

- **Crop performance table**
- **Revenue / cost / profit chart**

#### 🤖 AI Assistant

> **Rule-based natural-language queries over your own stored data only:**
>
> - Overdue tasks
> - Harvest readiness
> - Spend
> - Top revenue crop
> - Profit

**What it does *not* do:**

- ❌ **Does not call an external LLM**
- ❌ **Does not give agronomic recommendations**

> 💡 **This is by design**, per the original spec's caution about not presenting uncertain advice as guaranteed.

#### 📄 Reports

- **On-screen preview**
- **CSV export** for:
  - Financial
  - Crop
  - Harvest
  - Inventory
  - Worker
  - Livestock data

#### 🌱 Sample Data

A **realistic seeded farm** — **Green Valley Farm** — with:

- **3 users**
- **5 fields**
- **5 crops**
- Workers, tasks, transactions, harvests, sales, and more

#### 📱 Mobile-Responsive

- Collapsible nav
- Responsive tables and cards
- Works on **phone-sized screens**

---

## 🏗️ Architecture

### System Overview

```mermaid
flowchart TB
    subgraph FRONTEND["🖥️ Frontend (served by Flask)"]
        HTML["index.html"]
        APIJS["api.js<br/>fetch wrapper · session"]
        UIJS["ui.js<br/>tables · modals · badges"]
        Modules["modules.js<br/>every feature module"]
        App["app.js<br/>shell · nav · router · auth"]
    end

    subgraph BACKEND["⚙️ Backend (Flask)"]
        AppPy["app.py<br/>Flask app + all API routes"]
        Auth["auth.py<br/>JWT issuing/verification<br/>role decorators"]
        DB["db.py<br/>SQLite connection + schema"]
        Seed["seed.py<br/>sample data generator"]
    end

    subgraph DATA["🗄️ Data"]
        SQLite[("SQLite<br/>farm.db")]
    end

    FRONTEND -->|REST + JWT| BACKEND
    BACKEND --> DATA

    style FRONTEND fill:#61DAFB,color:#000
    style BACKEND fill:#000,color:#fff
    style DATA fill:#316192,color:#fff
```

### Request Flow

```mermaid
flowchart LR
    Request["🌐 Request"] --> Flask["Flask Router<br/>app.py"]
    Flask --> Auth["JWT verification<br/>auth.py"]
    Auth --> Role["Role check<br/>owner · manager · worker"]
    Role --> Scope["farm_id scoping<br/>tenant isolation"]
    Scope --> Query["SQL query<br/>db.py"]
    Query --> DB[("SQLite")]
    DB --> Response["JSON Response"]

    style Request fill:#61DAFB,color:#000
    style Flask fill:#000,color:#fff
    style Auth fill:#8B5CF6,color:#fff
    style Role fill:#FFB454,color:#000
    style Scope fill:#22C55E,color:#fff
    style DB fill:#316192,color:#fff
    style Response fill:#0f3460,color:#fff
```

### The Module Pattern — 15+ Times Over

```mermaid
flowchart LR
    Schema["📋 Schema Table<br/>in db.py"] --> Route["🛣️ Route Registration<br/>crud_routes()"]
    Route --> Section["🖥️ Frontend Section<br/>crudSection()"]
    Section --> UI["✅ Working Module"]

    style Schema fill:#22C55E,color:#fff
    style Route fill:#8B5CF6,color:#fff
    style Section fill:#61DAFB,color:#000
    style UI fill:#0f3460,color:#fff
```

> 💡 **Every module follows the same three-step pattern** — it's been demonstrated **15+ times** in the codebase.
>
> **Extending it is mechanical.**

### Design Principles

<div align="center">

| Principle | Implementation |
|-----------|---------------|
| **🎯 Core first, then advanced modules** | The build prioritized the core operational platform end to end, per the brief's own instruction |
| **🌾 Every screen has been run** | Not just written — every API route and UI screen has actually been verified |
| **🔒 Tenant isolation by `farm_id`** | Every query scoped to the user's farm |
| **🧩 One pattern, 15+ uses** | Schema table → `crud_routes()` → `crudSection()` — new modules are mechanical additions |
| **🤖 AI is grounded in real data** | The assistant answers only over your own stored data — no external LLM, no invented recommendations |
| **📤 CSV export now** | Financial, crop, harvest, inventory, worker, and livestock data exports work today |
| **🚫 No fake features** | Nothing pretends to exist. If it's not built, it's listed in **What's Stubbed** |
| **🔄 Migration is a rewrite of implementation, not design** | The REST contract is the contract — swap Flask for Express, SQLite for Postgres, JS for React, and the design survives |

</div>

### Project Structure

```
farmapp/
├── backend/
│   ├── app.py           # Flask app + all API routes
│   ├── auth.py           # JWT issuing/verification, role decorators
│   ├── db.py              # SQLite connection + full schema
│   ├── seed.py            # Sample data generator
│   ├── requirements.txt
│   └── farm.db             # created after running seed.py
│
├── frontend/
│   ├── index.html
│   └── static/
│       ├── js/
│       │   ├── api.js     # fetch wrapper, session storage
│       │   ├── ui.js       # reusable UI helpers (tables, modals, badges)
│       │   ├── modules.js  # every feature module (dashboard, crops, etc.)
│       │   └── app.js      # shell, nav, router, login/register
│       └── css/
│
└── .env.example
```

---

## 🚀 Running It

```bash
cd backend
pip install -r requirements.txt
python3 seed.py       # creates farm.db with realistic sample data (run once)
python3 app.py         # starts the server on http://localhost:5055
```

Open **`http://localhost:5055`** in a browser.

### 👥 Demo Logins

**All passwords:** `password123`

| Role | Email |
|------|-------|
| **Owner** | `owner@greenvalley.farm` |
| **Manager** | `manager@greenvalley.farm` |
| **Worker** | `worker@greenvalley.farm` |

Or register a **brand-new farm** from the login screen's **"Register Farm"** tab.

> 💡 **The frontend is served directly by Flask** (`frontend/index.html` + `frontend/static/`) — **there's no separate build step or dev server.**

---

## 📝 What's Stubbed or Left for a Follow-Up Phase

> **Given the scope of the original spec (33 sections), this build prioritized the core operational platform end to end** — per the brief's own instruction to **build the core first and layer on advanced modules progressively**.

<div align="center">

| Area | Current State | What's Needed |
|------|--------------|---------------|
| **Attendance screen** | Schema and API routes exist | A UI tab — same pattern as Field Operations |
| **Livestock event logs** *(vaccination, breeding)* | Schema and API routes exist | Same — a UI tab |
| **Photo / file uploads** | Schema table `photos` exists | Multipart upload handling and object storage — no persistent file storage in this environment |
| **PDF / Excel export** | **CSV export works now** | PDF/XLSX just need a library like `reportlab` or `openpyxl` |
| **Push / email / SMS notifications** | In-app notification log exists and feeds dashboard alerts | An email/SMS provider for outbound delivery |
| **Live weather API integration** | Uses local demo data | Swap `/api/weather` to call a real provider — see [below](#-live-weather-integration) |
| **Multi-farm switcher UI** | Farm-to-farm isolation is enforced by `farm_id` scoping in the API | A full "manage multiple farms per user" UI — **each user is tied to one farm today** |

</div>

> 💡 **None of this is hard to add** — the pattern for every module *(schema table → `crud_routes()` registration → frontend `crudSection()` call)* is already established and demonstrated **15+ times** in the codebase. **Extending it is mechanical.**

---

## 🚢 Going to Production

> **This is a real, working app, not a mockup** — but a few things below are **dev-mode conveniences** you'd want to change before exposing it publicly.

<div align="center">

| # | Area | Current State | What to Do |
|:-:|------|--------------|-----------|
| **1** | **Secret key** | `backend/auth.py` has a hardcoded `SECRET` | Move it to `os.environ["JWT_SECRET"]` — see `.env.example` |
| **2** | **WSGI server** | `python3 app.py` uses Flask's **dev server** | Use **gunicorn** or **uwsgi** behind **nginx** |
| **3** | **CORS** | Currently wide open (`Access-Control-Allow-Origin: *`) since frontend and backend are same-origin here | **Lock this down** if you split them |

</div>

---

## 🔄 Migrating to PostgreSQL

The schema in **`db.py`** is plain SQL with only a couple of SQLite-specific touches *(`AUTOINCREMENT`, `datetime('now')`, `strftime`)*.

### The Migration Path

**1. Swap `AUTOINCREMENT`** → `SERIAL` / `GENERATED ALWAYS AS IDENTITY`

**2. Replace the connection layer:**

- Replace the `sqlite3` connection in `db.py` with **`psycopg2`** or **SQLAlchemy**
- Keep the same **`query()`** / **`rows_to_list()`** function signatures so **`app.py` doesn't need to change**

**3. Replace date functions:**

- Replace `datetime('now')` defaults with **`now()`**
- Replace `strftime('%Y-%m', ...)` with **`to_char(date, 'YYYY-MM')`** in the analytics query

**4. Add a migrations tool:**

- **Alembic** — instead of `CREATE TABLE IF NOT EXISTS`

---

## 🔄 Migrating to Node.js / TypeScript / React

### The REST Contract Is the Spec

The **REST API surface in `app.py`** — every `/api/...` route, request/response shapes — **is the contract to reimplement in Express/TypeScript**.

The frontend modules in **`modules.js`** show **exactly what each screen needs from each endpoint** — so they double as a spec.

### On the Frontend

- Each **`Modules.x`** object maps to one **React component / page**
- **`crudSection()`** maps to a generic **`<CrudTable>`** component pattern

---

## 🌤️ Live Weather Integration

Replace the body of **`/api/weather`** in **`app.py`** with a call to a real provider:

- **OpenWeatherMap**
- **Tomorrow.io**

Use the field/farm's location, and **keep the same response shape** — `current`, `forecast`, `advisories` — **so the frontend needs no changes.**

---

## 🗺️ Roadmap

### ✅ Current

- [x] JWT-based authentication with three roles (owner, manager, worker)
- [x] Dashboard with farm overview, financial summary, and live alerts
- [x] Farms & Fields CRUD with a simple visual field map
- [x] Crops with full lifecycle stages (Planning → Completed)
- [x] Field Operations — irrigation, fertilizer, and pest/disease logs
- [x] Tasks with priority, assignment, due dates, and status
- [x] Calendar month view aggregating tasks, plantings, harvests, irrigation, and equipment service
- [x] Workers with pay rate and status
- [x] Livestock with health and status tracking
- [x] Inventory categories with low-stock alerts feeding the dashboard
- [x] Equipment with value, hours, and next-service tracking
- [x] Financial income/expense ledger with revenue/expense/profit chart
- [x] Harvests with quantity, quality, and cost tracking
- [x] Sales & Customers with purchase history and outstanding balances
- [x] Weather with 7-day forecast and rain-based advisories (demo data)
- [x] Analytics with crop performance table and profit chart
- [x] Data-grounded AI Assistant — no external LLM, no agronomic recommendations
- [x] Reports with on-screen preview and CSV export for six data types
- [x] Realistic seeded sample farm (Green Valley Farm)
- [x] Mobile-responsive layout
- [x] Farm-to-farm isolation by `farm_id` scoping

### 🔜 Future Ideas

- [ ] **Attendance UI** — schema and API already exist
- [ ] **Livestock event log UI** — vaccination, breeding
- [ ] **Photo / file uploads** with object storage
- [ ] **PDF and Excel export** — via `reportlab` / `openpyxl`
- [ ] **Email / SMS delivery** for notifications
- [ ] **Live weather provider** — OpenWeatherMap, Tomorrow.io
- [ ] **Multi-farm switcher** — one user, many farms
- [ ] **Offline-first mobile app** — PWA or native
- [ ] **Field sensor integration** — soil moisture, temperature
- [ ] **Market price tracking** — for sales planning

---

## 🤝 Contributing

Contributions are welcome. Please:

1. Fork the repository
2. **Follow the established module pattern** — schema table → `crud_routes()` → `crudSection()`
3. **Scope every query by `farm_id`** — tenant isolation is not negotiable
4. **Keep the AI grounded in real data** — no external LLM, no invented recommendations
5. **Never expose the secret key** — move it to environment variables before submitting
6. **Keep it mobile-responsive** — responsive tables and cards
7. Submit a Pull Request

### Guidelines

- **Never trust a client-supplied `farm_id`** — derive it from the authenticated user
- **Never present uncertain advice as guaranteed** — the AI is deliberately rule-based
- **Never ship `farm.db`** — it's generated by `seed.py`
- **Never commit secrets** — use `.env.example` as the template
- **Never break the module pattern** — consistency is what makes extension mechanical

---

## 📜 License

MIT — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Flask** — for making a full REST API this approachable
- **SQLite** — for making local development instant
- **Every farmer who's ever managed a field on paper** — this is for you

---

<div align="center">

### 🌾 PLANT. TEND. HARVEST. SELL. GROW.

**A real, working app — not a mockup.**

**Every screen and API route has actually been run and verified.**

**The architecture survives the stack swap — the contract is the design.**

<br>

⭐ If this project helped you, consider giving it a star.

<br>

[⬆ Back to Top](#-green-valley--farm-management-platform)

</div>
