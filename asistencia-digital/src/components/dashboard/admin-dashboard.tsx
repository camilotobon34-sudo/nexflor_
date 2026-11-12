"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { AdminHome } from "./admin-home";
import { AdminSidebar } from "./admin-sidebar";
import { EmptyModule, ModuleOverview } from "./module-overview";
import { EntityModule } from "./entity-module";
import { ParticipantsModule } from "./participants-module";
import { adminNavigation, type AdminSection } from "@/lib/dashboard-types";

const validSections = new Set<AdminSection>(adminNavigation.map(({ id }) => id));

export default function AdminDashboard({ section }: { section: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentSection: AdminSection = validSections.has(section as AdminSection)
    ? (section as AdminSection)
    : "inicio";
  const currentItem = adminNavigation.find(({ id }) => id === currentSection)!;

  function renderSection() {
    switch (currentSection) {
      case "inicio":
        return <AdminHome />;
      case "participantes":
        return <ParticipantsModule />;
      case "empresas":
      case "entrenadores":
      case "eventos":
        return <EntityModule kind={currentSection} />;
      case "asistencias":
      case "historial":
      case "reportes":
      case "configuracion":
        return <ModuleOverview module={currentSection as EmptyModule} />;
    }
  }

  return (
    <div className="dashboard-app">
      <AdminSidebar onClose={() => setSidebarOpen(false)} open={sidebarOpen} />
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-page-label">
            <button aria-label="Abrir menú de navegación" className="mobile-menu-button" onClick={() => setSidebarOpen(true)} type="button">
              <Menu aria-hidden="true" size={20} />
            </button>
            <span className="topbar-divider">Administración</span>
            <span className="topbar-current">{currentItem.label}</span>
          </div>
          <div className="topbar-actions">
            <span className="preview-mode"><ShieldCheck aria-hidden="true" size={14} /> Vista de preparación</span>
            <button aria-label="No hay notificaciones" className="topbar-bell" disabled type="button"><Bell aria-hidden="true" size={17} /></button>
            <span className="user-avatar user-avatar-small">VM</span>
          </div>
        </header>

        <div className="dashboard-content">
          {renderSection()}
          <footer className="dashboard-footer">
            <span>ASISTENCIA DIGITAL <span className="footer-separator">/</span> VIVIANA MAMBUSCAY</span>
            <span>Panel de preparación <ArrowUpRight aria-hidden="true" size={13} /></span>
          </footer>
        </div>
      </main>
    </div>
  );
}
