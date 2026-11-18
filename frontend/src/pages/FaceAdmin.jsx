import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, Users, Clock, ArrowLeft, Trash2, CheckCircle2 } from 'lucide-react';

export default function Admin() {
  const [registros, setRegistros] = useState([]);

  useEffect(() => {
    const guardados = JSON.parse(localStorage.getItem('nexflor_asistencia') || '[]');
    setRegistros(guardados);
  }, []);

  const limpiarRegistros = () => {
    if (window.confirm("¿Estás seguro de borrar todo el historial de asistencia de Flores El Trigal?")) {
      localStorage.removeItem('nexflor_asistencia');
      setRegistros([]);
    }
  };

  const totalAsistentes = registros.length;
  const totalTardes = registros.filter(r => r.tarde).length;
  const totalPuntuales = totalAsistentes - totalTardes;

  return (
    <div className="max-w-4xl mx-auto p-6 text-white">
      <Link to="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-semibold mb-6">
        <ArrowLeft size={16} /> Volver al Inicio
      </Link>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Cabecera del Panel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-700 gap-4">
          <div>
            <span className="bg-emerald-600/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/30">
              Flores El Trigal - Administración
            </span>
            <h1 className="text-2xl font-bold mt-2 flex items-center gap-2">
              <Users className="text-emerald-400" /> Panel de Control y Alertas
            </h1>
          </div>
          {registros.length > 0 && (
            <button 
              onClick={limpiarRegistros}
              className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <Trash2 size={14} /> Limpiar Historial
            </button>
          )}
        </div>

        {/* Tarjetas de Resumen (Métricas) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-700 p-5 rounded-xl flex items-center gap-4">
            <div className="bg-blue-500/20 text-blue-400 p-3 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Registrados</p>
              <h3 className="text-2xl font-black text-white">{totalAsistentes}</h3>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-700 p-5 rounded-xl flex items-center gap-4">
            <div className="bg-emerald-500/20 text-emerald-400 p-3 rounded-xl">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Ingresos Puntuales</p>
              <h3 className="text-2xl font-black text-emerald-400">{totalPuntuales}</h3>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-700 p-5 rounded-xl flex items-center gap-4">
            <div className="bg-red-500/20 text-red-400 p-3 rounded-xl">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Alertas de Retraso</p>
              <h3 className="text-2xl font-black text-red-400">{totalTardes}</h3>
            </div>
          </div>
        </div>

        {/* Lista de Registros */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Clock size={16} className="text-emerald-400" /> Historial de Entradas (Turno Base: 6:00 a.m.)
          </h3>

          <div className="space-y-3">
            {registros.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-700/60">
                <p className="text-slate-500 text-xs">No hay registros de asistencia en este momento.</p>
              </div>
            ) : (
              registros.map((reg, idx) => (
                <div key={idx} className="bg-slate-900/60 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between border border-slate-700 gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <img src={reg.foto} alt="Colaborador" className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500" />
                    <div>
                      <h4 className="font-bold text-sm text-white">{reg.nombre}</h4>
                      <p className="text-slate-400">{reg.cargo} • Cédula: {reg.cedula}</p>
                      <p className="text-slate-300 mt-0.5">Hora de Check-in: <strong>{reg.hora}</strong></p>
                    </div>
                  </div>
                  <div>
                    {reg.tarde ? (
                      <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-3 py-1.5 rounded-full font-semibold flex items-center gap-1">
                        <AlertTriangle size={14} /> Tarde (Alerta de Retraso)
                      </span>
                    ) : (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded-full font-semibold flex items-center gap-1">
                        <ShieldCheck size={14} /> Puntual
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}