export type EmptyModule =
  | "asistencias"
  | "historial"
  | "reportes"
  | "configuracion"
  | "trainer"
  | "participantes"
  | "actividad";

export const emptyStateCopy: Record<EmptyModule, { title: string; description: string }> = {
  asistencias: {
    title: "El registro está preparado",
    description: "Los registros de asistencia aparecerán en esta vista tras habilitar el almacenamiento.",
  },
  historial: {
    title: "Tu historial está por comenzar",
    description: "Las capacitaciones completadas y sus participantes podrán consultarse aquí.",
  },
  reportes: {
    title: "Reportes listos para configurarse",
    description: "Los gráficos e informes se generarán con los datos verificados de Supabase.",
  },
  configuracion: {
    title: "Configuración del sistema",
    description: "Los datos sensibles, accesos y preferencias se configurarán con la conexión segura.",
  },
  trainer: {
    title: "El historial del evento aparecerá aquí",
    description: "La actividad y los participantes asociados se mostrarán al conectar la base de datos.",
  },
  participantes: {
    title: "Sin participantes importados",
    description: "Agrega un archivo Excel para revisar registros localmente o prepara un alta manual.",
  },
  actividad: {
    title: "No hay actividad registrada",
    description: "Las acciones confirmadas aparecerán aquí al conectar el sistema.",
  },
};
