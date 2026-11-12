import { Info } from "lucide-react";

type StorageNoticeProps = {
  compact?: boolean;
};

export function StorageNotice({ compact = false }: StorageNoticeProps) {
  return (
    <aside aria-label="Estado de conexión" className={`storage-notice${compact ? " storage-notice-compact" : ""}`}>
      <Info aria-hidden="true" size={16} />
      <span>
        <strong>Vista de preparación</strong>
        {" "}· La autenticación y el almacenamiento aún no están conectados a Supabase.
        No hay datos guardados; los formularios no simulan operaciones exitosas.
      </span>
    </aside>
  );
}
