const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "🏠", roles: ["owner", "manager", "worker"] },
  { id: "fields", label: "Farm & Fields", icon: "🗺️", roles: ["owner", "manager"] },
  { id: "crops", label: "Crops", icon: "🌾", roles: ["owner", "manager", "worker"] },
  { id: "fieldops", label: "Field Operations", icon: "💧", roles: ["owner", "manager", "worker"] },
  { id: "tasks", label: "Tasks", icon: "✅", roles: ["owner", "manager", "worker"] },
  { id: "calendar", label: "Calendar", icon: "📅", roles: ["owner", "manager", "worker"] },
  { id: "workers", label: "Workers", icon: "👨‍🌾", roles: ["owner", "manager"] },
  { id: "livestock", label: "Livestock", icon: "🐄", roles: ["owner", "manager"] },
  { id: "inventory", label: "Inventory", icon: "📦", roles: ["owner", "manager"] },
  { id: "equipment", label: "Equipment", icon: "🚜", roles: ["owner", "manager"] },
  { id: "harvests", label: "Harvests", icon: "🧺", roles: ["owner", "manager"] },
  { id: "sales", label: "Sales", icon: "🏪", roles: ["owner", "manager"] },
  { id: "customers", label: "Customers", icon: "👥", roles: ["owner", "manager"] },
  { id: "financial", label: "Financial", icon: "💰", roles: ["owner"] },
  { id: "analytics", label: "Analytics", icon: "📈", roles: ["owner"] },
  { id: "weather", label: "Weather", icon: "🌦️", roles: ["owner", "manager", "worker"] },
  { id: "assistant", label: "AI Assistant", icon: "🤖", roles: ["owner", "manager"] },
  { id: "reports", label: "Reports", icon: "📊", roles: ["owner"] },
];

let currentSection = "dashboard";

function visibleNav() {
  const role = Api.user?.role || "worker";
  return NAV.filter(n => n.roles.includes(role));
}

Modules.rerenderCurrent = async function () {
  await renderSection(currentSection);
};

async function renderSection(id) {
  currentSection = id;
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.section === id));
  const main = document.getElementById("main-content");
  main.innerHTML = `<div class="flex items-center justify-center py-24 text-gray-400"><span class="animate-pulse">Loading…</span></div>`;
  try {
    await Modules[id].render(main);
  } catch (err) {
    main.innerHTML = `<div class="card p-6 text-center text-red-600">Couldn't load this section: ${err.message}</div>`;
  }
  document.getElementById("mobile-menu")?.classList.add("hidden");
}

function renderShell() {
  const app = document.getElementById("app");
  const role = Api.user?.role || "worker";
  app.innerHTML = `
    <div class="flex h-screen overflow-hidden">
      <aside id="sidebar" class="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-100 shrink-0">
        <div class="px-5 py-5 border-b border-gray-100 flex items-center gap-2">
          <span class="text-2xl">🌱</span>
          <div><p class="font-bold leading-tight">Green Valley</p><p class="text-xs text-gray-400 leading-tight">Farm Management</p></div>
        </div>
        <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          ${visibleNav().map(n => `<div class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-gray-600 hover:bg-gray-50" data-section="${n.id}">
            <span>${n.icon}</span><span>${n.label}</span></div>`).join("")}
        </nav>
        <div class="p-3 border-t border-gray-100">
          <div class="flex items-center gap-2 px-2 py-2">
            <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">${(Api.user?.name || "?")[0]}</div>
            <div class="flex-1 min-w-0"><p class="text-sm font-medium truncate">${Api.user?.name || ""}</p><p class="text-xs text-gray-400 capitalize">${role}</p></div>
          </div>
          <button id="logout-btn" class="w-full text-left px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Log out</button>
        </div>
      </aside>

      <div class="flex-1 flex flex-col min-w-0">
        <header class="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2"><span class="text-xl">🌱</span><span class="font-bold">Green Valley</span></div>
          <button id="menu-toggle" class="p-2"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
        </header>
        <div id="mobile-menu" class="hidden md:hidden bg-white border-b border-gray-100 px-2 py-2 max-h-[70vh] overflow-y-auto">
          ${visibleNav().map(n => `<div class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-gray-600" data-section="${n.id}">
            <span>${n.icon}</span><span>${n.label}</span></div>`).join("")}
          <button id="logout-btn-mobile" class="w-full text-left px-3 py-2.5 text-sm text-red-600">Log out</button>
        </div>
        <main id="main-content" class="flex-1 overflow-y-auto p-4 sm:p-6"></main>
      </div>
    </div>`;

  document.querySelectorAll(".nav-item").forEach(el => el.addEventListener("click", () => renderSection(el.dataset.section)));
  document.getElementById("menu-toggle").onclick = () => document.getElementById("mobile-menu").classList.toggle("hidden");
  document.getElementById("logout-btn").onclick = doLogout;
  document.getElementById("logout-btn-mobile").onclick = doLogout;
  renderSection("dashboard");
}

