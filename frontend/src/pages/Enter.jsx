import React, { useState } from "react";
import { loginWorker } from "../api.js";

export default function Enter() {
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("entrar"); // 'entrar', 'crear', 'admin'
  const [error, setError] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    const success = loginWorker(nombre, password);
    if (success) {
      window.location.href = "/";
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-lg border border-slate-100 p-8 sm:p-12 flex flex-col items-center">
        
        {/* LOGO FLORES EL TRIGAL */}
        <div className="bg-[#112244] w-48 py-3 px-4 rounded-xl flex flex-col items-center justify-center shadow-md mb-8">
          <div className="flex items-center space-x-1 mb-1">
            {/* Icono de trigo estilizado */}
            <svg className="w-5 h-5 text-[#facc15]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.78L11 15.5v1.5c0 .55.45 1 1 1v1.93zm6-6.93c0 2.21-.9 4.21-2.35 5.65-.35-.77-1.12-1.35-2.03-1.45V15c0-.55-.45-1-1-1h-2v-2h1c.55 0 1-.45 1-1V9h2c.55 0 1-.45 1-1V6.35c2.18 1.15 3.35 3.39 3.35 4.65z"/>
            </svg>
          </div>
          <span className="text-white text-[10px] tracking-[0.25em] uppercase font-serif">Flores</span>
          <span className="text-[#facc15] text-sm tracking-[0.2em] uppercase font-serif font-bold">El Trigal</span>
        </div>

        {/* TÍTULO Y DESCRIPCIÓN */}
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mb-2 text-center">
          Entrar al taller
        </h1>
        <p className="text-slate-600 text-sm text-center mb-8 max-w-sm">
          Entra con la cuenta que ya creaste. Si todavía no tienes, créala primero.
        </p>

        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="flex bg-slate-50 p-1.5 rounded-full border border-slate-200 mb-8 w-full max-w-xs justify-between">
          <button
            type="button"
            onClick={() => setActiveTab("entrar")}
            className={`flex-1 py-2 text-xs font-medium rounded-full transition-all ${
              activeTab === "entrar"
                ? "bg-[#112244] text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("crear");
              window.location.href = "/ingreso"; // Ajusta si tienes ruta de registro
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-full transition-all ${
              activeTab === "crear"
                ? "bg-[#112244] text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Crear cuenta
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("admin");
              window.location.href = "/admin";
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-full transition-all ${
              activeTab === "admin"
                ? "bg-[#112244] text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Administrador
          </button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              Nombre
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre o correo"
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#112244] focus:border-transparent transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#112244] focus:border-transparent transition-all shadow-sm"
            />
          </div>

          {error && (
            <p className="text-red-600 text-xs text-center">Por favor verifica tus datos de acceso.</p>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#112244] hover:bg-[#1a3366] text-white text-sm font-medium rounded-xl shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#112244] mt-2"
          >
            Entrar
          </button>
        </form>

        {/* ENLACES INFERIORES */}
        <div className="mt-8 flex flex-col items-center space-y-2 text-xs">
          <a href="/admin" className="text-[#112244] hover:underline font-medium">
            Solo el panel de administración
          </a>
          <a href="/id" className="text-[#112244] hover:underline font-medium">
            Reconocimiento facial para personal autorizado
          </a>
        </div>

      </div>
    </div>
  );
}