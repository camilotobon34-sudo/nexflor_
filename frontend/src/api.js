export function workerToken() {
  return localStorage.getItem("nexflor_token");
}

export function loginWorker(email, password) {
  if (email && password) {
    localStorage.setItem("nexflor_token", "token_activo_local");
    return true;
  }
  return false;
}

export function logoutWorker() {
  localStorage.removeItem("nexflor_token");
}