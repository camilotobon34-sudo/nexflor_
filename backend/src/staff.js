import { randomUUID } from "crypto";
import { readDb, writeDb } from "./store.js";
import { checkPassword, createSession, hashPassword } from "./auth.js";

const LOCK_MS = 2 * 60 * 1000;
const MAX_TRIES = 5;
const attempts = new Map();
const dummyHash = hashPassword(randomUUID());

function fail(message, status) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function normalizeUsername(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function publicStaff(person) {
  return {
    id: person.id,
    name: person.name,
    username: person.username,
    active: person.active,
  };
}

function readStaff() {
  const db = readDb();
  const staff = Array.isArray(db.staff) ? db.staff : [];
  return { db, staff };
}

export function ensureStaff() {
  const { db, staff } = readStaff();
  if (!Array.isArray(db.staff)) {
    db.staff = staff;
    writeDb(db);
  }
  return staff;
}

export function listStaff() {
  return ensureStaff().map(publicStaff);
}

export function createStaff(input) {
  const name = String(input.name || "").trim().replace(/\s+/g, " ");
  const username = normalizeUsername(input.username);
  const password = String(input.password || "");
  if (name.length < 3) fail("Escribe el nombre del personal.", 400);
  if (username.length < 3) fail("El usuario necesita al menos 3 caracteres.", 400);
  if (password.length < 12) fail("La contraseña necesita al menos 12 caracteres.", 400);

  const { db, staff } = readStaff();
  if (staff.some((person) => normalizeUsername(person.username) === username)) {
    fail("Ese usuario ya existe.", 409);
  }

  const person = {
    id: randomUUID(),
    name,
    username,
    passwordHash: hashPassword(password),
    active: true,
    createdAt: new Date().toISOString(),
  };
  db.staff = staff;
  staff.push(person);
  writeDb(db);
  return publicStaff(person);
}

export function setStaffActive(id, active) {
  const { db, staff } = readStaff();
  const person = staff.find((item) => item.id === id);
  if (!person) fail("No se encontró esa cuenta de escaneo.", 404);
  person.active = active;
  db.staff = staff;
  writeDb(db);
  return publicStaff(person);
}

function rejectAttempt(key) {
  const current = attempts.get(key) || { count: 0, until: 0 };
  if (Date.now() < current.until) {
    fail("Demasiados intentos. Espera un momento antes de volver a entrar.", 429);
  }
  current.count += 1;
  if (current.count >= MAX_TRIES) {
    current.count = 0;
    current.until = Date.now() + LOCK_MS;
  }
  attempts.set(key, current);
  fail("Usuario o contraseña incorrectos, o cuenta suspendida.", 401);
}

export function loginStaff(usernameValue, passwordValue) {
  const username = normalizeUsername(usernameValue);
  const key = username || "unknown";
  const current = attempts.get(key);
  if (current && Date.now() < current.until) {
    fail("Demasiados intentos. Espera un momento antes de volver a entrar.", 429);
  }

  const staff = ensureStaff();
  const person = staff.find((item) => normalizeUsername(item.username) === username);
  const valid = checkPassword(String(passwordValue || ""), person?.passwordHash || dummyHash);
  if (!person || !person.active || !valid) rejectAttempt(key);

  attempts.delete(key);
  return {
    token: createSession("scanner", person.id),
    name: person.name,
    role: "scanner",
  };
}

export function isActiveStaff(id) {
  return ensureStaff().some((person) => person.id === id && person.active);
}
