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

  el.playersList.innerHTML = "";

  if (!list.length) {
    el.playersList.innerHTML = `<div class="empty">No hay jugadores conectados</div>`;
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

    // 🔥 PIPELINE DE HEADS (multi-provider real)

    const sources = [
      `https://minotar.net/helm/${name}/40.png`,          // 1 - BEST
      uuid ? `https://crafthead.net/avatar/${uuid}` : null, // 2
      uuid ? `https://crafatar.com/avatars/${uuid}?size=40&overlay` : null, // 3 legacy
      "assets/default-head.png"                             // 4 fallback
    ].filter(Boolean);

    let index = 0;

    const tryNext = () => {
      if (index >= sources.length) return;
      img.src = sources[index++];
    };

    img.onerror = tryNext;

    tryNext();

    const span = document.createElement("span");
    span.textContent = name;

    div.appendChild(img);
    div.appendChild(span);

    el.playersList.appendChild(div);
  });
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
