const CONFIG = NOOBSERVER_CONFIG;

// ----------------------------------------------------
// ELEMENTOS UI
// ----------------------------------------------------
const el = {
  status: document.getElementById("status"),
  version: document.getElementById("version"),
  icon: document.getElementById("server-icon"),
  playersCount: document.getElementById("players-count"),
  playersBar: document.getElementById("players-bar"),
  playersList: document.getElementById("players-list"),
  motd: document.getElementById("motd"),
  ping: document.getElementById("ping-value"),
  lastUpdate: document.getElementById("last-update"),
  pingArrow: document.getElementById("ping-arrow"),
  pingStatusText: document.getElementById("ping-status-text")
};

// ----------------------------------------------------
// ENDPOINTS
// ----------------------------------------------------
const PING_ENDPOINT =
  "https://api.mcstatus.io/v2/status/java/noobserver.monsternodes.com";

// ----------------------------------------------------
// FETCH LOOP (DATOS SERVIDOR) — INDEPENDIENTE
// ----------------------------------------------------
async function fetchData() {
  try {
    const res = await fetch(CONFIG.endpoint, {
      cache: "no-store"
    });

    if (!res.ok) throw new Error("HTTP error");

    const data = await res.json();
    render(data);

  } catch (err) {
    console.error(err);
    setOffline();
  }
}

// ----------------------------------------------------
// RENDER PRINCIPAL
// ----------------------------------------------------
function render(data) {

  const server = data?.server;

  if (!server || !server.online) {
    setOffline();
    return;
  }

  setOnline();
  renderVersion(server);
  renderIcon(server);
  renderPlayers(server.players);
  renderMOTD(server.motd);
  renderLastUpdate(data.lastUpdate);

  // ping NO depende del refresh
}

// ----------------------------------------------------
// ONLINE / OFFLINE
// ----------------------------------------------------
function setOnline() {
  el.status.textContent = "ONLINE";
  el.status.className = "status online";
}

function setOffline() {

  el.status.textContent = "OFFLINE";
  el.status.className = "status offline";

  el.playersCount.textContent = "0 / 20";
  el.playersBar.style.width = "0%";

  el.playersList.innerHTML =
    `<div class="empty">Sin jugadores conectados</div>`;

  el.motd.innerHTML = "";

  el.version.textContent = "-";

  el.icon.removeAttribute("src");

  resetPingUI();
}

// ----------------------------------------------------
// VERSION
// ----------------------------------------------------
function renderVersion(server) {
  el.version.textContent =
    server?.version?.name_clean ||
    server?.version ||
    "Unknown";
}

// ----------------------------------------------------
// ICONO
// ----------------------------------------------------
function renderIcon(server) {
  if (server?.icon) {
    el.icon.src = server.icon;
  } else {
    el.icon.removeAttribute("src");
  }
}

// ----------------------------------------------------
// JUGADORES
// ----------------------------------------------------
function renderPlayers(players) {

  if (!players) return;

  const online = players.online ?? 0;
  const max = players.max ?? 20;

  const list =
    Array.isArray(players.list)
      ? players.list
      : [];

  el.playersCount.textContent =
    `${online} / ${max}`;

  el.playersBar.style.width =
    `${max ? Math.round((online / max) * 100) : 0}%`;

  el.playersList.innerHTML = "";

  if (!list.length) {
    el.playersList.innerHTML =
      `<div class="empty">Sin jugadores conectados</div>`;
    return;
  }

  list.forEach(player => {

    const div = document.createElement("div");
    div.className = "player";

    const img = document.createElement("img");
    img.src =
      `https://mc-heads.net/avatar/${player.uuid || player.name_raw}/40`;

    const span = document.createElement("span");
    span.textContent =
      player.name_raw || player.name_clean;

    div.appendChild(img);
    div.appendChild(span);

    el.playersList.appendChild(div);
  });
}

