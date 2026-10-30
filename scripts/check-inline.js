"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const files = [
  "admin.html","index.html","store.html","features.html","forums.html","forum-thread.html",
  "wiki.html","vote.html","staff.html","contact.html","privacy.html","terms.html","login.html","register.html"
];
let checked = 0;
let failures = 0;
for (const relative of files) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  scripts.forEach((match, index) => {
    const attrs = match[1] || "";
    const source = (match[2] || "").trim();
    if (!source || /\bsrc\s*=/.test(attrs)) return;
    const type = (attrs.match(/\btype\s*=\s*["']([^"']+)["']/i) || [])[1] || "text/javascript";
    if (!/(javascript|ecmascript)/i.test(type) && type !== "text/javascript") return;
    checked += 1;
    try { new vm.Script(source, { filename: relative + "#inline-script-" + (index + 1) }); }
    catch (error) { failures += 1; process.stderr.write(relative + " inline script " + (index + 1) + ": " + error.message + "\n"); }
  });
}
if (failures) {
  process.stderr.write("Inline JavaScript syntax check failed: " + failures + " error(s).\n");
  process.exitCode = 1;
} else {
  process.stdout.write("Inline JavaScript syntax check passed: " + checked + " script(s).\n");
}
