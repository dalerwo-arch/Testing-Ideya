"use strict";
const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);

async function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(plain, salt, 64);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

async function verifyPassword(plain, stored) {
  if (!stored) return false;
  const [alg, salt, hex] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hex) return false;
  const hash = await scrypt(plain, salt, 64);
  const expected = Buffer.from(hex, "hex");
  return expected.length === hash.length && crypto.timingSafeEqual(expected, hash);
}

const b64u = (x) => Buffer.from(x).toString("base64url");

/** JWT (HS256) */
function signToken(payload, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }));
  const sig = crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

function verifyToken(token, secret) {
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  const expected = crypto.createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
  let given;
  try {
    given = Buffer.from(parts[2], "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };
