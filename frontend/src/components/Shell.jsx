import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logoutWorker, useApi } from "../api.js";

const groups = [
  {
    label: "Taller",
    links: [
      { to: "/", label: "Inicio", end: true, icon: HomeIcon },
      { to: "/cursos", label: "Cursos", icon: BookIcon },
      { to: "/practica/safe-preparation", label: "Práctica", icon: CheckIcon },
    ],
  },
  {
    label: "Seguimiento",
    links: [
      { to: "/equipo", label: "Equipo", icon: PeopleIcon },
      { to: "/progreso", label: "Progreso", icon: ChartIcon },
    ],
  },
  {
    label: "Herramientas",
    links: [
      { to: "/posture", label: "Nexflor Posture", icon: PostureIcon },
      { to: "/id", label: "Nexflor ID", icon: FaceIcon },
    ],
  },
];
const links = groups.flatMap((group) => group.links);

export default function Shell() {
  const me = useApi("/me");
  const navigate = useNavigate();

  function leave() {
    logoutWorker();
    navigate("/entrar");
  }
  const formatted = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const today = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex">
        <div className="mb-8 rounded-xl bg-[#112244] p-3">
          <img className="w-full rounded-lg" src="/logo-trigal.png" alt="Flores El Trigal" />
        </div>
        <nav aria-label="Navegación principal" className="flex-1 space-y-6">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{group.label}</h2>
              <div className="space-y-1">
                {group.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive ? "bg-[#112244] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-[#112244]"
                    }`}
                  >
                    <link.icon />
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>
        <NavLink to="/admin" className="mb-5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-[#112244] hover:bg-slate-50">Administrar</NavLink>
        <div className="rounded-xl bg-slate-100 p-3">
          <p className="text-xs font-medium text-slate-500">Cuenta activa</p>
          <strong className="mt-1 block text-sm">{me.data?.fullName || "Trabajador"}</strong>
          <span className="text-xs text-slate-500">{me.data?.role || "Flores El Trigal"}</span>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <img className="w-28 rounded md:hidden" src="/logo-trigal.png" alt="Flores El Trigal" />
          <p className="hidden flex-1 text-sm text-slate-500 sm:block">{today}</p>
          <NavLink to="/admin" className="hidden text-sm font-semibold text-[#112244] hover:underline md:block">Administrar</NavLink>
          <button type="button" className="text-sm font-medium text-slate-600 hover:text-red-700" onClick={leave}>Salir</button>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#112244] text-xs font-bold text-white">{me.data?.initials || "FT"}</span>
            <div>
              <strong className="block text-xs">{me.data?.fullName || "Trabajador"}</strong>
              <small className="text-xs text-slate-500">{me.data?.role || "Flores El Trigal"}</small>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 md:pb-8">
          <Outlet />
        </main>
      </div>
      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-slate-200 bg-white px-2 py-2 md:hidden">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `flex min-w-[72px] flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center text-[10px] ${
              isActive ? "text-[#112244]" : "text-slate-500"
            }`}
          >
            <link.icon />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Status({ loading, error, children }) {
  if (loading) return <p className="status">Cargando el taller…</p>;
  if (error) return <p className="status error">{error}. Revisa que la API esté en el puerto 4000.</p>;
  return children;
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4.5h9.5A3.5 3.5 0 0 1 18 8v12H8.5A3.5 3.5 0 0 0 5 16.5z" />
      <path d="M5 4.5A3.5 3.5 0 0 1 8.5 8H18" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="9" r="3" />
      <path d="M4.5 19c.6-2.4 2.4-3.5 4.5-3.5s3.9 1.1 4.5 3.5" />
      <circle cx="17" cy="9.5" r="2.2" />
      <path d="M16 15.6c1.4.3 2.5 1.2 3.1 3" />
    </svg>
  );
}
function FaceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="10" r="3.2" />
      <path d="M6 19c.8-2.4 2.8-3.6 6-3.6s5.2 1.2 6 3.6" />
      <path d="M5 8V5.5h2.5M19 8V5.5h-2.5M5 13v2.5h2.5M19 13v2.5h-2.5" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 19V9M10 19V5M15 19v-7M20 19V8" />
    </svg>
  );
}
function PostureIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="5" r="2.6" />
      <path d="M8.5 9.5c1.2-1.5 2.2-2.2 3.5-2.2s2.3.7 3.5 2.2l1.2 3.8c.2.7.3 1.4.3 2.1v1.5H7V15.5c0-.7.1-1.4.3-2.1z" />
      <path d="M12 11.5v4.5M9.5 15.5h5" />
    </svg>
  );
}
