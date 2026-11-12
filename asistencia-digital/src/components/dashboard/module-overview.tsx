import { Activity, CalendarDays, ClipboardCheck, Clock3, FileBarChart, Settings2, Users } from "lucide-react";
import { emptyStateCopy } from "@/lib/module-copy";
import { EmptyState } from "./empty-state";
import { SectionHeader } from "./section-header";
import { StorageNotice } from "./storage-notice";

const emptyModules = {
  asistencias: { title: "Registro de asistencias", description: "Consulta los registros de participación de tus capacitaciones.", icon: ClipboardCheck, eyebrow: "CONTROL DE PARTICIPACIÓN" },
  historial: { title: "Historial", description: "Revisa las actividades y asistencias de eventos anteriores.", icon: Clock3, eyebrow: "REGISTRO HISTÓRICO" },
  reportes: { title: "Reportes", description: "Explora resúmenes e indicadores de tus jornadas de formación.", icon: FileBarChart, eyebrow: "ANÁLISIS Y SEGUIMIENTO" },
  configuracion: { title: "Configuración", description: "Administra las preferencias y los datos del sistema.", icon: Settings2, eyebrow: "PREFERENCIAS DEL SISTEMA" },
  trainer: { title: "Asistencia del evento", description: "Consulta la participación registrada durante las jornadas que diriges.", icon: CalendarDays, eyebrow: "ESPACIO DEL ENTRENADOR" },
  participantes: { title: "Participantes", description: "Importa una hoja de Excel o prepara un registro manual.", icon: Users, eyebrow: "DIRECTORIO DE PERSONAS" },
  actividad: { title: "Actividad reciente", description: "Consulta los movimientos más recientes en tu sistema.", icon: Activity, eyebrow: "MOVIMIENTOS DEL SISTEMA" },
} as const;

export type EmptyModule = keyof typeof emptyModules;

export function ModuleOverview({ module }: { module: EmptyModule }) {
  const config = emptyModules[module];
  const Icon = config.icon;

  return (
    <section>
      <SectionHeader
        description={config.description}
        eyebrow={config.eyebrow}
        icon={Icon}
        title={config.title}
      />
      <StorageNotice />
      <div className="dashboard-panel module-overview-panel">
        <div className="module-overview-top">
          <div>
            <p className="panel-kicker">SIN CONEXIÓN A DATOS</p>
            <h2>{emptyStateCopy[module].title}</h2>
            <p>{emptyStateCopy[module].description}</p>
          </div>
          <span className="module-overview-icon"><Icon aria-hidden="true" size={23} /></span>
        </div>
        <EmptyState
          icon={Icon}
          title="Aún no hay datos para mostrar"
          description="La lista y sus acciones estarán disponibles cuando la autenticación y la conexión segura con Supabase estén configuradas."
        />
      </div>
    </section>
  );
}
