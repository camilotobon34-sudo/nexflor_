"use client";

import { FormEvent, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function AccessPortal() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [trainerMessage, setTrainerMessage] = useState("");

  function showPendingMessage(
    event: FormEvent<HTMLFormElement>,
    setMessage: (message: string) => void,
  ) {
    event.preventDefault();
    setMessage(
      "El acceso seguro aún no está conectado. No se enviaron tus datos ni se inició sesión.",
    );
  }

  return (
    <main className="access-page relative min-h-screen overflow-hidden bg-slate-950 text-white antialiased">
      <div className="ambient ambient-blue" aria-hidden="true" />
      <div className="ambient ambient-violet" aria-hidden="true" />
      <div className="ambient-grid" aria-hidden="true" />

      <div className="access-layout">
        <section className="intro-panel" aria-labelledby="product-name">
          <a className="brand-lockup" href="#inicio" aria-label="Asistencia digital, inicio">
            <span className="brand-symbol">
              <BookOpenCheck size={23} strokeWidth={1.8} />
              <span className="brand-spark">
                <Sparkles size={11} />
              </span>
            </span>
            <span className="brand-copy">
              <span>ASISTENCIA</span>
              <strong>digital</strong>
            </span>
          </a>

          <div className="intro-copy" id="inicio">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              <span>CAPACITACIONES Y ENTRENAMIENTOS</span>
            </div>
            <h1 id="product-name">
              Cada aprendizaje
              <br />
              <span>deja su huella.</span>
            </h1>
            <p className="intro-description">
              Un espacio sencillo y seguro para acompañar cada jornada de
              formación.
            </p>

            <div className="feature-list" aria-label="Características del sistema">
              <div className="feature-item">
                <span className="feature-icon">
                  <Fingerprint size={17} />
                </span>
                <span>Asistencia fácil de registrar</span>
                <Check className="feature-check" size={15} />
              </div>
              <div className="feature-item">
                <span className="feature-icon feature-icon-violet">
                  <BadgeCheck size={17} />
                </span>
                <span>Participación con evidencia digital</span>
                <Check className="feature-check" size={15} />
              </div>
            </div>
          </div>

          <footer className="intro-footer">
            <span className="footer-orbit" aria-hidden="true">
              <span />
            </span>
            <div>
              <span>UN ESPACIO DE FORMACIÓN</span>
              <strong>Viviana Mambuscay</strong>
            </div>
            <span className="footer-year">ACCESO PRIVADO</span>
          </footer>
        </section>

        <section className="login-area" aria-labelledby="access-heading">
          <div className="login-heading">
            <div className="secure-label">
              <span />
              ACCESO AL SISTEMA
            </div>
            <h2 id="access-heading">Qué gusto tenerte aquí.</h2>
            <p>Elige cómo quieres ingresar para continuar.</p>
          </div>

          <div className="login-options">
            <article className="login-card admin-card">
              <div className="card-topline">
                <span className="card-icon admin-icon">
                  <ShieldCheck size={21} strokeWidth={1.8} />
                </span>
                <span className="access-tag">
                  <LockKeyhole size={12} />
                  PRIVADO
                </span>
              </div>

              <div className="card-heading">
                <h3>Administradora</h3>
                <p>Acceso al espacio de administración.</p>
              </div>

              <form
                className="access-form"
                onSubmit={(event) => showPendingMessage(event, setAdminMessage)}
              >
                <label htmlFor="admin-identity">Usuario o correo electrónico</label>
                <input
                  autoComplete="username"
                  id="admin-identity"
                  name="identity"
                  placeholder="Tu usuario o correo"
                  required
                />

                <div className="password-label">
                  <label htmlFor="admin-password">Contraseña</label>
                </div>
                <div className="password-field">
                  <input
                    autoComplete="current-password"
                    id="admin-password"
                    name="password"
                    placeholder="Ingresa tu contraseña"
                    required
                    type={passwordVisible ? "text" : "password"}
                  />
                  <button
                    aria-label={
                      passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="visibility-toggle"
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    type="button"
                  >
                    {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                <button className="submit-button admin-submit" type="submit">
                  <span>Ingresar al panel administrativo</span>
                  <ArrowUpRight size={17} />
                </button>
                <p aria-live="polite" className="form-message">
                  {adminMessage}
                </p>
              </form>

              <div className="card-footnote">
                <LockKeyhole size={13} />
                <span>Solo para la administradora</span>
              </div>
            </article>

            <article className="login-card trainer-card">
              <div className="card-topline">
                <span className="card-icon trainer-icon">
                  <KeyRound size={20} strokeWidth={1.8} />
                </span>
                <span className="access-tag trainer-tag">
                  <span className="tag-dot" />
                  ENTRENADOR
                </span>
              </div>

              <div className="card-heading">
                <h3>Entrenador</h3>
                <p>Ingresa con tu código maestro.</p>
              </div>

              <form
                className="access-form trainer-form"
                onSubmit={(event) => showPendingMessage(event, setTrainerMessage)}
              >
                <label htmlFor="trainer-code">Código de entrenador</label>
                <div className="code-field">
                  <span className="code-prefix" aria-hidden="true">
                    <KeyRound size={15} />
                  </span>
                  <input
                    autoCapitalize="characters"
                    autoComplete="off"
                    id="trainer-code"
                    name="trainerCode"
                    placeholder="COD-ENT-01"
                    required
                    spellCheck={false}
                  />
                </div>
                <p className="field-hint">
                  Usa el código maestro asignado para el entrenamiento.
                </p>

                <button className="submit-button trainer-submit" type="submit">
                  <span>Ingresar como entrenador</span>
                  <ArrowUpRight size={17} />
                </button>
                <p aria-live="polite" className="form-message">
                  {trainerMessage}
                </p>
              </form>

              <div className="card-footnote">
                <ShieldCheck size={14} />
                <span>Un código para registrar participantes</span>
              </div>
            </article>
          </div>

          <p className="connection-note">
            <LockKeyhole size={13} />
            <span>
              El acceso seguro se habilitará al conectar la autenticación.
            </span>
          </p>
        </section>
      </div>
    </main>
  );
}
