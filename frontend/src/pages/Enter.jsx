import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, UserPlus, LogIn, ArrowRight } from 'lucide-react';

export default function Enter() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!correo || !password) {
      alert("Por favor completa todos los campos.");
      return;
    }

    if (isLogin) {
      // Simular inicio de sesión exitoso
      localStorage.setItem('nexflor_token', 'token_activo_local');
      alert("¡Bienvenido de nuevo a NEXFLOR!");
      navigate('/');
    } else {
      // Simular registro exitoso
      localStorage.setItem('nexflor_token', 'token_activo_local');
      alert("¡Cuenta creada con éxito en Flores El Trigal!");
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl max-w-md w-full space-y-6">
        
        <div className="text-center space-y-2">
          <span className="bg-emerald-600/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/30">
            Flores El Trigal
          </span>
          <h1 className="text-2xl font-black mt-2">NEXFLOR Portal</h1>
          <p className="text-slate-400 text-xs">Sistema Agroindustrial Inteligente</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium mb-1">Nombre Completo</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={e => setNombre(e.target.value)} 
                required={!isLogin}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none" 
                placeholder="Ej. Camilo Tobón" 
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              value={correo} 
              onChange={e => setCorreo(e.target.value)} 
              required 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none" 
              placeholder="tu.correo@trigal.com" 
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none" 
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 mt-2"
          >
            {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="text-center pt-2 space-y-2 border-t border-slate-700">
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>

          <div className="flex justify-center gap-4 text-xs pt-2 text-slate-400">
            <Link to="/admin" className="hover:text-white underline">Solo el panel de administración</Link>
            <span>•</span>
            <Link to="/id" className="hover:text-white underline">NEXFLOR ID (Acceso facial)</Link>
          </div>
        </div>

      </div>
    </div>
  );
}