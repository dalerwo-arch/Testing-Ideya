"use strict";
const config = require("./config");
const store = require("./store");
const { hashPassword, verifyPassword, signToken, verifyToken } = require("./security");

// ---------------------------------------------------------------- helpers
class HttpError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}
const E = (s, c, m) => new HttpError(s, c, m);
const bad = (m) => E(400, "VALIDATION_ERROR", m);

const D = () => store.get();
const save = () => store.save();
const uuid = () => store.uuid();
const nowIso = () => new Date().toISOString();

function str(v, { min = 0, max = 1000, name = "field" } = {}) {
  if (typeof v !== "string") throw bad(`${name}: нодуруст`);
  const s = v.trim();
  if (s.length < min || s.length > max) throw bad(`${name}: дарозӣ нодуруст`);
  return s;
}
function optStr(v, max, name) {
  if (v === undefined || v === null || v === "") return null;
  return str(v, { max, name });
}
function email(v) {
  const s = str(v, { min: 3, max: 200, name: "email" }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw bad("email: нодуруст");
  return s;
}
function password(v, min = 6) {
  if (typeof v !== "string" || v.length < min || v.length > 100) throw bad(`password: камаш ${min} аломат`);
  return v;
}
function intIn(v, min, max, name) {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) throw bad(`${name}: нодуруст`);
  return v;
}
const isObj = (b) => b && typeof b === "object" && !Array.isArray(b);

const byId = (arr, id) => arr.find((x) => x.id === id);
const isOwner = (u) => u.email === config.adminEmail;

function groupOf(id) {
  return id ? byId(D().groups, id) || null : null;
}
function validGroupIdOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !groupOf(v)) throw E(400, "GROUP_NOT_FOUND", "Гурӯҳ ёфт нашуд.");
  return v;
}

function publicUser(u) {
  const g = groupOf(u.groupId);
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    status: u.status,
    lockReason: u.lockReason || null,
    groupId: u.groupId || null,
    group: g ? { id: g.id, name: g.name } : null,
    hasGoogle: !!u.googleId,
    createdAt: u.createdAt,
  };
}

// ---------------------------------------------------------------- login log
function clientIp(req) {
  return (req.socket.remoteAddress || "").replace(/^::ffff:/, "");
}
function logLogin(req, mail, success, userId, reason) {
  const logs = D().loginLogs;
  logs.push({
    id: uuid(),
    userId: userId || null,
    email: mail,
    success,
    reason: reason || null,
    ip: clientIp(req) || null,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 250) || null,
    createdAt: nowIso(),
  });
  if (logs.length > 5000) logs.splice(0, logs.length - 5000);
  save();
}

// ---------------------------------------------------------------- rate limit
const hits = new Map();
function rateLimit(req) {
  const ip = clientIp(req);
  const now = Date.now();
  let h = hits.get(ip);
  if (!h || h.reset < now) h = { count: 0, reset: now + 60_000 };
  h.count++;
  hits.set(ip, h);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  if (h.count > 60) throw E(429, "TOO_MANY_REQUESTS", "Дархостҳо аз ҳад зиёд. Як дақиқа интизор шавед.");
}

// ---------------------------------------------------------------- exam helpers
const testOf = (id) => byId(D().tests, id);
const questionsOf = (testId) => D().questions.filter((q) => q.testId === testId).sort((a, b) => a.position - b.position);
const endsAt = (attempt, test) => new Date(new Date(attempt.startedAt).getTime() + test.durationMinutes * 60_000);

function finalizeAttempt(attempt, status) {
  if (attempt.status !== "IN_PROGRESS") return attempt;
  const d = D();
  attempt.total = d.questions.filter((q) => q.testId === attempt.testId).length;
  attempt.score = d.answers.filter((a) => a.attemptId === attempt.id && a.isCorrect).length;
  attempt.status = status;
  attempt.finishedAt = nowIso();
  save();
  return attempt;
}

function expireIfNeeded(attempt) {
  if (attempt.status !== "IN_PROGRESS") return false;
  const test = testOf(attempt.testId);
  if (!test || Date.now() >= endsAt(attempt, test).getTime()) {
    finalizeAttempt(attempt, "EXPIRED");
    return true;
  }
  return false;
}

function latestAttempt(userId, testId) {
  let best = null;
  for (const a of D().attempts) {
    if (a.userId === userId && a.testId === testId && (!best || a.attemptNo > best.attemptNo)) best = a;
  }
  return best;
}

function assertTestPublishable(testId) {
  const qs = questionsOf(testId);
  const ok = qs.length > 0 && qs.every((q) => q.options.length >= 2 && q.options.filter((o) => o.isCorrect).length === 1);
  if (!ok) {
    throw E(400, "TEST_INCOMPLETE", "Барои нашр тест бояд камаш як савол дошта бошад ва ҳар савол як ҷавоби дуруст дошта бошад.");
  }
}