// ----------------------------------------------------
// MOTD
// ----------------------------------------------------
function renderMOTD(motd) {

  if (!motd) return;

  if (typeof motd.html === "string") {
    el.motd.innerHTML = motd.html;
  } else if (motd.clean) {
    el.motd.textContent = motd.clean;
  }
}

// ----------------------------------------------------
// LAST UPDATE
// ----------------------------------------------------
function renderLastUpdate(ts) {
  if (!ts) return;

  el.lastUpdate.textContent =
    new Date(ts).toLocaleString("es-ES");
}

// ====================================================
// PING SYSTEM (TOTALMENTE INDEPENDIENTE)
// ====================================================

const pingState = {
  samples: [],
  started: false
};

const PING_CONFIG = {
  interval: 5000,
  warmup: 8,
  stabilize: 20,
  maxValid: 500,
  spikeRatio: 2.0
};

// ----------------------------------------------------
// INIT PING UI
// ----------------------------------------------------
function resetPingUI() {
  el.ping.textContent = "-- ms";
  el.pingArrow.style.left = "2%";
  el.pingStatusText.textContent =
    "Estado de tu conexión: calculando...";
}

// ----------------------------------------------------
// START LOOP
// ----------------------------------------------------
function startPingLoop() {

  if (pingState.started) return;
  pingState.started = true;

  resetPingUI();

  measurePing();
  setInterval(measurePing, PING_CONFIG.interval);
}

// ----------------------------------------------------
// MEDIR PING
// ----------------------------------------------------
async function measurePing() {

  if (document.visibilityState !== "visible") return;

  try {
    const t0 = performance.now();

    const res = await fetch(PING_ENDPOINT, {
      cache: "no-store"
    });

    const t1 = performance.now();

    if (!res.ok) return;

    const ping = t1 - t0;

    if (ping <= 0 || ping > PING_CONFIG.maxValid) return;

    addSample(ping);
    updatePing();

  } catch (e) {
    console.error("Ping error", e);
  }
}

// ----------------------------------------------------
// BUFFER
// ----------------------------------------------------
function addSample(v) {
  pingState.samples.push(v);

  if (pingState.samples.length > 50) {
    pingState.samples.shift();
  }
}

// ----------------------------------------------------
// MEDIANA
// ----------------------------------------------------
function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// ----------------------------------------------------
// OUTLIERS
// ----------------------------------------------------
function filterOutliers(samples, base) {
  return samples.filter(v => {
    const diff = Math.abs(v - base) / base;
    return diff <= PING_CONFIG.spikeRatio;
  });
}

// ----------------------------------------------------
// UPDATE UI
// ----------------------------------------------------
function updatePing() {

  const s = pingState.samples;

  if (s.length < PING_CONFIG.warmup) {
    el.ping.textContent = "-- ms";
    el.pingStatusText.textContent =
      "Estado de tu conexión: calculando...";
    return;
  }

  const base = median(s);
  const filtered = filterOutliers(s, base);

  const value = median(filtered);

  el.ping.textContent = `${value.toFixed(1)} ms`;

  let pos = 0;
  let status = "Injugable";

  if (value <= 30) {
    pos = (value / 30) * 20;
    status = "Excelente";
  } else if (value <= 60) {
    pos = 20 + ((value - 30) / 30) * 20;
    status = "Bueno";
  } else if (value <= 150) {
    pos = 40 + ((value - 60) / 90) * 20;
    status = "Aceptable";
  } else if (value <= 250) {
    pos = 60 + ((value - 150) / 100) * 20;
    status = "Malo";
  } else {
    pos = 80 + Math.min(((value - 250) / 200) * 20, 20);
    status = "Injugable";
  }

  pos = Math.max(2, Math.min(pos, 98));

  el.pingArrow.style.left = `${pos}%`;

  el.pingStatusText.textContent =
    `Estado de tu conexión: ${status}`;
}

// ----------------------------------------------------
// INIT GENERAL
// ----------------------------------------------------
fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs || 15000);

// 🔥 IMPORTANTE: ping independiente del refresh
startPingLoop();
