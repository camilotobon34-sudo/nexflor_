export const TOKEN_KEY = "serrania-admin";
const ROLE_KEY = "serrania-role";
const NAME_KEY = "serrania-name";
const DOC_KEY = "serrania-document";
const JOB_KEY = "serrania-job";

export function readSession() {
  const token = sessionStorage.getItem(TOKEN_KEY) || "";
  return {
    token,
    role: sessionStorage.getItem(ROLE_KEY) || (token ? "admin" : ""),
    name: sessionStorage.getItem(NAME_KEY) || "",
    documentId: sessionStorage.getItem(DOC_KEY) || "",
    job: sessionStorage.getItem(JOB_KEY) || "",
  };
}

export function saveSession(body) {
  sessionStorage.setItem(TOKEN_KEY, body.token);
  sessionStorage.setItem(ROLE_KEY, body.role || "trabajador");
  sessionStorage.setItem(NAME_KEY, body.name || "");
  sessionStorage.setItem(DOC_KEY, body.documentId || "");
  sessionStorage.setItem(JOB_KEY, body.job || "");
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(NAME_KEY);
  sessionStorage.removeItem(DOC_KEY);
  sessionStorage.removeItem(JOB_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
