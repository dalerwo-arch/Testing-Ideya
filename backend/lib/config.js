"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// backend/.env ихтиёрӣ аст (агар набошад, қиматҳои пешфарз истифода мешаванд)
(function loadEnv() {
  const f = path.join(ROOT, ".env");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
})();

const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

module.exports = {
  ROOT,
  port: num(process.env.PORT, 4000),
  // Админи асосӣ (соҳиб). Танҳо ҳамин аккаунт аз аввал админ аст.
  adminEmail: (process.env.ADMIN_EMAIL || "dalerwo08@gmail.com").trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || "112233",
  adminName: process.env.ADMIN_NAME || "Daler",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean),
  maxExamEntries: num(process.env.MAX_EXAM_ENTRIES, 3),
  tokenHours: num(process.env.TOKEN_HOURS, 12),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  sslKeyPath: process.env.SSL_KEY_PATH || "",
  sslCertPath: process.env.SSL_CERT_PATH || "",
  dataDir: path.resolve(ROOT, process.env.DATA_DIR || "data"),
  frontendDist: path.resolve(ROOT, process.env.FRONTEND_DIST || "../frontend/dist"),
};
