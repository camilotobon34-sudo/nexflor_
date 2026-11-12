"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type TrainerDialogProps = {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
};

export default function TrainerDialog({
  title,
  description,
  onClose,
  children,
}: TrainerDialogProps) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="trainer-dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-describedby="trainer-dialog-description"
        aria-labelledby="trainer-dialog-title"
        aria-modal="true"
        className="trainer-dialog"
        role="dialog"
      >
        <header className="trainer-dialog-header">
          <div>
            <p className="panel-kicker">ASISTENCIA DIGITAL</p>
            <h2 id="trainer-dialog-title">{title}</h2>
            <p id="trainer-dialog-description">{description}</p>
          </div>
          <button
            aria-label="Cerrar ventana"
            className="trainer-dialog-close"
            onClick={onClose}
            ref={closeButton}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className="trainer-dialog-content">{children}</div>
      </section>
    </div>
  );
}
