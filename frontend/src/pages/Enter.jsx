import { useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api.js";
import { readSession, saveSession } from "../session.js";

export default function Enter() {
  const existing = readSession();
  const [mode, setMode] = useState("entrar");
  const [fullName, setFullName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [role, setRole] = useState("");
  const [shift, setShift] = useState("Mañana");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(Boolean(existing.token));

  if (done) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (mode === "crear" && password !== confirm) {
      setError("Las dos contraseñas tienen que coincidir.");
      return;
    }
    setBusy(true);
    try {
      const body = mode === "crear"
        ? await api("/workers/register", { method: "POST", body: JSON.stringify({ fullName, documentId, role, shift, password }) })
        : await api("/workers/login", { method: "POST", body: JSON.stringify({ documentId, password }) });
      saveSession(body);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="card staff-login" onSubmit={submit}>
        <p className="eyebrow">Nexflor · Flores El Trigal</p>
        <h1>{mode === "crear" ? "Crear cuenta de trabajador" : "Entrar al turno"}</h1>
        <p className="lede">Una sola cuenta para identificarte, recorrer Academy y seguir el taller.</p>
        <div className="chips">
          <button type="button" className={mode === "entrar" ? "on" : ""} onClick={() => { setMode("entrar"); setError(""); }}>Entrar</button>
          <button type="button" className={mode === "crear" ? "on" : ""} onClick={() => { setMode("crear"); setError(""); }}>Crear cuenta</button>
        </div>
        {mode === "crear" && (
          <>
            <label>Nombre completo<input value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
            <label>Cargo o tipo de persona<input value={role} onChange={(event) => setRole(event.target.value)} required /></label>
            <label>Turno
              <select value={shift} onChange={(event) => setShift(event.target.value)}>
                <option>Mañana</option>
                <option>Tarde</option>
              </select>
            </label>
          </>
        )}
        <label>Identificación<input value={documentId} onChange={(event) => setDocumentId(event.target.value)} autoComplete="username" required /></label>
        <label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "crear" ? "new-password" : "current-password"} required /></label>
        {mode === "crear" && <label>Confirmar contraseña<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required /></label>}
        {error && <p className="status error">{error}</p>}
        <button className="button" type="submit" disabled={busy}>{busy ? "Un momento…" : mode === "crear" ? "Crear cuenta" : "Entrar"}</button>
        <a href="/admin">Solo el panel de administración</a>
      </form>
    </main>
  );
}
