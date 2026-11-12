"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, ChevronLeft, LogOut, X } from "lucide-react";
import { adminNavigation } from "@/lib/dashboard-types";

type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <button
          aria-label="Cerrar el menú"
          className="dashboard-mobile-backdrop"
          onClick={onClose}
          type="button"
        />
      )}
      <aside className={`dashboard-sidebar${open ? " dashboard-sidebar-open" : ""}`}>
        <Link aria-label="Asistencia digital, inicio administrativo" className="dashboard-brand" href="/admin" onClick={onClose}>
          <span className="brand-symbol">
            <BookOpenCheck aria-hidden="true" size={22} strokeWidth={1.8} />
            <span className="brand-spark" />
          </span>
          <span className="dashboard-brand-copy">
            <span>ASISTENCIA</span>
            <strong>digital</strong>
          </span>
          <span className="brand-admin-badge">ADMIN</span>
        </Link>

        <div className="sidebar-section-label">ESPACIO DE TRABAJO</div>
        <nav aria-label="Menú administrativo" className="dashboard-nav">
          {adminNavigation.map(({ id, label, icon: Icon, href }) => {
            const active =
              id === "inicio"
                ? pathname === "/admin"
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`dashboard-nav-link${active ? " dashboard-nav-link-active" : ""}`}
                href={href}
                key={id}
                onClick={onClose}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>{label}</span>
                {active && <ChevronLeft aria-hidden="true" className="nav-active-arrow" size={14} />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <span aria-hidden="true" className="user-avatar">VM</span>
            <span className="sidebar-user-copy">
              <strong>Viviana Mambuscay</strong>
              <span>Administradora</span>
            </span>
          </div>
          <Link className="sidebar-logout" href="/">
            <LogOut aria-hidden="true" size={16} />
            <span>Volver al acceso</span>
          </Link>
        </div>
        <button aria-label="Cerrar menú" className="sidebar-close" onClick={onClose} type="button">
          <X size={20} />
        </button>
      </aside>
    </>
  );
}
