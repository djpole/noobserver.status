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

const ctx = el.canvas?.getContext("2d");

let lastRenderedPlayers = [];
let lastPing = null;

/* =========================
   HEAD SYSTEM (SIN CAMBIOS FUNCIONALES)
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
}

/* =========================
   VERSION (NUEVA API)
========================= */

function renderVersion(server) {
  el.version.textContent =
    server.version?.name_clean ||
    server.version?.name_raw ||
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
   PLAYERS (ADAPTADO NUEVA API)
========================= */

function renderPlayers(players) {
  if (!players) return;

  const online = players.online ?? 0;
  const max = players.max ?? 20;
  const list = players.list ?? [];

  el.playersCount.textContent = `${online} / ${max}`;

  const percent = max > 0 ? (online / max) * 100 : 0;
  el.playersBar.style.width = `${percent}%`;

  const names = list.map(p => p.name_clean || p.name_raw || p.name).join(",");
  if (names === lastRenderedPlayers.join(",")) return;

  lastRenderedPlayers = list.map(p => p.name_clean || p.name_raw || p.name);

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
    img.alt = p.name_clean || p.name_raw || "player";
    img.loading = "lazy";

    setHeadWithFallback(img, p.uuid);

    const span = document.createElement("span");
    span.textContent = p.name_clean || p.name_raw || "unknown";

    div.appendChild(img);
    div.appendChild(span);

    el.playersList.appendChild(div);
  });
}

/* =========================
   MOTD (NUEVA API STRING HTML)
========================= */

function renderMOTD(motd) {
  if (!motd) return;

  if (typeof motd.html === "string") {
    el.motd.innerHTML = motd.html;
    return;
  }

  if (Array.isArray(motd.html)) {
    el.motd.innerHTML = motd.html.join("<br>");
    return;
  }

  if (typeof motd.clean === "string") {
    el.motd.textContent = motd.clean;
    return;
  }

  if (Array.isArray(motd.clean)) {
    el.motd.innerHTML = motd.clean.join("<br>");
  }
}

/* =========================
   PING
========================= */

function renderPing(data) {
  const ping = data?.ping;
  if (ping == null) return;

  el.ping.textContent = `${ping} ms`;
  lastPing = ping;
}

/* =========================
   GRAPH
========================= */

function renderGraph(history) {
  if (!ctx || !el.canvas) return;

  const w = el.canvas.width = el.canvas.offsetWidth;
  const h = el.canvas.height = 70;

  ctx.clearRect(0, 0, w, h);

  if (!history || history.length < 2) return;

  const max = Math.max(...history);
  const min = Math.min(...history);

  ctx.beginPath();

  history.forEach((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;

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
  el.lastUpdate.textContent = new Date(ts).toLocaleTimeString();
}

/* =========================
   LOOP
========================= */

fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs);
