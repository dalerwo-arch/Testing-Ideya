import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import cors from "cors";
import express from "express";
import { assertConfig, config } from "./lib/config";
import { errorHandler } from "./lib/errors";
import { prisma } from "./lib/prisma";
import { requireAuth, requireRole } from "./middleware/auth";
import { authRouter } from "./routes/auth";
import { adminUsersRouter } from "./routes/adminUsers";
import { adminTestsRouter } from "./routes/adminTests";
import { adminResultsRouter } from "./routes/adminResults";
import { studentRouter } from "./routes/student";

assertConfig();

const app = express();
app.set("trust proxy", false);
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/admin", requireAuth, requireRole("ADMIN"), adminUsersRouter, adminTestsRouter, adminResultsRouter);
app.use("/api/student", requireAuth, requireRole("STUDENT"), studentRouter);

app.use("/api", (_req, res) => res.status(404).json({ error: "NOT_FOUND", message: "API ёфт нашуд." }));

// Frontend-и build шуда (production): як порт барои ҳама
const distPath = config.frontendDist;
if (fs.existsSync(path.join(distPath, "index.html"))) {
  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        if (filePath.endsWith("sw.js") || filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(distPath, "index.html")));
} else {
  app.get("/", (_req, res) =>
    res
      .status(200)
      .send("Frontend build нашудааст. Дар папкаи frontend `npm run build`-ро иҷро кунед (ё scripts\\setup.bat).")
  );
}

app.use(errorHandler);

async function main() {
  await prisma.$connect();

  let server: http.Server | https.Server;
  const useHttps = !!(config.sslKeyPath && config.sslCertPath);
  if (useHttps) {
    server = https.createServer(
      { key: fs.readFileSync(config.sslKeyPath), cert: fs.readFileSync(config.sslCertPath) },
      app
    );
  } else {
    server = http.createServer(app);
  }

  server.listen(config.port, "0.0.0.0", () => {
    console.log(`\nOffline Exam System кор мекунад (${useHttps ? "HTTPS" : "HTTP"}) дар порти ${config.port}`);
    console.log(`Дар худи компютер: ${useHttps ? "https" : "http"}://localhost:${config.port}`);
  });

  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(async (e) => {
  console.error("Сервер оғоз нашуд:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
