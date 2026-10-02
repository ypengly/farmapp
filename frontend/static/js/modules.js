const Modules = {};

// ---------- Shared reference data (loaded once, refreshed on demand) ----------
Modules.refData = { fields: [], crops: [], workers: [], customers: [], livestock: [] };

Modules.loadRefData = async function () {
  const [fields, crops, workers, customers, livestock] = await Promise.all([
    Api.get("/fields"), Api.get("/crops"), Api.get("/workers"), Api.get("/customers"), Api.get("/livestock"),
  ]);
  Modules.refData = { fields, crops, workers, customers, livestock };
};

function opt(list, valueKey, labelKey, selected) {
  return `<option value="">—</option>` + list.map(i =>
    `<option value="${i[valueKey]}" ${String(i[valueKey]) === String(selected) ? "selected" : ""}>${i[labelKey]}</option>`).join("");
}

// ---------- Generic form builder ----------
// fieldSpec: {key, label, type: text|number|date|select|textarea, options?, span2?}
function buildFormFields(fieldSpec, values = {}) {
  return fieldSpec.map(f => {
    const val = values[f.key] ?? f.default ?? "";
    let input;
    if (f.type === "select") {
      input = `<select name="${f.key}" ${f.required ? "required" : ""}>${f.options(val)}</select>`;
    } else if (f.type === "textarea") {
      input = `<textarea name="${f.key}" rows="2">${val}</textarea>`;
    } else {
      input = `<input type="${f.type || "text"}" name="${f.key}" value="${val}" ${f.step ? `step="${f.step}"` : ""} ${f.required ? "required" : ""} />`;
    }
    return `<div class="mb-3 ${f.span2 ? "sm:col-span-2" : ""}"><label>${f.label}</label>${input}</div>`;
  }).join("");
}

function collectFormValues(container, fieldSpec) {
  const out = {};
  fieldSpec.forEach(f => {
    const el = container.querySelector(`[name="${f.key}"]`);
    if (!el) return;
    let v = el.value;
    if (f.type === "number") v = v === "" ? null : Number(v);
    if (v !== "") out[f.key] = v;
  });
  return out;
}