function doLogout() {
  Api.clearSession();
  renderAuth();
}

function renderAuth() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white p-4">
      <div class="card w-full max-w-sm p-6">
        <div class="text-center mb-5">
          <p class="text-4xl mb-1">🌱</p>
          <h1 class="text-xl font-bold">Farm Management</h1>
          <p class="text-sm text-gray-500">Sign in to manage your farm</p>
        </div>
        <div class="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          <button id="tab-login" class="tab-btn-auth flex-1 py-1.5 rounded-md text-sm font-medium bg-white shadow-sm">Log In</button>
          <button id="tab-register" class="tab-btn-auth flex-1 py-1.5 rounded-md text-sm font-medium text-gray-500">Register Farm</button>
        </div>
        <div id="auth-body"></div>
        <p class="text-xs text-gray-400 mt-4 text-center">Demo login: owner@greenvalley.farm / password123</p>
      </div>
    </div>`;

  function showLogin() {
    document.getElementById("auth-body").innerHTML = `
      <form id="login-form" class="space-y-3">
        <div><label>Email</label><input type="email" name="email" required value="owner@greenvalley.farm" /></div>
        <div><label>Password</label><input type="password" name="password" required value="password123" /></div>
        <button class="btn-primary w-full py-2.5 rounded-lg font-semibold">Log In</button>
        <p id="login-err" class="text-red-600 text-sm"></p>
      </form>`;
    document.getElementById("login-form").addEventListener("submit", async e => {
      e.preventDefault();
      const f = e.target;
      try {
        const res = await Api.post("/auth/login", { email: f.email.value, password: f.password.value });
        Api.setSession(res.token, res.user);
        renderShell();
      } catch (err) { document.getElementById("login-err").textContent = err.message; }
    });
  }

  function showRegister() {
    document.getElementById("auth-body").innerHTML = `
      <form id="register-form" class="space-y-3">
        <div><label>Your Name</label><input type="text" name="name" required /></div>
        <div><label>Farm Name</label><input type="text" name="farm_name" required /></div>
        <div><label>Email</label><input type="email" name="email" required /></div>
        <div><label>Password</label><input type="password" name="password" required minlength="6" /></div>
        <button class="btn-primary w-full py-2.5 rounded-lg font-semibold">Create Farm Account</button>
        <p id="register-err" class="text-red-600 text-sm"></p>
      </form>`;
    document.getElementById("register-form").addEventListener("submit", async e => {
      e.preventDefault();
      const f = e.target;
      try {
        const res = await Api.post("/auth/register", {
          name: f.name.value, farm_name: f.farm_name.value, email: f.email.value, password: f.password.value, role: "owner",
        });
        Api.setSession(res.token, res.user);
        renderShell();
      } catch (err) { document.getElementById("register-err").textContent = err.message; }
    });
  }

  document.getElementById("tab-login").onclick = () => {
    document.getElementById("tab-login").classList.add("bg-white", "shadow-sm");
    document.getElementById("tab-register").classList.remove("bg-white", "shadow-sm");
    showLogin();
  };
  document.getElementById("tab-register").onclick = () => {
    document.getElementById("tab-register").classList.add("bg-white", "shadow-sm");
    document.getElementById("tab-login").classList.remove("bg-white", "shadow-sm");
    showRegister();
  };
  showLogin();
}

// ---------- Boot ----------
(function boot() {
  if (Api.token && Api.user) {
    renderShell();
  } else {
    renderAuth();
  }
})();
