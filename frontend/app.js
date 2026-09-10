const API_BASE = "https://sentinel-disaster-management.onrender.com/api";

// ---------- i18n ----------
const STRINGS = {
  en: {
    monitoring: (n) => `Monitoring ${n} zones`,
    activeAlerts: "Active Alerts",
    responsePriority: "Response Priority",
    resources: "Available Resources",
    groundReports: "Ground Reports",
    noAlerts: "No active alerts. All zones nominal.",
    noReports: "No ground reports yet.",
    langBtn: "తెలుగు",
  },
  te: {
    monitoring: (n) => `${n} జోన్‌లు పర్యవేక్షణలో ఉన్నాయి`,
    activeAlerts: "క్రియాశీల హెచ్చరికలు",
    responsePriority: "స్పందన ప్రాధాన్యత",
    resources: "అందుబాటులో ఉన్న వనరులు",
    groundReports: "క్షేత్ర నివేదికలు",
    noAlerts: "ప్రస్తుతం హెచ్చరికలు లేవు. అన్ని జోన్లు సాధారణంగా ఉన్నాయి.",
    noReports: "ఇంకా క్షేత్ర నివేదికలు లేవు.",
    langBtn: "English",
  },
};

let currentLang = "en";

function t(key, ...args) {
  const val = STRINGS[currentLang][key];
  return typeof val === "function" ? val(...args) : val;
}

function applyStaticLabels() {
  document.querySelector(".alerts-panel h2").textContent = t("activeAlerts");
  document.querySelector(".allocation-panel h2").textContent = t("responsePriority");
  document.querySelector(".resources-panel h2").textContent = t("resources");
  document.querySelector(".reports-panel h2").textContent = t("groundReports");
  document.getElementById("langToggle").textContent = t("langBtn");
}

document.getElementById("langToggle").addEventListener("click", () => {
  currentLang = currentLang === "en" ? "te" : "en";
  applyStaticLabels();
  refreshAll();
});

const RISK_COLORS = {
  CRITICAL: "#E4572E",
  HIGH: "#F2A65A",
  MODERATE: "#E0C341",
  LOW: "#4FB286",
};

// ---------- Map setup ----------
const map = L.map("map", { zoomControl: true }).setView([16.315, 80.42], 13);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19,
  className: "dark-tiles",
}).addTo(map);

let zoneMarkers = {};

function renderMarkers(zones) {
  Object.values(zoneMarkers).forEach((m) => map.removeLayer(m));
  zoneMarkers = {};

  zones.forEach((zone) => {
    const color = RISK_COLORS[zone.riskLevel];
    const radius = 10 + zone.riskScore / 6;

    const marker = L.circleMarker([zone.lat, zone.lng], {
      radius,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.35,
      className: "risk-marker",
    }).addTo(map);

    marker.bindTooltip(`${zone.name} — ${zone.riskLevel} (${zone.riskScore})`, {
      direction: "top",
    });

    marker.on("click", () => openDrawer(zone));
    zoneMarkers[zone.id] = marker;
  });
}

// ---------- Data fetch + render ----------
async function loadZones() {
  const res = await fetch(`${API_BASE}/zones`);
  const zones = await res.json();
  renderMarkers(zones);
  return zones;
}

async function loadAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  const data = await res.json();
  const list = document.getElementById("alertsList");
  const count = document.getElementById("alertCount");

  count.textContent = data.count;

  if (data.count === 0) {
    list.innerHTML = `<p class="empty">${t("noAlerts")}</p>`;
    return;
  }

  list.innerHTML = data.alerts
    .map(
      (a) => `
      <div class="alert-card ${a.riskLevel === "HIGH" ? "high" : ""}" data-zone="${a.zoneId}">
        <div class="alert-card-top">
          <span class="alert-card-name">${a.name}</span>
          <span class="alert-card-level ${a.riskLevel === "HIGH" ? "high" : ""}">${a.riskLevel}</span>
        </div>
        <div class="alert-card-msg">${a.message}</div>
      </div>`
    )
    .join("");

  document.querySelectorAll(".alert-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const zoneId = card.getAttribute("data-zone");
      const res = await fetch(`${API_BASE}/zones/${zoneId}`);
      const zone = await res.json();

      openDrawer(zone);
      map.panTo([zone.lat, zone.lng]);
    });
  });
}

async function loadAllocationPlan() {
  const res = await fetch(`${API_BASE}/allocation-plan`);
  const data = await res.json();
  const list = document.getElementById("allocationList");

  if (data.plan.length === 0) {
    list.innerHTML = `<p class="empty">No priority action needed right now.</p>`;
    return;
  }

  list.innerHTML = data.plan
    .map(
      (p) => `
      <div class="alloc-item">
        <span class="alloc-priority">${p.priority}</span>
        <div class="alloc-detail">
          <strong>${p.zone} — ${p.riskLevel}</strong>
          <span>${p.suggestedAction}</span>
        </div>
      </div>`
    )
    .join("");
}

async function loadResources() {
  const res = await fetch(`${API_BASE}/resources`);
  const resources = await res.json();
  const list = document.getElementById("resourcesList");

  list.innerHTML = resources
    .map(
      (r) => `
      <div class="resource-row">
        <span>${r.type}</span>
        <span class="resource-count">${r.available} · ${r.location}</span>
      </div>`
    )
    .join("");
}

