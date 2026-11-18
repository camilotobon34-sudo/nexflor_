import { useEffect, useState } from "react";

export const WORKER_KEY = "nexflor_token";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

function isValidWorkerToken(token) {
  const [role, id, expiresAt, signature, ...rest] = String(token || "").split(".");
  return Boolean(
    role === "worker" &&
      id &&
      signature &&
      rest.length === 0 &&
      Number.isFinite(Number(expiresAt)) &&
      Number(expiresAt) > Date.now(),
  );
}

export function workerToken() {
  const token = localStorage.getItem(WORKER_KEY);
  if (!token) return "";
  if (isValidWorkerToken(token)) return token;
  localStorage.removeItem(WORKER_KEY);
  window.dispatchEvent(new Event("nexflor:session-expired"));
  return "";
}

export function logoutWorker() {
  localStorage.removeItem(WORKER_KEY);
}

function saveWorkerToken(body) {
  if (!body || !isValidWorkerToken(body.token)) {
    throw new Error("El servidor devolvió una sesión de trabajador no válida.");
  }
  localStorage.setItem(WORKER_KEY, body.token);
  return body;
}

export async function api(path, options = {}) {
  const route = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(options.headers || {});
  const isPublicAuthRoute = /^\/(workers\/(login|register)|admin\/login|staff\/login)$/.test(route);
  const token = isPublicAuthRoute ? "" : workerToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}/api${route}`, {
    ...options,
    headers,
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof body === "object" && body !== null && body.message
      ? body.message
      : `La solicitud falló (${response.status}).`;

    if (response.status === 401 && headers.get("Authorization") === `Bearer ${token}`) {
      logoutWorker();
      window.dispatchEvent(new Event("nexflor:session-expired"));
    }
    throw new Error(message);
  }

  return body;
}

export async function loginWorker(name, password) {
  const body = await api("/workers/login", {
    method: "POST",
    body: JSON.stringify({ name, password }),
  });
  return saveWorkerToken(body);
}

export async function registerWorker(name, password, shift) {
  const body = await api("/workers/register", {
    method: "POST",
    body: JSON.stringify({ name, password, shift }),
  });
  return saveWorkerToken(body);
}

export function useApi(path) {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: "", data: null });

    api(path)
      .then((data) => {
        if (active) setState({ loading: false, error: "", data });
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error.message, data: null });
      });

    return () => {
      active = false;
    };
  }, [path]);

  return state;
}
