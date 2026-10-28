const {send,method}=require("../lib/server");

const empty = () => ({
  configured: false,
  stale: true,
  updatedAt: null,
  network: { online: false, playersOnline: 0, maxPlayers: 0 },
  servers: {
    lifesteal: { online: false, playersOnline: 0, maxPlayers: 0 },
    practice: { online: false, playersOnline: 0, maxPlayers: 0 }
  }
});

function normalizeServer(raw) {
  const players = raw && raw.players || {};
  return {
    online: !!(raw && raw.online === true),
    playersOnline: Number.isFinite(Number(players.online)) ? Number(players.online) : 0,
    maxPlayers: Number.isFinite(Number(players.max)) ? Number(players.max) : 0
  };
}

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;

  // Set VELOSTAT_URL in Vercel if your host exposes Velostat at a different URL.
  const url = process.env.VELOSTAT_URL || "https://sg-4.madflex.shop:8080/status";
  const headers = {};
  // Optional server-side header for a hosting-provider/API gateway, never exposed to browser code.
  if (process.env.VELOSTAT_AUTH_HEADER_NAME && process.env.VELOSTAT_AUTH_HEADER_VALUE) {
    headers[process.env.VELOSTAT_AUTH_HEADER_NAME] = process.env.VELOSTAT_AUTH_HEADER_VALUE;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(7000),
      cache: "no-store"
    });
    if (!response.ok) {
      console.error("Velostat upstream returned HTTP", response.status);
      return send(res, 502, { ...empty(), unavailable: true, reason: "upstream_http_error" });
    }

    const data = await response.json();
    if (data && data.error) {
      console.error("Velostat upstream returned an API error");
      return send(res, 502, { ...empty(), unavailable: true, reason: "upstream_authorization_required" });
    }

    const life = normalizeServer(data.lifesteal);
    const practice = normalizeServer(data.practice);
    const validLife = !!data.lifesteal;
    const validPractice = !!data.practice;
    if (!validLife && !validPractice) {
      return send(res, 502, { ...empty(), unavailable: true, reason: "expected_servers_missing" });
    }

    const servers = { lifesteal: life, practice };
    const list = Object.values(servers);
    const online = list.some(server => server.online);
    const playersOnline = list.reduce((sum, server) => sum + server.playersOnline, 0);
    const maxPlayers = list.reduce((sum, server) => sum + server.maxPlayers, 0);
    const newestTimestamp = [data.lifesteal && data.lifesteal.updated_at, data.practice && data.practice.updated_at]
      .filter(value => Number.isFinite(Number(value)))
      .map(Number)
      .sort((a, b) => b - a)[0];

    return send(res, 200, {
      configured: true,
      stale: false,
      updatedAt: newestTimestamp ? new Date(newestTimestamp).toISOString() : new Date().toISOString(),
      network: { online, playersOnline, maxPlayers },
      servers
    });
  } catch (error) {
    console.error("Velostat status fetch failed:", error && error.name || "Error");
    return send(res, 502, { ...empty(), unavailable: true, reason: "velostat_unreachable" });
  }
};
