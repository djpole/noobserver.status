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
    setOffline();
  }
}

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
  el.playersList.replaceChildren();
}

function renderVersion(server) {
  el.version.textContent =
    server?.version?.name_clean || "Unknown";
}

function renderIcon(server) {
  el.icon.src = server?.icon || "";
}

function renderPlayers(players) {
  if (!players) return;

  const online = players.online ?? 0;
  const max = players.max ?? 20;
  const list = players.list ?? [];

  el.playersCount.textContent = `${online} / ${max}`;
  el.playersBar.style.width = `${max ? (online / max) * 100 : 0}%`;

  el.playersList.replaceChildren();

  if (!list.length) {
    el.playersList.innerHTML = `<div class="empty">Sin jugadores conectados</div>`;
    return;
  }

  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "player";

    const img = document.createElement("img");
    img.src = `https://mc-heads.net/avatar/${p.uuid}/40`;

    const span = document.createElement("span");
    span.textContent = p.name_raw;

    div.appendChild(img);
    div.appendChild(span);

    el.playersList.appendChild(div);
  });
}

function renderMOTD(motd) {
  if (!motd) return;

  el.motd.innerHTML =
    motd.html?.join("<br>") ||
    motd.clean?.join("<br>") ||
    "";
}

function renderPing(data) {
  el.ping.textContent =
    data?.ping != null ? `${data.ping} ms` : "";
}

function renderLastUpdate(ts) {
  if (!ts) return;
  el.lastUpdate.textContent = new Date(ts).toLocaleString();
}

fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs);