// ---------- Generic CRUD section ----------
function crudSection({ title, icon, apiPath, columns, fieldSpec, addLabel, extraButtons, onBeforeSave }) {
  return {
    async render(container) {
      const items = await Api.get(`/${apiPath}`);
      container.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 class="text-xl font-bold">${icon || ""} ${title}</h2>
          <div class="flex gap-2">${extraButtons || ""}<button class="add-btn btn-primary px-4 py-2 rounded-lg text-sm font-semibold">+ ${addLabel || "Add"}</button></div>
        </div>
        <div class="card p-2 sm:p-4">${UI.table(columns, items, {
          actions: (r) => `<button class="edit-btn text-sky-600 hover:underline text-xs font-medium mr-3" data-id="${r.id}">Edit</button>
                            <button class="del-btn text-red-600 hover:underline text-xs font-medium" data-id="${r.id}">Delete</button>`
        })}</div>`;

      function openForm(values, id) {
        const backdrop = UI.modal(id ? `Edit ${title.replace(/s$/, "")}` : `Add ${title.replace(/s$/, "")}`,
          `<form id="crud-form">${UI.formGrid(buildFormFields(fieldSpec, values))}
             <div class="flex justify-end gap-2 mt-2"><button type="button" class="cancel-btn px-4 py-2 rounded-lg border">Cancel</button>
             <button type="submit" class="btn-primary px-4 py-2 rounded-lg font-semibold">Save</button></div></form>`, { wide: true });
        backdrop.querySelector(".cancel-btn").onclick = () => backdrop.remove();
        backdrop.querySelector("#crud-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          let vals = collectFormValues(backdrop, fieldSpec);
          if (onBeforeSave) vals = onBeforeSave(vals) || vals;
          try {
            if (id) await Api.put(`/${apiPath}/${id}`, vals);
            else await Api.post(`/${apiPath}`, vals);
            UI.toast(id ? "Updated" : "Added");
            backdrop.remove();
            await Modules.rerenderCurrent();
          } catch (err) { UI.toast(err.message, "error"); }
        });
      }

      container.querySelector(".add-btn").onclick = () => openForm({});
      container.querySelectorAll(".edit-btn").forEach(btn => {
        btn.onclick = () => {
          const item = items.find(i => String(i.id) === btn.dataset.id);
          openForm(item, item.id);
        };
      });
      container.querySelectorAll(".del-btn").forEach(btn => {
        btn.onclick = () => UI.confirmDelete(`Delete this ${title.toLowerCase().replace(/s$/, "")}?`, async () => {
          await Api.del(`/${apiPath}/${btn.dataset.id}`);
          UI.toast("Deleted");
          await Modules.rerenderCurrent();
        });
      });
    }
  };
}

Modules.crudSection = crudSection;
Modules.opt = opt;

// ============ FIELDS ============
Modules.fields = {
  async render(container) {
    await Modules.loadRefData();
    const fields = Modules.refData.fields;
    const statusColors = { Active: "#2f7d4f", Idle: "#9ca3af", Preparing: "#d97706" };
    const mapHtml = fields.map(f => `
      <div class="field-marker absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group" style="left:${f.map_x}%; top:${f.map_y}%" data-id="${f.id}">
        <div class="w-4 h-4 rounded-full border-2 border-white shadow" style="background:${statusColors[f.status] || '#9ca3af'}"></div>
        <div class="opacity-0 group-hover:opacity-100 transition absolute left-1/2 -translate-x-1/2 top-5 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">${f.name}</div>
      </div>`).join("");

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 class="text-xl font-bold">🗺️ Farm & Fields</h2>
        <button class="add-btn btn-primary px-4 py-2 rounded-lg text-sm font-semibold">+ Add Field</button>
      </div>
      <div class="card p-4 mb-5">
        <div class="relative w-full h-56 sm:h-72 rounded-lg overflow-hidden" style="background: repeating-linear-gradient(45deg,#eaf3ec,#eaf3ec 12px,#e1ece4 12px,#e1ece4 24px);">
          ${mapHtml}
        </div>
        <p class="text-xs text-gray-400 mt-2">Click a marker below in the table to view field details. Map positions are illustrative.</p>
      </div>
      <div class="card p-2 sm:p-4">${UI.table([
        { label: "Field", key: "name" },
        { label: "Area", render: r => `${r.area || "—"} ${r.area_unit || ""}` },
        { label: "Soil", key: "soil_type" },
        { label: "Irrigation", key: "irrigation_type" },
        { label: "Current Crop", render: r => (Modules.refData.crops.find(c => c.field_id === r.id)?.name) || "—" },
        { label: "Status", render: r => UI.badge(r.status, UI.statusColor(r.status)) },
      ], fields, {
        actions: r => `<button class="edit-btn text-sky-600 hover:underline text-xs font-medium mr-3" data-id="${r.id}">Edit</button>
                        <button class="del-btn text-red-600 hover:underline text-xs font-medium" data-id="${r.id}">Delete</button>`
      })}</div>`;

    const fieldSpec = [
      { key: "name", label: "Field Name", required: true },
      { key: "area", label: "Area", type: "number", step: "0.1" },
      { key: "area_unit", label: "Unit", default: "ha" },
      { key: "location", label: "Location" },
      { key: "soil_type", label: "Soil Type" },
      { key: "irrigation_type", label: "Irrigation Type" },
      { key: "status", label: "Status", type: "select", options: (v) => Modules.opt([{ v: "Active" }, { v: "Idle" }, { v: "Preparing" }].map(x => ({ id: x.v, name: x.v })), "id", "name", v) },
    ];

    function openForm(values, id) {
      const backdrop = UI.modal(id ? "Edit Field" : "Add Field",
        `<form id="f-form">${UI.formGrid(buildFormFields(fieldSpec, values))}
        <div class="flex justify-end gap-2 mt-2"><button type="button" class="cancel-btn px-4 py-2 rounded-lg border">Cancel</button>
        <button type="submit" class="btn-primary px-4 py-2 rounded-lg font-semibold">Save</button></div></form>`, { wide: true });
      backdrop.querySelector(".cancel-btn").onclick = () => backdrop.remove();
      backdrop.querySelector("#f-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const vals = collectFormValues(backdrop, fieldSpec);
        try {
          if (id) await Api.put(`/fields/${id}`, vals); else await Api.post("/fields", vals);
          UI.toast(id ? "Field updated" : "Field added"); backdrop.remove(); await Modules.rerenderCurrent();
        } catch (err) { UI.toast(err.message, "error"); }
      });
    }
    container.querySelector(".add-btn").onclick = () => openForm({});
    container.querySelectorAll(".edit-btn").forEach(b => b.onclick = () => openForm(fields.find(f => f.id == b.dataset.id), b.dataset.id));
    container.querySelectorAll(".del-btn").forEach(b => b.onclick = () => UI.confirmDelete("Delete this field?", async () => {
      await Api.del(`/fields/${b.dataset.id}`); UI.toast("Deleted"); await Modules.rerenderCurrent();
    }));
  }
};

