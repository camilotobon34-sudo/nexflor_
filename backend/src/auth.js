import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { readDb, writeDb } from "./store.js";

const SECRET = "serrania-admin-local";
const SESSION = 8 * 60 * 60 * 1000;
const LOCK_MS = 2 * 60 * 1000;
const MAX_TRIES = 5;
const attempts = { count: 0, until: 0 };

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function checkPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  return next.length === prev.length && timingSafeEqual(next, prev);
}

export function ensureAdmin() {
  const db = readDb();
  if (db.admin?.passwordHash) return db.admin;
  db.admin = {
    username: "admin",
    name: "Administrador",
    passwordHash: hashPassword("Serrania2026"),
  };
  writeDb(db);
  return db.admin;
}

export function signAdmin() {
  const body = `admin.${Date.now() + SESSION}`;
  const sig = createHmac("sha256", SECRET).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function verifyAdmin(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return false;
  const [role, exp, sig] = parts;
  const body = `${role}.${exp}`;
  const expected = createHmac("sha256", SECRET).update(body).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return role === "admin" && Number(exp) > Date.now();
}

export function loginAdmin(username, password) {
  if (Date.now() < attempts.until) {
    const minutes = Math.max(1, Math.ceil((attempts.until - Date.now()) / 60000));
    const error = new Error(`Demasiados intentos. Espera ${minutes} min para volver a entrar.`);
    error.status = 429;
    throw error;
  }
  const admin = ensureAdmin();
  const userOk = username === admin.username;
  const passOk = checkPassword(password, admin.passwordHash);
  if (!userOk || !passOk) {
    attempts.count += 1;
    if (attempts.count >= MAX_TRIES) {
      attempts.count = 0;
      attempts.until = Date.now() + LOCK_MS;
    }
    const error = new Error("Usuario o contraseña incorrectos.");
    error.status = 401;
    throw error;
  }
  attempts.count = 0;
  attempts.until = 0;
  return { token: signAdmin(), name: admin.name, username: admin.username };
}