function assertNoAttempts(testId) {
  if (D().attempts.some((a) => a.testId === testId)) {
    throw E(409, "TEST_HAS_ATTEMPTS", "Тест аллакай супорида шудааст; саволҳоро тағйир додан мумкин нест.");
  }
}

function testSummary(t) {
  const d = D();
  return {
    id: t.id,
    title: t.title,
    description: t.description || null,
    durationMinutes: t.durationMinutes,
    isPublished: t.isPublished,
    createdAt: t.createdAt,
    groups: t.groupIds.map((id) => groupOf(id)).filter(Boolean).map((g) => ({ id: g.id, name: g.name })),
    _count: {
      questions: d.questions.filter((q) => q.testId === t.id).length,
      attempts: d.attempts.filter((a) => a.testId === t.id).length,
    },
  };
}

function removeAttempts(pred) {
  const d = D();
  const ids = new Set(d.attempts.filter(pred).map((a) => a.id));
  d.attempts = d.attempts.filter((a) => !ids.has(a.id));
  d.answers = d.answers.filter((a) => !ids.has(a.attemptId));
}

// ---------------------------------------------------------------- owner
async function ensureOwner() {
  const d = D();
  let u = d.users.find((x) => x.email === config.adminEmail);
  if (!u) {
    d.users.push({
      id: uuid(),
      email: config.adminEmail,
      fullName: config.adminName,
      passwordHash: await hashPassword(config.adminPassword),
      googleId: null,
      role: "ADMIN",
      status: "ACTIVE",
      lockReason: null,
      groupId: null,
      createdAt: nowIso(),
    });
    save();
    console.log(`Админи асосӣ сохта шуд: ${config.adminEmail}`);
  } else if (u.role !== "ADMIN" || u.status !== "ACTIVE") {
    u.role = "ADMIN";
    u.status = "ACTIVE";
    u.lockReason = null;
    save();
  }
}

// ---------------------------------------------------------------- router
const routes = [];
function route(method, pattern, auth, handler) {
  const keys = [];
  const re = new RegExp(
    "^" +
      pattern.replace(/:([A-Za-z]+)/g, (_, k) => {
        keys.push(k);
        return "([^/]+)";
      }) +
      "/?$"
  );
  routes.push({ method, re, keys, auth, handler });
}
const created = (data) => ({ __status: 201, data });

// ======== AUTH (public) ========
route("GET", "/api/health", "none", () => ({ ok: true, time: nowIso() }));

route("GET", "/api/auth/config", "none", () => ({
  googleClientId: config.googleClientId || null,
  maxExamEntries: config.maxExamEntries,
}));

route("GET", "/api/auth/groups", "none", () =>
  [...D().groups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => ({ id: g.id, name: g.name }))
);

route("POST", "/api/auth/register", "none", async (c) => {
  rateLimit(c.req);
  const b = isObj(c.body) ? c.body : {};
  const fullName = str(b.fullName, { min: 2, max: 120, name: "fullName" });
  const mail = email(b.email);
  const pw = password(b.password);
  const groupId = validGroupIdOrNull(b.groupId);
  const passwordHash = await hashPassword(pw);
  if (D().users.some((u) => u.email === mail)) throw E(409, "EMAIL_EXISTS", "Ин Email аллакай сабт шудааст.");
  D().users.push({
    id: uuid(), email: mail, fullName, passwordHash, googleId: null, role: "STUDENT",
    status: "PENDING", lockReason: null, groupId, createdAt: nowIso(),
  });
  save();
  return created({ ok: true, status: "PENDING" });
});

route("POST", "/api/auth/login", "none", async (c) => {
  rateLimit(c.req);
  const b = isObj(c.body) ? c.body : {};
  const mail = email(b.email);
  const pw = typeof b.password === "string" ? b.password : "";
  const as = b.as === "admin" ? "admin" : "student";
  const user = D().users.find((u) => u.email === mail);

  if (!user || !(await verifyPassword(pw, user.passwordHash))) {
    logLogin(c.req, mail, false, user && user.id, "INVALID_CREDENTIALS");
    throw E(401, "INVALID_CREDENTIALS", "Email ё парол нодуруст аст.");
  }
  const wanted = as === "admin" ? "ADMIN" : "STUDENT";
  if (user.role !== wanted) {
    logLogin(c.req, mail, false, user.id, "WRONG_ROLE");
    throw E(403, "WRONG_ROLE", as === "admin" ? "Ин аккаунт админ нест." : "Ин аккаунт донишҷӯ нест.");
  }
  if (user.status !== "ACTIVE") {
    const code = `ACCOUNT_${user.status}`;
    logLogin(c.req, mail, false, user.id, code);
    throw E(403, code, "Аккаунт фаъол нест.");
  }
  logLogin(c.req, mail, true, user.id);
  return {
    token: signToken({ sub: user.id, role: user.role }, D().meta.jwtSecret, config.tokenHours * 3600),
    user: publicUser(user),
  };
});

