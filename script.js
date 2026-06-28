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
// PING ENGINE (DESACOPLADO)
// ----------------------------------------------------
const PING_STATE = {
  samples: [],
  window: 7,
  lastStable: null,
  ready: false
};

// ----------------------------------------------------
// VISIBILITY HANDLING
// ----------------------------------------------------
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    PING_STATE.samples = [];
    PING_STATE.lastStable = null;
    PING_STATE.ready = false;
  }
});

// ----------------------------------------------------
// FETCH LOOP (SERVIDOR - 15s)
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

  el.ping.textContent = "-- ms";

  el.pingArrow.style.left = "2%";

  el.pingStatusText.textContent =
    "Estado de tu conexión: calculando...";
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
  if (server?.icon) el.icon.src = server.icon;
  else el.icon.removeAttribute("src");
}

// ----------------------------------------------------
// JUGADORES
// ----------------------------------------------------
function renderPlayers(players) {

  if (!players) return;

  const online = players.online ?? 0;
  const max = players.max ?? 20;

  const list = Array.isArray(players.list) ? players.list : [];

  el.playersCount.textContent = `${online} / ${max}`;

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
    span.textContent = player.name_raw || player.name_clean;

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
// PING LOOP (CADA 5s INDEPENDIENTE)
// ----------------------------------------------------
async function pingLoop() {
  try {
    const t0 = performance.now();

    await fetch(PING_ENDPOINT, {
      cache: "no-store",
      keepalive: true
    });

    const t1 = performance.now();

    processPing(t1 - t0);

  } catch (e) {
    console.error("Ping error", e);
  }
}

// iniciar loop independiente
setInterval(pingLoop, 5000);
pingLoop(); // primera ejecución inmediata

// ----------------------------------------------------
// PING PROCESSING (SIN DERIVA + SIN WARMUP BLOQUEANTE)
// ----------------------------------------------------
function processPing(ping) {

  // primer valor siempre visible (evita UI congelada)
  if (!PING_STATE.ready) {
    PING_STATE.ready = true;
    PING_STATE.lastStable = ping;
    renderPing(ping);
    return;
  }

  // filtro anti-spike
  if (PING_STATE.lastStable) {
    const diff = Math.abs(ping - PING_STATE.lastStable);

    if (diff > PING_STATE.lastStable * 0.6) {
      return;
    }
  }

  PING_STATE.samples.push(ping);

  if (PING_STATE.samples.length > PING_STATE.window) {
    PING_STATE.samples.shift();
  }

  // mediana (robusto, sin deriva)
  const sorted = [...PING_STATE.samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  const stablePing =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

  PING_STATE.lastStable = stablePing;

  renderPing(stablePing);
}

// ----------------------------------------------------
// RENDER PING
// ----------------------------------------------------
function renderPing(ping) {

  el.ping.textContent = `${ping.toFixed(1)} ms`;

  let position = 0;
  let statusText = "Injugable";

  if (ping <= 30) {
    position = (ping / 30) * 20;
    statusText = "Excelente";
  }
  else if (ping <= 60) {
    position = 20 + ((ping - 30) / 30) * 20;
    statusText = "Bueno";
  }
  else if (ping <= 150) {
    position = 40 + ((ping - 60) / 90) * 20;
    statusText = "Aceptable";
  }
  else if (ping <= 250) {
    position = 60 + ((ping - 150) / 100) * 20;
    statusText = "Malo";
  }
  else {
    position = 80 + Math.min(((ping - 250) / 200) * 20, 20);
    statusText = "Injugable";
  }

  position = Math.max(2, Math.min(position, 98));

  el.pingArrow.style.left = `${position}%`;

  el.pingStatusText.textContent =
    `Estado de tu conexión: ${statusText}`;
}

// ----------------------------------------------------
// LAST UPDATE
// ----------------------------------------------------
function renderLastUpdate(ts) {
  if (!ts) return;

  el.lastUpdate.textContent =
    new Date(ts).toLocaleString("es-ES");
}

// ----------------------------------------------------
// INIT
// ----------------------------------------------------
fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs || 15000);
