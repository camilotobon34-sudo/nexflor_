import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, loginWorker, logoutWorker, registerWorker } from "../api.js";
import { saveSession } from "../session.js";

const tabs = [
  { id: "entrar", label: "Entrar" },
  { id: "crear", label: "Crear cuenta" },
  { id: "admin", label: "Administrador" },
];

const descriptions = {
  entrar: "Entra con la cuenta que ya creaste. Si todavía no tienes, créala primero.",
  crear: "Crea tu cuenta con tu nombre y una contraseña. Después podrás entrar al taller.",
  admin: "Entra con tu nombre de administrador.",
};

export default function Enter() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("entrar");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [shift, setShift] = useState("Mañana");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function changeTab(tab) {
    setActiveTab(tab);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (activeTab === "crear" && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      if (activeTab === "admin") {
        const session = await api("/admin/login", {
          method: "POST",
          body: JSON.stringify({ username: name, password }),
        });
        logoutWorker();
        saveSession(session);
        navigate("/admin", { replace: true });
      } else {
        if (activeTab === "crear") {
          await registerWorker(name, password, shift);
        } else {
          await loginWorker(name, password);
        }
        navigate("/", { replace: true });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fcfbf9] px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-7 shadow-lg sm:p-10">
        <div className="mb-7 flex justify-center">
          <img
            src="/logo-trigal.png"
            alt="Flores El Trigal"
            className="w-full max-w-[360px] rounded-lg"
          />
        </div>

        <h1 className="text-center font-fraunces text-3xl font-semibold text-slate-900">
          {activeTab === "crear" ? "Crear cuenta" : "Entrar al taller"}
        </h1>
        <p className="mx-auto mb-7 mt-2 max-w-sm text-center text-sm leading-6 text-slate-600">
          {descriptions[activeTab]}
        </p>

        <div
          aria-label="Tipo de acceso"
          className="mb-7 grid grid-cols-3 rounded-full border border-slate-200 bg-slate-50 p-1"
          role="tablist"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => changeTab(tab.id)}
              className={`rounded-full px-2 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#112244] sm:text-sm ${
                activeTab === tab.id
                  ? "bg-[#112244] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#112244]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form className="mx-auto max-w-sm space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium text-slate-800">
            {activeTab === "admin" ? "Nombre de administrador" : "Nombre / Correo"}
            <input
              type="text"
              name="name"
              required
              autoComplete="username"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={activeTab === "admin" ? "Tu nombre" : "Tu nombre completo"}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#112244] focus:ring-2 focus:ring-[#112244]/15"
            />
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Contraseña
            <input
              type="password"
              name="password"
              required
              autoComplete={activeTab === "crear" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tu contraseña"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#112244] focus:ring-2 focus:ring-[#112244]/15"
            />
          </label>

          {activeTab === "crear" && (
            <>
              <label className="block text-sm font-medium text-slate-800">
                Confirmar contraseña
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite tu contraseña"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#112244] focus:ring-2 focus:ring-[#112244]/15"
                />
              </label>

              <label className="block text-sm font-medium text-slate-800">
                Turno
                <select
                  name="shift"
                  value={shift}
                  onChange={(event) => setShift(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#112244] focus:ring-2 focus:ring-[#112244]/15"
                >
                  <option>Mañana</option>
                  <option>Tarde</option>
                </select>
              </label>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#112244] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#1a3366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#112244] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
          >
            {busy
              ? activeTab === "crear" ? "Creando cuenta…" : "Entrando…"
              : activeTab === "crear" ? "Crear cuenta" : "Entrar"}
          </button>
        </form>

        <nav aria-label="Accesos adicionales" className="mt-7 flex flex-col items-center gap-2 text-sm">
          <Link className="font-medium text-[#112244] hover:underline" to="/admin">
            Solo el panel de administración
          </Link>
          <Link className="font-medium text-[#112244] hover:underline" to="/ingreso">
            Reconocimiento facial para personal autorizado
          </Link>
        </nav>
      </section>
    </main>
  );
}
