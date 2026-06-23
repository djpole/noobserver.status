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

  indicator: document.getElementById("ping-indicator"),
  state: document.getElementById("ping-state"),

  lastUpdate: document.getElementById("last-update"),
  canvas: document.getElementById("ping-chart")
};

let lastPlayers = [];

function fetchData() {
  fetch(CONFIG.endpoint)
    .then(r => r.json())
    .then(render)
    .catch(() => setOffline());
}

function render(data) {
  const s = data.server;
  if (!s) return setOffline();

  setOnline();

  el.version.textContent = s.version?.name_clean || "Unknown";

  if (s.icon) el.icon.src = s.icon;

  renderPlayers(s.players);
  renderPing(data.ping);
  renderPingBar(data.ping);

  el.motd.innerHTML = s.motd?.clean || "";
  el.lastUpdate.textContent = new Date(data.lastUpdate).toLocaleTimeString();
}

function setOnline() {
  el.status.textContent = "ONLINE";
  el.status.className = "status online";
}

function setOffline() {
  el.status.textContent = "OFFLINE";
  el.status.className = "status offline";

  el.playersList.innerHTML = "";
}

function renderPlayers(p) {
  if (!p) return;

  el.playersCount.textContent = `${p.online} / ${p.max}`;

  el.playersList.innerHTML = "";

  (p.list || []).forEach(pl => {
    const div = document.createElement("div");
    div.textContent = pl.name;

    const img = document.createElement("img");
    img.src = `https://mc-heads.net/avatar/${pl.uuid}/40`;

    div.prepend(img);
    el.playersList.appendChild(div);
  });
}

function renderPing(ping) {
  el.ping.textContent = ping + " ms";
}

function renderPingBar(ping) {
  const bar = el.indicator;
  const state = el.state;

  if (ping == null) return;

  const clamped = Math.min(ping, 300);
  const percent = (clamped / 300) * 100;

  bar.style.left = percent + "%";

  let label = "";

  if (ping <= 30) label = "Excelente";
  else if (ping <= 60) label = "Bueno";
  else if (ping <= 100) label = "Aceptable";
  else if (ping <= 150) label = "Pobre";
  else if (ping <= 250) label = "Malo";
  else label = "Injugable";

  state.textContent = label;
}

fetchData();
setInterval(fetchData, CONFIG.refreshIntervalMs);
