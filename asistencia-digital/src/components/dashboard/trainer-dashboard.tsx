"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Fingerprint,
  QrCode,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { EmptyState } from "./empty-state";
import { SectionHeader } from "./section-header";
import { StorageNotice } from "./storage-notice";
import QuickRegistrationModal from "@/components/trainer/quick-registration-modal";
import QrGeneratorModal from "@/components/trainer/qr-generator-modal";

export default function TrainerDashboard() {
  const [quickRegistrationOpen, setQuickRegistrationOpen] = useState(false);
  const [qrGeneratorOpen, setQrGeneratorOpen] = useState(false);

  return (
    <main className="trainer-workspace">
      <header className="trainer-topbar">
        <Link aria-label="Volver a la pantalla de acceso" className="dashboard-brand trainer-brand" href="/">
          <span className="brand-symbol"><BookOpenCheck aria-hidden="true" size={21} strokeWidth={1.8} /><span className="brand-spark" /></span>
          <span className="dashboard-brand-copy"><span>ASISTENCIA</span><strong>digital</strong></span>
        </Link>
        <span className="preview-mode"><ShieldCheck aria-hidden="true" size={14} /> VISTA DE PREPARACIÓN</span>
        <Link className="trainer-exit" href="/"><ArrowLeft aria-hidden="true" size={15} />Volver al acceso</Link>
      </header>

      <div className="trainer-main">
        <StorageNotice />

        <SectionHeader
          description="Acompaña tu jornada de formación y consulta la actividad de tu evento."
          eyebrow="ESPACIO DEL ENTRENADOR"
          icon={UserRound}
          title="Tu jornada, a un solo lugar."
        />

        <section aria-label="Información del evento activo" className="trainer-event-card dashboard-panel">
          <div className="event-card-heading">
            <div className="event-identity">
              <span className="event-icon"><CalendarDays aria-hidden="true" size={21} /></span>
              <div><p className="panel-kicker">EVENTO ACTIVO</p><h2>Sin eventos asignados</h2><p>El evento y tu perfil aparecerán al conectar Supabase.</p></div>
            </div>
            <span className="event-state"><span />Sin asignación</span>
          </div>

          <div className="event-facts">
            <div><UserRound aria-hidden="true" size={16} /><span>ENTRENADOR</span><strong>Se verificará al iniciar sesión</strong></div>
            <div><Building2 aria-hidden="true" size={16} /><span>EMPRESA</span><strong>No hay empresa vinculada</strong></div>
            <div><CalendarDays aria-hidden="true" size={16} /><span>FECHA DEL EVENTO</span><strong>—</strong></div>
          </div>
        </section>

        <section aria-label="Asistencias registradas" className="trainer-attendance-card dashboard-panel">
          <div className="trainer-attendance-overview">
            <span className="trainer-count-icon"><Users aria-hidden="true" size={21} /></span>
            <div><p className="panel-kicker">PARTICIPACIÓN</p><h2>Asistencias registradas</h2><p>El conteo se actualizará con datos guardados.</p></div>
          </div>
          <div className="trainer-attendance-count"><strong>0</strong><span>Este evento</span></div>
        </section>

        <div className="trainer-actions">
          <section className="dashboard-panel trainer-primary-action">
            <span className="trainer-action-icon"><Fingerprint aria-hidden="true" size={22} /></span>
            <div><p className="panel-kicker">REGISTRO PRESENCIAL</p><h2>Registrar asistencia</h2><p>Verifica la disponibilidad del evento antes de iniciar el registro.</p></div>
            <button aria-haspopup="dialog" className="primary-action trainer-register-button" onClick={() => setQuickRegistrationOpen(true)} type="button"><ClipboardCheck aria-hidden="true" size={18} /><span>REGISTRAR ASISTENCIA</span><ArrowUpRight aria-hidden="true" size={16} /></button>
          </section>

          <section className="dashboard-panel trainer-qr-action">
            <span className="trainer-action-icon trainer-qr-icon"><QrCode aria-hidden="true" size={22} /></span>
            <div><p className="panel-kicker">AUTOREGISTRO</p><h2>Código QR del evento</h2><p>Revisa si hay un evento vinculado para generar su enlace público.</p></div>
            <button aria-haspopup="dialog" className="secondary-action trainer-qr-button" onClick={() => setQrGeneratorOpen(true)} type="button"><QrCode aria-hidden="true" size={17} />Generar QR del evento</button>
            <span className="qr-status-note" id="qr-status-note">La clave temporal requiere validación segura del servidor.</span>
          </section>
        </div>

        <section aria-label="Historial de asistencia del evento" className="dashboard-panel trainer-history-panel">
          <header className="list-toolbar">
            <div><p className="panel-kicker">SEGUIMIENTO</p><h2>Historial de registros</h2><span>Participaciones del evento activo</span></div>
            <span className="event-state"><Clock3 aria-hidden="true" size={13} />Sin actividad</span>
          </header>
          <EmptyState
            icon={BadgeCheck}
            title="Aún no hay registros"
            description="Cuando el almacenamiento esté conectado y exista un evento asignado, sus participantes aparecerán aquí."
          />
        </section>

        <div className="trainer-security-note"><CheckCircle2 aria-hidden="true" size={16} /><span>Los datos del evento se mostrarán después de validar de forma segura tu acceso.</span></div>
      </div>
      <footer className="trainer-footer"><span>ASISTENCIA DIGITAL · VIVIANA MAMBUSCAY</span><Link href="/"><ArrowLeft aria-hidden="true" size={13} />Volver al acceso</Link></footer>
      <QuickRegistrationModal isOpen={quickRegistrationOpen} onClose={() => setQuickRegistrationOpen(false)} />
      <QrGeneratorModal isOpen={qrGeneratorOpen} onClose={() => setQrGeneratorOpen(false)} />
    </main>
  );
}
