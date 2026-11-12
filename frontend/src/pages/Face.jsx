import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { measureVideo, prepareModels } from "../browserFace.js";
import { clearSession, readSession, saveSession } from "../session.js";

const emptyForm = { fullName: "", documentId: "", role: "", email: "" };

export default function Face() {
  const [session, setSession] = useState(readSession);

  function logout() {
    clearSession();
    setSession(readSession());
  }

  if (!session.token) {
    return (
      <section className="page face-page">
        <div className="face-intro">
          <div className="face-intro-mark" aria-hidden="true">ID</div>
          <div>
            <p className="eyebrow">Identidad y acceso seguro</p>
            <h1>Nexflor ID</h1>
            <p>Acceso facial integrado en Nexflor. El personal autorizado puede registrar un rostro o verificar su ingreso; el administrador gestiona permisos y reportes.</p>
          </div>
        </div>
        <StaffLogin onDone={(body) => { saveSession(body); setSession(readSession()); }} />
      </section>
    );
  }

  return <Scanner token={session.token} name={session.name} onLogout={logout} />;
}

function StaffLogin({ onDone }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = await api("/staff/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onDone(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card staff-login" onSubmit={submit}>
      <div className="staff-login-heading">
        <span className="face-status-dot" aria-hidden="true" />
        <div>
          <h2>Personal autorizado</h2>
          <p>Inicia sesión para continuar al escáner.</p>
        </div>
      </div>
      <label>Usuario<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label>
      <label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
      {error && <p className="status error">{error}</p>}
      <button className="button" type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar para escanear"}</button>
    </form>
  );
}

