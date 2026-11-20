import fs from "fs";
import path from "path";
import dotenv from "dotenv";

/** Папкаи backend: аввалин папка боло аз ин файл, ки package.json дорад. */
function findBackendDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

export const backendDir = findBackendDir();
const envPath = path.join(backendDir, ".env");
const envFound = fs.existsSync(envPath);
if (envFound) dotenv.config({ path: envPath });

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  port: num(process.env.PORT, 4000),
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  maxExamEntries: num(process.env.MAX_EXAM_ENTRIES, 3),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  sslKeyPath: process.env.SSL_KEY_PATH || "",
  sslCertPath: process.env.SSL_CERT_PATH || "",
  frontendDist: path.resolve(backendDir, process.env.FRONTEND_DIST || "../frontend/dist"),
};

export function assertConfig(): void {
  if (!envFound) {
    throw new Error(
      `Файли .env ёфт нашуд (${envPath}). Дар папкаи лоиҳа иҷро кунед: node scripts/init-env.js`
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL дар файли .env нишон дода нашудааст.");
  }
  if (config.jwtSecret.length < 32 || config.jwtSecret.startsWith("CHANGE_ME")) {
    throw new Error("JWT_SECRET дар файли .env бояд камаш 32 аломат бошад. Иҷро кунед: node scripts/init-env.js");
  }
}
