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
   HEAD SYSTEM (NO TOCAR)
========================= */

const headCache = new Map();

function getHeadUrls(uuid) {
  return [
    `https://mc-heads.net/avatar/${uuid}/40`,
    `https://minotar.net/helm/${uuid}/40`,
    `https://visage.surgeplay.com/head/40/${uuid}`
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
  if (!data) return setOffline();

  const server = data.server;
  if (!server) return setOffline();

  // ONLINE SI O SI si API responde
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
  el.status.textContent = server?.online ? "ONLINE" : "OFFLINE";
  el.status.className = server?.online ? "status online" : "status offline";
}

function setOffline() {
  el.status.textContent = "OFFLINE";
  el.status.className = "status offline";

  el.playersCount.textContent = "0 / 0";
  el.playersBar.style.width = "0%";
  el.playersList.replaceChildren();
}

/* =========================
   VERSION
========================= */

function renderVersion(server) {
  const v =
    server?.version?.name_clean ||
    server?.version?.name_raw ||
    "Unknown";

  el.version.textContent = v;
}

/* =========================
   ICON
========================= */

function renderIcon(server) {
  if (server?.icon) el.icon.src = server.icon;
}

/* =========================
   PLAYERS
========================= */

function renderPlayers(players) {
  if (!players) return;

  const online = players.online ?? 0;
  const max = players.max ?? 0;
  const list = players.list ?? [];

  el.playersCount.textContent = `${online} / ${max}`;

  const percent = max ? (online / max) * 100 : 0;
  el.playersBar.style.width = `${percent}%`;

  const names = list.map(p => p.name).join(",");
  if (names === lastRenderedPlayers.join(",")) return;

  lastRenderedPlayers = list.map(p => p.name);

  el.playersList.replaceChildren();

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No hay jugadores conectados";
    el.playersList.appendChild(empty);
    return;
  }

  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "player";

    const img = document.createElement("img");
    img.alt = p.name;
    img.loading = "lazy";

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
    (Array.isArray(motd.html) ? motd.html.join("<br>") : "") ||
    (Array.isArray(motd.clean) ? motd.clean.join("<br>") : "") ||
    (typeof motd.raw === "string" ? motd.raw : "");
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

  if (!Array.isArray(history) || history.length < 2) return;

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
