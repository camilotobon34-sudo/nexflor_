import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, WORKER_KEY } from "../api.js";
import { TOKEN_KEY } from "./Admin.jsx";

const copy = {
  entrar: "Entra con la cuenta que ya creaste. Si todavía no tienes, créala primero.",
  crear: "Crea tu cuenta con tu nombre y una contraseña. Después podrás entrar al taller.",
  admin: "Entra con tu nombre de administrador.",
};

export default function Enter() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("entrar");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [shift, setShift] = useState("Mañana");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function choose(next) {
    setMode(next);
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "admin") {
        const body = await api("/admin/login", {
          method: "POST",
          body: JSON.stringify({ username: name, password }),
        });
        sessionStorage.setItem(TOKEN_KEY, body.token);
        navigate("/admin");
        return;
      }
      if (mode === "crear") {
        if (password !== confirm) {
          setError("Las dos contraseñas tienen que coincidir.");
          return;
        }
        const body = await api("/workers/register", {
          method: "POST",
          body: JSON.stringify({ name, password, shift }),
        });
        sessionStorage.setItem(WORKER_KEY, body.token);
        navigate("/");
        return;
      }
      const body = await api("/workers/login", {
        method: "POST",
        body: JSON.stringify({ name, password }),
      });
      sessionStorage.setItem(WORKER_KEY, body.token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const action = mode === "crear" ? "Crear cuenta" : "Entrar";

  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <img className="login-logo" src="/logo-trigal.png" alt="Flores El Trigal" />
        <h1>{mode === "crear" ? "Crear cuenta" : "Entrar al taller"}</h1>
        <p className="lede">{copy[mode]}</p>
        <div className="roles">
          <button type="button" className={mode === "entrar" ? "on" : ""} onClick={() => choose("entrar")}>
            Entrar
          </button>
          <button type="button" className={mode === "crear" ? "on" : ""} onClick={() => choose("crear")}>
            Crear cuenta
          </button>
          <button type="button" className={mode === "admin" ? "on" : ""} onClick={() => choose("admin")}>
            Administrador
          </button>
        </div>
        <label>
          Nombre
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="username" required />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "crear" ? "new-password" : "current-password"}
            required
          />
        </label>
        {mode === "crear" && (
          <>
            <label>
              Confirmar contraseña
              <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required />
            </label>
            <label>
              Turno
              <select value={shift} onChange={(event) => setShift(event.target.value)}>
                <option>Mañana</option>
                <option>Tarde</option>
              </select>
            </label>
          </>
        )}
        {error && <p className="status error">{error}</p>}
        <button className="button" type="submit" disabled={busy}>{busy ? "Un momento…" : action}</button>
        <Link to="/admin">Solo el panel de administración</Link>
      </form>
    </main>
  );
}
