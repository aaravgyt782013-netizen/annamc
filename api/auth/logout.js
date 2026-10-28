const { send, method, readSession, safeEqual, clearSession } = require("../../lib/server");
module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  const user = readSession(req);
  if (user && !safeEqual(req.headers["x-csrf-token"], user.csrf)) return send(res, 403, { error: "Invalid CSRF token" });
  clearSession(res);
  return send(res, 200, { ok: true });
};
