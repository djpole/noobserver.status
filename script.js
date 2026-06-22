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
   FETCH
========================= */
async function fetchData() {
  try {
    const res = await fetch(CONFIG.endpoint, { cache: "no-store" });

    if (!res.ok) throw new Error("HTTP error");

    const data = await res.json();
    render(data);

  } catch (err) {
    console.error("Fetch error:", err);
    setOffline();
  }
}

/* =========================
   MAIN RENDER
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
  el.playersList.innerHTML = "";
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
   PLAYERS (HEAD FIX REAL)
========================= */
function renderPlayers(players) {
  if (!players) return;

  const online = players.online ?? 0;
  const max = players.max ?? 20;
  const list = players.list ?? [];

  el.playersCount.textContent = `${online} / ${max}`;

  const percent = max > 0 ? (online / max) * 100 : 0;
  el.playersBar.style.width = `${percent}%`;

  const names = list.map(p => p.name).join(",");
  if (names === lastRenderedPlayers.join(",")) return;

  lastRenderedPlayers = list.map(p => p.name);

  el.playersList.innerHTML = "";

  if (!list.length) {
    el.playersList.innerHTML =
      `<div class="empty">No hay jugadores conectados</div>`;
    return;
  }

  list.slice(0, CONFIG.maxPlayers).forEach(p => {
    const uuid = p.uuid;
    const name = p.name;

    const div = document.createElement("div");
    div.className = "player";

    const img = document.createElement("img");
    img.alt = name;
    img.loading = "lazy";

    // 🔥 PRIORIDAD 1: username (MUCHO MÁS estable)
    img.src = `https://mc-heads.net/avatar/${name}/40`;

    // 🔥 fallback 2: UUID si username falla
    img.onerror = () => {
      if (uuid) {
        img.src = `https://crafthead.net/avatar/${uuid}`;
      } else {
        img.src = "assets/default-head.png";
      }

      // fallback final absoluto
      img.onerror = () => {
        img.src = "assets/default-head.png";
      };
    };

    const span = document.createElement("span");
    span.textContent = name;

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
    (motd.html?.join("<br>")) ||
    (motd.clean?.join("<br>")) ||
    "";
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
