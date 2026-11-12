"use client";

import { CalendarDays, ClipboardCheck, Info, ShieldAlert, Users } from "lucide-react";
import TrainerDialog from "./trainer-dialog";

type QuickRegistrationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  eventName?: string;
  eventId?: string;
};

export default function QuickRegistrationModal({
  isOpen,
  onClose,
  eventName,
  eventId,
}: QuickRegistrationModalProps) {
  if (!isOpen) return null;

  const isReady = Boolean(eventId && eventName);

  return (
    <TrainerDialog
      description="El registro del entrenador debe asociarse a un evento y guardar cada confirmación de forma segura."
      onClose={onClose}
      title="Registrar asistencia"
    >
      {isReady ? (
        <div className="trainer-registration-summary">
          <p>La verificación de identidad, disponibilidad del participante y registro de asistencia solo se habilitarán mediante la integración segura con Supabase.</p>
          <button className="secondary-action" disabled type="button">
            <ClipboardCheck aria-hidden="true" size={16} />
            Registro no disponible
          </button>
        </div>
      ) : (
        <div className="trainer-dialog-empty">
          <span className="trainer-dialog-empty-icon"><CalendarDays aria-hidden="true" size={23} /></span>
          <span className="trainer-dialog-status"><ShieldAlert aria-hidden="true" size={14} />EVENTO NO ASIGNADO</span>
          <h3>No hay un evento listo para registrar</h3>
          <p>Cuando el entrenador tenga un evento asignado, aquí se mostrará el proceso de verificación y registro. No se generó una asistencia.</p>
          <div className="trainer-dialog-data">
            <span><Users aria-hidden="true" size={15} />Participantes disponibles</span>
            <strong>Se cargarán desde Supabase</strong>
          </div>
          <div className="trainer-dialog-caveat">
            <Info aria-hidden="true" size={15} />
            <span>El registro no almacena datos localmente y no permite registrar participantes ficticios.</span>
          </div>
        </div>
      )}
    </TrainerDialog>
  );
}
