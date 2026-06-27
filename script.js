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
  lastUpdate: document.getElementById("last-update")
};

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
  renderPing(data);
  renderLastUpdate(data.lastUpdate);
}

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
  el.icon.src = "";
}

function renderVersion(server) {
  el.version.textContent = server?.version?.name_clean || server?.version || "Unknown";
}

function renderIcon(server) {
  if (server?.icon) {
    el.icon.src = server.icon;
  }
}

function renderPlayers(players) {
  if (!players) return;
  const online = players.online ?? 0;
  const max = players.max ?? 20;
  const list = players.list ?? [];

  el.playersCount.textContent = `${online} / ${max}`;
  el.playersBar.style.width = `${max ? Math.round((online / max) * 100) : 0}%`;

  el.playersList.innerHTML = ""; // limpiar

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
  // La API devuelve .html como string
  if (typeof motd.html === "string") {
    el.motd.innerHTML = motd.html;
  } else if (motd.clean) {
    el.motd.textContent = motd.clean;
  }
}

function renderPing(data) {
  const ping = data?.ping != null ? data.ping : "--";
  el.ping.textContent = `${ping} ms`;
}

function renderLastUpdate(ts) {
  if (!ts) return;
  el.lastUpdate.textContent = new Date(ts).toLocaleString('es-ES');
}

// Inicial y refresco
fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs || 30000);
