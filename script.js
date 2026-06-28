const CONFIG = NOOBSERVER_CONFIG;

// ----------------------------------------------------
// ELEMENTOS UI
// ----------------------------------------------------
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
  pingArrow: document.getElementById("ping-arrow"),
  pingStatusText: document.getElementById("ping-status-text")
};

// ----------------------------------------------------
// PING STATE (nuevo)
// ----------------------------------------------------
let lastAcceptedPing = null;
let pingHistory = [];

// ----------------------------------------------------
// FETCH LOOP (datos servidor)
// ----------------------------------------------------
async function fetchData() {
  try {
    const res = await fetch(CONFIG.endpoint, {
      cache: "no-store"
    });

    if (!res.ok) throw new Error("HTTP error");

    const data = await res.json();
    render(data);

  } catch (err) {
    console.error(err);
    setOffline();
  }
}

// ----------------------------------------------------
// RENDER PRINCIPAL
// ----------------------------------------------------
function render(data) {

  const server = data?.server;

  if (!server || !server.online) {
    setOffline();
    return;
  }

  setOnline();
  renderVersion(server);
  renderIcon(server);
  renderPlayers(server.players);
  renderMOTD(server.motd);
  renderLastUpdate(data.lastUpdate);

  measurePing();
}

// ----------------------------------------------------
// ONLINE / OFFLINE
// ----------------------------------------------------
function setOnline() {
  el.status.textContent = "ONLINE";
  el.status.className = "status online";
}

function setOffline() {

  el.status.textContent = "OFFLINE";
  el.status.className = "status offline";

  el.playersCount.textContent = "0 / 20";
  el.playersBar.style.width = "0%";

  el.playersList.innerHTML =
    `<div class="empty">Sin jugadores conectados</div>`;

  el.motd.innerHTML = "";

  el.version.textContent = "-";

  el.icon.removeAttribute("src");

  el.ping.textContent = "-- ms";

  el.pingArrow.style.left = "2%";

  el.pingStatusText.textContent =
    "Estado de tu conexión: Sin datos";

  el.pingStatusText.className =
    "ping-status-text";
}

// ----------------------------------------------------
// VERSION
// ----------------------------------------------------
function renderVersion(server) {
  el.version.textContent =
    server?.version?.name_clean ||
    "Unknown";
}

// ----------------------------------------------------
// ICONO
// ----------------------------------------------------
function renderIcon(server) {
  if (server?.icon) {
    el.icon.src = server.icon;
  } else {
    el.icon.removeAttribute("src");
  }
}

// ----------------------------------------------------
// JUGADORES
// ----------------------------------------------------
function renderPlayers(players) {

  if (!players) return;

  const online = players.online ?? 0;
  const max = players.max ?? 20;

  const list =
    Array.isArray(players.list)
      ? players.list
      : [];

  el.playersCount.textContent =
    `${online} / ${max}`;

  el.playersBar.style.width =
    `${max ? Math.round((online / max) * 100) : 0}%`;

  el.playersList.innerHTML = "";

  if (!list.length) {
    el.playersList.innerHTML =
      `<div class="empty">Sin jugadores conectados</div>`;
    return;
  }

  list.forEach(player => {

    const div = document.createElement("div");
    div.className = "player";

    const img = document.createElement("img");
    img.src =
      `https://mc-heads.net/avatar/${player.uuid || player.name_raw}/40`;

    const span = document.createElement("span");
    span.textContent =
      player.name_raw || player.name_clean;

    div.appendChild(img);
    div.appendChild(span);

    el.playersList.appendChild(div);
  });
}

// ----------------------------------------------------
// MOTD
// ----------------------------------------------------
function renderMOTD(motd) {

  if (!motd) return;

  if (typeof motd.html === "string") {
    el.motd.innerHTML = motd.html;
  } else if (motd.clean) {
    el.motd.textContent = motd.clean;
  }
}

// ----------------------------------------------------
// PING MEJORADO
// ----------------------------------------------------
async function measurePing() {

  // 1. No medir en background
  if (document.hidden) return;

  try {

    const t0 = performance.now();

    await fetch(CONFIG.endpoint, {
      cache: "no-store"
    });

    const t1 = performance.now();

    const ping = t1 - t0;

    // 2. Filtrado de picos absurdos
    if (lastAcceptedPing !== null) {

      const ratio = ping / lastAcceptedPing;
      const delta = ping - lastAcceptedPing;

      if (ratio > 3 && delta > 100) {
        return; // spike ignorado
      }

    }

    lastAcceptedPing = ping;

    // 3. Historial corto (mediana 3)
    pingHistory.push(ping);

    if (pingHistory.length > 3) {
      pingHistory.shift();
    }

    const sorted = [...pingHistory].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    renderPing(median);

  } catch (e) {
    console.error("Ping error", e);
  }
}

// ----------------------------------------------------
// RENDER PING
// ----------------------------------------------------
function renderPing(ping) {

  el.ping.textContent =
    `${ping.toFixed(1)} ms`;

  let position = 0;
  let statusText = "Injugable";

  if (ping <= 30) {
    position = (ping / 30) * 20;
    statusText = "Excelente";
  } else if (ping <= 60) {
    position = 20 + ((ping - 30) / 30) * 20;
    statusText = "Bueno";
  } else if (ping <= 150) {
    position = 40 + ((ping - 60) / 90) * 20;
    statusText = "Aceptable";
  } else if (ping <= 250) {
    position = 60 + ((ping - 150) / 100) * 20;
    statusText = "Malo";
  } else {
    position = 80 + Math.min(((ping - 250) / 200) * 20, 20);
    statusText = "Injugable";
  }

  position = Math.max(2, Math.min(position, 98));

  el.pingArrow.style.left = `${position}%`;

  el.pingStatusText.textContent =
    `Estado de tu conexión: ${statusText}`;

  el.pingStatusText.className =
    "ping-status-text";
}

// ----------------------------------------------------
// ÚLTIMA ACTUALIZACIÓN
// ----------------------------------------------------
function renderLastUpdate(ts) {
  if (!ts) return;

  el.lastUpdate.textContent =
    new Date(ts).toLocaleString("es-ES");
}

// ----------------------------------------------------
// VISIBILITY FIX (nuevo)
// ----------------------------------------------------
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    measurePing();
  }
});

// ----------------------------------------------------
// INIT
// ----------------------------------------------------
fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs || 15000);
