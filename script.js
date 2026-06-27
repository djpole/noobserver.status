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
  pingChart: document.getElementById("ping-chart")
};

// ----------------------------------------------------
// PING HISTORY + CANVAS
// ----------------------------------------------------
const pingHistory = new Array(CONFIG.pingHistorySize || 60).fill(0);
const ctx = el.pingChart.getContext("2d");

// ----------------------------------------------------
// FETCH LOOP
// ----------------------------------------------------
async function fetchData() {
  try {
    const res = await fetch(CONFIG.endpoint, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP error");

    const data = await res.json();
    render(data);

  } catch (e) {
    console.error(e);
    setOffline();
  }
}

// ----------------------------------------------------
// RENDER MAIN
// ----------------------------------------------------
function render(data) {
  const server = data?.server;

  if (!server || !server.online) {
    return setOffline();
  }

  setOnline();
  renderVersion(server);
  renderIcon(server);
  renderPlayers(server.players);
  renderMOTD(server.motd);
  renderPing(server);
  renderLastUpdate(data.lastUpdate);
}

// ----------------------------------------------------
// STATUS
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

  clearPingChart();
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
// ICON
// ----------------------------------------------------
function renderIcon(server) {
  if (server?.icon) {
    el.icon.src = server.icon;
  } else {
    el.icon.removeAttribute("src");
  }
}

// ----------------------------------------------------
// PLAYERS
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

  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "player";

    const img = document.createElement("img");
    img.src = `https://mc-heads.net/avatar/${p.uuid || p.name_raw}/40`;

    const span = document.createElement("span");
    span.textContent = p.name_raw || p.name_clean;

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
// PING + HISTORIAL
// ----------------------------------------------------
function renderPing(data) {
  const ping = data?.ping;

  if (ping == null) {
    el.ping.textContent = "-- ms";
    return;
  }

  const value = Number(ping);

  el.ping.textContent = `${value.toFixed(1)} ms`;

  updatePingHistory(value);
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
// PING HISTORY UPDATE
// ----------------------------------------------------
function updatePingHistory(value) {

  pingHistory.push(value);

  if (pingHistory.length > (CONFIG.pingHistorySize || 60)) {
    pingHistory.shift();
  }

  drawPingChart();
}

// ----------------------------------------------------
// DRAW CHART
// ----------------------------------------------------
function drawPingChart() {

  if (!ctx) return;

  const canvas = el.pingChart;

  const w = canvas.width = canvas.offsetWidth;
  const h = canvas.height = canvas.offsetHeight;

  ctx.clearRect(0, 0, w, h);

  const max = Math.max(...pingHistory, 50);

  ctx.beginPath();
  ctx.strokeStyle = "#58A6FF";
  ctx.lineWidth = 2;

  pingHistory.forEach((v, i) => {

    const x = (i / (pingHistory.length - 1)) * w;
    const y = h - (v / max) * h;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

// ----------------------------------------------------
// CLEAR CHART
// ----------------------------------------------------
function clearPingChart() {
  pingHistory.fill(0);

  if (!ctx) return;

  const canvas = el.pingChart;

  const w = canvas.width = canvas.offsetWidth;
  const h = canvas.height = canvas.offsetHeight;

  ctx.clearRect(0, 0, w, h);
}

// ----------------------------------------------------
// INIT
// ----------------------------------------------------
fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs || 15000);