// Google Login (ихтиёрӣ, танҳо бо интернет)
route("POST", "/api/auth/google", "none", async (c) => {
  rateLimit(c.req);
  if (!config.googleClientId) throw E(404, "GOOGLE_DISABLED", "Google Login танзим нашудааст.");
  const credential = str((c.body || {}).credential, { min: 10, max: 5000, name: "credential" });
  let info;
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw E(401, "GOOGLE_INVALID", "Токени Google нодуруст аст.");
    info = await r.json();
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw E(503, "GOOGLE_OFFLINE", "Google дастнорас аст (интернет нест).");
  }
  const verified = info.email_verified === true || info.email_verified === "true";
  if (info.aud !== config.googleClientId || !info.email || !info.sub || !verified) {
    throw E(401, "GOOGLE_INVALID", "Токени Google нодуруст аст.");
  }
  const mail = String(info.email).toLowerCase();
  let user = D().users.find((u) => u.googleId === info.sub || u.email === mail);
  if (!user) {
    D().users.push({
      id: uuid(), email: mail, fullName: info.name || mail, passwordHash: null, googleId: info.sub,
      role: "STUDENT", status: "PENDING", lockReason: null, groupId: null, createdAt: nowIso(),
    });
    save();
    logLogin(c.req, mail, false, null, "ACCOUNT_PENDING");
    throw E(403, "ACCOUNT_PENDING", "Сабти ном анҷом ёфт. Интизори тасдиқи админ шавед.");
  }
  if (!user.googleId) {
    user.googleId = info.sub;
    save();
  }
  if (user.role !== "STUDENT") throw E(403, "WRONG_ROLE", "Админ бояд бо Email ва парол ворид шавад.");
  if (user.status !== "ACTIVE") {
    const code = `ACCOUNT_${user.status}`;
    logLogin(c.req, mail, false, user.id, code);
    throw E(403, code, "Аккаунт фаъол нест.");
  }
  logLogin(c.req, mail, true, user.id, "GOOGLE");
  return {
    token: signToken({ sub: user.id, role: user.role }, D().meta.jwtSecret, config.tokenHours * 3600),
    user: publicUser(user),
  };
});

route("GET", "/api/auth/me", "any", (c) => publicUser(c.user));

route("POST", "/api/auth/change-password", "any", async (c) => {
  const b = isObj(c.body) ? c.body : {};
  const next = password(b.newPassword);
  if (!(await verifyPassword(String(b.currentPassword || ""), c.user.passwordHash))) {
    throw E(400, "INVALID_CREDENTIALS", "Пароли ҷорӣ нодуруст аст.");
  }
  c.user.passwordHash = await hashPassword(next);
  save();
  return { ok: true };
});

// ======== ADMIN: stats, users ========
route("GET", "/api/admin/stats", "ADMIN", () => {
  const d = D();
  return {
    students: d.users.filter((u) => u.role === "STUDENT").length,
    pending: d.users.filter((u) => u.status === "PENDING").length,
    locked: d.users.filter((u) => u.status === "LOCKED").length,
    tests: d.tests.length,
    attempts: d.attempts.length,
    groups: d.groups.length,
  };
});

route("GET", "/api/admin/users", "ADMIN", (c) => {
  const q = c.query;
  const s = (q.search || "").trim().toLowerCase();
  return D().users
    .filter((u) => (!q.status || u.status === q.status) && (!q.role || u.role === q.role) && (!q.groupId || u.groupId === q.groupId))
    .filter((u) => !s || u.fullName.toLowerCase().includes(s) || u.email.includes(s))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 500)
    .map(publicUser);
});

route("POST", "/api/admin/users", "ADMIN", async (c) => {
  const b = isObj(c.body) ? c.body : {};
  const fullName = str(b.fullName, { min: 2, max: 120, name: "fullName" });
  const mail = email(b.email);
  const pw = password(b.password);
  const groupId = validGroupIdOrNull(b.groupId);
  const role = b.role === "ADMIN" ? "ADMIN" : "STUDENT";
  const passwordHash = await hashPassword(pw);
  if (D().users.some((u) => u.email === mail)) throw E(409, "EMAIL_EXISTS", "Ин Email аллакай сабт шудааст.");
  const u = {
    id: uuid(), email: mail, fullName, passwordHash, googleId: null, role, status: "ACTIVE",
    lockReason: null, groupId, createdAt: nowIso(),
  };
  D().users.push(u);
  save();
  return created(publicUser(u));
});

