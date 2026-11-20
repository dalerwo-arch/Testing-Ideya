// backend/.env месозад: пароли PostgreSQL-ро мепурсад ва JWT_SECRET-и тасодуфӣ менависад.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");

const envPath = path.join(__dirname, "..", "backend", ".env");

if (fs.existsSync(envPath) && !process.argv.includes("--force")) {
  console.log("backend/.env аллакай мавҷуд аст. Барои аз нав сохтан: node scripts/init-env.js --force");
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, def) =>
  new Promise((res) => rl.question(def ? `${q} [${def}]: ` : `${q}: `, (a) => res(a.trim() || def || "")));

(async () => {
  console.log("\n=== Танзими Offline Exam System ===");
  const user = await ask("Корбари PostgreSQL", "postgres");
  const pass = await ask("Пароли PostgreSQL (ҳангоми насби PostgreSQL додаед)");
  const host = await ask("Суроғаи PostgreSQL", "localhost");
  const port = await ask("Порти PostgreSQL", "5432");
  const db = await ask("Номи база", "exam_system");
  const adminEmail = await ask("Email-и админ", "dalerwo08@gmail.com");
  const adminPass = await ask("Пароли админ", "112233");
  rl.close();

  const secret = crypto.randomBytes(32).toString("hex");
  const url = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}?schema=public`;
  const text = `DATABASE_URL="${url}"
PORT=4000
JWT_SECRET="${secret}"
JWT_EXPIRES_IN="12h"
SEED_ADMIN_EMAIL="${adminEmail}"
SEED_ADMIN_PASSWORD="${adminPass}"
SEED_ADMIN_NAME="Daler"
MAX_EXAM_ENTRIES=3
GOOGLE_CLIENT_ID=""
SSL_KEY_PATH=""
SSL_CERT_PATH=""
FRONTEND_DIST="../frontend/dist"
`;
  fs.writeFileSync(envPath, text, "utf8");
  console.log("\nbackend/.env сохта шуд.\n");
})();
