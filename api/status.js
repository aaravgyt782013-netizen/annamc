const { send, method } = require("../lib/server");

const TARGETS = {
  proxy: "sg-4.madflex.shop:19139",
  lifesteal: "sg-3.madflex.shop:19132",
  practice: "sg-1.madflex.shop:19138"
};

const emptyServer = () => ({ online: false, playersOnline: 0, maxPlayers: 0 });
const empty = () => ({
  configured: true,
  stale: true,
  updatedAt: null,
  network: { online: false, playersOnline: 0, maxPlayers: 0 },
  proxy: emptyServer(),
  servers: { lifesteal: emptyServer(), practice: emptyServer() }
});

async function query(address) {
  const url = "https://api.mcstatus.io/v2/status/java/" + encodeURIComponent(address) + "?query=false&timeout=5";
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6500),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Status provider returned HTTP " + response.status);
  return response.json();
}

function normalize(data) {
  const players = data && data.players || {};
  return {
    online: data && data.online === true,
    playersOnline: Number.isFinite(Number(players.online)) ? Number(players.online) : 0,
    maxPlayers: Number.isFinite(Number(players.max)) ? Number(players.max) : 0
  };
}

module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;
  try {
    const entries = await Promise.all(Object.entries(TARGETS).map(async ([key, address]) => {
      try { return [key, normalize(await query(address)), true]; }
      catch (error) {
        console.error("Minecraft status lookup failed for", key, error && error.name || "Error");
        return [key, emptyServer(), false];
      }
    }));
    const results = Object.fromEntries(entries.map(([key, value]) => [key, value]));
    const proxyAvailable = results.proxy[2];
    const lifeAvailable = results.lifesteal[2];
    const practiceAvailable = results.practice[2];
    if (!proxyAvailable && !lifeAvailable && !practiceAvailable) {
      return send(res, 502, { ...empty(), unavailable: true, reason: "status_sources_unreachable" });
    }
    const proxy = results.proxy[1];
    const servers = { lifesteal: results.lifesteal[1], practice: results.practice[1] };
    // Network count is reported by the public Velocity proxy. Backend cards remain separately queried.
    return send(res, 200, {
      configured: true,
      stale: false,
      updatedAt: new Date().toISOString(),
      network: proxyAvailable
        ? { online: proxy.online, playersOnline: proxy.playersOnline, maxPlayers: proxy.maxPlayers }
        : { online: false, playersOnline: 0, maxPlayers: 0 },
      proxy,
      proxyAddress: TARGETS.proxy,
      servers,
      availability: { proxy: proxyAvailable, lifesteal: lifeAvailable, practice: practiceAvailable },
      source: "mcstatus.io"
    });
  } catch (error) {
    console.error("Minecraft status fetch failed:", error && error.name || "Error");
    return send(res, 502, { ...empty(), unavailable: true, reason: "status_sources_unreachable" });
  }
};
