const crypto = require("node:crypto");
const { Pool } = require("pg");

let pool;
function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true }, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000 });
  return pool;
}
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
function method(req, res, allowed) {
  if (!allowed.includes(req.method)) { res.setHeader("Allow", allowed.join(", ")); send(res, 405, { error: "Method not allowed" }); return false; }
  return true;
}
function secret() {
  const value = process.env.ANNA_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("ANNA_SESSION_SECRET must contain at least 32 characters");
  return value;
}
function sign(value) { return crypto.createHmac("sha256", secret()).update(value).digest("base64url"); }
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || "")); const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function cookie(req, name) {
  const raw = req.headers.cookie || "";
  const item = raw.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}
function sessionToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return body + "." + sign(body);
}
function readSession(req) {
  const token = cookie(req, "anna_session");
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra || !safeEqual(sign(body), signature)) return null;
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!value.exp || value.exp < Date.now() || !value.email || !value.csrf) return null;
    return value;
  } catch { return null; }
}
function setSession(res, payload) {
  const value = sessionToken(payload);
  res.setHeader("Set-Cookie", "anna_session=" + encodeURIComponent(value) + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800");
}
function clearSession(res) {
  res.setHeader("Set-Cookie", "anna_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0");
}
async function requireAdmin(req, res, { csrf = true } = {}) {
  const user = readSession(req);
  if (!user) { send(res, 401, { error: "Please sign in again" }); return null; }
  if (csrf && !safeEqual(req.headers["x-csrf-token"], user.csrf)) { send(res, 403, { error: "Invalid CSRF token" }); return null; }
  try {
    const result = await db().query("SELECT role, active FROM staff_users WHERE lower(email)=lower($1)", [user.email]);
    const row = result.rows[0];
    const isOwner = user.email.toLowerCase() === String(process.env.ANNA_ADMIN_EMAIL || "").toLowerCase();
    if (!isOwner && (!row || !row.active)) { send(res, 403, { error: "Account is not authorized" }); return null; }
    user.role = isOwner ? "owner" : row.role;
    return user;
  } catch (e) { send(res, 503, { error: "Database unavailable or schema not installed" }); return null; }
}
function requireRole(user, roles, res) {
  if (!roles.includes(user.role)) { send(res, 403, { error: "Insufficient permission" }); return false; }
  return true;
}
async function audit(user, action, entityType, entityId, details = {}) {
  await db().query("INSERT INTO audit_logs(actor_email, action, entity_type, entity_id, details) VALUES($1,$2,$3,$4,$5::jsonb)", [user.email, action, entityType, entityId == null ? null : String(entityId), JSON.stringify(details)]);
}
function validEmail(v) { return typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function parseBody(req) { return req.body && typeof req.body === "object" ? req.body : {}; }
module.exports = { db, send, method, safeEqual, setSession, clearSession, readSession, requireAdmin, requireRole, audit, validEmail, parseBody };
