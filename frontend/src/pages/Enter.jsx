import React, { useState } from "react";
import { loginWorker } from "../api.js";

export default function Enter() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    const success = loginWorker(email, password);
    if (success) {
      // Forzamos la recarga directa a la raiz para entrar sin bloqueos
      window.location.href = "/";
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-slate-900 font-fraunces">
          NEXFLOR Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sistema Agroindustrial Inteligente • Flores El Trigal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Correo Electrónico
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. julian.aguirre@trigal.com"
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-xs">Por favor introduce tus credenciales.</p>
            )}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
              >
                Iniciar Sesión
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
            <a href="/admin" className="text-emerald-600 hover:underline">Panel administrativo</a>
            <a href="/id" className="text-emerald-600 hover:underline">NEXFLOR ID (Acceso facial)</a>
          </div>
        </div>
      </div>
    </div>
  );
}