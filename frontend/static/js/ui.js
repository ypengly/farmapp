const UI = {
  el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  },

  toast(msg, type = "success") {
    const colors = { success: "bg-emerald-600", error: "bg-red-600", info: "bg-gray-800" };
    const t = UI.el(`<div class="fixed bottom-4 right-4 z-[100] ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs">${msg}</div>`);
    document.body.appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 2500);
  },

  badge(text, color) {
    const map = {
      green: "bg-emerald-100 text-emerald-800", red: "bg-red-100 text-red-800",
      yellow: "bg-amber-100 text-amber-800", blue: "bg-sky-100 text-sky-800",
      gray: "bg-gray-100 text-gray-700", orange: "bg-orange-100 text-orange-800",
    };
    return `<span class="badge ${map[color] || map.gray}">${text}</span>`;
  },

  statusColor(status) {
    const s = (status || "").toLowerCase();
    if (["completed", "paid", "resolved", "good", "healthy", "active", "operational", "present"].includes(s)) return "green";
    if (["overdue", "cancelled", "absent", "urgent", "high", "critical"].includes(s)) return "red";
    if (["pending", "scheduled", "reported", "monitoring", "in progress", "partially paid", "late"].includes(s)) return "yellow";
    if (["investigating", "medium", "fair"].includes(s)) return "orange";
    return "gray";
  },

  modal(title, bodyHtml, { onMount, wide } = {}) {
    const backdrop = UI.el(`
      <div class="fixed inset-0 modal-backdrop z-50 flex items-start md:items-center justify-center p-3 overflow-y-auto">
        <div class="card w-full ${wide ? "max-w-2xl" : "max-w-md"} my-8">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 class="font-semibold text-lg">${title}</h3>
            <button class="close-modal text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
          </div>
          <div class="p-5">${bodyHtml}</div>
        </div>
      </div>`);
    backdrop.querySelector(".close-modal").onclick = () => backdrop.remove();
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
    document.body.appendChild(backdrop);
    if (onMount) onMount(backdrop);
    return backdrop;
  },

  field(labelText, inputHtml) {
    return `<div class="mb-3"><label>${labelText}</label>${inputHtml}</div>`;
  },

  formGrid(fieldsHtml) {
    return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-3">${fieldsHtml}</div>`;
  },

  table(columns, rows, { actions } = {}) {
    const thead = columns.map(c => `<th>${c.label}</th>`).join("") + (actions ? `<th></th>` : "");
    const tbody = rows.map(r => {
      const tds = columns.map(c => `<td>${c.render ? c.render(r) : (r[c.key] ?? "—")}</td>`).join("");
      const act = actions ? `<td class="whitespace-nowrap">${actions(r)}</td>` : "";
      return `<tr data-id="${r.id}">${tds}${act}</tr>`;
    }).join("");
    return `<div class="overflow-x-auto"><table class="data-table w-full min-w-[600px]"><thead><tr>${thead}</tr></thead><tbody>${tbody || `<tr><td colspan="${columns.length + 1}" class="text-center text-gray-400 py-6">No data yet</td></tr>`}</tbody></table></div>`;
  },

  confirmDelete(msg, onConfirm) {
    const backdrop = UI.modal("Confirm", `<p class="text-sm text-gray-600 mb-4">${msg}</p>
      <div class="flex justify-end gap-2"><button class="cancel-btn px-4 py-2 rounded-lg border">Cancel</button>
      <button class="confirm-btn px-4 py-2 rounded-lg bg-red-600 text-white">Delete</button></div>`);
    backdrop.querySelector(".cancel-btn").onclick = () => backdrop.remove();
    backdrop.querySelector(".confirm-btn").onclick = async () => { await onConfirm(); backdrop.remove(); };
  },

  fmtMoney(n) { return "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }); },
  fmtDate(s) { if (!s) return "—"; try { return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); } catch { return s; } },
  today() { return new Date().toISOString().slice(0, 10); },
};
