const { send, method, readSession, requireAdmin } = require("../../lib/server");
module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;
  const session = readSession(req);
  if (!session) return send(res, 401, { authenticated: false });
  const user = await requireAdmin(req, res, { csrf: false });
  if (!user) return;
  return send(res, 200, { authenticated: true, email: user.email, role: user.role, csrf: user.csrf, expiresAt: user.exp });
};