function targetUser(c) {
  const u = byId(D().users, c.params.id);
  if (!u) throw E(404, "NOT_FOUND", "Ёфт нашуд.");
  return u;
}
function notSelfOrOwner(c, u) {
  if (u.id === c.user.id) throw E(400, "CANNOT_SELF", "Ин амалро нисбат ба худ иҷро кардан мумкин нест.");
  if (isOwner(u)) throw E(403, "OWNER_PROTECTED", "Админи асосиро тағйир додан мумкин нест.");
}

route("PATCH", "/api/admin/users/:id", "ADMIN", async (c) => {
  const u = targetUser(c);
  const b = isObj(c.body) ? c.body : {};
  if (b.email !== undefined) {
    const mail = email(b.email);
    if (mail !== u.email) {
      if (isOwner(u)) throw E(403, "OWNER_PROTECTED", "Email-и админи асосиро тағйир додан мумкин нест.");
      if (D().users.some((x) => x.email === mail && x.id !== u.id)) throw E(409, "EMAIL_EXISTS", "Ин Email аллакай сабт шудааст.");
      u.email = mail;
    }
  }
  if (b.fullName !== undefined) u.fullName = str(b.fullName, { min: 2, max: 120, name: "fullName" });
  if (b.groupId !== undefined) u.groupId = validGroupIdOrNull(b.groupId);
  if (b.newPassword) u.passwordHash = await hashPassword(password(b.newPassword));
  save();
  return publicUser(u);
});

route("DELETE", "/api/admin/users/:id", "ADMIN", (c) => {
  const u = targetUser(c);
  notSelfOrOwner(c, u);
  const d = D();
  removeAttempts((a) => a.userId === u.id);
  d.loginLogs.forEach((l) => {
    if (l.userId === u.id) l.userId = null;
  });
  d.users = d.users.filter((x) => x.id !== u.id);
  save();
  return { ok: true };
});

route("POST", "/api/admin/users/:id/approve", "ADMIN", (c) => {
  const u = targetUser(c);
  u.status = "ACTIVE";
  u.lockReason = null;
  save();
  return publicUser(u);
});
route("POST", "/api/admin/users/:id/reject", "ADMIN", (c) => {
  const u = targetUser(c);
  notSelfOrOwner(c, u);
  u.status = "REJECTED";
  save();
  return publicUser(u);
});
route("POST", "/api/admin/users/:id/lock", "ADMIN", (c) => {
  const u = targetUser(c);
  notSelfOrOwner(c, u);
  u.status = "LOCKED";
  u.lockReason = "Аз тарафи админ маҳкам шуд";
  save();
  return publicUser(u);
});
route("POST", "/api/admin/users/:id/unlock", "ADMIN", (c) => {
  const u = targetUser(c);
  u.status = "ACTIVE";
  u.lockReason = null;
  save();
  return publicUser(u);
});
route("POST", "/api/admin/users/:id/promote", "ADMIN", (c) => {
  const u = targetUser(c);
  u.role = "ADMIN";
  u.status = "ACTIVE";
  u.lockReason = null;
  save();
  return publicUser(u);
});
route("POST", "/api/admin/users/:id/demote", "ADMIN", (c) => {
  const u = targetUser(c);
  notSelfOrOwner(c, u);
  u.role = "STUDENT";
  save();
  return publicUser(u);
});
route("POST", "/api/admin/users/:id/terminate-active", "ADMIN", (c) => {
  const u = targetUser(c);
  const active = D().attempts.filter((a) => a.userId === u.id && a.status === "IN_PROGRESS");
  active.forEach((a) => finalizeAttempt(a, "TERMINATED"));
  return { ok: true, terminated: active.length };
});

route("GET", "/api/admin/users/:id/history", "ADMIN", (c) => {
  const u = targetUser(c);
  const d = D();
  return {
    logins: d.loginLogs.filter((l) => l.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100),
    attempts: d.attempts
      .filter((a) => a.userId === u.id)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .map((a) => ({ ...a, test: { title: (testOf(a.testId) || {}).title || "—" } })),
  };
});

route("GET", "/api/admin/login-logs", "ADMIN", () =>
  [...D().loginLogs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 300)
    .map((l) => {
      const u = l.userId ? byId(D().users, l.userId) : null;
      return { ...l, user: u ? { fullName: u.fullName } : null };
    })
);

