const { send, method } = require("../lib/server");

const SERVERS = {
  lifesteal: "sg-3.madflex.shop:19132",
  practice: "sg-1.madflex.shop:19138"
};

const empty = () => ({
  configured: true,
  stale: true,
  updatedAt: null,
  network: { online: false, playersOnline: 0, maxPlayers: 0 },
  servers: {
    lifesteal: { online: false, playersOnline: 0, maxPlayers: 0 },
    practice: { online: false, playersOnline: 0, maxPlayers: 0 }
  }
});

function normalizeStatus(data) {
  const players = data && data.players || {};
  return {
    online: data && data.online === true,
    playersOnline: Number.isFinite(Number(players.online)) ? Number(players.online) : 0,
    maxPlayers: Number.isFinite(Number(players.max)) ? Number(players.max) : 0
  };
}

async function fetchServerStatus(address) {
  const endpoint = "https://api.mcstatus.io/v2/status/java/" + encodeURIComponent(address);
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(7000),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Public status API returned HTTP " + response.status);
  return response.json();
}

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;

  try {
    const [lifeResult, practiceResult] = await Promise.allSettled([
      fetchServerStatus(SERVERS.lifesteal),
      fetchServerStatus(SERVERS.practice)
    ]);

    const lifeData = lifeResult.status === "fulfilled" ? lifeResult.value : null;
    const practiceData = practiceResult.status === "fulfilled" ? practiceResult.value : null;

    // If neither endpoint could be queried, report unavailable instead of inventing counts.
    if (!lifeData && !practiceData) {
      console.error("Public Minecraft status API could not query either backend.");
      return send(res, 502, { ...empty(), unavailable: true, reason: "status_sources_unreachable" });
    }

    const servers = {
      lifesteal: normalizeStatus(lifeData),
      practice: normalizeStatus(practiceData)
    };
    const list = Object.values(servers);
    const playersOnline = list.reduce((sum, server) => sum + server.playersOnline, 0);
    const maxPlayers = list.reduce((sum, server) => sum + server.maxPlayers, 0);
    const updatedAt = new Date().toISOString();

    return send(res, 200, {
      configured: true,
      stale: false,
      updatedAt,
      network: {
        online: list.some(server => server.online),
        playersOnline,
        maxPlayers
      },
      servers,
      partial: !lifeData || !practiceData,
      source: "mcstatus.io"
    });
  } catch (error) {
    console.error("Public Minecraft status fetch failed:", error && error.name || "Error");
    return send(res, 502, { ...empty(), unavailable: true, reason: "status_sources_unreachable" });
  }
};
