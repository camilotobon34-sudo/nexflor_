import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "./empty-state";
import { StorageNotice } from "./storage-notice";

const metrics = [
  { label: "Total de participantes", value: 0, icon: Users, detail: "Personas registradas", color: "blue" },
  { label: "Total de entrenadores", value: 0, icon: UserRound, detail: "Perfiles activos", color: "violet" },
  { label: "Eventos realizados", value: 0, icon: CalendarDays, detail: "Jornadas completadas", color: "cyan" },
  { label: "Asistencias registradas", value: 0, icon: ClipboardCheck, detail: "Registros en el sistema", color: "green" },
];

export function AdminHome() {
  const shortcuts = [
    { label: "Agregar participantes", description: "Carga un archivo o regístralos manualmente.", href: "/admin/participantes", icon: Users },
    { label: "Crear evento", description: "Organiza una capacitación.", href: "/admin/eventos", icon: CalendarDays },
    { label: "Registrar empresa", description: "Administra una organización.", href: "/admin/empresas", icon: Building2 },
  ];

  return (
    <div className="admin-home">
      <StorageNotice />
      <section aria-label="Indicadores administrativos" className="metric-grid">
        {metrics.map(({ label, value, icon: Icon, detail, color }) => (
          <article className={`metric-card metric-${color}`} key={label}>
            <div className="metric-card-top">
              <span className="metric-icon"><Icon aria-hidden="true" size={19} strokeWidth={1.8} /></span>
              <span className="metric-empty-badge">Sin datos</span>
            </div>
            <p>{label}</p>
            <strong>{value}</strong>
            <span className="metric-detail">{detail} · Sin registros</span>
          </article>
        ))}
      </section>

      <section aria-label="Asistencias recientes" className="overview-grid">
        <article className="dashboard-panel chart-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">VISTA GENERAL</p>
              <h2>Actividad de asistencias</h2>
            </div>
            <span className="period-pill"><Activity aria-hidden="true" size={13} /> Sin actividad</span>
          </div>
          <div className="chart-placeholder">
            <div aria-hidden="true" className="chart-axis-labels">
              <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
            </div>
            <div aria-hidden="true" className="chart-grid">
              <span /><span /><span /><span /><span />
              <div className="chart-no-data">
                <span><BarChart3 aria-hidden="true" size={20} /></span>
                <strong>Aún no hay asistencias</strong>
                <small>El gráfico aparecerá cuando existan registros.</small>
              </div>
            </div>
            <div aria-hidden="true" className="chart-x-labels">
              <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
            </div>
          </div>
          <p className="chart-caption">Conteo diario · Disponible al conectar Supabase</p>
        </article>

        <article className="dashboard-panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">LO MÁS RECIENTE</p>
              <h2>Actividad reciente</h2>
            </div>
            <span className="activity-icon"><Activity aria-hidden="true" size={16} /></span>
          </div>
          <EmptyState
            icon={ClipboardCheck}
            title="Todo está por comenzar"
            description="Aquí aparecerán las actividades recientes una vez que se conecte el sistema."
          />
        </article>
      </section>

      <section aria-labelledby="shortcuts-heading" className="shortcut-section">
        <div className="shortcut-title">
          <div>
            <p className="panel-kicker">PARA EMPEZAR</p>
            <h2 id="shortcuts-heading">Accesos rápidos</h2>
          </div>
          <Link className="text-navigation-link" href="/admin/participantes">
            Explorar el sistema <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        </div>
        <div className="shortcut-grid">
          {shortcuts.map(({ label, description, href, icon: Icon }) => (
            <Link aria-label={`${label}. ${description}`} className="shortcut-card" href={href} key={href}>
              <span className="shortcut-icon"><Icon aria-hidden="true" size={18} /></span>
              <span className="shortcut-copy"><strong>{label}</strong><small>{description}</small></span>
              <ArrowUpRight aria-hidden="true" className="shortcut-arrow" size={17} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