// ---------- Ground reports ----------
async function loadReports() {
  const res = await fetch(`${API_BASE}/reports`);
  const reports = await res.json();
  const list = document.getElementById("reportsList");

  document.getElementById("reportCount").textContent = reports.length;

  if (reports.length === 0) {
    list.innerHTML = `<p class="empty">${t("noReports")}</p>`;
    return;
  }

  list.innerHTML = reports
    .map((r) => {
      const zoneName = (window.__zoneNames || {})[r.zoneId] || r.zoneId;
      const cls =
        r.severity === "CRITICAL"
          ? "critical"
          : r.severity === "HIGH"
          ? "high"
          : "";

      const mins = Math.max(
        1,
        Math.round((Date.now() - new Date(r.timestamp)) / 60000)
      );

      return `
      <div class="report-card ${cls}">
        <div class="report-card-top">
          <span>${zoneName} · ${r.severity}</span>
          <span>${mins}m ago</span>
        </div>
        <div>${r.message}</div>
      </div>`;
    })
    .join("");
}

// ---------- SOS modal ----------
const sosOverlay = document.getElementById("sosOverlay");

document.getElementById("sosBtn").addEventListener("click", () => {
  sosOverlay.classList.add("open");
});

document.getElementById("sosClose").addEventListener("click", () => {
  sosOverlay.classList.remove("open");
});

document.getElementById("sosSubmit").addEventListener("click", async () => {
  const zoneId = document.getElementById("sosZone").value;
  const reporterName = document.getElementById("sosName").value;
  const severity = document.getElementById("sosSeverity").value;
  const message = document.getElementById("sosMessage").value.trim();

  if (!zoneId || !message) {
    alert("Please select a zone and describe what you're seeing.");
    return;
  }

  await fetch(`${API_BASE}/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zoneId,
      reporterName,
      severity,
      message,
    }),
  });

  document.getElementById("sosMessage").value = "";
  document.getElementById("sosName").value = "";

  sosOverlay.classList.remove("open");

  await loadReports();
});

function populateSosZoneOptions(zones) {
  const select = document.getElementById("sosZone");

  select.innerHTML = zones
    .map((z) => `<option value="${z.id}">${z.name}</option>`)
    .join("");
}

// ---------- Trend chart ----------
async function drawTrendChart(zoneId) {
  const res = await fetch(`${API_BASE}/zones/${zoneId}/history`);
  const data = await res.json();

  const canvas = document.getElementById("trendCanvas");
  const ctx = canvas.getContext("2d");

  const w = canvas.width;
  const h = canvas.height;
  const pad = 10;

  ctx.clearRect(0, 0, w, h);

  const points = data.history;
  const maxScore = 100;

  const stepX = (w - pad * 2) / (points.length - 1);

  ctx.strokeStyle = "#24384D";
  ctx.beginPath();
  ctx.moveTo(pad, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.stroke();

  ctx.strokeStyle = "#F2A65A";
  ctx.lineWidth = 2;

  ctx.beginPath();

  points.forEach((p, i) => {
    const x = pad + i * stepX;
    const y =
      h - pad - (p.score / maxScore) * (h - pad * 2);

    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.stroke();

  points.forEach((p, i) => {
    const x = pad + i * stepX;
    const y =
      h - pad - (p.score / maxScore) * (h - pad * 2);

    ctx.fillStyle = "#F2A65A";

    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#7C93A8";
  ctx.font = "10px Inter";

  ctx.fillText("6h ago", pad, h - 1);
  ctx.fillText("now", w - pad - 22, h - 1);
}

// ---------- Drawer ----------
function openDrawer(zone) {
  document.getElementById("drawerTitle").textContent = zone.name;

  document.getElementById("drawerStats").innerHTML = `
    <div class="drawer-row">
      <span>Risk score</span>
      <span>${zone.riskScore} / 100</span>
    </div>

    <div class="drawer-row">
      <span>Risk level</span>
      <span>${zone.riskLevel}</span>
    </div>

    <div class="drawer-row">
      <span>Rainfall</span>
      <span>${zone.rainfallMM} mm</span>
    </div>

    <div class="drawer-row">
      <span>River level</span>
      <span>
        ${zone.riverLevelM} m
        (danger: ${zone.riverDangerLevelM} m)
      </span>
    </div>

    <div class="drawer-row">
      <span>Soil moisture</span>
      <span>${zone.soilMoisture}%</span>
    </div>

    <div class="drawer-row">
      <span>Population at risk</span>
      <span>${zone.population.toLocaleString()}</span>
    </div>
  `;

  document.getElementById("zoneDrawer").classList.add("open");

  drawTrendChart(zone.id);
}

// ---------- Downloadable report ----------
document
  .getElementById("downloadReportBtn")
  .addEventListener("click", () => {
    window.print();
  });

document
  .getElementById("drawerClose")
  .addEventListener("click", () => {
    document.getElementById("zoneDrawer").classList.remove("open");
  });

// ---------- Clock ----------
function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent =
    now.toLocaleTimeString();
}

setInterval(updateClock, 1000);
updateClock();

// ---------- Init + polling ----------
async function refreshAll() {
  const zones = await loadZones();

  window.__zoneNames = Object.fromEntries(
    zones.map((z) => [z.id, z.name])
  );

  populateSosZoneOptions(zones);

  document.getElementById("statusText").textContent =
    t("monitoring", zones.length);

  await loadAlerts();
  await loadAllocationPlan();
  await loadResources();
  await loadReports();
}

applyStaticLabels();
refreshAll();

setInterval(refreshAll, 15000); // simulate live monitoring every 15s