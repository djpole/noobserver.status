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
// FETCH LOOP
// ----------------------------------------------------
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

// ----------------------------------------------------
// RENDER MAIN
// ----------------------------------------------------
function render(data) {
  const server = data?.server;
  if (!server || !server.online) {
    return setOffline();
  }
  setOnline();
  renderVersion(server);
  renderIcon(server);
  renderPlayers(server.players);
  renderMOTD(server.motd);
  renderPing(data);           // Cambiado para pasar todo el data
  renderLastUpdate(data.lastUpdate);
}

// ----------------------------------------------------
// STATUS
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
  el.playersList.innerHTML = `<div class="empty">Sin jugadores conectados</div>`;
  el.motd.innerHTML = "";
  el.version.textContent = "-";
  el.icon.removeAttribute("src");
  el.ping.textContent = "-- ms";
  el.pingStatusText.textContent = "Estado del servidor: Sin datos";
  el.pingArrow.style.left = "0%";
}

// ----------------------------------------------------
// VERSION, ICON, PLAYERS, MOTD (sin cambios)
// ----------------------------------------------------
function renderVersion(server) {
  el.version.textContent = server?.version?.name_clean || server?.version || "Unknown";
}

function renderIcon(server) {
  if (server?.icon) {
    el.icon.src = server.icon;
  } else {
    el.icon.removeAttribute("src");
  }
}

function renderPlayers(players) {
  if (!players) return;
  const online = players.online ?? 0;
  const max = players.max ?? 20;
  const list = Array.isArray(players.list) ? players.list : [];
  el.playersCount.textContent = `${online} / ${max}`;
  el.playersBar.style.width = `${max ? Math.round((online / max) * 100) : 0}%`;
  el.playersList.innerHTML = "";
  if (!list.length) {
    el.playersList.innerHTML = `<div class="empty">Sin jugadores conectados</div>`;
    return;
  }
  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "player";
    const img = document.createElement("img");
    img.src = `https://mc-heads.net/avatar/${p.uuid || p.name_raw}/40`;
    const span = document.createElement("span");
    span.textContent = p.name_raw || p.name_clean;
    div.appendChild(img);
    div.appendChild(span);
    el.playersList.appendChild(div);
  });
}

function renderMOTD(motd) {
  if (!motd) return;
  if (typeof motd.html === "string") {
    el.motd.innerHTML = motd.html;
  } else if (motd.clean) {
    el.motd.textContent = motd.clean;
  }
}

// ----------------------------------------------------
// NUEVA FUNCIÓN PING
// ----------------------------------------------------
function renderPing(data) {
  const ping = data?.ping != null ? Number(data.ping) : 0;
  
  el.ping.textContent = `${ping.toFixed(1)} ms`;

  // Determinar posición de la flecha (0% a 100%)
  let position = 0;
  let statusText = "Injugable";
  let statusClass = "terrible";

  if (ping <= 60) {
    position = (ping / 60) * 25;           // 0-25%
    statusText = "Bueno";
    statusClass = "good";
  } else if (ping <= 150) {
    position = 25 + ((ping - 60) / 90) * 25; // 25-50%
    statusText = "Aceptable";
    statusClass = "acceptable";
  } else if (ping <= 250) {
    position = 50 + ((ping - 150) / 100) * 25; // 50-75%
    statusText = "Malo";
    statusClass = "bad";
  } else {
    position = 75 + Math.min((ping - 250) / 100 * 25, 25); // 75-100%
    statusText = "Injugable";
    statusClass = "terrible";
  }

  el.pingArrow.style.left = `${Math.min(Math.max(position, 2), 98)}%`;
  el.pingStatusText.textContent = `Estado del servidor: ${statusText}`;
  el.pingStatusText.className = `ping-status-text ${statusClass}`;
}

// ----------------------------------------------------
// LAST UPDATE
// ----------------------------------------------------
function renderLastUpdate(ts) {
  if (!ts) return;
  el.lastUpdate.textContent = new Date(ts).toLocaleString("es-ES");
}

// ----------------------------------------------------
// INIT
// ----------------------------------------------------
fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs || 15000);
