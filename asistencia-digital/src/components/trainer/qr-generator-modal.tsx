"use client";

import { useState } from "react";
import { CalendarDays, Check, Copy, Info, Link2, QrCode, ShieldAlert } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import TrainerDialog from "./trainer-dialog";

type QrGeneratorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  eventName?: string;
  eventId?: string;
  registrationUrl?: string;
};

export default function QrGeneratorModal({
  isOpen,
  onClose,
  eventName,
  eventId,
  registrationUrl,
}: QrGeneratorModalProps) {
  const [copyMessage, setCopyMessage] = useState("");

  if (!isOpen) return null;

  const isReady = Boolean(eventId && eventName);
  const href = registrationUrl
    ? new URL(registrationUrl, typeof window === "undefined" ? "https://example.invalid" : window.location.origin).toString()
    : eventId && eventName && typeof window !== "undefined"
      ? new URL(`/autoregistro?evento=${encodeURIComponent(eventId)}`, window.location.origin).toString()
      : "";

  async function copyRegistrationLink() {
    if (!href) return;

    try {
      await navigator.clipboard.writeText(href);
      setCopyMessage("Enlace copiado. La validación sigue requiriendo una clave de un solo uso.");
    } catch (error) {
      console.error("Could not copy the event registration link.", error);
      setCopyMessage("No se pudo copiar el enlace. Comprueba los permisos del navegador.");
    }
  }

  return (
    <TrainerDialog
      description="El código QR identifica el evento; una clave temporal verificada en servidor autoriza cada registro."
      onClose={onClose}
      title="Código QR del evento"
    >
      {isReady && href ? (
        <div className="qr-generator-ready">
          <div aria-label="Enlace público del evento; requiere clave temporal" className="qr-code-frame">
            <QRCodeSVG bgColor="#ffffff" level="M" marginSize={4} size={210} title={`Autoregistro: ${eventName}`} value={href} />
          </div>
          <p className="qr-event-name"><CalendarDays aria-hidden="true" size={15} />{eventName}</p>
          <div className="trainer-dialog-caveat">
            <Info aria-hidden="true" size={15} />
            <span>El enlace por sí solo no acepta asistencias. La clave y el consumo de un solo uso deben verificarse en el servidor.</span>
          </div>
          <button className="secondary-action qr-copy-action" onClick={copyRegistrationLink} type="button">
            {copyMessage.startsWith("Enlace copiado") ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
            Copiar enlace del evento
          </button>
          {copyMessage && <p aria-live="polite" className="trainer-dialog-feedback">{copyMessage}</p>}
        </div>
      ) : (
        <div className="trainer-dialog-empty">
          <span className="trainer-dialog-empty-icon qr-dialog-icon"><QrCode aria-hidden="true" size={23} /></span>
          <span className="trainer-dialog-status"><ShieldAlert aria-hidden="true" size={14} />EVENTO NO ASIGNADO</span>
          <h3>No se generó ningún QR</h3>
          <p>Primero se debe asignar un evento guardado. Un QR inventado o sin una clave de acceso segura no puede registrar asistencia.</p>
          <div className="trainer-dialog-data">
            <span><Link2 aria-hidden="true" size={15} />Enlace público</span>
            <strong>Pendiente de conectar Supabase</strong>
          </div>
          <div className="trainer-dialog-caveat">
            <Info aria-hidden="true" size={15} />
            <span>Las claves temporales se emitirán y validarán de forma independiente al código maestro del entrenador.</span>
          </div>
        </div>
      )}
    </TrainerDialog>
  );
}