function Scanner({ token, name, onLogout }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [mode, setMode] = useState("ingreso");
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState("listo");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [code, setCode] = useState({ documentId: "", pin: "" });
  const [cameraError, setCameraError] = useState("");
  const [cameraOn, setCameraOn] = useState(false);

  function staffApi(path, options = {}) {
    return api(path, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
  }

  useEffect(() => {
    staffApi("/face/status").then(setStatus).catch((err) => {
      if (err.message.includes("cuenta autorizada")) onLogout();
      else setError(err.message);
    });
    return () => stopCamera();
  }, [token]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function openCamera() {
    setCameraError("");
    if (!window.isSecureContext) {
      setCameraError("En el celular la cámara solo abre con HTTPS. Acepta el aviso del certificado y vuelve a intentar. El acceso no se concede sin verificación.");
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Este navegador no tiene cámara disponible. Puedes usar el código alternativo si un administrador te lo entregó.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "user" }, width: { ideal: 720 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
      return true;
    } catch {
      setCameraError("No se pudo abrir la cámara. Revisa el permiso o usa el código alternativo. El acceso no se concede sin verificación.");
      return false;
    }
  }

  async function captureFrames() {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const frames = [];
    for (let step = 0; step < 4; step += 1) {
      const width = video.videoWidth || 480;
      const height = video.videoHeight || 360;
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);
      frames.push(canvas.toDataURL("image/jpeg", 0.72));
      if (step < 3) await new Promise((resolve) => setTimeout(resolve, 450));
    }
    return frames;
  }

  async function scan(event) {
    event?.preventDefault();
    setError("");
    setResult(null);
    if (!consent) {
      setError("Marca el consentimiento antes de usar la cámara.");
      return;
    }
    const opened = streamRef.current || await openCamera();
    if (!opened) return;
    const video = videoRef.current;
    if (video && !video.videoWidth) {
      await new Promise((resolve) => { video.onloadeddata = () => resolve(); });
    }
    setPhase("escaneando");
    try {
      let reading;
      if (status?.engine === "server") {
        reading = { frames: await captureFrames() };
      } else {
        await prepareModels((message) => setError(message));
        setError("");
        reading = await measureVideo(video);
      }
      const path = mode === "registro" ? "/face/register" : "/face/verify";
      const body = mode === "registro" ? { ...form, consent: true, ...reading } : reading;
      const response = await staffApi(path, { method: "POST", body: JSON.stringify(body) });
      setResult(response);
      if (response.already === false) setForm(emptyForm);
      const next = await staffApi("/face/status");
      setStatus(next);
    } catch (err) {
      if (err.message.includes("cuenta autorizada")) onLogout();
      setError(err.message);
      setResult(null);
    } finally {
      setPhase("listo");
      stopCamera();
    }
  }

  async function sendCode(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    try {
      const response = await staffApi("/face/code", { method: "POST", body: JSON.stringify(code) });
      setResult(response);
      const next = await staffApi("/face/status");
      setStatus(next);
    } catch (err) {
      if (err.message.includes("cuenta autorizada")) onLogout();
      setError(err.message);
    }
  }

  const tone = result?.access === "permitido" ? "ok" : result ? "bad" : "";

  return (
    <section className="page face-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Identidad y acceso seguro</p>
          <h1>Nexflor ID</h1>
          <p>Centra el rostro en la guía para registrar tu identidad o verificar el ingreso. La decisión de acceso se confirma en el servidor.</p>
        </div>
        <button type="button" onClick={onLogout}>Salir{name ? ` · ${name}` : ""}</button>
      </div>

      <div className="stats">
        <article className="card stat"><span>Entradas de hoy</span><strong>{status?.entered ?? "–"}</strong></article>
        <article className="card stat"><span>Pendientes</span><strong>{status?.pending ?? "–"}</strong></article>
        <article className="card stat"><span>Accesos rechazados</span><strong>{status?.denied ?? "–"}</strong></article>
      </div>

      {status?.notice && <p className={status.engine === "server" && status.modelReady ? "muted" : "status"}>{status.notice}</p>}

      <div className="face-layout">
        <section className="card scanner">
          <div className="chips">
            <button type="button" className={mode === "ingreso" ? "on" : ""} onClick={() => { setMode("ingreso"); setResult(null); }}>Verificar ingreso</button>
            <button type="button" className={mode === "registro" ? "on" : ""} onClick={() => { setMode("registro"); setResult(null); }}>Registrar rostro</button>
          </div>
          <div className={`viewport ${phase === "escaneando" ? "scanning" : ""}`}>
            <video ref={videoRef} autoPlay playsInline muted />
            <div className={`face-frame${cameraOn ? " active" : ""}`} aria-hidden="true"><span /></div>
            <span className={`camera-state${cameraOn ? " live" : ""}`}><span />{cameraOn ? "Cámara activa" : "Cámara en espera"}</span>
            {!cameraOn && <p>La cámara aparece cuando inicias el escaneo.</p>}
            {phase === "escaneando" && <span className="scan-flag">Verificando rostro…</span>}
          </div>
          <label className="consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>{status?.consent || "Acepto el uso de mi imagen para verificar o registrar mi identidad mediante Nexflor ID."}</span>
          </label>
          <p className="face-hint">Tu cámara solo se activa cuando aceptas y presionas iniciar. Puedes retirar el permiso desde tu navegador.</p>
          {mode === "registro" && (
            <div className="face-form">
              <label>Nombre completo<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></label>
              <label>Identificación<input value={form.documentId} onChange={(event) => setForm({ ...form, documentId: event.target.value })} required /></label>
              <label>Cargo<input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} required /></label>
              <label>Correo<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              <p className="muted">La fecha de registro la guarda el servidor. El estado inicial es pendiente.</p>
            </div>
          )}
          {cameraError && <p className="status error">{cameraError}</p>}
          {error && <p className="status error">{error}</p>}
          {result && <p className={`face-result ${tone}`}>{result.message}{result.name && result.access === "permitido" ? ` ${result.name}.` : ""}</p>}
          <div className="face-actions">
            <button className="button" type="button" onClick={scan} disabled={phase === "escaneando" || !consent}>
              {phase === "escaneando" ? "Escaneando…" : "Iniciar escaneo"}
            </button>
            <button type="button" onClick={() => { setResult(null); setError(""); }}>Volver a intentar</button>
          </div>
        </section>

        <section className="card">
          <h2>¿No puedes usar la cámara?</h2>
          <p>Un administrador puede entregarte un código. Ese código también lo comprueba el servidor y no autoriza a quien esté pendiente, rechazado o suspendido.</p>
          <form className="face-form" onSubmit={sendCode}>
            <label>Identificación<input value={code.documentId} onChange={(event) => setCode({ ...code, documentId: event.target.value })} /></label>
            <label>Código<input value={code.pin} onChange={(event) => setCode({ ...code, pin: event.target.value })} inputMode="numeric" /></label>
            <button className="button" type="submit">Entrar con código</button>
          </form>
        </section>
      </div>
    </section>
  );
}
