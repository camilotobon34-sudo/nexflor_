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

function publicStaff(person) {
  return {
    id: person.id,
    username: person.username,
    name: person.name,
    role: person.role,
    active: person.active === true,
    createdAt: person.createdAt,
  };
}

export function ensureStaff() {
  const db = readDb();
  if (Array.isArray(db.staff)) return db.staff;
  db.staff = [{
    id: `s_${randomBytes(4).toString("hex")}`,
    username: "portero",
    name: "Personal de ingreso",
    role: "portero",
    active: true,
    passwordHash: hashPassword("Ingreso2026"),
    createdAt: Date.now(),
  }];
  writeDb(db);
  return db.staff;
}

function signSession(role, username) {
  const body = `${role}.${username}.${Date.now() + SESSION}`;
  const sig = createHmac("sha256", SECRET).update(body).digest("hex");
  return `${body}.${sig}`;
}

function validSig(body, sig) {
  const expected = createHmac("sha256", SECRET).update(body).digest("hex");
  const a = Buffer.from(String(sig));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifySession(token) {
  const parts = String(token || "").split(".");
  if (parts.length === 3) {
    const [role, exp, sig] = parts;
    if (!validSig(`${role}.${exp}`, sig)) return null;
    if (role !== "admin" || Number(exp) <= Date.now()) return null;
    return { role: "admin", username: "admin" };
  }
  if (parts.length !== 4) return null;
  const [role, username, exp, sig] = parts;
  if (!validSig(`${role}.${username}.${exp}`, sig)) return null;
  if (Number(exp) <= Date.now()) return null;
  if (role === "admin" && username === "admin") return { role, username };
  if (role === "trabajador") {
    if (!/^[a-z0-9-]{4,20}$/.test(username)) return null;
    const worker = (readDb().workers || []).find((item) => item.documentId.toLowerCase() === username && item.active !== false);
    return worker ? { role, username, name: worker.fullName, workerId: worker.id } : null;
  }
  if (role !== "portero" || !/^[a-z0-9]{3,20}$/.test(username)) return null;
  const account = (readDb().staff || []).find((item) => item.username === username && item.role === "portero" && item.active === true);
  return account ? { role: "portero", username } : null;
}

export function verifyAdmin(token) {
  return verifySession(token)?.role === "admin";
}

function rejectLogin() {
  attempts.count += 1;
  if (attempts.count >= MAX_TRIES) {
    attempts.count = 0;
    attempts.until = Date.now() + LOCK_MS;
  }
  const error = new Error("Usuario o contraseña incorrectos.");
  error.status = 401;
  throw error;
}

export function loginAdmin(username, password) {
  if (Date.now() < attempts.until) {
    const minutes = Math.max(1, Math.ceil((attempts.until - Date.now()) / 60000));
    const error = new Error(`Demasiados intentos. Espera ${minutes} min para volver a entrar.`);
    error.status = 429;
    throw error;
  }
  ensureAdmin();
  ensureStaff();
  const db = readDb();
  const name = String(username || "").trim().toLowerCase();
  const admin = name === db.admin.username ? db.admin : null;
  const staff = admin ? null : (db.staff || []).find((item) => item.username === name);
  const account = admin
    ? { username: admin.username, name: admin.name, role: "admin", passwordHash: admin.passwordHash, active: true }
    : staff;
  if (!account || account.active === false || !checkPassword(password, account.passwordHash)) rejectLogin();
  attempts.count = 0;
  attempts.until = 0;
  return {
    token: signSession(account.role, account.username),
    role: account.role,
    name: account.name,
    username: account.username,
  };
}

export function listStaff() {
  return ensureStaff().filter((item) => item.role === "portero").map(publicStaff);
}

export function createStaff({ username, name, password }) {
  const user = String(username || "").trim().toLowerCase();
  const label = String(name || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const pass = String(password || "");
  if (!/^[a-z0-9]{3,20}$/.test(user) || user === "admin") {
    const error = new Error("El usuario debe tener de 3 a 20 letras o números, y no puede llamarse admin.");
    error.status = 400;
    throw error;
  }
  if (label.length < 3) {
    const error = new Error("Escribe el nombre de quien va a escanear.");
    error.status = 400;
    throw error;
  }
  if (pass.length < 8) {
    const error = new Error("La contraseña del personal necesita al menos 8 caracteres.");
    error.status = 400;
    throw error;
  }
  const db = readDb();
  if (!Array.isArray(db.staff)) db.staff = [];
  if (db.staff.some((item) => item.username === user)) {
    const error = new Error("Ese usuario ya existe.");
    error.status = 409;
    throw error;
  }
  const person = {
    id: `s_${randomBytes(4).toString("hex")}`,
    username: user,
    name: label,
    role: "portero",
    active: true,
    passwordHash: hashPassword(pass),
    createdAt: Date.now(),
  };
  db.staff.push(person);
  writeDb(db);
  return publicStaff(person);
}

export function setStaffActive(id, active) {
  const db = readDb();
  const person = (db.staff || []).find((item) => item.id === id && item.role === "portero");
  if (!person) {
    const error = new Error("No encontré esa cuenta de escaneo.");
    error.status = 404;
    throw error;
  }
  person.active = active === true;
  writeDb(db);
  return publicStaff(person);
}

function cleanWorkerText(value, max) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function workerSession(worker) {
  return {
    token: signSession("trabajador", worker.documentId.toLowerCase()),
    role: "trabajador",
    name: worker.fullName,
    username: worker.documentId.toLowerCase(),
    documentId: worker.documentId,
    job: worker.role,
    shift: worker.shift,
  };
}

export function getWorker(documentId) {
  const code = String(documentId || "").toLowerCase();
  return (readDb().workers || []).find((item) => item.documentId.toLowerCase() === code && item.active !== false) || null;
}

export function linkWorkerFace(documentId, personId) {
  const db = readDb();
  const worker = (db.workers || []).find((item) => item.documentId.toLowerCase() === String(documentId || "").toLowerCase());
  if (!worker) return null;
  worker.facePersonId = personId;
  writeDb(db);
  return worker.id;
}

export function registerWorker({ fullName, documentId, password, role, shift }) {
  const name = cleanWorkerText(fullName, 80);
  const document = cleanWorkerText(documentId, 20);
  const job = cleanWorkerText(role, 80);
  const pass = String(password || "");
  if (name.length < 3) {
    const error = new Error("Escribe el nombre completo.");
    error.status = 400;
    throw error;
  }
  if (!/^[A-Za-z0-9-]{4,20}$/.test(document)) {
    const error = new Error("La identificación debe tener entre 4 y 20 letras o números.");
    error.status = 400;
    throw error;
  }
  if (job.length < 2) {
    const error = new Error("Escribe el cargo o el tipo de persona.");
    error.status = 400;
    throw error;
  }
  if (pass.length < 6) {
    const error = new Error("La contraseña necesita al menos 6 caracteres.");
    error.status = 400;
    throw error;
  }
  const db = readDb();
  if (!Array.isArray(db.workers)) db.workers = [];
  if (db.workers.some((item) => item.documentId.toLowerCase() === document.toLowerCase())) {
    const error = new Error("Esa identificación ya tiene cuenta. Entra con ella.");
    error.status = 409;
    throw error;
  }
  const worker = {
    id: `w_${randomBytes(8).toString("hex")}`,
    fullName: name,
    documentId: document,
    role: job,
    shift: shift === "Tarde" ? "Tarde" : "Mañana",
    passwordHash: hashPassword(pass),
    active: true,
    facePersonId: "",
    createdAt: Date.now(),
  };
  db.workers.push(worker);
  writeDb(db);
  return workerSession(worker);
}

export function loginWorker(documentId, password) {
  if (Date.now() < attempts.until) {
    const minutes = Math.max(1, Math.ceil((attempts.until - Date.now()) / 60000));
    const error = new Error(`Demasiados intentos. Espera ${minutes} min para volver a entrar.`);
    error.status = 429;
    throw error;
  }
  const worker = getWorker(documentId);
  if (!worker || !checkPassword(password, worker.passwordHash)) rejectLogin();
  attempts.count = 0;
  attempts.until = 0;
  return workerSession(worker);
}
