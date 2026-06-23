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

  pingIndicator: document.getElementById("ping-indicator"),
  pingState: document.getElementById("ping-state"),

  lastUpdate: document.getElementById("last-update"),
  canvas: document.getElementById("ping-chart")
};

const ctx = el.canvas?.getContext("2d");

let lastRenderedPlayers = [];
let lastPing = null;

/* =========================
   HEAD SYSTEM (SIN CAMBIOS)
========================= */

const headCache = new Map();

function getHeadUrls(uuid) {
  return [
    `https://mc-heads.net/avatar/${uuid}/40`,
    `https://minotar.net/helm/${uuid}/40`,
    `https://visage.surgeplay.com/head/40/${uuid}`,
    `https://crafatar.com/renders/head/${uuid}?size=40&overlay`,
  ];
}

function setHeadWithFallback(img, uuid, index = 0) {
  if (!uuid) {
    img.src = "assets/default-head.png";
    return;
  }

  if (headCache.has(uuid)) {
    img.src = headCache.get(uuid);
    return;
  }

  const urls = getHeadUrls(uuid);

  if (index >= urls.length) {
    img.src = "assets/default-head.png";
    return;
  }

  const url = urls[index];

  const tester = new Image();

  tester.onload = () => {
    headCache.set(uuid, url);
    img.src = url;
  };

  tester.onerror = () => {
    setHeadWithFallback(img, uuid, index + 1);
  };

  tester.src = url;
}

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
    console.error("Fetch error:", e);
    setOffline();
  }
}

/* =========================
   RENDER CORE
========================= */

function render(data) {
  const server = data?.server;

  if (!server) {
    setOffline();
    return;
  }

  setOnline();

  renderVersion(server);
  renderIcon(server);
  renderPlayers(server.players);
  renderMOTD(server.motd);
  renderPing(data.ping);
  renderPingBar(data.ping);
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

  renderPingBar(null);
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
  if (server.icon) el.icon.src = server.icon;
}

/* =========================
   PLAYERS
========================= */

function renderPlayers(players) {
  if (!players) return;

  const online = players.online ?? 0;
  const max = players.max ?? 20;
  const list = players.list ?? [];

  el.playersCount.textContent = `${online} / ${max}`;

  const percent = max > 0 ? (online / max) * 100 : 0;
  el.playersBar.style.width = `${percent}%`;

  el.playersList.replaceChildren();

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No hay jugadores conectados";
    el.playersList.appendChild(empty);
    return;
  }

  list.slice(0, CONFIG.maxPlayers).forEach(p => {
    const div = document.createElement("div");
    div.className = "player";

    const img = document.createElement("img");
    img.alt = p.name;

    setHeadWithFallback(img, p.uuid);

    const span = document.createElement("span");
    span.textContent = p.name;

    div.appendChild(img);
    div.appendChild(span);

    el.playersList.appendChild(div);
  });
}

/* =========================
   MOTD
========================= */

function renderMOTD(motd) {
  if (!motd) return;

  el.motd.innerHTML =
    motd.html?.join("<br>") ||
    motd.clean?.join("<br>") ||
    "";
}

/* =========================
   PING TEXT
========================= */

function renderPing(ping) {
  if (ping == null) return;
  el.ping.textContent = `${ping} ms`;
  lastPing = ping;
}

/* =========================
   PING BAR + ESTADOS
========================= */

function renderPingBar(ping) {
  const bar = el.pingIndicator;
  const state = el.pingState;

  if (!bar || !state) return;

  if (ping == null) {
    bar.style.left = "0%";
    state.textContent = "Sin datos";
    return;
  }

  // clamp 0–300
  const capped = Math.min(ping, 300);

  // posicion proporcional
  const percent = (capped / 300) * 100;
  bar.style.left = `${percent}%`;

  let label = "";
  let color = "";

  if (ping <= 30) {
    label = "Excelente";
    color = "#2ea043";
  } else if (ping <= 60) {
    label = "Bueno";
    color = "#238636";
  } else if (ping <= 100) {
    label = "Aceptable";
    color = "#d29922";
  } else if (ping <= 150) {
    label = "Pobre";
    color = "#e38c29";
  } else if (ping <= 250) {
    label = "Malo";
    color = "#da3633";
  } else {
    label = "Injugable";
    color = "#6e7681";
  }

  state.textContent = `${label} (${ping} ms)`;
  state.style.color = color;
}

/* =========================
   GRAPH
========================= */

function renderGraph(history) {
  if (!ctx || !el.canvas) return;

  const w = el.canvas.width = el.canvas.offsetWidth;
  const h = el.canvas.height = 70;

  ctx.clearRect(0, 0, w, h);

  if (!history?.length || history.length < 2) return;

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
