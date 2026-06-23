const CONFIG = NOOBSERVER_CONFIG;

const el = {
  status: document.getElementById("status"),
  version: document.getElementById("version"),
  icon: document.getElementById("server-icon"),

  playersCount: document.getElementById("players-count"),
  playersBar: document.getElementById("players-bar"),
  playersList: document.getElementById("players-list"),

  motd: document.getElementById("motd"),
  ping: document.getElementById("ping-value"),
  pingStatus: document.getElementById("ping-status"),
  pingArrow: document.getElementById("ping-arrow"),

  lastUpdate: document.getElementById("last-update"),
  canvas: document.getElementById("ping-chart")
};

const ctx = el.canvas?.getContext("2d");

let lastRenderedPlayers = [];

/* =========================
   FETCH
========================= */

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

/* =========================
   RENDER
========================= */

function render(data) {
  const server = data.server;
  if (!server) return setOffline();

  setOnline();

  renderVersion(server);
  renderIcon(server);
  renderPlayers(server.players);
  renderMOTD(server.motd);
  renderPing(data);
  renderLastUpdate(data.lastUpdate);
  renderGraph(data.pingHistory || []);
}

/* =========================
   STATUS
========================= */

function setOnline() {
  el.status.textContent = "ONLINE";
  el.status.className = "status online";
}

function setOffline() {
  el.status.textContent = "OFFLINE";
  el.status.className = "status offline";

  el.playersCount.textContent = "0 / 20";
  el.playersBar.style.width = "0%";
  el.playersList.replaceChildren();

  el.pingStatus.textContent = "Sin datos";
  el.pingArrow.style.left = "0%";
}

/* =========================
   VERSION + ICON
========================= */

function renderVersion(server) {
  el.version.textContent =
    server.version?.name_clean ||
    server.version?.name_raw ||
    "Unknown";
}

function renderIcon(server) {
  if (server.icon) el.icon.src = server.icon;
}

/* =========================
   PLAYERS
========================= */

function renderPlayers(players) {
  const online = players.online ?? 0;
  const max = players.max ?? 20;
  const list = players.list ?? [];

  el.playersCount.textContent = `${online} / ${max}`;

  const percent = (online / max) * 100;
  el.playersBar.style.width = `${percent}%`;

  if (!list.length) {
    el.playersList.innerHTML = `<div class="empty">Sin jugadores</div>`;
    return;
  }

  el.playersList.replaceChildren();

  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "player";

    const img = document.createElement("img");
    img.src = `https://mc-heads.net/avatar/${p.uuid}/40`;
    img.alt = p.name_raw || p.name;

    const span = document.createElement("span");
    span.textContent = p.name_raw || p.name;

    div.appendChild(img);
    div.appendChild(span);

    el.playersList.appendChild(div);
  });
}

/* =========================
   PING + SEMÁFORO
========================= */

function getPingStatus(ping) {
  if (ping <= 30) return "Excelente";
  if (ping <= 60) return "Bueno";
  if (ping <= 100) return "Aceptable";
  if (ping <= 150) return "Pobre";
  if (ping <= 250) return "Malo";
  return "Injugable";
}

function renderPing(data) {
  const ping = data.ping;
  if (ping == null) return;

  el.ping.textContent = `${ping} ms`;

  const status = getPingStatus(ping);
  el.pingStatus.textContent = status;

  // mapa 0-300ms → 0-100%
  let percent = Math.min((ping / 300) * 100, 100);
  el.pingArrow.style.left = `${percent}%`;
}

/* =========================
   GRAPH
========================= */

function renderGraph(history) {
  if (!ctx || !el.canvas) return;

  const w = el.canvas.width = el.canvas.offsetWidth;
  const h = el.canvas.height = 70;

  ctx.clearRect(0, 0, w, h);

  if (!history.length) return;

  const max = Math.max(...history);
  const min = Math.min(...history);

  ctx.beginPath();

  history.forEach((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;

    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#58A6FF";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/* =========================
   LAST UPDATE
========================= */

function renderLastUpdate(ts) {
  if (!ts) return;
  el.lastUpdate.textContent = new Date(ts).toLocaleTimeString();
}

/* =========================
   LOOP
========================= */

fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs);
