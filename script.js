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
   HEAD SYSTEM (FIXED + CLEAN)
========================= */

const headCache = new Map();

function getHeadUrls(uuid) {
  return [
    `https://mc-heads.net/avatar/${uuid}/40`,
    `https://minotar.net/helm/${uuid}/40`,
    `https://visage.surgeplay.com/head/40/${uuid}`,
    `assets/default-head.png`
  ];
}

function setHeadWithFallback(img, uuid, index = 0) {
  if (!uuid) {
    img.src = "assets/default-head.png";
    return;
  }

  const cache = headCache.get(uuid);
  if (cache) {
    img.src = cache;
    return;
  }

  const urls = getHeadUrls(uuid);

  if (index >= urls.length) {
    img.src = "assets/default-head.png";
    return;
  }

  const url = urls[index];

  img.onload = () => {
    headCache.set(uuid, url);
  };

  img.onerror = () => {
    setHeadWithFallback(img, uuid, index + 1);
  };

  img.src = url;
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
    console.error(e);
    setOffline();
  }
}

/* =========================
   RENDER
========================= */

function render(data) {
  const server = data?.server;
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
  el.playersBar.style.width = `${max ? (online / max) * 100 : 0}%`;

  const names = list.map(p => p.name).join(",");
  if (names === lastRenderedPlayers.join(",")) return;

  lastRenderedPlayers = list.map(p => p.name);

  el.playersList.replaceChildren();

  if (!list.length) {
    el.playersList.innerHTML =
      `<div class="empty">No hay jugadores conectados</div>`;
    return;
  }

  list.slice(0, CONFIG.maxPlayers).forEach(p => {
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
   MOTD (FIXED)
========================= */

function renderMOTD(motd) {
  if (!motd) {
    el.motd.textContent = "";
    return;
  }

  const html = motd.html;

  // caso string directo
  if (typeof html === "string") {
    el.motd.innerHTML = html;
    return;
  }

  // caso array
  if (Array.isArray(html)) {
    el.motd.innerHTML = html.join("<br>");
    return;
  }

  // fallback clean string
  if (typeof motd.clean === "string") {
    el.motd.textContent = motd.clean;
    return;
  }

  if (Array.isArray(motd.clean)) {
    el.motd.textContent = motd.clean.join("\n");
    return;
  }

  el.motd.textContent = "";
}

/* =========================
   PING (FIXED)
========================= */

function renderPing(data) {
  const ping = data?.ping;

  if (ping == null || isNaN(ping)) {
    el.ping.textContent = "-- ms";
    return;
  }

  el.ping.textContent = `${ping} ms`;

  if (typeof ping === "number") {
    lastPing = ping;
  }
}

/* =========================
   LAST UPDATE (FIXED)
========================= */

function renderLastUpdate(lastUpdate) {
  if (!lastUpdate) {
    el.lastUpdate.textContent = "--";
    return;
  }

  const date = new Date(lastUpdate);

  if (isNaN(date.getTime())) {
    el.lastUpdate.textContent = "--";
    return;
  }

  el.lastUpdate.textContent = date.toLocaleTimeString();
}

/* =========================
   GRAPH
========================= */

function renderGraph(history) {
  if (!ctx || !el.canvas) return;

  const w = el.canvas.width = el.canvas.offsetWidth;
  const h = el.canvas.height = 70;

  ctx.clearRect(0, 0, w, h);

  if (!history?.length) return;

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
   LOOP
========================= */

fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs);
