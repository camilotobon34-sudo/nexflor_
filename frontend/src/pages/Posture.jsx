import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertOctagon, CheckCircle, Volume2, ArrowLeft } from 'lucide-react';

export default function Posture() {
  const [alertaActiva, setAlertaActiva] = useState(false);
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);

  const iniciarPitido = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Crear oscilador para el tono de alerta fuerte en campo
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Frecuencia de alerta
      gain.gain.setValueAtTime(0.2, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      oscRef.current = osc;
      setAlertaActiva(true);
    } catch (e) {
      console.error("Error al reproducir audio de alerta:", e);
    }
  };

  const detenerPitido = () => {
    if (oscRef.current) {
      oscRef.current.stop();
      oscRef.current.disconnect();
      oscRef.current = null;
    }
    setAlertaActiva(false);
  };

  return (
    <div className={`min-h-screen p-6 transition-colors duration-300 ${alertaActiva ? 'bg-red-950 text-white' : 'bg-slate-900 text-white'}`}>
      <div className="max-w-xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-semibold mb-6">
          <ArrowLeft size={16} /> Volver al Inicio
        </Link>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl space-y-6">
          
          <div className="flex justify-between items-center pb-4 border-b border-slate-700">
            <div>
              <span className="bg-emerald-600/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/30">
                Flores El Trigal
              </span>
              <h1 className="text-2xl font-bold mt-2">NEXFLOR Posture</h1>
            </div>
            <span className="text-xs text-slate-400">Salud Ocupacional</span>
          </div>

          <p className="text-slate-300 text-xs leading-relaxed">
            Sistema preventivo de ergonomía diseñado para mitigar lesiones lumbares y fatiga muscular durante las labores agachadas o de esfuerzo en las camas de cultivo.
          </p>

          {/* Panel Visual de Alerta */}
          <div className={`p-6 rounded-2xl border text-center transition-all ${
            alertaActiva 
              ? 'bg-red-600/30 border-red-500 animate-pulse' 
              : 'bg-slate-900/60 border-slate-700'
          }`}>
            {alertaActiva ? (
              <div className="space-y-3">
                <AlertOctagon className="mx-auto text-red-400 animate-bounce" size={48} />
                <h2 className="text-lg font-bold text-red-300">¡ALERTA CRÍTICA DE POSTURA!</h2>
                <p className="text-xs text-red-200">Riesgo ergonómico lumbar detectado en campo. ¡Endereza tu espalda de inmediato!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <CheckCircle className="mx-auto text-emerald-400" size={48} />
                <h2 className="text-lg font-bold text-emerald-300">Postura Ergonómica Correcta</h2>
                <p className="text-xs text-slate-400">Monitoreo activo. Mantén la columna recta y usa apoyo adecuado.</p>
              </div>
            )}
          </div>

          {/* Controles de Simulación Didáctica */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Simulación Didáctica en Tiempo Real:</p>
            
            {!alertaActiva ? (
              <button 
                onClick={iniciarPitido}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition text-sm"
              >
                <Volume2 size={20} /> Simular Mala Postura (Activar Pitido y Alerta)
              </button>
            ) : (
              <button 
                onClick={detenerPitido}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition text-sm"
              >
                <Activity size={20} /> Corregir Postura (Silenciar Alerta)
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}