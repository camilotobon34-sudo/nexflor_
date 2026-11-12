import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  FileBarChart,
  Settings2,
  UserRound,
  Users,
} from "lucide-react";

export type AdminSection =
  | "inicio"
  | "empresas"
  | "participantes"
  | "entrenadores"
  | "eventos"
  | "asistencias"
  | "historial"
  | "reportes"
  | "configuracion";

export type DashboardNavigationItem = {
  id: AdminSection;
  label: string;
  icon: LucideIcon;
  href: string;
};

export const adminNavigation: DashboardNavigationItem[] = [
  { id: "inicio", label: "Inicio", icon: BarChart3, href: "/admin" },
  { id: "empresas", label: "Empresas", icon: Building2, href: "/admin/empresas" },
  { id: "participantes", label: "Participantes", icon: Users, href: "/admin/participantes" },
  { id: "entrenadores", label: "Entrenadores", icon: UserRound, href: "/admin/entrenadores" },
  { id: "eventos", label: "Eventos", icon: CalendarDays, href: "/admin/eventos" },
  { id: "asistencias", label: "Registro de asistencias", icon: ClipboardCheck, href: "/admin/asistencias" },
  { id: "historial", label: "Historial", icon: Clock3, href: "/admin/historial" },
  { id: "reportes", label: "Reportes", icon: FileBarChart, href: "/admin/reportes" },
  { id: "configuracion", label: "Configuración", icon: Settings2, href: "/admin/configuracion" },
];

export type EntityRecord = {
  id: string;
  name: string;
  createdAt: string;
  status: string;
  company?: string;
  eventDate?: string;
  trainer?: string;
  trainerCode?: string;
};

export type EntityField = {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  type?: "text" | "date" | "select";
  options?: string[];
  help?: string;
};

export const entityModules = {
  empresas: {
    title: "Empresas",
    description: "Administra las organizaciones asociadas a tus jornadas de formación.",
    singular: "empresa",
    newLabel: "Nueva empresa",
    icon: Building2,
    columns: ["Empresa", "Estado", "Fecha de creación"],
    searchPlaceholder: "Buscar empresa...",
    fields: [
      { name: "name", label: "Nombre de la empresa", placeholder: "Nombre de la empresa", required: true },
      { name: "status", label: "Estado", placeholder: "Selecciona un estado", type: "select", options: ["Activa", "Inactiva"], required: true },
    ],
  },
  entrenadores: {
    title: "Entrenadores",
    description: "Consulta los perfiles y códigos maestros de quienes lideran las jornadas.",
    singular: "entrenador",
    newLabel: "Nuevo entrenador",
    icon: UserRound,
    columns: ["Entrenador", "Código maestro", "Estado", "Fecha de creación"],
    searchPlaceholder: "Buscar entrenador...",
    fields: [
      { name: "name", label: "Nombre del entrenador", placeholder: "Nombre completo", required: true },
      { name: "status", label: "Estado", placeholder: "Selecciona un estado", type: "select", options: ["Activo", "Inactivo"], required: true },
    ],
  },
  eventos: {
    title: "Eventos",
    description: "Organiza una capacitación y consulta la empresa y el entrenador responsable.",
    singular: "evento",
    newLabel: "Nuevo evento",
    icon: CalendarDays,
    columns: ["Evento", "Empresa", "Fecha", "Entrenador", "Estado"],
    searchPlaceholder: "Buscar evento...",
    fields: [
      { name: "name", label: "Nombre del evento", placeholder: "Nombre de la capacitación", required: true },
      { name: "company", label: "Empresa asociada", placeholder: "Conecta Supabase para cargar empresas", type: "select", disabled: true, help: "Las empresas se cargarán de forma segura desde Supabase." },
      { name: "date", label: "Fecha del evento", placeholder: "", type: "date", required: true },
      { name: "trainer", label: "Entrenador responsable", placeholder: "Conecta Supabase para cargar entrenadores", type: "select", disabled: true, help: "Los entrenadores se cargarán desde sus perfiles guardados." },
      { name: "status", label: "Estado", placeholder: "Selecciona un estado", type: "select", options: ["Programado", "En curso", "Finalizado", "Cancelado"], required: true },
    ],
  },
} satisfies Record<
  "empresas" | "entrenadores" | "eventos",
  {
    title: string;
    description: string;
    singular: string;
    newLabel: string;
    icon: LucideIcon;
    columns: string[];
    searchPlaceholder: string;
    fields: EntityField[];
  }
>;
