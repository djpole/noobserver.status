const NOOBSERVER_CONFIG = {
  // Endpoint Node-RED (cache del servidor Minecraft)
  endpoint: "https://domotica.djpole.es/noobserver",

  // Frecuencia de actualización de la UI (NO afecta a la API original)
  refreshIntervalMs: 15000,

  // Tamaño del histórico de ping (gráfica)
  pingHistorySize: 60,

  // Máximo de jugadores visibles
  maxPlayers: 20,

  // Debug mode (false en producción)
  debug: false
};