// ======== ADMIN: groups ========
route("GET", "/api/admin/groups", "ADMIN", () => {
  const d = D();
  return [...d.groups]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => ({
      ...g,
      _count: { users: d.users.filter((u) => u.groupId === g.id).length, assignments: d.tests.filter((t) => t.groupIds.includes(g.id)).length },
    }));
});
route("POST", "/api/admin/groups", "ADMIN", (c) => {
  const name = str((c.body || {}).name, { min: 1, max: 80, name: "name" });
  if (D().groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) throw E(409, "ALREADY_EXISTS", "Ин гурӯҳ аллакай ҳаст.");
  const g = { id: uuid(), name, createdAt: nowIso() };
  D().groups.push(g);
  save();
  return created(g);
});
route("PATCH", "/api/admin/groups/:id", "ADMIN", (c) => {
  const g = byId(D().groups, c.params.id);
  if (!g) throw E(404, "NOT_FOUND", "Ёфт нашуд.");
  const name = str((c.body || {}).name, { min: 1, max: 80, name: "name" });
  if (D().groups.some((x) => x.id !== g.id && x.name.toLowerCase() === name.toLowerCase())) throw E(409, "ALREADY_EXISTS", "Ин гурӯҳ аллакай ҳаст.");
  g.name = name;
  save();
  return g;
});
route("DELETE", "/api/admin/groups/:id", "ADMIN", (c) => {
  const g = byId(D().groups, c.params.id);
  if (!g) throw E(404, "NOT_FOUND", "Ёфт нашуд.");
  const d = D();
  d.users.forEach((u) => {
    if (u.groupId === g.id) u.groupId = null;
  });
  d.tests.forEach((t) => {
    t.groupIds = t.groupIds.filter((id) => id !== g.id);
  });
  d.groups = d.groups.filter((x) => x.id !== g.id);
  save();
  return { ok: true };
});

// ======== ADMIN: tests & questions ========
function groupIdsFrom(v) {
  if (!Array.isArray(v)) throw bad("groupIds: нодуруст");
  const ids = [...new Set(v)];
  for (const id of ids) if (typeof id !== "string" || !groupOf(id)) throw E(400, "GROUP_NOT_FOUND", "Гурӯҳ ёфт нашуд.");
  return ids;
}

route("GET", "/api/admin/tests", "ADMIN", () =>
  [...D().tests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(testSummary)
);

route("POST", "/api/admin/tests", "ADMIN", (c) => {
  const b = isObj(c.body) ? c.body : {};
  const t = {
    id: uuid(),
    title: str(b.title, { min: 1, max: 200, name: "title" }),
    description: optStr(b.description, 2000, "description"),
    durationMinutes: b.durationMinutes === undefined ? 30 : intIn(b.durationMinutes, 1, 600, "durationMinutes"),
    isPublished: false,
    groupIds: b.groupIds === undefined ? [] : groupIdsFrom(b.groupIds),
    createdAt: nowIso(),
  };
  D().tests.push(t);
  save();
  return created(testSummary(t));
});

route("GET", "/api/admin/tests/:id", "ADMIN", (c) => {
  const t = testOf(c.params.id);
  if (!t) throw E(404, "NOT_FOUND", "Тест ёфт нашуд.");
  return {
    ...testSummary(t),
    questions: questionsOf(t.id).map((q) => ({
      id: q.id,
      text: q.text,
      position: q.position,
      options: q.options.map((o, i) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect, position: i })),
    })),
  };
});

route("PATCH", "/api/admin/tests/:id", "ADMIN", (c) => {
  const t = testOf(c.params.id);
  if (!t) throw E(404, "NOT_FOUND", "Тест ёфт нашуд.");
  const b = isObj(c.body) ? c.body : {};
  const patch = {};
  if (b.title !== undefined) patch.title = str(b.title, { min: 1, max: 200, name: "title" });
  if (b.description !== undefined) patch.description = optStr(b.description, 2000, "description");
  if (b.durationMinutes !== undefined) patch.durationMinutes = intIn(b.durationMinutes, 1, 600, "durationMinutes");
  if (b.groupIds !== undefined) patch.groupIds = groupIdsFrom(b.groupIds);
  if (b.isPublished !== undefined) {
    if (typeof b.isPublished !== "boolean") throw bad("isPublished: нодуруст");
    if (b.isPublished) assertTestPublishable(t.id);
    patch.isPublished = b.isPublished;
  }
  Object.assign(t, patch);
  save();
  return testSummary(t);
});

route("DELETE", "/api/admin/tests/:id", "ADMIN", (c) => {
  const t = testOf(c.params.id);
  if (!t) throw E(404, "NOT_FOUND", "Тест ёфт нашуд.");
  const d = D();
  removeAttempts((a) => a.testId === t.id);
  d.questions = d.questions.filter((q) => q.testId !== t.id);
  d.tests = d.tests.filter((x) => x.id !== t.id);
  save();
  return { ok: true };
});

