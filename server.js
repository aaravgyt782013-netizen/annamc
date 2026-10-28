"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const MIME = {
  ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8", ".mjs":"text/javascript; charset=utf-8",
  ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml",
  ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg",
  ".webp":"image/webp", ".ico":"image/x-icon", ".webmanifest":"application/manifest+json",
  ".woff2":"font/woff2", ".txt":"text/plain; charset=utf-8"
};
const ROUTES = { "/":"/index.html", "/home":"/index.html", "/admin":"/admin.html", "/store":"/store.html", "/login":"/index.html" };

function send(res, status, body, type="text/plain; charset=utf-8") {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(body);
}
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) { reject(new Error("Request body too large")); req.destroy(); }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}
async function handle(req, res) {
  let url;
  try { url = new URL(req.url, "http://localhost"); } catch { return send(res, 400, "Bad request"); }
  let pathname = decodeURIComponent(url.pathname);\n  req.query = Object.fromEntries(url.searchParams.entries());
  if (pathname.startsWith("/api/")) {
    if (!/^\/api\/[a-zA-Z0-9_/-]+$/.test(pathname) || pathname.includes("..")) return send(res, 404, JSON.stringify({error:"Not found"}), "application/json; charset=utf-8");
    const modulePath = path.join(ROOT, pathname.slice(1) + ".js");
    if (!modulePath.startsWith(path.join(ROOT, "api") + path.sep) || !fs.existsSync(modulePath) || !fs.statSync(modulePath).isFile()) return send(res, 404, JSON.stringify({error:"API route not found"}), "application/json; charset=utf-8");
    try {
      if (["POST","PUT","PATCH","DELETE"].includes(req.method)) req.body = await parseJsonBody(req);
      else req.body = {};
      const handler = require(modulePath);
      if (typeof handler !== "function") return send(res, 500, JSON.stringify({error:"Invalid API handler"}), "application/json; charset=utf-8");
      return await handler(req, res);
    } catch (error) {
      console.error("API request failed:", pathname, error.message);
      if (!res.headersSent) return send(res, error.message === "Invalid JSON body" ? 400 : 500, JSON.stringify({error:error.message === "Invalid JSON body" ? error.message : "Server error"}), "application/json; charset=utf-8");
      if (!res.writableEnded) res.end();
      return;
    }
  }
  if (pathname === "/login" && url.searchParams.has("login")) pathname = "/";
  pathname = ROUTES[pathname] || pathname;
  if (pathname.endsWith("/")) pathname += "index.html";
  let file = path.resolve(ROOT, "." + pathname);
  if (!file.startsWith(ROOT + path.sep) || file === ROOT) return send(res, 403, "Forbidden");
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Not found • Anna MC</title></head><body style=\"background:#131314;color:#e5e2e3;font:16px system-ui;padding:3rem\"><h1>Page not found</h1><p>The page you requested does not exist.</p><a style=\"color:#f2ca50\" href=\"/home\">Return to Anna MC</a></body></html>", "text/html; charset=utf-8");
  const ext = path.extname(file).toLowerCase();
  const relative = path.relative(ROOT, file).split(path.sep);
  const protectedFile = relative.some(part => part.startsWith(".")) ||
    ["api","lib","database","node_modules"].includes(relative[0]) ||
    ["server.js","package.json","package-lock.json"].includes(relative[0]);
  if (protectedFile || !MIME[ext] || ext === ".json") return send(res, 404, "Not found");
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", ext === ".html" ? "no-cache" : "public, max-age=3600");
  const stream = fs.createReadStream(file);
  stream.on("error", () => { if (!res.headersSent) send(res, 500, "Unable to read file"); else res.end(); });
  if (req.method === "HEAD") return res.end();
  stream.pipe(res);
}
const server = http.createServer((req, res) => { handle(req, res); });
server.listen(PORT, "0.0.0.0", () => console.log("Anna MC website listening on port " + PORT));
