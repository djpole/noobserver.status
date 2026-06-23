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

/* =========================
   HEADS (SIN CAMBIOS)
========================= */

const headCache = new Map();

function getHead(uuid) {
  return [
    `https://mc-heads.net/avatar/${uuid}/40`,
    `https://minotar.net/helm/${uuid}/40`
  ];
}

function setHead(img, uuid, i = 0) {
  if (!uuid) return (img.src = "assets/default-head.png");

  if (headCache.has(uuid)) {
    img.src = headCache.get(uuid);
    return;
  }

  const urls = getHead(uuid);
  if (i >= urls.length) return (img.src = "assets/default-head.png");

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
   MINECRAFT MOTD PARSER (FIX REAL)
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
   CORE RENDER
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
  renderGraph(data.pingHistory || []);
  renderLastUpdate(data.lastUpdate);
}

/* =========================
   STATUS
========================= */

function setOnline(server) {
  el.status.textContent = server.online ? "ONLINE" : "OFFLINE";
  el.status.className = server.online ? "status online" : "status offline";
}

function setOffline() {
  el.status.textContent = "OFFLINE";
  el.status.className = "status offline";
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

  el.playersCount.textContent =
    `${players.online ?? 0} / ${players.max ?? 0}`;

  if (list.map(p => p.name).join() === lastRenderedPlayers.join()) return;

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
   MOTD (FIX FINAL)
========================= */

function renderMOTD(motd) {
  const raw =
    motd?.html ||
    motd?.clean ||
    motd?.raw ||
    "";

  el.motd.innerHTML = parseMC(
    Array.isArray(raw) ? raw.join("<br>") : raw
  );
}

/* =========================
   PING + STATE (RESTAURADO)
========================= */

function getPingState(p) {
  if (p <= 30) return ["Excelente", "#2ecc71"];
  if (p <= 60) return ["Bueno", "#27ae60"];
  if (p <= 100) return ["Aceptable", "#f1c40f"];
  if (p <= 150) return ["Pobre", "#f39c12"];
  if (p <= 250) return ["Malo", "#e74c3c"];
  return ["Injugable", "#2c3e50"];
}

function renderPing(ping) {
  if (ping == null) return;

  el.ping.textContent = `${ping} ms`;

  const [label, color] = getPingState(ping);

  let state = document.getElementById("ping-state");
  if (!state) {
    state = document.createElement("div");
    state.id = "ping-state";
    el.ping.parentElement.appendChild(state);
  }

  state.textContent = label;
  state.style.color = color;
}

/* =========================
   GRAPH (OK)
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
