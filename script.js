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
  canvas: document.getElementById("ping-chart"),

  pingArrow: null
};

const ctx = el.canvas?.getContext("2d");

let lastRenderedPlayers = [];
let lastPing = null;

/* =========================
   UTIL: MINECRAFT COLORS
========================= */
function parseMC(text) {
  if (!text) return "";

  const colors = {
    a: "#55ff55",
    b: "#55ffff",
    c: "#ff5555",
    d: "#ff55ff",
    e: "#ffff55",
    f: "#ffffff",
    0: "#000000",
    1: "#0000aa",
    2: "#00aa00",
    3: "#00aaaa",
    4: "#aa0000",
    5: "#aa00aa",
    6: "#ffaa00",
    7: "#aaaaaa",
    8: "#555555",
    9: "#5555ff"
  };

  return text
    .replace(/§[0-9a-f]/gi, m => {
      const c = m[1].toLowerCase();
      return `</span><span style="color:${colors[c] || "#fff"}">`;
    })
    .replace(/^/, "<span>")
    .concat("</span>");
}

/* =========================
   HEADS (SIN CAMBIOS)
========================= */
const headCache = new Map();

function getHeadUrls(uuid) {
  return [
    `https://mc-heads.net/avatar/${uuid}/40`,
    `https://minotar.net/helm/${uuid}/40`,
    `https://visage.surgeplay.com/head/40/${uuid}`
  ];
}

function setHead(img, uuid, i = 0) {
  if (!uuid) {
    img.src = "assets/default-head.png";
    return;
  }

  if (headCache.has(uuid)) {
    img.src = headCache.get(uuid);
    return;
  }

  const urls = getHeadUrls(uuid);
  if (i >= urls.length) {
    img.src = "assets/default-head.png";
    return;
  }

  const url = urls[i];
  const test = new Image();

  test.onload = () => {
    headCache.set(uuid, url);
    img.src = url;
  };

  test.onerror = () => setHead(img, uuid, i + 1);

  test.src = url;
}

/* =========================
   FETCH
========================= */
async function fetchData() {
  try {
    const res = await fetch(CONFIG.endpoint, { cache: "no-store" });
    const data = await res.json();
    render(data);
  } catch (e) {
    console.error(e);
    setOffline();
  }
}

/* =========================
   RENDER CORE
========================= */
function render(data) {
  const server = data?.server;
  if (!server) return setOffline();

  setOnline(server);

  renderVersion(server);
  renderIcon(server);
  renderPlayers(server.players);
  renderMOTD(server.motd);
  renderPing(data.ping);
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

  el.playersCount.textContent = "0 / 0";
  el.playersBar.style.width = "0%";
  el.playersList.replaceChildren();
}

/* =========================
   VERSION
========================= */
function renderVersion(server) {
  el.version.textContent =
    server?.version?.name_clean ||
    server?.version?.name_raw ||
    "Unknown";
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

  const list = players.list || [];
  const online = players.online ?? 0;
  const max = players.max ?? 0;

  el.playersCount.textContent = `${online} / ${max}`;

  const names = list.map(p => p.name).join(",");
  if (names === lastRenderedPlayers.join(",")) return;

  lastRenderedPlayers = list.map(p => p.name);

  el.playersList.replaceChildren();

  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "player";

    const img = document.createElement("img");
    const span = document.createElement("span");

    span.textContent = p.name;

    setHead(img, p.uuid);

    div.appendChild(img);
    div.appendChild(span);
    el.playersList.appendChild(div);
  });
}

/* =========================
   MOTD
========================= */
function renderMOTD(motd) {
  const raw = motd?.html || motd?.clean || motd?.raw || "";
  el.motd.innerHTML = parseMC(Array.isArray(raw) ? raw.join("<br>") : raw);
}

/* =========================
   PING + STATE + BAR
========================= */
function getPingState(ping) {
  if (ping <= 30) return ["Excelente", "#2ecc71"];
  if (ping <= 60) return ["Bueno", "#27ae60"];
  if (ping <= 100) return ["Aceptable", "#f1c40f"];
  if (ping <= 150) return ["Pobre", "#f39c12"];
  if (ping <= 250) return ["Malo", "#e74c3c"];
  return ["Injugable", "#2c3e50"];
}

function renderPing(ping) {
  if (ping == null) return;

  el.ping.textContent = `${ping} ms`;
  lastPing = ping;

  const [label, color] = getPingState(ping);

  let state = document.getElementById("ping-state");
  if (!state) {
    state = document.createElement("div");
    state.id = "ping-state";
    el.ping.parentElement.appendChild(state);
  }

  state.textContent = label;
  state.style.color = color;

  const arrow = document.getElementById("ping-arrow");
  if (arrow) {
    const pct = Math.min(ping / 300, 1) * 100;
    arrow.style.left = pct + "%";
  }
}

/* =========================
   GRAPH
========================= */
function renderGraph(history) {
  if (!ctx) return;

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

  const d = new Date(ts);
  el.lastUpdate.textContent = d.toLocaleTimeString();
}

/* =========================
   LOOP
========================= */
fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs);
