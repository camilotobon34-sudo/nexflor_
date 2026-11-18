import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ShieldCheck, AlertTriangle, Users, Clock, ArrowLeft } from 'lucide-react';

export default function Face() {
  const videoRef = useRef(null);
  const [foto, setFoto] = useState(null);
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [cargo, setCargo] = useState('Trabajador Operativo');
  const [vistaAdmin, setVistaAdmin] = useState(false);
  const [registros, setRegistros] = useState([]);

  useEffect(() => {
    const guardados = JSON.parse(localStorage.getItem('nexflor_asistencia') || '[]');
    setRegistros(guardados);
  }, []);

  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("No se pudo acceder a la cámara web. Verifica los permisos del navegador.");
    }
  };

  const tomarFoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 320;
      canvas.height = videoRef.current.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setFoto(canvas.toDataURL('image/png'));
      }
    }
  };

  const registrarIngreso = (e) => {
    e.preventDefault();
    if (!nombre || !cedula || !foto) {
      alert("Por favor completa los campos y tómate la foto en vivo.");
      return;
    }

    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutoActual = ahora.getMinutes();
    
    // Regla institucional de puntualidad: Base a las 6:00 a.m.
    const esTarde = horaActual > 6 || (horaActual === 6 && minutoActual > 0);

    const nuevoRegistro = {
      nombre,
      cedula,
      cargo,
      foto,
      hora: ahora.toLocaleTimeString(),
      tarde: esTarde
    };

    const actualizados = [nuevoRegistro, ...registros];
    setRegistros(actualizados);
    localStorage.setItem('nexflor_asistencia', JSON.stringify(actualizados));
    
    alert(esTarde ? "⚠️ Ingreso registrado con RETRASO (Alerta enviada al panel del administrador)." : "✅ ¡Ingreso puntual registrado con éxito en Flores El Trigal!");
    
    setNombre('');
    setCedula('');
    setFoto(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">
      <Link to="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-semibold mb-6">
        <ArrowLeft size={16} /> Volver al Inicio
      </Link>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl space-y-6">
        
        <div className="flex justify-between items-center pb-4 border-b border-slate-700">
          <div>
            <span className="bg-emerald-600/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/30">
              Flores El Trigal
            </span>
            <h1 className="text-2xl font-bold mt-2">NEXFLOR Id - Control de Asistencia</h1>
          </div>
          <button 
            onClick={() => setVistaAdmin(!vistaAdmin)}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <Users size={16} /> {vistaAdmin ? 'Ir a Registro' : 'Panel Admin'}
          </button>
        </div>

        {!vistaAdmin ? (
          <form onSubmit={registrarIngreso} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Nombre Completo del Colaborador</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={e => setNombre(e.target.value)} 
                required 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none" 
                placeholder="Ej. Camilo Tobón" 
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Número de Cédula</label>
              <input 
                type="text" 
                value={cedula} 
                onChange={e => setCedula(e.target.value)} 
                required 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none" 
                placeholder="Ej. 1012345678" 
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Cargo en el Cultivo</label>
              <select 
                value={cargo} 
                onChange={e => setCargo(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none"
              >
                <option value="Trabajador Operativo">Trabajador Operativo</option>
                <option value="Supervisor de Campo">Supervisor de Campo</option>
                <option value="Gerente">Gerente</option>
                <option value="Personal Administrativo">Personal Administrativo</option>
              </select>
            </div>

            <div className="space-y-2 pt-2">
              <button 
                type="button" 
                onClick={iniciarCamara} 
                className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
              >
                <Camera size={16} /> Encender Cámara Web
              </button>

              <div className="relative bg-black rounded-xl overflow-hidden h-44 flex items-center justify-center border border-slate-700">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>

              <button 
                type="button" 
                onClick={tomarFoto} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl text-xs font-semibold transition"
              >
                Capturar Fotografía en Vivo
              </button>
              {foto && <p className="text-emerald-400 text-xs font-medium text-center">✓ Fotografía vinculada correctamente</p>}
            </div>

            <button 
              type="submit" 
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition shadow-lg mt-4"
            >
              Registrar Check-in (Hora Base: 6:00 a.m.)
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <Clock size={16} /> Panel de Administración y Alertas en Tiempo Real
            </h2>
            <p className="text-xs text-slate-400">Control de puntualidad comparado con el turno de las 6:00 a.m. y ausentismo.</p>

            <div className="space-y-3 mt-4">
              {registros.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-10">No hay registros de asistencia guardados en este navegador.</p>
              ) : (
                registros.map((reg, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-4 rounded-xl flex items-center justify-between border border-slate-700 text-xs">
                    <div className="flex items-center gap-3">
                      <img src={reg.foto} alt="Colaborador" className="w-12 h-12 rounded-full object-cover border border-emerald-500" />
                      <div>
                        <h4 className="font-bold text-sm text-white">{reg.nombre}</h4>
                        <p className="text-slate-400">{reg.cargo} • Cédula: {reg.cedula}</p>
                        <p className="text-slate-300 mt-0.5">Ingreso: <strong>{reg.hora}</strong></p>
                      </div>
                    </div>
                    <div>
                      {reg.tarde ? (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                          <AlertTriangle size={12} /> Tarde (Alerta)
                        </span>
                      ) : (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                          <ShieldCheck size={12} /> Puntual
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}