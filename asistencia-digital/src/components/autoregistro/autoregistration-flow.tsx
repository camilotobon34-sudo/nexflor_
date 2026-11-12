"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Eye,
  Fingerprint,
  ImageUp,
  Info,
  LoaderCircle,
  LockKeyhole,
  PenLine,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import SignaturePad from "signature_pad";
import type { Worker } from "tesseract.js";

type CaptureStep = 1 | 2 | 3;

const maxImageSize = 8 * 1024 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function AutoregistrationFlow() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("evento")?.trim() ?? "";
  const eventIdLooksValid = uuidPattern.test(eventId);
  const [step, setStep] = useState<CaptureStep>(1);
  const [identification, setIdentification] = useState("");
  const [oneTimeCode, setOneTimeCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [ocrMessage, setOcrMessage] = useState("");
  const [isReadingDocument, setIsReadingDocument] = useState(false);
  const [signatureMessage, setSignatureMessage] = useState("");
  const [signaturePresent, setSignaturePresent] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    if (step !== 3 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: "#f8fafc",
      penColor: "#20294b",
      minWidth: 0.9,
      maxWidth: 2.8,
    });
    signaturePadRef.current = signaturePad;

    function resizeCanvas() {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;
      const data = signaturePad.toData();
      const bounds = currentCanvas.getBoundingClientRect();
      const pixelRatio = Math.max(window.devicePixelRatio || 1, 1);
      currentCanvas.width = Math.round(bounds.width * pixelRatio);
      currentCanvas.height = Math.round(bounds.height * pixelRatio);
      currentCanvas.getContext("2d")?.scale(pixelRatio, pixelRatio);
      signaturePad.clear();
      if (data.length > 0) signaturePad.fromData(data);
    }

    function handleSignature(event: Event) {
      if (event.type === "endStroke") {
        setSignaturePresent(!signaturePad.isEmpty());
        setSignatureMessage("");
      }
    }

    signaturePad.addEventListener("endStroke", handleSignature);
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    resizeCanvas();

    return () => {
      observer.disconnect();
      signaturePad.removeEventListener("endStroke", handleSignature);
      signaturePad.off();
      signaturePadRef.current = null;
    };
  }, [step]);

  async function handleDocumentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setOcrMessage("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setOcrMessage("Elige una imagen JPG, PNG o WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > maxImageSize) {
      setOcrMessage("La imagen debe pesar menos de 8 MB.");
      event.target.value = "";
      return;
    }

    setImageUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return URL.createObjectURL(file);
    });
    setIsReadingDocument(true);
    let worker: Worker | null = null;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("spa");
      const result = await worker.recognize(file);
      const idMatch = result.data.text.match(/(?:^|\D)(\d[\d\s.-]{5,18}\d)(?:\D|$)/);
      if (idMatch?.[1]) {
        setIdentification(idMatch[1].replace(/\D/g, ""));
        setOcrMessage("Lectura preliminar completada. Confirma la cédula manualmente antes de continuar.");
      } else {
        setOcrMessage("No reconocimos un número de cédula. Revísala y escribe el número manualmente.");
      }
    } catch (error) {
      console.error("Could not read the participant document locally.", error);
      setOcrMessage("No pudimos leer la imagen. Puedes escribir la cédula manualmente.");
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (error) {
          console.error("Could not stop the local document recognition worker.", error);
        }
      }
      setIsReadingDocument(false);
      event.target.value = "";
    }
  }

  function verifyAccessKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventIdLooksValid) {
      setVerificationMessage("El QR no incluye un identificador de evento válido. Solicita un enlace vigente al entrenador.");
      return;
    }
    setVerificationMessage("La clave no se verificó: la integración segura con Supabase todavía no está disponible. Tus datos no se enviaron y no se registró la asistencia.");
  }

  function startPreview() {
    setPreviewMode(true);
    setStep(2);
  }

  function clearSignature() {
    signaturePadRef.current?.clear();
    setSignaturePresent(false);
    setSignatureMessage("");
  }

  function requestConfirmation() {
    setSignatureMessage(
      "No se confirmó ni guardó la asistencia. La autenticación, el consentimiento y el guardado seguro requieren conectar Supabase.",
    );
  }

  return (
    <main className="autoregistration-page">
      <div aria-hidden="true" className="autoregistration-ambient" />
      <header className="autoregistration-topbar">
        <Link aria-label="Asistencia digital, volver al acceso" className="autoregistration-brand" href="/">
          <span className="brand-symbol"><Fingerprint aria-hidden="true" size={22} /><span className="brand-spark" /></span>
          <span className="dashboard-brand-copy"><span>ASISTENCIA</span><strong>digital</strong></span>
        </Link>
        <span className="autoregistration-privacy"><ShieldCheck aria-hidden="true" size={14} />REGISTRO PROTEGIDO</span>
      </header>

      <div className="autoregistration-shell">
        <header className="autoregistration-heading">
          <div className="autoregistration-status"><span />AUTOREGISTRO DEL PARTICIPANTE</div>
          <h1>Tu asistencia <span>importa.</span></h1>
          <p>Identifícate y sigue los pasos para confirmar tu participación.</p>
        </header>

        <section aria-label="Registro de asistencia" className="autoregistration-card">
          <div className="autoregistration-event">
            <span className="autoregistration-event-icon"><UserRoundCheck aria-hidden="true" size={20} /></span>
            <div><span>EVENTO</span><strong>{eventIdLooksValid ? `Evento ${eventId.slice(0, 8).toUpperCase()}` : "Evento pendiente de verificar"}</strong></div>
            <span className={`event-state${eventIdLooksValid ? "" : " event-state-invalid"}`}><span />{eventIdLooksValid ? "Sin verificar" : "Enlace pendiente"}</span>
          </div>

          {previewMode && (
            <div className="autoregistration-preview-alert">
              <ShieldAlert aria-hidden="true" size={17} />
              <span><strong>Vista previa local, sin validar.</strong> La clave no se verificó ni se enviarán los datos. No permite registrar una asistencia.</span>
            </div>
          )}

          <div aria-label={`Paso ${step} de 3`} className="autoregistration-progress">
            {[1, 2, 3].map((stepNumber) => (
              <div className={`progress-step${stepNumber === step ? " progress-step-current" : ""}${stepNumber < step ? " progress-step-complete" : ""}`} key={stepNumber}>
                <span>{stepNumber < step ? <CheckCircle2 aria-hidden="true" size={15} /> : stepNumber}</span>
                <span>{stepNumber === 1 ? "Verificación" : stepNumber === 2 ? "Identidad" : "Firma"}</span>
              </div>
            ))}
            <div aria-hidden="true" className="progress-track"><span style={{ width: `${((step - 1) / 2) * 100}%` }} /></div>
          </div>

          {step === 1 && (
            <form className="autoregistration-form" onSubmit={verifyAccessKey}>
              <div className="autoregistration-field">
                <label htmlFor="participant-identification">Número de cédula</label>
                <input autoComplete="off" id="participant-identification" inputMode="numeric" maxLength={20} onChange={(event) => { setIdentification(event.target.value.replace(/\D/g, "")); setVerificationMessage(""); }} pattern="[0-9]{5,20}" placeholder="Escribe tu número de documento" required value={identification} />
              </div>
              <div className="autoregistration-field">
                <label htmlFor="one-time-code"><LockKeyhole aria-hidden="true" size={14} />Clave temporal de un solo uso</label>
                <input autoComplete="one-time-code" id="one-time-code" inputMode="numeric" maxLength={8} onChange={(event) => { setOneTimeCode(event.target.value.replace(/\D/g, "")); setVerificationMessage(""); }} pattern="[0-9]{6,8}" placeholder="Clave de 6 a 8 dígitos" required value={oneTimeCode} />
                <small>Solicítala al entrenador. La clave maestra del entrenador es diferente.</small>
              </div>
              {verificationMessage && <p aria-live="polite" className="autoregistration-error" role="alert"><ShieldAlert aria-hidden="true" size={15} />{verificationMessage}</p>}
              <button className="autoregistration-primary" type="submit">Verificar clave <ArrowRight aria-hidden="true" size={17} /></button>
              <div className="autoregistration-preview-divider"><span />DISEÑO LOCAL, SIN VERIFICACIÓN<span /></div>
              <button className="autoregistration-preview-button" onClick={startPreview} type="button">Explorar la vista previa de identidad y firma</button>
              <p className="autoregistration-safe-note"><Info aria-hidden="true" size={14} />La vista previa no valida claves ni permite marcar asistencia.</p>
            </form>
          )}

          {step === 2 && (
            <section aria-label="Captura del documento de identidad" className="autoregistration-capture">
              <div className="autoregistration-preview-label"><Eye aria-hidden="true" size={14} />LECTURA PRELIMINAR · SOLO EN ESTE DISPOSITIVO</div>
              <h2>Verifica tu identidad</h2>
              <p>Fotografía tu documento o escribe la cédula. La lectura automática ayuda a llenar el campo, pero no verifica la identidad.</p>
              <input accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" id="participant-document" onChange={handleDocumentChange} ref={fileInput} type="file" />
              <label className="document-photo-button" htmlFor="participant-document">
                {imageUrl ? <img alt="Vista previa del documento en este dispositivo" className="document-image-preview" src={imageUrl} /> : <span className="document-photo-icon"><Camera aria-hidden="true" size={23} /></span>}
                <span><strong>{imageUrl ? "Tomar otra fotografía" : "Tomar o seleccionar una foto"}</strong><small>Imagen JPG, PNG o WebP · Máximo 8 MB</small></span>
                <ImageUp aria-hidden="true" className="document-photo-trailing" size={17} />
              </label>
              <p aria-live="polite" className={`ocr-status${isReadingDocument ? " ocr-status-loading" : ""}`}>
                {isReadingDocument && <LoaderCircle aria-hidden="true" className="ocr-spinner" size={15} />}
                {!isReadingDocument && imageUrl && ocrMessage && <Info aria-hidden="true" size={15} />}
                {isReadingDocument ? "Leyendo en tu navegador; el modelo OCR de Tesseract se descarga de un CDN." : ocrMessage}
              </p>
              <p className="autoregistration-safe-note"><ShieldCheck aria-hidden="true" size={14} />La imagen no se transmite ni almacena. Comprueba manualmente el número reconocido.</p>
              <div className="autoregistration-field">
                <label htmlFor="preview-identification">Cédula identificada</label>
                <input autoComplete="off" id="preview-identification" inputMode="numeric" maxLength={20} onChange={(event) => setIdentification(event.target.value.replace(/\D/g, ""))} placeholder="Puedes ingresar el número manualmente" value={identification} />
              </div>
              <div className="autoregistration-step-actions">
                <button className="autoregistration-secondary" onClick={() => setStep(1)} type="button"><ArrowLeft aria-hidden="true" size={15} />Anterior</button>
                <button className="autoregistration-primary" disabled={identification.length < 5} onClick={() => setStep(3)} type="button">Revisar firma <ArrowRight aria-hidden="true" size={16} /></button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section aria-label="Firma de asistencia" className="autoregistration-capture">
              <div className="autoregistration-preview-label"><PenLine aria-hidden="true" size={14} />FIRMA EN VISTA PREVIA LOCAL</div>
              <h2>Prepara tu firma</h2>
              <p>Dibuja en el recuadro. La firma permanece en memoria y se elimina al salir de esta página.</p>
              <div className="signature-canvas-frame">
                <canvas aria-label="Recuadro para dibujar la firma" className="signature-canvas" height={180} ref={canvasRef} />
                {!signaturePresent && <span className="signature-placeholder">Firma aquí con tu dedo o mouse</span>}
              </div>
              <div className="signature-canvas-actions">
                <span>{signaturePresent ? <><CheckCircle2 aria-hidden="true" size={14} />Firma dibujada</> : <><Info aria-hidden="true" size={14} />Aún no has firmado</>}</span>
                <button className="clear-signature-button" onClick={clearSignature} type="button"><RotateCcw aria-hidden="true" size={13} />Limpiar</button>
              </div>
              <div className="autoregistration-preview-alert">
                <ShieldAlert aria-hidden="true" size={17} />
                <span>El registro no se ha verificado. La firma no se guardará ni se adjuntará a una asistencia.</span>
              </div>
              {signatureMessage && <p aria-live="polite" className="autoregistration-error" role="status"><Info aria-hidden="true" size={15} />{signatureMessage}</p>}
              <div className="autoregistration-step-actions">
                <button className="autoregistration-secondary" onClick={() => { setSignatureMessage(""); setStep(2); }} type="button"><ArrowLeft aria-hidden="true" size={15} />Anterior</button>
                <button className="autoregistration-primary" onClick={requestConfirmation} type="button"><LockKeyhole aria-hidden="true" size={16} />Confirmación pendiente</button>
              </div>
            </section>
          )}

          <footer className="autoregistration-footer">
            <ShieldCheck aria-hidden="true" size={14} />
            <span>Ningún paso de esta vista previa crea un registro de asistencia.</span>
          </footer>
        </section>
        <Link className="autoregistration-back-link" href="/"><ArrowLeft aria-hidden="true" size={14} />Volver al acceso</Link>
      </div>
    </main>
  );
}
