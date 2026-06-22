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

  lastUpdate: document.getElementById("last-update"),
  canvas: document.getElementById("ping-chart")
};

const ctx = el.canvas.getContext("2d");

let lastRenderedPlayers = [];
let lastPing = null;

/* =========================
   FETCH LOOP
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
   MAIN RENDER
========================= */
function render(data) {
  const server = data.server;

  if (!server || !server.players) {
    setOffline();
    return;
  }

  setOnline(server);
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
function setOnline(server) {
  el.status.textContent = "ONLINE";
  el.status.className = "status online";
}

function setOffline() {
  el.status.textContent = "OFFLINE";
  el.status.className = "status offline";

  el.playersCount.textContent = "0 / 20";
  el.playersBar.style.width = "0%";
}

/* =========================
   VERSION
========================= */
function renderVersion(server) {
  el.version.textContent =
    server.protocol?.name ||
    server.version ||
    "Unknown";
}

/* =========================
   ICON
========================= */
function renderIcon(server) {
  if (server.icon) {
    el.icon.src = server.icon;
  }
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

  // evitar repaint si no cambia
  const names = list.map(p => p.name).join(",");

  if (names === lastRenderedPlayers.join(",")) return;

  lastRenderedPlayers = list.map(p => p.name);

  el.playersList.innerHTML = "";

  if (list.length === 0) {
    el.playersList.innerHTML = `<div class="empty">No hay jugadores conectados</div>`;
    return;
  }

  list.slice(0, CONFIG.maxPlayers).forEach(p => {
    const uuid = p.uuid;
    const name = p.name;

    const skin = uuid
      ? `https://crafatar.com/avatars/${uuid}?size=40&overlay`
      : "";

    const div = document.createElement("div");
    div.className = "player";

    div.innerHTML = `
      <img src="${skin}" alt="${name}">
      <span>${name}</span>
    `;

    el.playersList.appendChild(div);
  });
}

/* =========================
   MOTD
========================= */
function renderMOTD(motd) {
  if (!motd) return;

  if (motd.html?.length) {
    el.motd.innerHTML = motd.html.join("<br>");
  } else if (motd.clean?.length) {
    el.motd.innerHTML = motd.clean.join("<br>");
  }
}

/* =========================
   PING
========================= */
function renderPing(data) {
  const ping = data.ping;

  if (ping == null) return;

  el.ping.textContent = `${ping} ms`;

  if (ping !== lastPing) {
    lastPing = ping;
  }
}

/* =========================
   GRAPH
========================= */
function renderGraph(history) {
  const canvas = el.canvas;
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = 70;

  ctx.clearRect(0, 0, width, height);

  if (!history || history.length < 2) return;

  const max = Math.max(...history);
  const min = Math.min(...history);

  ctx.beginPath();

  history.forEach((p, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - ((p - min) / (max - min || 1)) * height;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
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

  const d = new Date(ts);

  el.lastUpdate.textContent = d.toLocaleTimeString();
}

/* =========================
   LOOP
========================= */
fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs);
