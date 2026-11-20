"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("./config");

// Тамоми маълумот дар як файл: backend/data/db.json (ҳар тағйирот фавран захира мешавад)
const FILE = path.join(config.dataDir, "db.json");
const BAK = FILE + ".bak";

const emptyDb = () => ({
  meta: { jwtSecret: crypto.randomBytes(32).toString("hex") },
  users: [],
  groups: [],
  tests: [], // {id,title,description,durationMinutes,isPublished,groupIds[],createdAt}
  questions: [], // {id,testId,text,position,options:[{id,text,isCorrect}]}
  attempts: [],
  answers: [],
  loginLogs: [],
});

let db = null;
let lastBackup = 0;

function tryRead(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function init() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  if (fs.existsSync(FILE)) {
    db = tryRead(FILE);
    if (!db && fs.existsSync(BAK)) {
      console.warn("[!] db.json вайрон шудааст, аз db.json.bak барқарор мешавад.");
      db = tryRead(BAK);
    }
    if (!db) {
      const moved = FILE + `.corrupt-${Date.now()}`;
      fs.renameSync(FILE, moved);
      console.warn(`[!] db.json хонда нашуд. Нусхаи вайрон: ${moved}. Базаи нав сохта мешавад.`);
    }
  }
  if (!db) db = emptyDb();
  const base = emptyDb();
  for (const k of Object.keys(base)) if (db[k] === undefined) db[k] = base[k];
  if (!db.meta.jwtSecret) db.meta.jwtSecret = base.meta.jwtSecret;
  save();
  return db;
}

function save() {
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db));
  if (fs.existsSync(FILE) && Date.now() - lastBackup > 60_000) {
    try {
      fs.copyFileSync(FILE, BAK);
      lastBackup = Date.now();
    } catch {
      /* ignore */
    }
  }
  fs.renameSync(tmp, FILE);
}

const get = () => db;
const uuid = () => crypto.randomUUID();

module.exports = { init, save, get, uuid, FILE };