function parseQuestion(body) {
  const b = isObj(body) ? body : {};
  const text = str(b.text, { min: 1, max: 2000, name: "text" });
  if (!Array.isArray(b.options) || b.options.length < 2 || b.options.length > 10) throw bad("options: аз 2 то 10 ҷавоб лозим аст");
  const options = b.options.map((o) => {
    if (!isObj(o) || typeof o.isCorrect !== "boolean") throw bad("options: нодуруст");
    return { id: uuid(), text: str(o.text, { min: 1, max: 500, name: "option" }), isCorrect: o.isCorrect };
  });
  if (options.filter((o) => o.isCorrect).length !== 1) {
    throw E(400, "ONE_CORRECT_REQUIRED", "Барои ҳар савол айнан як ҷавоби дуруст лозим аст.");
  }
  return { text, options };
}
const questionView = (q) => ({
  id: q.id,
  text: q.text,
  position: q.position,
  options: q.options.map((o, i) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect, position: i })),
});

route("POST", "/api/admin/tests/:id/questions", "ADMIN", (c) => {
  const t = testOf(c.params.id);
  if (!t) throw E(404, "NOT_FOUND", "Тест ёфт нашуд.");
  const p = parseQuestion(c.body);
  assertNoAttempts(t.id);
  const qs = questionsOf(t.id);
  const q = { id: uuid(), testId: t.id, text: p.text, position: qs.length ? qs[qs.length - 1].position + 1 : 0, options: p.options };
  D().questions.push(q);
  save();
  return created(questionView(q));
});

route("PUT", "/api/admin/questions/:id", "ADMIN", (c) => {
  const q = byId(D().questions, c.params.id);
  if (!q) throw E(404, "NOT_FOUND", "Савол ёфт нашуд.");
  const p = parseQuestion(c.body);
  assertNoAttempts(q.testId);
  q.text = p.text;
  q.options = p.options;
  save();
  return questionView(q);
});

route("DELETE", "/api/admin/questions/:id", "ADMIN", (c) => {
  const q = byId(D().questions, c.params.id);
  if (!q) throw E(404, "NOT_FOUND", "Савол ёфт нашуд.");
  assertNoAttempts(q.testId);
  D().questions = D().questions.filter((x) => x.id !== q.id);
  save();
  return { ok: true };
});

// ======== ADMIN: results ========
function latestMap() {
  const m = new Map();
  for (const a of D().attempts) {
    const k = `${a.userId}:${a.testId}`;
    m.set(k, Math.max(m.get(k) || 0, a.attemptNo));
  }
  return m;
}

route("GET", "/api/admin/results", "ADMIN", (c) => {
  const q = c.query;
  const s = (q.search || "").trim().toLowerCase();
  const latest = latestMap();
  return D().attempts
    .filter((a) => !q.testId || a.testId === q.testId)
    .map((a) => ({ a, u: byId(D().users, a.userId), t: testOf(a.testId) }))
    .filter((x) => x.u && x.t)
    .filter((x) => !q.groupId || x.u.groupId === q.groupId)
    .filter((x) => !s || x.u.fullName.toLowerCase().includes(s) || x.u.email.includes(s))
    .sort((x, y) => y.a.startedAt.localeCompare(x.a.startedAt))
    .slice(0, 1000)
    .map(({ a, u, t }) => ({
      id: a.id,
      status: a.status,
      attemptNo: a.attemptNo,
      entryCount: a.entryCount,
      retakeGranted: a.retakeGranted,
      startedAt: a.startedAt,
      finishedAt: a.finishedAt,
      score: a.score,
      total: a.total,
      isLatest: latest.get(`${a.userId}:${a.testId}`) === a.attemptNo,
      user: { id: u.id, fullName: u.fullName, email: u.email, group: (groupOf(u.groupId) || {}).name || null },
      test: { id: t.id, title: t.title },
    }));
});

route("GET", "/api/admin/attempts/:id", "ADMIN", (c) => {
  const a = byId(D().attempts, c.params.id);
  if (!a) throw E(404, "NOT_FOUND", "Кӯшиш ёфт нашуд.");
  const u = byId(D().users, a.userId) || { fullName: "—", email: "—" };
  const t = testOf(a.testId) || { title: "—" };
  const chosen = new Map(D().answers.filter((x) => x.attemptId === a.id).map((x) => [x.questionId, x.optionId]));
  return {
    id: a.id,
    status: a.status,
    score: a.score,
    total: a.total,
    entryCount: a.entryCount,
    startedAt: a.startedAt,
    finishedAt: a.finishedAt,
    user: { fullName: u.fullName, email: u.email },
    testTitle: t.title,
    questions: questionsOf(a.testId).map((q) => ({
      id: q.id,
      text: q.text,
      selectedOptionId: chosen.get(q.id) || null,
      options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
    })),
  };
});

route("POST", "/api/admin/attempts/:id/allow-retake", "ADMIN", (c) => {
  const a = byId(D().attempts, c.params.id);
  if (!a) throw E(404, "NOT_FOUND", "Кӯшиш ёфт нашуд.");
  if (a.status === "IN_PROGRESS") throw E(409, "ATTEMPT_IN_PROGRESS", "Имтиҳон ҳанӯз идома дорад.");
  const newer = D().attempts.some((x) => x.userId === a.userId && x.testId === a.testId && x.attemptNo > a.attemptNo);
  if (newer) throw E(409, "NOT_LATEST", "Ин кӯшиши охирин нест.");
  a.retakeGranted = true;
  save();
  return { ok: true };
});

