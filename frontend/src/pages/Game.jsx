import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Scissors, CheckCircle2, RotateCcw, ArrowLeft, Award } from 'lucide-react';

export default function Game() {
  const { id } = useParams();
  const [tallosCortados, setTallosCortados] = useState(0);
  const [juegoTerminado, setJuegoTerminado] = useState(false);

  const metaTallos = 10;

  const cortarTallo = () => {
    if (tallosCortados < metaTallos) {
      const nuevoTotal = tallosCortados + 1;
      setTallosCortados(nuevoTotal);
      if (nuevoTotal === metaTallos) {
        setJuegoTerminado(true);
      }
    }
  };

  const reiniciarJuego = () => {
    setTallosCortados(0);
    setJuegoTerminado(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">
      <Link to={`/cursos/${id}`} className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-semibold mb-6">
        <ArrowLeft size={16} /> Volver al Curso
      </Link>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        
        {!juegoTerminado ? (
          <>
            <div>
              <span className="bg-emerald-600/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/30">
                Minijuego de Práctica - Módulo #{id}
              </span>
              <h1 className="text-2xl font-bold mt-3">Simulación de Corte Técnico</h1>
              <p className="text-slate-400 text-xs mt-1">
                Haz clic repetidamente en el botón para realizar el corte angular de los tallos en la línea de producción de Flores El Trigal.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl my-6">
              <div className="text-6xl font-black text-emerald-400 tracking-wider">
                {tallosCortados} <span className="text-2xl text-slate-500">/ {metaTallos}</span>
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-widest mt-2">Tallos Procesados Correctamente</p>
            </div>

            <button 
              onClick={cortarTallo}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Scissors size={24} /> ¡Cortar Tallo a 45°!
            </button>
          </>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            <CheckCircle2 className="mx-auto text-emerald-400" size={64} />
            <div>
              <h2 className="text-2xl font-bold">¡Práctica Superada con Éxito!</h2>
              <p className="text-emerald-200 text-xs mt-1">
                Has demostrado excelente destreza y precisión técnica en las labores de campo.
              </p>
            </div>

            {/* SILUETA DE EL TRIGAL */}
            <div className="bg-gradient-to-b from-emerald-950 to-emerald-900 border border-emerald-600/40 p-8 rounded-2xl relative overflow-hidden shadow-inner">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
              <Award className="mx-auto text-emerald-400 mb-2" size={32} />
              <h3 className="text-emerald-300 font-bold tracking-widest uppercase text-xs mb-1">Certificación Oficial NEXFLOR</h3>
              <div className="text-5xl my-2">🌾🏛️🌾</div>
              <p className="text-white font-black text-xl tracking-wide mt-1">FLORES EL TRIGAL</p>
              <p className="text-emerald-300 text-xs mt-1">Excelencia Agroindustrial • El Carmen de Viboral, Antioquia</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                onClick={reiniciarJuego}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <RotateCcw size={16} /> Jugar de Nuevo
              </button>
              <Link 
                to="/cursos"
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                Ver más Cursos
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}