// ============ CROPS ============
Modules.crops = {
  async render(container) {
    await Modules.loadRefData();
    const stages = ["Planning", "Land Preparation", "Planting", "Germination", "Growth", "Flowering", "Fruit Development", "Harvest", "Completed"];
    const fieldSpec = [
      { key: "name", label: "Crop Name", required: true },
      { key: "variety", label: "Variety" },
      { key: "field_id", label: "Field", type: "select", options: v => Modules.opt(Modules.refData.fields, "id", "name", v) },
      { key: "planting_date", label: "Planting Date", type: "date" },
      { key: "expected_harvest_date", label: "Expected Harvest", type: "date" },
      { key: "seed_quantity", label: "Seed Quantity", type: "number", step: "0.01" },
      { key: "seed_cost", label: "Seed Cost ($)", type: "number", step: "0.01" },
      { key: "stage", label: "Stage", type: "select", options: v => stages.map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
      { key: "health", label: "Health", type: "select", options: v => ["Excellent", "Good", "Fair", "Poor"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
      { key: "status", label: "Status", type: "select", options: v => ["Active", "Completed", "Failed"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
      { key: "notes", label: "Notes", type: "textarea", span2: true },
    ];
    const sec = crudSection({
      title: "Crops", icon: "🌾", apiPath: "crops", addLabel: "Crop", fieldSpec,
      columns: [
        { label: "Crop", render: r => `${r.name}${r.variety ? ` <span class="text-gray-400">(${r.variety})</span>` : ""}` },
        { label: "Field", render: r => Modules.refData.fields.find(f => f.id === r.field_id)?.name || "—" },
        { label: "Stage", render: r => UI.badge(r.stage, r.stage === "Harvest" ? "orange" : "blue") },
        { label: "Health", render: r => UI.badge(r.health, UI.statusColor(r.health)) },
        { label: "Expected Harvest", render: r => UI.fmtDate(r.expected_harvest_date) },
        { label: "Status", render: r => UI.badge(r.status, UI.statusColor(r.status)) },
      ],
    });
    await sec.render(container);
  }
};

// ============ TASKS ============
Modules.tasks = {
  async render(container) {
    await Modules.loadRefData();
    const fieldSpec = [
      { key: "title", label: "Task Title", required: true, span2: true },
      { key: "task_type", label: "Type", type: "select", options: v => ["Planting", "Watering", "Fertilizing", "Spraying", "Weeding", "Harvesting", "Equipment maintenance"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
      { key: "priority", label: "Priority", type: "select", options: v => ["Low", "Medium", "High"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
      { key: "field_id", label: "Field", type: "select", options: v => Modules.opt(Modules.refData.fields, "id", "name", v) },
      { key: "worker_id", label: "Assigned Worker", type: "select", options: v => Modules.opt(Modules.refData.workers, "id", "name", v) },
      { key: "due_date", label: "Due Date", type: "date" },
      { key: "status", label: "Status", type: "select", options: v => ["Pending", "In Progress", "Completed", "Overdue"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
      { key: "notes", label: "Notes", type: "textarea", span2: true },
    ];
    const sec = crudSection({
      title: "Tasks", icon: "✅", apiPath: "tasks", addLabel: "Task", fieldSpec,
      columns: [
        { label: "Task", key: "title" },
        { label: "Type", key: "task_type" },
        { label: "Field", render: r => Modules.refData.fields.find(f => f.id === r.field_id)?.name || "—" },
        { label: "Worker", render: r => Modules.refData.workers.find(w => w.id === r.worker_id)?.name || "—" },
        { label: "Priority", render: r => UI.badge(r.priority, UI.statusColor(r.priority)) },
        { label: "Due", render: r => UI.fmtDate(r.due_date) },
        { label: "Status", render: r => UI.badge(r.status, UI.statusColor(r.status)) },
      ],
    });
    await sec.render(container);
  }
};

// ============ WORKERS ============
Modules.workers = {
  async render(container) {
    const fieldSpec = [
      { key: "name", label: "Name", required: true },
      { key: "contact", label: "Contact" },
      { key: "role", label: "Role" },
      { key: "hire_date", label: "Hire Date", type: "date" },
      { key: "pay_rate", label: "Pay Rate ($/day)", type: "number", step: "0.01" },
      { key: "status", label: "Status", type: "select", options: v => ["Active", "Inactive"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
    ];
    const sec = crudSection({
      title: "Workers", icon: "👨‍🌾", apiPath: "workers", addLabel: "Worker", fieldSpec,
      columns: [
        { label: "Name", key: "name" }, { label: "Role", key: "role" }, { label: "Contact", key: "contact" },
        { label: "Pay Rate", render: r => UI.fmtMoney(r.pay_rate) + "/day" },
        { label: "Status", render: r => UI.badge(r.status, UI.statusColor(r.status)) },
      ],
    });
    await sec.render(container);
  }
};

// ============ INVENTORY ============
Modules.inventory = {
  async render(container) {
    const fieldSpec = [
      { key: "name", label: "Item Name", required: true },
      { key: "category", label: "Category", type: "select", options: v => ["Seeds", "Fertilizer", "Pesticides", "Animal Feed", "Tools", "Spare Parts", "Packaging"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
      { key: "quantity", label: "Quantity", type: "number", step: "0.01" },
      { key: "unit", label: "Unit" },
      { key: "cost", label: "Unit Cost ($)", type: "number", step: "0.01" },
      { key: "supplier", label: "Supplier" },
      { key: "min_stock", label: "Minimum Stock Level", type: "number", step: "0.01" },
      { key: "expiration_date", label: "Expiration Date", type: "date" },
    ];
    const sec = crudSection({
      title: "Inventory", icon: "📦", apiPath: "inventory", addLabel: "Item", fieldSpec,
      columns: [
        { label: "Item", key: "name" }, { label: "Category", key: "category" },
        { label: "Qty", render: r => `${r.quantity} ${r.unit || ""} ${r.quantity <= r.min_stock ? UI.badge("Low", "red") : ""}` },
        { label: "Unit Cost", render: r => UI.fmtMoney(r.cost) }, { label: "Supplier", key: "supplier" },
        { label: "Expires", render: r => UI.fmtDate(r.expiration_date) },
      ],
    });
    await sec.render(container);
  }
};

// ============ EQUIPMENT ============
Modules.equipment = {
  async render(container) {
    const fieldSpec = [
      { key: "name", label: "Equipment Name", required: true },
      { key: "equip_type", label: "Type", type: "select", options: v => ["Tractor", "Pump", "Truck", "Harvester", "Tool", "Irrigation equipment"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
      { key: "purchase_date", label: "Purchase Date", type: "date" },
      { key: "purchase_price", label: "Purchase Price ($)", type: "number", step: "0.01" },
      { key: "current_value", label: "Current Value ($)", type: "number", step: "0.01" },
      { key: "operating_hours", label: "Operating Hours", type: "number", step: "0.1" },
      { key: "next_service_date", label: "Next Service Date", type: "date" },
      { key: "status", label: "Status", type: "select", options: v => ["Operational", "Needs Service", "Out of Service"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
    ];
    const sec = crudSection({
      title: "Equipment", icon: "🚜", apiPath: "equipment", addLabel: "Equipment", fieldSpec,
      columns: [
        { label: "Name", key: "name" }, { label: "Type", key: "equip_type" },
        { label: "Value", render: r => UI.fmtMoney(r.current_value) },
        { label: "Hours", key: "operating_hours" },
        { label: "Next Service", render: r => UI.fmtDate(r.next_service_date) },
        { label: "Status", render: r => UI.badge(r.status, UI.statusColor(r.status)) },
      ],
    });
    await sec.render(container);
  }
};

// ============ LIVESTOCK ============
Modules.livestock = {
  async render(container) {
    const fieldSpec = [
      { key: "animal_type", label: "Animal Type", required: true },
      { key: "breed", label: "Breed" },
      { key: "tag_id", label: "Tag/ID" },
      { key: "gender", label: "Gender", type: "select", options: v => ["Male", "Female"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
      { key: "birth_date", label: "Birth Date", type: "date" },
      { key: "weight", label: "Weight (kg)", type: "number", step: "0.1" },
      { key: "health", label: "Health", type: "select", options: v => ["Healthy", "Monitoring", "Sick"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
      { key: "purchase_date", label: "Purchase Date", type: "date" },
      { key: "purchase_price", label: "Purchase Price ($)", type: "number", step: "0.01" },
      { key: "status", label: "Status", type: "select", options: v => ["Active", "Sold", "Deceased"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
    ];
    const sec = crudSection({
      title: "Livestock", icon: "🐄", apiPath: "livestock", addLabel: "Animal", fieldSpec,
      columns: [
        { label: "Type", key: "animal_type" }, { label: "Breed", key: "breed" }, { label: "Tag", key: "tag_id" },
        { label: "Gender", key: "gender" }, { label: "Weight", render: r => `${r.weight || "—"} kg` },
        { label: "Health", render: r => UI.badge(r.health, UI.statusColor(r.health)) },
        { label: "Status", render: r => UI.badge(r.status, UI.statusColor(r.status)) },
      ],
    });
    await sec.render(container);
  }
};

// ============ HARVESTS ============
Modules.harvests = {
  async render(container) {
    await Modules.loadRefData();
    const fieldSpec = [
      { key: "crop_id", label: "Crop", type: "select", options: v => Modules.opt(Modules.refData.crops, "id", "name", v) },
      { key: "field_id", label: "Field", type: "select", options: v => Modules.opt(Modules.refData.fields, "id", "name", v) },
      { key: "date", label: "Harvest Date", type: "date" },
      { key: "quantity", label: "Quantity", type: "number", step: "0.01" },
      { key: "unit", label: "Unit", default: "kg" },
      { key: "quality", label: "Quality", type: "select", options: v => ["Excellent", "Good", "Fair", "Poor"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
      { key: "labor_cost", label: "Labor Cost ($)", type: "number", step: "0.01" },
      { key: "production_cost", label: "Production Cost ($)", type: "number", step: "0.01" },
      { key: "notes", label: "Notes", type: "textarea", span2: true },
    ];
    const sec = crudSection({
      title: "Harvests", icon: "🧺", apiPath: "harvests", addLabel: "Harvest", fieldSpec,
      columns: [
        { label: "Crop", render: r => Modules.refData.crops.find(c => c.id === r.crop_id)?.name || "—" },
        { label: "Field", render: r => Modules.refData.fields.find(f => f.id === r.field_id)?.name || "—" },
        { label: "Date", render: r => UI.fmtDate(r.date) },
        { label: "Quantity", render: r => `${r.quantity} ${r.unit}` },
        { label: "Quality", render: r => UI.badge(r.quality, UI.statusColor(r.quality)) },
        { label: "Total Cost", render: r => UI.fmtMoney((r.labor_cost || 0) + (r.production_cost || 0)) },
      ],
    });
    await sec.render(container);
  }
};

// ============ CUSTOMERS ============
Modules.customers = {
  async render(container) {
    const sales = await Api.get("/sales");
    const fieldSpec = [
      { key: "name", label: "Customer Name", required: true },
      { key: "phone", label: "Phone" },
      { key: "location", label: "Location" },
    ];
    const sec = crudSection({
      title: "Customers", icon: "👥", apiPath: "customers", addLabel: "Customer", fieldSpec,
      columns: [
        { label: "Name", key: "name" }, { label: "Phone", key: "phone" }, { label: "Location", key: "location" },
        { label: "Total Purchases", render: r => UI.fmtMoney(sales.filter(s => s.customer_id === r.id).reduce((a, s) => a + s.total, 0)) },
        { label: "Outstanding", render: r => UI.fmtMoney(sales.filter(s => s.customer_id === r.id && s.payment_status !== "Paid").reduce((a, s) => a + s.total, 0)) },
      ],
    });
    await sec.render(container);
  }
};

// ============ SALES ============
Modules.sales = {
  async render(container) {
    await Modules.loadRefData();
    const fieldSpec = [
      { key: "customer_id", label: "Customer", type: "select", options: v => Modules.opt(Modules.refData.customers, "id", "name", v) },
      { key: "product", label: "Product", required: true },
      { key: "quantity", label: "Quantity", type: "number", step: "0.01" },
      { key: "price", label: "Unit Price ($)", type: "number", step: "0.01" },
      { key: "date", label: "Date", type: "date" },
      { key: "payment_status", label: "Payment Status", type: "select", options: v => ["Pending", "Partially Paid", "Paid", "Cancelled"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
    ];
    const sec = crudSection({
      title: "Sales", icon: "🏪", apiPath: "sales", addLabel: "Sale", fieldSpec,
      columns: [
        { label: "Customer", render: r => Modules.refData.customers.find(c => c.id === r.customer_id)?.name || "—" },
        { label: "Product", key: "product" }, { label: "Qty", key: "quantity" },
        { label: "Total", render: r => UI.fmtMoney(r.total) }, { label: "Date", render: r => UI.fmtDate(r.date) },
        { label: "Status", render: r => UI.badge(r.payment_status, UI.statusColor(r.payment_status)) },
      ],
      onBeforeSave: (vals) => { vals.total = (Number(vals.quantity) || 0) * (Number(vals.price) || 0); return vals; },
    });
    await sec.render(container);
  }
};

// ============ FINANCIAL ============
Modules.financial = {
  async render(container) {
    const [txs, trend] = await Promise.all([Api.get("/transactions"), Api.get("/analytics/financial-trend")]);
    const income = txs.filter(t => t.type === "income").reduce((a, t) => a + t.amount, 0);
    const expense = txs.filter(t => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 class="text-xl font-bold">💰 Financial Management</h2>
        <button class="add-btn btn-primary px-4 py-2 rounded-lg text-sm font-semibold">+ Add Transaction</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div class="card p-4"><p class="text-xs text-gray-500 uppercase font-semibold">Total Revenue</p><p class="text-2xl font-bold text-emerald-700 mt-1">${UI.fmtMoney(income)}</p></div>
        <div class="card p-4"><p class="text-xs text-gray-500 uppercase font-semibold">Total Expenses</p><p class="text-2xl font-bold text-red-600 mt-1">${UI.fmtMoney(expense)}</p></div>
        <div class="card p-4"><p class="text-xs text-gray-500 uppercase font-semibold">Net Profit</p><p class="text-2xl font-bold mt-1">${UI.fmtMoney(income - expense)}</p></div>
      </div>
      <div class="card p-4 mb-5"><canvas id="finChart" height="90"></canvas></div>
      <div class="card p-2 sm:p-4">${UI.table([
        { label: "Type", render: r => UI.badge(r.type, r.type === "income" ? "green" : "red") },
        { label: "Category", key: "category" }, { label: "Amount", render: r => UI.fmtMoney(r.amount) },
        { label: "Date", render: r => UI.fmtDate(r.date) }, { label: "Description", key: "description" },
      ], txs, {
        actions: r => `<button class="del-btn text-red-600 hover:underline text-xs font-medium" data-id="${r.id}">Delete</button>`
      })}</div>`;

    new Chart(container.querySelector("#finChart"), {
      type: "bar",
      data: {
        labels: trend.map(t => t.month),
        datasets: [
          { label: "Income", data: trend.map(t => t.income), backgroundColor: "#2f7d4f" },
          { label: "Expenses", data: trend.map(t => t.expense), backgroundColor: "#d97706" },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } } },
    });

    const fieldSpec = [
      { key: "type", label: "Type", type: "select", options: v => ["income", "expense"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount ($)", type: "number", step: "0.01", required: true },
      { key: "date", label: "Date", type: "date" },
      { key: "description", label: "Description", type: "textarea", span2: true },
    ];
    container.querySelector(".add-btn").onclick = () => {
      const backdrop = UI.modal("Add Transaction", `<form id="tx-form">${UI.formGrid(buildFormFields(fieldSpec, { date: UI.today() }))}
        <div class="flex justify-end gap-2 mt-2"><button type="button" class="cancel-btn px-4 py-2 rounded-lg border">Cancel</button>
        <button type="submit" class="btn-primary px-4 py-2 rounded-lg font-semibold">Save</button></div></form>`, { wide: true });
      backdrop.querySelector(".cancel-btn").onclick = () => backdrop.remove();
      backdrop.querySelector("#tx-form").addEventListener("submit", async e => {
        e.preventDefault();
        try { await Api.post("/transactions", collectFormValues(backdrop, fieldSpec)); UI.toast("Transaction added"); backdrop.remove(); await Modules.rerenderCurrent(); }
        catch (err) { UI.toast(err.message, "error"); }
      });
    };
    container.querySelectorAll(".del-btn").forEach(b => b.onclick = () => UI.confirmDelete("Delete this transaction?", async () => {
      await Api.del(`/transactions/${b.dataset.id}`); UI.toast("Deleted"); await Modules.rerenderCurrent();
    }));
  }
};

// ============ ANALYTICS ============
Modules.analytics = {
  async render(container) {
    const perf = await Api.get("/analytics/crop-performance");
    container.innerHTML = `
      <h2 class="text-xl font-bold mb-4">📈 Farm Analytics</h2>
      <div class="card p-4 mb-5"><canvas id="perfChart" height="100"></canvas></div>
      <div class="card p-2 sm:p-4">${UI.table([
        { label: "Crop", key: "crop" }, { label: "Variety", key: "variety" }, { label: "Area", render: r => r.area ? `${r.area} ha` : "—" },
        { label: "Yield", render: r => r.yield ? `${r.yield} kg` : "—" }, { label: "Revenue", render: r => UI.fmtMoney(r.revenue) },
        { label: "Cost", render: r => UI.fmtMoney(r.cost) },
        { label: "Profit", render: r => `<span class="${r.profit >= 0 ? 'text-emerald-700' : 'text-red-600'} font-semibold">${UI.fmtMoney(r.profit)}</span>` },
      ], perf)}</div>`;
    new Chart(container.querySelector("#perfChart"), {
      type: "bar",
      data: { labels: perf.map(p => p.crop), datasets: [
        { label: "Revenue", data: perf.map(p => p.revenue), backgroundColor: "#2f7d4f" },
        { label: "Cost", data: perf.map(p => p.cost), backgroundColor: "#d97706" },
        { label: "Profit", data: perf.map(p => p.profit), backgroundColor: "#0369a1" },
      ]},
      options: { responsive: true, plugins: { legend: { position: "bottom" } } },
    });
  }
};

// ============ WEATHER ============
Modules.weather = {
  async render(container) {
    const w = await Api.get("/weather");
    const icons = { Sunny: "☀️", "Partly Cloudy": "⛅", Cloudy: "☁️", "Light Rain": "🌦️", "Heavy Rain": "🌧️", Windy: "💨" };
    container.innerHTML = `
      <h2 class="text-xl font-bold mb-4">🌦️ Weather</h2>
      ${w.advisories.length ? `<div class="card p-4 mb-4 border-amber-300 bg-amber-50">${w.advisories.map(a => `<p class="text-sm text-amber-800 font-medium">⚠️ ${a}</p>`).join("")}</div>` : ""}
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        ${w.forecast.map((f, i) => `
          <div class="card p-3 text-center ${i === 0 ? "ring-2 ring-emerald-500" : ""}">
            <p class="text-xs text-gray-500">${i === 0 ? "Today" : UI.fmtDate(f.date)}</p>
            <p class="text-3xl my-2">${icons[f.condition] || "🌤️"}</p>
            <p class="text-xs text-gray-600 mb-1">${f.condition}</p>
            <p class="text-sm font-semibold">${f.temp_high}° / ${f.temp_low}°</p>
            <p class="text-xs text-sky-600 mt-1">💧 ${f.rain_probability}%</p>
          </div>`).join("")}
      </div>
      <p class="text-xs text-gray-400 mt-4">${w.note}</p>`;
  }
};

// ============ CALENDAR ============
Modules.calendar = {
  async render(container) {
    const events = await Api.get("/calendar");
    const typeColors = { task: "bg-sky-500", harvest: "bg-amber-500", planting: "bg-emerald-500", irrigation: "bg-blue-400", maintenance: "bg-red-500" };
    let viewDate = new Date();

    function draw() {
      const year = viewDate.getFullYear(), month = viewDate.getMonth();
      const first = new Date(year, month, 1);
      const startDow = first.getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      let cells = "";
      for (let i = 0; i < startDow; i++) cells += `<div class="border border-gray-100 bg-gray-50 min-h-[70px]"></div>`;
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = new Date(year, month, day).toISOString().slice(0, 10);
        const dayEvents = events.filter(e => e.date === dateStr);
        cells += `<div class="border border-gray-100 min-h-[70px] p-1 text-xs">
          <div class="font-semibold text-gray-500">${day}</div>
          ${dayEvents.slice(0, 3).map(e => `<div class="${typeColors[e.type] || 'bg-gray-400'} text-white rounded px-1 py-0.5 mb-0.5 truncate" title="${e.title}">${e.title}</div>`).join("")}
          ${dayEvents.length > 3 ? `<div class="text-gray-400">+${dayEvents.length - 3} more</div>` : ""}
        </div>`;
      }
      container.querySelector("#cal-grid").innerHTML = cells;
      container.querySelector("#cal-label").textContent = monthLabel;
    }

    container.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">📅 Farm Calendar</h2>
        <div class="flex items-center gap-2">
          <button id="prev-month" class="px-3 py-1.5 rounded-lg border hover:bg-gray-50">&larr;</button>
          <span id="cal-label" class="font-semibold w-36 text-center"></span>
          <button id="next-month" class="px-3 py-1.5 rounded-lg border hover:bg-gray-50">&rarr;</button>
        </div>
      </div>
      <div class="flex gap-3 mb-3 flex-wrap text-xs">
        ${Object.entries(typeColors).map(([k, c]) => `<span class="flex items-center gap-1"><span class="w-3 h-3 rounded ${c} inline-block"></span>${k}</span>`).join("")}
      </div>
      <div class="card overflow-hidden">
        <div class="grid grid-cols-7 bg-gray-50 text-xs font-semibold text-gray-500">
          ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<div class="p-2 text-center">${d}</div>`).join("")}
        </div>
        <div id="cal-grid" class="grid grid-cols-7"></div>
      </div>`;
    container.querySelector("#prev-month").onclick = () => { viewDate.setMonth(viewDate.getMonth() - 1); draw(); };
    container.querySelector("#next-month").onclick = () => { viewDate.setMonth(viewDate.getMonth() + 1); draw(); };
    draw();
  }
};

// ============ REPORTS ============
Modules.reports = {
  async render(container) {
    const types = [
      { id: "financial", label: "Financial Report", icon: "💰" },
      { id: "crop", label: "Crop Report", icon: "🌾" },
      { id: "harvest", label: "Harvest Report", icon: "🧺" },
      { id: "inventory", label: "Inventory Report", icon: "📦" },
      { id: "worker", label: "Worker Report", icon: "👨‍🌾" },
      { id: "livestock", label: "Livestock Report", icon: "🐄" },
    ];
    container.innerHTML = `
      <h2 class="text-xl font-bold mb-4">📊 Report Generator</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${types.map(t => `
          <div class="card p-5">
            <p class="text-3xl mb-2">${t.icon}</p>
            <p class="font-semibold mb-3">${t.label}</p>
            <div class="flex gap-2">
              <button data-type="${t.id}" data-fmt="json" class="view-btn px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-gray-50">View</button>
              <button data-type="${t.id}" data-fmt="csv" class="csv-btn px-3 py-1.5 rounded-lg btn-primary text-xs font-medium">Export CSV</button>
            </div>
          </div>`).join("")}
      </div>
      <div id="report-preview" class="mt-5"></div>`;

    container.querySelectorAll(".view-btn").forEach(b => b.onclick = async () => {
      const data = await Api.get(`/reports/${b.dataset.type}`);
      const preview = container.querySelector("#report-preview");
      if (!data.length) { preview.innerHTML = `<p class="text-gray-400 text-sm">No data available for this report yet.</p>`; return; }
      const cols = Object.keys(data[0]).map(k => ({ label: k, key: k }));
      preview.innerHTML = `<h3 class="font-semibold mb-2">${b.dataset.type} report preview</h3><div class="card p-2 sm:p-4">${UI.table(cols, data)}</div>`;
    });
    container.querySelectorAll(".csv-btn").forEach(b => b.onclick = async () => {
      try {
        const res = await Api.get(`/reports/${b.dataset.type}?format=csv`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${b.dataset.type}_report.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      } catch (err) { UI.toast("Export failed: " + err.message, "error"); }
    });
  }
};

// ============ AI ASSISTANT ============
Modules.assistant = {
  async render(container) {
    container.innerHTML = `
      <h2 class="text-xl font-bold mb-4">🤖 AI Farm Assistant</h2>
      <div class="card p-4 mb-4">
        <p class="text-sm text-gray-500 mb-3">Ask about your farm's recorded data. This assistant reports on what's stored in the system — it doesn't give guaranteed agronomic advice.</p>
        <div class="flex flex-wrap gap-2 mb-3">
          ${["Which fields are ready for harvest?", "What tasks are overdue?", "How much did I spend on fertilizer?", "Which crop generated the most revenue?", "Show me my farm profit."].map(q =>
            `<button class="quick-q text-xs px-3 py-1.5 rounded-full border hover:bg-gray-50">${q}</button>`).join("")}
        </div>
        <form id="ask-form" class="flex gap-2">
          <input type="text" name="q" placeholder="Ask a question about your farm..." class="flex-1" />
          <button class="btn-primary px-4 py-2 rounded-lg font-semibold text-sm">Ask</button>
        </form>
      </div>
      <div id="chat-log" class="space-y-3"></div>`;

    async function ask(q) {
      const log = container.querySelector("#chat-log");
      log.insertAdjacentHTML("beforeend", `<div class="flex justify-end"><div class="bg-emerald-600 text-white px-4 py-2 rounded-2xl rounded-br-sm max-w-md text-sm">${q}</div></div>`);
      const res = await Api.post("/assistant/ask", { question: q });
      log.insertAdjacentHTML("beforeend", `<div class="flex justify-start"><div class="card px-4 py-2 rounded-2xl rounded-bl-sm max-w-md text-sm">${res.answer}</div></div>`);
      log.scrollTop = log.scrollHeight;
    }
    container.querySelectorAll(".quick-q").forEach(b => b.onclick = () => ask(b.textContent));
    container.querySelector("#ask-form").addEventListener("submit", e => {
      e.preventDefault();
      const input = e.target.q;
      if (!input.value.trim()) return;
      ask(input.value.trim());
      input.value = "";
    });
  }
};

// ============ FIELD OPERATIONS (irrigation / fertilizer / pests) ============
Modules.fieldops = {
  async render(container) {
    await Modules.loadRefData();
    container.innerHTML = `
      <h2 class="text-xl font-bold mb-4">💧 Field Operations</h2>
      <div class="flex gap-1 border-b border-gray-200 mb-4">
        <button class="tab-btn active px-4 py-2 text-sm" data-tab="irrigation">Irrigation</button>
        <button class="tab-btn px-4 py-2 text-sm" data-tab="fertilizer">Fertilizer</button>
        <button class="tab-btn px-4 py-2 text-sm" data-tab="pests">Pest &amp; Disease</button>
      </div>
      <div id="fieldops-body"></div>`;

    const tabs = {
      irrigation: crudSection({
        title: "Irrigation Logs", apiPath: "irrigation", addLabel: "Log",
        fieldSpec: [
          { key: "field_id", label: "Field", type: "select", options: v => Modules.opt(Modules.refData.fields, "id", "name", v) },
          { key: "date", label: "Date", type: "date" },
          { key: "water_amount", label: "Water Amount (L)", type: "number", step: "0.1" },
          { key: "method", label: "Method" }, { key: "duration_minutes", label: "Duration (min)", type: "number" },
          { key: "worker_id", label: "Worker", type: "select", options: v => Modules.opt(Modules.refData.workers, "id", "name", v) },
          { key: "status", label: "Status", type: "select", options: v => ["Scheduled", "Completed"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
          { key: "notes", label: "Notes", type: "textarea", span2: true },
        ],
        columns: [
          { label: "Field", render: r => Modules.refData.fields.find(f => f.id === r.field_id)?.name || "—" },
          { label: "Date", render: r => UI.fmtDate(r.date) }, { label: "Amount", render: r => `${r.water_amount || "—"} L` },
          { label: "Method", key: "method" }, { label: "Status", render: r => UI.badge(r.status, UI.statusColor(r.status)) },
        ],
      }),
      fertilizer: crudSection({
        title: "Fertilizer Logs", apiPath: "fertilizer", addLabel: "Log",
        fieldSpec: [
          { key: "field_id", label: "Field", type: "select", options: v => Modules.opt(Modules.refData.fields, "id", "name", v) },
          { key: "crop_id", label: "Crop", type: "select", options: v => Modules.opt(Modules.refData.crops, "id", "name", v) },
          { key: "fert_type", label: "Fertilizer Type" }, { key: "quantity", label: "Quantity (kg)", type: "number", step: "0.1" },
          { key: "cost", label: "Cost ($)", type: "number", step: "0.01" }, { key: "application_date", label: "Application Date", type: "date" },
          { key: "worker_id", label: "Worker", type: "select", options: v => Modules.opt(Modules.refData.workers, "id", "name", v) },
          { key: "notes", label: "Notes", type: "textarea", span2: true },
        ],
        columns: [
          { label: "Field", render: r => Modules.refData.fields.find(f => f.id === r.field_id)?.name || "—" },
          { label: "Type", key: "fert_type" }, { label: "Qty", key: "quantity" }, { label: "Cost", render: r => UI.fmtMoney(r.cost) },
          { label: "Date", render: r => UI.fmtDate(r.application_date) },
        ],
      }),
      pests: crudSection({
        title: "Pest & Disease Reports", apiPath: "pests", addLabel: "Report",
        fieldSpec: [
          { key: "field_id", label: "Field", type: "select", options: v => Modules.opt(Modules.refData.fields, "id", "name", v) },
          { key: "crop_id", label: "Crop", type: "select", options: v => Modules.opt(Modules.refData.crops, "id", "name", v) },
          { key: "date", label: "Date", type: "date" },
          { key: "severity", label: "Severity", type: "select", options: v => ["Low", "Medium", "High", "Critical"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
          { key: "status", label: "Status", type: "select", options: v => ["Reported", "Investigating", "Treatment Applied", "Monitoring", "Resolved"].map(s => `<option ${s === v ? "selected" : ""}>${s}</option>`).join("") },
          { key: "description", label: "Description", type: "textarea", span2: true },
          { key: "treatment", label: "Treatment", type: "textarea", span2: true },
        ],
        columns: [
          { label: "Field", render: r => Modules.refData.fields.find(f => f.id === r.field_id)?.name || "—" },
          { label: "Date", render: r => UI.fmtDate(r.date) }, { label: "Description", key: "description" },
          { label: "Severity", render: r => UI.badge(r.severity, UI.statusColor(r.severity)) },
          { label: "Status", render: r => UI.badge(r.status, UI.statusColor(r.status)) },
        ],
      }),
    };
    const body = container.querySelector("#fieldops-body");
    await tabs.irrigation.render(body);
    container.querySelectorAll(".tab-btn").forEach(btn => {
      btn.onclick = async () => {
        container.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        await tabs[btn.dataset.tab].render(body);
      };
    });
  }
};

// ============ DASHBOARD ============
Modules.dashboard = {
  async render(container) {
    const d = await Api.get("/dashboard");
    const o = d.overview, fin = d.financial;
    const alertIcons = { low_inventory: "📦", overdue_task: "⏰", harvest_approaching: "🌾", pest: "🐛", maintenance: "🔧" };

    container.innerHTML = `
      <div class="mb-5">
        <h2 class="text-2xl font-bold">${d.farm?.name || "Your Farm"}</h2>
        <p class="text-sm text-gray-500">${d.farm?.location || ""} · ${o.total_area || 0} ${d.farm?.area_unit || "ha"} total area</p>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${statCard("🌾", "Active Crops", o.active_crops, "#2f7d4f")}
        ${statCard("🗺️", "Fields", o.fields, "#0369a1")}
        ${statCard("🐄", "Livestock", o.livestock, "#7c3aed")}
        ${statCard("👨‍🌾", "Workers", o.workers, "#d97706")}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div class="card p-5 lg:col-span-2">
          <h3 class="font-semibold mb-3">Financial Overview</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div><p class="text-xs text-gray-500">Total Revenue</p><p class="text-lg font-bold text-emerald-700">${UI.fmtMoney(fin.total_revenue)}</p></div>
            <div><p class="text-xs text-gray-500">Total Expenses</p><p class="text-lg font-bold text-red-600">${UI.fmtMoney(fin.total_expenses)}</p></div>
            <div><p class="text-xs text-gray-500">Net Profit</p><p class="text-lg font-bold">${UI.fmtMoney(fin.net_profit)}</p></div>
            <div><p class="text-xs text-gray-500">Monthly Income</p><p class="text-lg font-semibold text-emerald-700">${UI.fmtMoney(fin.monthly_income)}</p></div>
            <div><p class="text-xs text-gray-500">Monthly Expenses</p><p class="text-lg font-semibold text-red-600">${UI.fmtMoney(fin.monthly_expense)}</p></div>
            <div><p class="text-xs text-gray-500">Ready for Harvest</p><p class="text-lg font-semibold text-amber-600">${o.ready_for_harvest} crops</p></div>
          </div>
        </div>
        <div class="card p-5">
          <h3 class="font-semibold mb-3">Alerts</h3>
          <div class="space-y-2 max-h-56 overflow-y-auto">
            ${d.alerts.length ? d.alerts.map(a => `<div class="text-sm flex gap-2"><span>${alertIcons[a.type] || "⚠️"}</span><span class="text-gray-700">${a.message}</span></div>`).join("") : `<p class="text-sm text-gray-400">No active alerts. Everything looks good!</p>`}
          </div>
        </div>
      </div>

      <div class="card p-5">
        <h3 class="font-semibold mb-3">Upcoming Harvests</h3>
        ${d.upcoming_harvests.length ? UI.table([
          { label: "Crop", key: "name" }, { label: "Field", key: "field_name" },
          { label: "Stage", render: r => UI.badge(r.stage, "blue") },
          { label: "Expected Date", render: r => UI.fmtDate(r.expected_harvest_date) },
        ], d.upcoming_harvests) : `<p class="text-sm text-gray-400">No upcoming harvests scheduled.</p>`}
      </div>`;

    function statCard(icon, label, value, color) {
      return `<div class="card p-4 flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style="background:${color}22">${icon}</div>
        <div><p class="text-xs text-gray-500">${label}</p><p class="text-xl font-bold">${value}</p></div>
      </div>`;
    }
  }
};