route("GET", "/api/admin/results/export.csv", "ADMIN", () => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Full name", "Email", "Group", "Test", "Attempt", "Status", "Score", "Total", "Started", "Finished"].map(esc).join(",")];
  [...D().attempts]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .forEach((a) => {
      const u = byId(D().users, a.userId);
      const t = testOf(a.testId);
      if (!u || !t) return;
      rows.push(
        [u.fullName, u.email, (groupOf(u.groupId) || {}).name, t.title, a.attemptNo, a.status, a.score, a.total, a.startedAt, a.finishedAt]
          .map(esc)
          .join(",")
      );
    });
  return {
    __raw: true,
    status: 200,
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="results.csv"' },
    body: "﻿" + rows.join("\r\n"),
  };
});

// ======== STUDENT ========
function accessibleTest(user, testId) {
  if (!user.groupId) throw E(403, "NO_GROUP", "Шумо ба гурӯҳ вобаста нестед.");
  const t = testOf(testId);
  if (!t || !t.isPublished || !t.groupIds.includes(user.groupId)) {
    throw E(404, "NOT_FOUND", "Тест ёфт нашуд ё барои шумо дастрас нест.");
  }
  return t;
}
function ownAttempt(user, id) {
  const a = byId(D().attempts, id);
  if (!a || a.userId !== user.id) throw E(404, "NOT_FOUND", "Кӯшиш ёфт нашуд.");
  return a;
}

