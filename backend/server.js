"use strict";
const fs = require("fs");
const http = require("http");
const https = require("https");
const os = require("os");
const path = require("path");
const config = require("./lib/config");
const store = require("./lib/store");
const { handleApi, ensureOwner, HttpError } = require("./lib/app");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function sendJson(res, status, data, extra = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(new HttpError(413, "PAYLOAD_TOO_LARGE", "Дархост хеле калон аст."));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "INVALID_JSON", "JSON нодуруст аст."));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res, pathname) {
  const dist = config.frontendDist;
  const indexFile = path.join(dist, "index.html");
  if (!fs.existsSync(indexFile)) {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Frontend build нашудааст. Иҷро кунед: bash scripts/setup.sh (ё scripts\\setup.bat)");
    return;
  }
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    rel = "/";
  }
  let file = path.join(dist, rel);
  if (file !== dist && !file.startsWith(dist + path.sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  let isFile = false;
  try {
    isFile = fs.statSync(file).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) {
    if (path.extname(rel)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    file = indexFile; // SPA fallback
  }
  const ext = path.extname(file).toLowerCase();
  const noCache = file === indexFile || path.basename(file) === "sw.js";
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": noCache ? "no-cache" : "public, max-age=3600",
  });
  fs.createReadStream(file).pipe(res);
}

async function onRequest(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname;
    if (pathname.startsWith("/api/") || pathname === "/api") {
      const query = Object.fromEntries(url.searchParams);
      const out = await handleApi(req, pathname, query, () => readBody(req));
      if (out && out.__raw) {
        res.writeHead(out.status, { "Cache-Control": "no-store", ...out.headers });
        res.end(out.body);
      } else if (out && out.__status) {
        sendJson(res, out.__status, out.data);
      } else {
        sendJson(res, 200, out === undefined ? { ok: true } : out);
      }
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    serveStatic(req, res, pathname);
  } catch (e) {
    if (e instanceof HttpError) {
      if (!res.headersSent) sendJson(res, e.status, { error: e.code, message: e.message });
    } else {
      console.error(e);
      if (!res.headersSent) sendJson(res, 500, { error: "SERVER_ERROR", message: "Хатои дохилии сервер." });
    }
  }
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === "IPv4" && !i.internal) out.push(i.address);
  }
  return out;
}

async function main() {
  store.init();
  await ensureOwner();

  const useHttps = !!(config.sslKeyPath && config.sslCertPath);
  const server = useHttps
    ? https.createServer({ key: fs.readFileSync(config.sslKeyPath), cert: fs.readFileSync(config.sslCertPath) }, onRequest)
    : http.createServer(onRequest);

  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.error(`Порти ${config.port} банд аст. Равзанаи кӯҳнаро пӯшед ё дар backend/.env PORT=4001 нависед.`);
    } else {
      console.error("Хатои сервер:", e.message);
    }
    process.exit(1);
  });

  server.listen(config.port, "0.0.0.0", () => {
    const proto = useHttps ? "https" : "http";
    console.log("\n==============================================");
    console.log("  Offline Exam System кор мекунад!");
    console.log("==============================================");
    console.log(`  Дар ин компютер:  ${proto}://localhost:${config.port}`);
    for (const ip of lanAddresses()) console.log(`  Дар телефон:      ${proto}://${ip}:${config.port}`);
    console.log(`  Админ:            ${config.adminEmail}`);
    console.log(`  Маълумот:         ${store.FILE}`);
    console.log("  Барои қатъ кардан: Ctrl+C (равзанаро то охири имтиҳон накушед)\n");
  });

  const shutdown = () => {
    try {
      store.save();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error("Сервер оғоз нашуд:", e && e.message ? e.message : e);
  process.exit(1);
});
