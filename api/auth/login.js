const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const { db, send, method, safeEqual, setSession, validEmail, parseBody } = require("../../lib/server");
module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  try {
    const body = parseBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!validEmail(email) || password.length < 1 || password.length > 200) return send(res, 400, { error: "Enter a valid email and password" });
    const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim().slice(0, 64);
    const pool = db();
    const key = crypto.createHash("sha256").update(email + "|" + ip).digest("hex");
    const attempts = await pool.query("SELECT count, locked_until FROM login_attempts WHERE attempt_key=$1", [key]);
    if (attempts.rows[0]?.locked_until && new Date(attempts.rows[0].locked_until).getTime() > Date.now()) return send(res, 429, { error: "Too many attempts. Try again later." });
    const ownerEmail = String(process.env.ANNA_ADMIN_EMAIL || "").trim().toLowerCase();
    const ownerHash = String(process.env.ANNA_ADMIN_PASSWORD_HASH || "");
    let authorized = false;
    if (email && email === ownerEmail && ownerHash.startsWith("$2")) {
      authorized = await bcrypt.compare(password, ownerHash);
    } else {
      const staff = await pool.query("SELECT password_hash, active FROM staff_users WHERE lower(email)=lower($1)", [email]);
      if (staff.rows[0]?.active && staff.rows[0]?.password_hash) authorized = await bcrypt.compare(password, staff.rows[0].password_hash);
    }
    if (!authorized) {
      await pool.query("INSERT INTO login_attempts(attempt_key,count,first_attempt,locked_until) VALUES($1,1,now(),NULL) ON CONFLICT(attempt_key) DO UPDATE SET count=CASE WHEN login_attempts.first_attempt < now()-interval '15 minutes' THEN 1 ELSE login_attempts.count+1 END, first_attempt=CASE WHEN login_attempts.first_attempt < now()-interval '15 minutes' THEN now() ELSE login_attempts.first_attempt END, locked_until=CASE WHEN (CASE WHEN login_attempts.first_attempt < now()-interval '15 minutes' THEN 1 ELSE login_attempts.count+1 END)>=8 THEN now()+interval '15 minutes' ELSE NULL END", [key]);
      return send(res, 401, { error: "Invalid email or password" });
    }
    await pool.query("DELETE FROM login_attempts WHERE attempt_key=$1", [key]);
    const csrf = crypto.randomBytes(32).toString("base64url");
    setSession(res, { email, csrf, exp: Date.now() + 8 * 60 * 60 * 1000 });
    await pool.query("INSERT INTO audit_logs(actor_email,action,entity_type,details) VALUES($1,'login','session',$2::jsonb)", [email, JSON.stringify({ ip })]);
    return send(res, 200, { ok: true, email, csrf, expiresIn: 28800 });
  } catch (e) {
    console.error("admin login failed", e.message);
    return send(res, 503, { error: "Login service is not configured. Check database and environment variables." });
  }
};