route("GET", "/api/student/tests", "STUDENT", (c) => {
  const user = c.user;
  if (!user.groupId) return [];
  return D().tests
    .filter((t) => t.isPublished && t.groupIds.includes(user.groupId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((t) => {
      const latest = latestAttempt(user.id, t.id);
      if (latest) expireIfNeeded(latest);
      let state = "AVAILABLE";
      if (latest) state = latest.retakeGranted ? "AVAILABLE" : latest.status === "IN_PROGRESS" ? "IN_PROGRESS" : "DONE";
      return {
        id: t.id,
        title: t.title,
        description: t.description || null,
        durationMinutes: t.durationMinutes,
        questionCount: D().questions.filter((q) => q.testId === t.id).length,
        state,
        attemptId: latest && !latest.retakeGranted ? latest.id : null,
        retakeGranted: latest ? latest.retakeGranted : false,
      };
    });
});

route("POST", "/api/student/tests/:id/start", "STUDENT", (c) => {
  const user = c.user;
  const test = accessibleTest(user, c.params.id);
  const questions = questionsOf(test.id);
  if (questions.length === 0) throw E(400, "TEST_EMPTY", "Дар ин тест савол нест.");

  const latest = latestAttempt(user.id, test.id);
  let attempt;
  if (!latest) {
    attempt = { id: uuid(), userId: user.id, testId: test.id, attemptNo: 1, status: "IN_PROGRESS", entryCount: 1, retakeGranted: false, startedAt: nowIso(), finishedAt: null, score: null, total: null };
    D().attempts.push(attempt);
  } else if (latest.retakeGranted) {
    latest.retakeGranted = false;
    attempt = { id: uuid(), userId: user.id, testId: test.id, attemptNo: latest.attemptNo + 1, status: "IN_PROGRESS", entryCount: 1, retakeGranted: false, startedAt: nowIso(), finishedAt: null, score: null, total: null };
    D().attempts.push(attempt);
  } else if (latest.status === "IN_PROGRESS") {
    if (expireIfNeeded(latest)) throw E(409, "EXAM_EXPIRED", "Вақти имтиҳон тамом шуд.");
    const entries = latest.entryCount + 1;
    latest.entryCount = entries;
    if (entries >= config.maxExamEntries) {
      // Воридшавии N-ум: имтиҳон қатъ мешавад ва аккаунт то иҷозати нави админ маҳкам мешавад.
      finalizeAttempt(latest, "TERMINATED");
      user.status = "LOCKED";
      user.lockReason = `Ба имтиҳон ${entries} маротиба ворид шуд`;
      save();
      throw E(403, "ACCOUNT_LOCKED_EXAM", "Шумо ба имтиҳон бисёр маротиба ворид шудед. Аккаунт маҳкам шуд.");
    }
    attempt = latest;
  } else {
    throw E(409, "EXAM_ALREADY_TAKEN", "Шумо ин имтиҳонро аллакай супоридед.");
  }
  save();

  const answers = {};
  D().answers.filter((a) => a.attemptId === attempt.id).forEach((a) => (answers[a.questionId] = a.optionId));
  return {
    attemptId: attempt.id,
    testTitle: test.title,
    durationMinutes: test.durationMinutes,
    startedAt: attempt.startedAt,
    endsAt: endsAt(attempt, test).toISOString(),
    serverNow: nowIso(),
    entryCount: attempt.entryCount,
    maxEntries: config.maxExamEntries,
    // isCorrect ҳеҷ гоҳ ба донишҷӯ фиристода намешавад
    questions: questions.map((q) => ({ id: q.id, text: q.text, options: q.options.map((o) => ({ id: o.id, text: o.text })) })),
    answers,
  };
});

route("POST", "/api/student/attempts/:id/answer", "STUDENT", (c) => {
  const a = ownAttempt(c.user, c.params.id);
  const b = isObj(c.body) ? c.body : {};
  if (a.status !== "IN_PROGRESS") throw E(409, "EXAM_FINISHED", "Имтиҳон анҷом ёфтааст.");
  if (expireIfNeeded(a)) throw E(410, "EXAM_EXPIRED", "Вақти имтиҳон тамом шуд.");

  const q = byId(D().questions, b.questionId);
  const o = q && q.options.find((x) => x.id === b.optionId);
  if (!q || q.testId !== a.testId || !o) throw E(400, "INVALID_OPTION", "Ҷавоб ба ин савол тааллуқ надорад.");
  if (D().answers.some((x) => x.attemptId === a.id && x.questionId === q.id)) {
    throw E(409, "ANSWER_LOCKED", "Ҷавобро иваз кардан мумкин нест.");
  }
  D().answers.push({ id: uuid(), attemptId: a.id, questionId: q.id, optionId: o.id, isCorrect: o.isCorrect, answeredAt: nowIso() });
  save();
  return created({ ok: true });
});

function finish(c, status) {
  const a = ownAttempt(c.user, c.params.id);
  if (a.status === "IN_PROGRESS" && !expireIfNeeded(a)) finalizeAttempt(a, status);
  return { status: a.status, score: a.score, total: a.total };
}
route("POST", "/api/student/attempts/:id/finish", "STUDENT", (c) => finish(c, "SUBMITTED"));
// Баромадан аз тест: имтиҳон баста мешавад, бе иҷозати админ аз нав супоридан мумкин нест.
route("POST", "/api/student/attempts/:id/exit", "STUDENT", (c) => finish(c, "EXITED"));

route("GET", "/api/student/results", "STUDENT", (c) =>
  D().attempts
    .filter((a) => a.userId === c.user.id && a.status !== "IN_PROGRESS")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((a) => ({
      id: a.id,
      testTitle: (testOf(a.testId) || {}).title || "—",
      status: a.status,
      score: a.score,
      total: a.total,
      startedAt: a.startedAt,
      finishedAt: a.finishedAt,
    }))
);

// ---------------------------------------------------------------- dispatcher
function authenticate(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) throw E(401, "UNAUTHORIZED", "Воридшавӣ лозим аст.");
  const payload = verifyToken(token, D().meta.jwtSecret);
  if (!payload) throw E(401, "UNAUTHORIZED", "Токен нодуруст ё кӯҳна шудааст.");
  const user = byId(D().users, payload.sub);
  if (!user) throw E(401, "UNAUTHORIZED", "Корбар ёфт нашуд.");
  if (user.status === "LOCKED") throw E(403, "ACCOUNT_LOCKED", "Аккаунт маҳкам аст.");
  if (user.status === "PENDING") throw E(403, "ACCOUNT_PENDING", "Аккаунт ҳанӯз тасдиқ нашудааст.");
  if (user.status === "REJECTED") throw E(403, "ACCOUNT_REJECTED", "Аккаунт рад карда шудааст.");
  return user;
}

/** Агар роҳ ба API рост ояд, натиҷа (ё хато) бармегардонад; вагарна undefined. */
async function handleApi(req, pathname, query, readBody) {
  let matched = null;
  let pathMatched = false;
  for (const r of routes) {
    const m = r.re.exec(pathname);
    if (!m) continue;
    pathMatched = true;
    if (r.method !== req.method) continue;
    const params = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
    matched = { r, params };
    break;
  }
  if (!matched) {
    if (pathMatched) throw E(405, "METHOD_NOT_ALLOWED", "Усули дархост нодуруст аст.");
    throw E(404, "NOT_FOUND", "API ёфт нашуд.");
  }
  const { r, params } = matched;
  let user = null;
  if (r.auth !== "none") {
    user = authenticate(req);
    if (r.auth !== "any" && user.role !== r.auth) throw E(403, "FORBIDDEN", "Дастрасӣ манъ аст.");
  }
  const body = req.method === "GET" || req.method === "DELETE" ? undefined : await readBody();
  return r.handler({ req, params, query, body, user });
}

module.exports = { handleApi, ensureOwner, HttpError };
