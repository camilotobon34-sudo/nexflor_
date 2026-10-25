export const TOKEN_KEY = "serrania-admin";
const ROLE_KEY = "serrania-role";
const NAME_KEY = "serrania-name";

export function readSession() {
  const token = sessionStorage.getItem(TOKEN_KEY) || "";
  return {
    token,
    role: sessionStorage.getItem(ROLE_KEY) || (token ? "admin" : ""),
    name: sessionStorage.getItem(NAME_KEY) || "",
  };
}

export function saveSession(body) {
  sessionStorage.setItem(TOKEN_KEY, body.token);
  sessionStorage.setItem(ROLE_KEY, body.role || "admin");
  sessionStorage.setItem(NAME_KEY, body.name || "");
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(NAME_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
