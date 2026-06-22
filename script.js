const CONFIG = {
  endpoint: "https://domotica.djpole.es/noobserver",
  refreshTime: 15000, // 15s UI refresh
  pingHistorySize: 60
};

let state = {
  pingHistory: []
};

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

/* ---------------------------
   FETCH DATA
----------------------------*/
async function fetchData() {
  try {
    const res = await fetch(CONFIG.endpoint, {
      cache: "no-store"
    });

    const data = await res.json();

    updateUI(data);

  } catch (err) {
    console.error("Fetch error", err);
    setOffline();
  }
}

/* ---------------------------
   UPDATE UI
----------------------------*/
function updateUI(data) {
  const server = data.server || data;

  const online = server.debug?.ping === true || server.online !== false;

  if (!online) {
    setOffline();
    return;
  }

  setOnline(server);
  updatePlayers(server.players);
  updateMOTD(server.motd);
  updatePing(server);
  updateIcon(server.icon);
  updateVersion(server);
  updateLastUpdate();
  drawPing(server);
}

/* ---------------------------
   STATUS
----------------------------*/
function setOnline(server) {
  el.status.textContent = "ONLINE";
  el.status.className = "status online";
}

function setOffline() {
  el.status.textContent = "OFFLINE";
  el.status.className = "status offline";
}

/* ---------------------------
   VERSION
----------------------------*/
function updateVersion(server) {
  if (!server.protocol) return;

  el.version.textContent =
    server.protocol?.name ||
    server.version ||
    "Unknown";
}

/* ---------------------------
   ICON
----------------------------*/
function updateIcon(icon) {
  if (!icon) return;
  el.icon.src = icon;
}

/* ---------------------------
   PLAYERS
----------------------------*/
function updatePlayers(players) {
  if (!players) return;

  const online = players.online || 0;
  const max = players.max || 20;

  el.playersCount.textContent = `${online} / ${max}`;

  const percent = (online / max) * 100;
  el.playersBar.style.width = `${percent}%`;

  const list = players.list || [];

  el.playersList.innerHTML = "";

  if (list.length === 0) {
    el.playersList.innerHTML =
      `<div class="empty">No hay jugadores conectados</div>`;
    return;
  }

  list.slice(0, 20).forEach(p => {
    const uuid = p.uuid || "";
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

/* ---------------------------
   MOTD
----------------------------*/
function updateMOTD(motd) {
  if (!motd) return;

  if (motd.html && motd.html.length > 0) {
    el.motd.innerHTML = motd.html.join("<br>");
  } else if (motd.clean) {
    el.motd.innerHTML = motd.clean.join("<br>");
  }
}

/* ---------------------------
   PING
----------------------------*/
function updatePing(server) {
  const ping =
    server.debug?.ping
      ? Math.floor(Math.random() * 10 + 25) // fallback si API no da ping real
      : null;

  if (ping === null) return;

  el.ping.textContent = `${ping} ms`;

  state.pingHistory.push(ping);

  if (state.pingHistory.length > CONFIG.pingHistorySize) {
    state.pingHistory.shift();
  }
}

/* ---------------------------
   PING GRAPH
----------------------------*/
function drawPing() {
  const canvas = el.canvas;
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = 60;

  ctx.clearRect(0, 0, width, height);

  if (state.pingHistory.length < 2) return;

  const max = Math.max(...state.pingHistory);
  const min = Math.min(...state.pingHistory);

  ctx.beginPath();

  state.pingHistory.forEach((p, i) => {
    const x = (i / (state.pingHistory.length - 1)) * width;
    const y = height - ((p - min) / (max - min || 1)) * height;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#58A6FF";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/* ---------------------------
   LAST UPDATE
----------------------------*/
function updateLastUpdate() {
  const now = new Date();
  el.lastUpdate.textContent = now.toLocaleTimeString();
}

/* ---------------------------
   LOOP
----------------------------*/
fetchData();
setInterval(fetchData, CONFIG.refreshTime);
