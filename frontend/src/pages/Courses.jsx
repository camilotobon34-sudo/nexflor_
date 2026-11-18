import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, Award, Scissors, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Course() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Base de datos interna para los 10 cursos de Flores El Trigal
  const contenidosCursos = {
    '1': {
      titulo: '1. Preparación y Nivelación de Camas',
      imagen: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
      teoria: 'Las camas de cultivo en Flores El Trigal deben mantenerse perfectamente niveladas y desinfectadas antes de la siembra. Esto evita encharcamientos, previene la proliferación de hongos radiculares y garantiza un crecimiento uniforme de los tallos florales.',
      pregunta: '¿Cuál es el objetivo principal de mantener las camas niveladas y desinfectadas?',
      opciones: [
        { label: 'Evitar encharcamientos y hongos radiculares', correcta: true },
        { label: 'Hacer que el suelo se vea estético', correcta: false }
      ]
    },
    '2': {
      titulo: '2. Técnica de Corte Preciso de Tallos',
      imagen: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
      teoria: 'El corte de tallos en campo debe realizarse con una inclinación exacta de 45 grados utilizando tijeras debidamente esterilizadas. Este ángulo maximiza el área de absorción de agua e hidratación durante el proceso de poscosecha.',
      pregunta: '¿A qué ángulo exacto se debe realizar el corte técnico del tallo?',
      opciones: [
        { label: 'A 90 grados (recto)', correcta: false },
        { label: 'A 45 grados con herramienta esterilizada', correcta: true }
      ]
    },
    '3': {
      titulo: '3. Estándares de Calidad en Poscosecha',
      imagen: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=800&q=80',
      teoria: 'En la central de poscosecha de Flores El Trigal, cada ramo se inspecciona rigurosamente evaluando la longitud del tallo, el grosor del botón floral, la firmeza del follaje y la ausencia total de plagas o daños mecánicos.',
      pregunta: '¿Qué se evalúa principalmente en la poscosecha de Flores El Trigal?',
      opciones: [
        { label: 'Longitud, grosor y ausencia de plagas', correcta: true },
        { label: 'El color del empaque exterior', correcta: false }
      ]
    },
    '4': {
      titulo: '4. Manejo y Control de Riego por Goteo',
      imagen: 'https://images.unsplash.com/photo-1592417817098-8f3d691a4bf5?auto=format&fit=crop&w=800&q=80',
      teoria: 'El sistema de riego por goteo optimiza el consumo hídrico y permite entregar la dosis exacta de nutrientes y minerales directamente a la raíz de las plantas según las condiciones climáticas del día.',
      pregunta: '¿Cuál es la ventaja principal del riego por goteo?',
      opciones: [
        { label: 'Optimizar agua y dosificar nutrientes directo a la raíz', correcta: true },
        { label: 'Inundar completamente los pasillos del cultivo', correcta: false }
      ]
    },
    '5': {
      titulo: '5. Ergonomía Preventiva en Campo',
      imagen: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80',
      teoria: 'Para evitar lesiones lumbares crónicas durante las labores agachadas en las camas de cultivo, el personal debe aplicar posturas con la espalda recta, flexión adecuada de rodillas y realizar pausas activas periódicas.',
      pregunta: '¿Cómo se debe proteger la columna al laborar en las camas de cultivo?',
      opciones: [
        { label: 'Manteniendo la espalda recta y flexionando rodillas', correcta: true },
        { label: 'Doblando completamente la cintura sin soporte', correcta: false }
      ]
    },
    '6': {
      titulo: '6. Control Biológico de Plagas',
      imagen: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
      teoria: 'La detección temprana de ácaros y trips permite aplicar controles biológicos y ecológicos sustentables, protegiendo el ecosistema local de El Carmen de Viboral y la salud de los trabajadores.',
      pregunta: '¿Por qué es importante la detección temprana de plagas?',
      opciones: [
        { label: 'Para aplicar controles ecológicos y proteger el cultivo', correcta: true },
        { label: 'Para ignorarlas hasta que el daño sea total', correcta: false }
      ]
    },
    '7': {
      titulo: '7. Protocolos de Bioseguridad y Aseo',
      imagen: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
      trigo: 'La desinfección estricta de calzado, manos y herramientas de corte antes de ingresar a los bloques de producción evita la propagación cruzada de bacterias y virus vegetales.',
      pregunta: '¿Cuándo se deben desinfectar las herramientas y manos?',
      opciones: [
        { label: 'Antes de ingresar a los bloques de producción', correcta: true },
        { label: 'Únicamente al finalizar la semana laboral', correcta: false }
      ]
    },
    '8': {
      titulo: '8. Manejo de Cadena de Frío',
      imagen: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      teoria: 'Tras el corte, las flores deben ingresar rápidamente a los cuartos fríos especializados para reducir su tasa de respiración metabólica y garantizar una excelente durabilidad en el florero del cliente final.',
      pregunta: '¿Cuál es la función del cuarto frío en la poscosecha?',
      opciones: [
        { label: 'Reducir la respiración de la flor y alargar su vida útil', correcta: true },
        { label: 'Congelar las hojas para que queden rígidas', correcta: false }
      ]
    },
    '9': {
      titulo: '9. Clasificación por Calibre y Longitud',
      imagen: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80',
      teoria: 'Los tallos se agrupan utilizando mallas calibradoras oficiales según su longitud en centímetros y grosor del tallo, cumpliendo con los exigentes requerimientos del mercado de exportación internacional.',
      pregunta: '¿Qué se utiliza para agrupar los tallos según sus medidas?',
      opciones: [
        { label: 'Mallas y reglas calibradoras oficiales', correcta: true },
        { label: 'Cálculos al ojo sin herramientas', correcta: false }
      ]
    },
    '10': {
      titulo: '10. Empaque y Embalaje de Exportación',
      imagen: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=800&q=80',
      teoria: 'El embalaje final incluye protectores de cartón corrugado, encerado adecuado y ventilación estratégica en las cajas para soportar la logística de transporte aéreo internacional sin daños.',
      pregunta: '¿Qué se busca garantizar con el correcto embalaje de exportación?',
      opciones: [
        { label: 'Que el producto llegue en perfecto estado a nivel internacional', correcta: true },
        { label: 'Reducir el peso de las cajas a cero kilogramos', correcta: false }
      ]
    }
  };

  const cursoActual = contenidosCursos[id] || contenidosCursos['1'];

  const [leido, setLeido] = useState(false);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null);
  const [quizAprobado, setQuizAprobado] = useState(false);

  const verificarRespuesta = (esCorrecta) => {
    setRespuestaSeleccionada(esCorrecta);
    if (esCorrecta) {
      setQuizAprobado(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 text-white">
      <Link to="/cursos" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-semibold mb-6">
        <ArrowLeft size={16} /> Volver a la Malla Curricular
      </Link>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl p-8 space-y-6">
        
        {/* Cabecera del Curso */}
        <div>
          <span className="bg-emerald-600/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/30">
            Curso Técnico #{id} - Flores El Trigal
          </span>
          <h1 className="text-2xl font-bold mt-3">{cursoActual.titulo}</h1>
        </div>

        {/* Imagen Ilustrativa */}
        <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-700">
          <img src={cursoActual.imagen} alt="Referencia de cultivo" className="w-full h-full object-cover" />
        </div>

        {/* Contenido Teórico */}
        <div className="bg-slate-700/40 p-5 rounded-xl border border-slate-600/50 space-y-3">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={18} /> Contenido Teórico Oficial
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">{cursoActual.teoria}</p>
        </div>

        {/* Check de lectura */}
        <label className="flex items-center gap-3 cursor-pointer pt-2">
          <input 
            type="checkbox" 
            checked={leido} 
            onChange={e => setLeido(e.target.checked)}
            className="w-5 h-5 accent-emerald-500 rounded"
          />
          <span className="text-sm font-medium">He comprendido el material teórico de este módulo</span>
        </label>

        {/* Evaluación (Quiz) - Se activa al marcar el check */}
        {leido && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <Award size={18} /> Evaluación del Módulo
            </h3>
            <p className="text-sm text-slate-200">{cursoActual.pregunta}</p>
            
            <div className="space-y-2">
              {cursoActual.opciones.map((op, idx) => (
                <button
                  key={idx}
                  onClick={() => verificarRespuesta(op.correcta)}
                  className={`w-full text-left p-3 rounded-lg text-xs font-medium transition border ${
                    respuestaSeleccionada === null 
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-white' 
                      : op.correcta 
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200 font-bold' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 opacity-50'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>

            {quizAprobado && (
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 size={16} /> ¡Evaluación aprobada con éxito!
                </span>
                <Link 
                  to={`/cursos/${id}/juego`} 
                  className="w-sm sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  Ir al Minijuego de Práctica <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}