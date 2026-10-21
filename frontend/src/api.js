import { useEffect, useState } from "react";
import { readSession } from "./session.js";

export async function api(path, options = {}) {
  const token = readSession().token;
  const response = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "No se pudo completar la solicitud.");
  return body;
}

export function useApi(path) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [tick, setTick] = useState(0);

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
  }, [path, tick]);

  return { ...state, reload: () => setTick((value) => value + 1) };
}
