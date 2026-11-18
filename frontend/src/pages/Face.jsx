import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { clearSession, readSession, saveSession } from "../session.js";

let modelLoad;
let faceApiLoad;

function loadFaceApi() {
  if (!faceApiLoad) {
    faceApiLoad = import("@vladmandic/face-api").catch((error) => {
      faceApiLoad = null;
      throw error;
    });
  }
  return faceApiLoad;
}

async function loadFaceModels() {
  const faceapi = await loadFaceApi();
  if (!modelLoad) {
    modelLoad = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ]).catch((error) => {
      modelLoad = null;
      throw error;
    });
  }
  return modelLoad;
}

function eyeAspect(points, start) {
  const point = (offset) => points[start + offset];
  const span = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const horizontal = span(point(0), point(3));
  if (!horizontal) return 0;
  return (span(point(1), point(5)) + span(point(2), point(4))) / (2 * horizontal);
}

async function analyzeFrames(frames) {
  const faceapi = await loadFaceApi();
  const samples = [];
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

  for (const frame of frames) {
    const image = new Image();
    image.src = frame;
    await image.decode();
    const faces = await faceapi.detectAllFaces(image, options).withFaceLandmarks().withFaceDescriptors();
    if (faces.length !== 1) continue;
    const face = faces[0];
    const points = face.landmarks.positions;
    samples.push({
      descriptor: Array.from(face.descriptor),
      ear: (eyeAspect(points, 36) + eyeAspect(points, 42)) / 2,
      noseX: points[30].x,
      boxWidth: face.detection.box.width,
    });
  }

  if (samples.length < 3) {
    throw new Error("No se pudo leer un rostro con claridad en al menos tres capturas. Ajusta la luz y vuelve a intentar.");
  }

  const descriptor = new Array(128).fill(0);
  for (const sample of samples) {
    sample.descriptor.forEach((value, index) => { descriptor[index] += value; });
  }
  let magnitude = 0;
  descriptor.forEach((value, index) => {
    descriptor[index] = value / samples.length;
    magnitude += descriptor[index] ** 2;
  });
  magnitude = Math.sqrt(magnitude) || 1;
  const normalized = descriptor.map((value) => Number((value / magnitude).toFixed(6)));
  const noses = samples.map((sample) => sample.noseX);
  const eyes = samples.map((sample) => sample.ear);
  const moved = Math.max(...noses) - Math.min(...noses) > samples[0].boxWidth * 0.035;
  const blinked = Math.max(...eyes) - Math.min(...eyes) >= 0.045;

  return {
    descriptor: normalized,
    quality: true,
    liveness: !frames.every((frame) => frame === frames[0]) && (moved || blinked),
    staticImage: frames.every((frame) => frame === frames[0]),
  };
}

function faceApi(path, token, options = {}) {
  return api(path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
}

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

export default function Face() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cameraStartRef = useRef(null);
  const cameraRequestId = useRef(0);
  const verificationRef = useRef(false);
  const waitingForPersonToLeave = useRef(false);
  const emptyFrameCount = useRef(0);
  const [session, setSession] = useState(readSession);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("verify");
  const [person, setPerson] = useState({ fullName: "", documentId: "", role: "Trabajador Operativo", email: "" });
  const [code, setCode] = useState({ documentId: "", pin: "" });
  const [engine, setEngine] = useState(null);
  const [modelState, setModelState] = useState("loading");
  const [cameraReady, setCameraReady] = useState(false);
  const [scanState, setScanState] = useState("preparing");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const authorized = session.token && ["admin", "scanner"].includes(session.role);

  useEffect(() => () => {
    stopStream(streamRef.current);
  }, []);

  useEffect(() => {
    if (!authorized) return undefined;
    let active = true;
    setModelState("loading");
    loadFaceModels()
      .then(() => { if (active) setModelState("ready"); })
      .catch((modelError) => {
        if (active) {
          setModelState("error");
          setError(`No se pudieron cargar los modelos faciales: ${modelError.message}`);
        }
      });
    return () => { active = false; };
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return undefined;
    let active = true;
    const refresh = () => {
      faceApi("/face/status", session.token)
        .then((status) => {
          if (active) setEngine(status);
        })
        .catch((requestError) => {
          if (active) {
            setError(requestError.message);
            setEngine(null);
          }
        });
    };
    refresh();
    const timer = engine?.modelReady
      ? null
      : window.setInterval(refresh, 3000);
    return () => {
      active = false;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [authorized, session.token, engine?.modelReady]);

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = await api("/staff/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      saveSession(body);
      setSession(readSession());
      setPassword("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    cameraRequestId.current += 1;
    cameraStartRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setScanState("preparing");
    clearSession();
    setSession(readSession());
    setEngine(null);
    setModelState("loading");
    setMessage("");
  }

  const startCamera = useCallback(async () => {
    setError("");
    setMessage("");
    if (streamRef.current?.active && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      setCameraReady(true);
      return;
    }
    if (cameraStartRef.current) return cameraStartRef.current;

    const requestId = cameraRequestId.current + 1;
    cameraRequestId.current = requestId;
    const request = (async () => {
      setCameraReady(false);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Este navegador no permite abrir la cámara. Usa una conexión HTTPS.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (requestId !== cameraRequestId.current) {
          stopStream(stream);
          return;
        }
        if (!videoRef.current) {
          stopStream(stream);
          throw new Error("No se pudo preparar la cámara. Vuelve a intentarlo.");
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      } catch (cameraError) {
        setCameraReady(false);
        setError(cameraError.message || "No se pudo abrir la cámara. Revisa sus permisos.");
      }
    })();
    cameraStartRef.current = request;
    await request;
    if (cameraStartRef.current === request) cameraStartRef.current = null;
  }, []);

  useEffect(() => {
    if (authorized) {
      void startCamera();
    } else {
      setCameraReady(false);
      setScanState("preparing");
    }
  }, [authorized, startCamera]);

  async function captureFrames() {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      throw new Error("Enciende la cámara y espera a que aparezca la imagen.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * canvas.width);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la captura de la cámara.");

    const frames = [];
    for (let index = 0; index < 4; index += 1) {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 650));
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.78));
    }
    return frames;
  }

  async function register(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const frames = await captureFrames();
      const recognition = engine?.modelReady ? { frames } : await analyzeFrames(frames);
      const result = await faceApi("/face/register", session.token, {
        method: "POST",
        body: JSON.stringify({ ...person, consent: true, ...recognition }),
      });
      setMessage(result.message);
      if (!result.already) setPerson({ fullName: "", documentId: "", role: "Trabajador Operativo", email: "" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyFace() {
    if (verificationRef.current) return;
    verificationRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const frames = await captureFrames();
      const recognition = engine?.modelReady ? { frames } : await analyzeFrames(frames);
      const result = await faceApi("/face/verify", session.token, {
        method: "POST",
        body: JSON.stringify(recognition),
      });
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
      verificationRef.current = false;
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await faceApi("/face/code", session.token, {
        method: "POST",
        body: JSON.stringify(code),
      });
      setMessage(result.message);
      setCode({ documentId: "", pin: "" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!authorized || mode !== "verify" || !cameraReady || modelState !== "ready") {
      if (authorized && mode === "verify") setScanState("preparing");
      return undefined;
    }

    let active = true;
    let timer;
    const inspect = async () => {
      if (!active) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        setScanState("preparing");
        timer = window.setTimeout(inspect, 800);
        return;
      }

      try {
        const faceapi = await loadFaceApi();
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
        const faces = await faceapi.detectAllFaces(video, options);
        if (waitingForPersonToLeave.current) {
          if (faces.length === 0) {
            emptyFrameCount.current += 1;
            if (emptyFrameCount.current >= 3) {
              waitingForPersonToLeave.current = false;
              emptyFrameCount.current = 0;
              setScanState("waiting");
            }
          } else {
            emptyFrameCount.current = 0;
          }
        } else if (faces.length === 1 && !verificationRef.current) {
          waitingForPersonToLeave.current = true;
          emptyFrameCount.current = 0;
          setScanState("capturing");
          await verifyFace();
          if (active) setScanState("done");
        } else if (faces.length > 1) {
          setScanState("multiple");
        } else if (faces.length === 0) {
          setScanState("waiting");
        }
      } catch (scanError) {
        if (active) {
          setError(scanError.message);
          setScanState("error");
        }
      } finally {
        if (active) timer = window.setTimeout(inspect, 900);
      }
    };

    void inspect();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [authorized, cameraReady, engine?.modelReady, mode, modelState, session.token]);

  if (!authorized) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <form className="mx-auto max-w-md space-y-5 rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9" onSubmit={login}>
          <div className="rounded-2xl bg-[#112244] px-5 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Flores El Trigal</p>
            <p className="mt-1 text-sm font-medium">NEXFLOR ID · Acceso autorizado</p>
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Ingreso de personal</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Inicia sesión con la cuenta de escaneo creada por un administrador.</p>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Usuario
            <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Contraseña
            <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p className="status error" role="alert">{error}</p>}
          <button className="w-full rounded-xl bg-[#112244] px-4 py-3 font-semibold text-white transition hover:bg-[#1c3561] disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={busy}>{busy ? "Verificando…" : "Entrar"}</button>
          <Link className="block text-center text-sm font-medium text-emerald-800 hover:underline" to="/entrar">Volver al taller</Link>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/entrar" className="text-sm font-medium text-emerald-300 hover:text-emerald-200">Volver</Link>
        <button type="button" onClick={logout} className="text-sm text-slate-300 hover:text-white">Salir de {session.name || "la cuenta"}</button>
      </div>
      <section className="space-y-6 rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-8">
        <header className="border-b border-slate-700 pb-5">
          <p className="text-emerald-300 text-xs font-semibold uppercase tracking-wide">Flores El Trigal</p>
          <h1 className="text-2xl font-bold mt-2">NEXFLOR ID</h1>
          <p className="text-sm text-slate-300 mt-2">Registro y verificación de ingreso. Las plantillas se guardan cifradas; no se conserva la fotografía capturada.</p>
        </header>

        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
          <strong>Motor de reconocimiento: </strong>
          {engine?.modelReady ? "Servidor listo" : modelState === "ready" ? "Navegador listo" : modelState === "error" ? "No disponible" : "Cargando modelos…"}
          <p className="text-slate-400 mt-1">
            {engine?.modelReady
              ? "El servidor analiza las capturas y valida el acceso."
              : modelState === "ready"
                ? "El navegador mide el rostro; el servidor compara la plantilla, aplica la aprobación y registra el ingreso."
                : engine?.notice || engine?.message || "Preparando el reconocimiento facial…"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1" role="tablist" aria-label="Acciones de Nexflor ID">
          <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => { setMode("register"); setError(""); setMessage(""); }} className={`rounded-lg px-3 py-2 text-sm ${mode === "register" ? "bg-emerald-600 text-white" : "text-slate-300"}`}>Registrar persona</button>
          <button type="button" role="tab" aria-selected={mode === "verify"} onClick={() => { setMode("verify"); setError(""); setMessage(""); }} className={`rounded-lg px-3 py-2 text-sm ${mode === "verify" ? "bg-emerald-600 text-white" : "text-slate-300"}`}>Marcar ingreso</button>
        </div>

        <div className="space-y-3">
          {!cameraReady && <button type="button" onClick={startCamera} className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold">Activar cámara</button>}
          <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-80 rounded-xl bg-black object-cover" aria-label="Vista previa de cámara" />
          <p className="text-sm text-slate-300" role="status" aria-live="polite">
            {!cameraReady
              ? "Esperando permiso de cámara…"
              : modelState !== "ready"
                ? "Preparando el reconocimiento facial…"
                : scanState === "capturing"
                  ? "Rostro detectado. Verificando el ingreso…"
                  : scanState === "multiple"
                    ? "Debe aparecer una sola persona frente a la cámara."
                    : scanState === "done"
                      ? "Verificación lista. Retira el rostro para registrar el siguiente ingreso."
                      : "Cámara activa. Mira a la cámara y parpadea o mueve un poco la cabeza; el ingreso se registrará automáticamente."}
          </p>
        </div>

        {mode === "register" ? (
          <form onSubmit={register} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Nombre completo<input className="w-full mt-1 rounded-lg bg-slate-900 border border-slate-600 p-3" value={person.fullName} onChange={(event) => setPerson({ ...person, fullName: event.target.value })} required /></label>
            <label className="text-sm">Documento de identidad<input className="w-full mt-1 rounded-lg bg-slate-900 border border-slate-600 p-3" value={person.documentId} onChange={(event) => setPerson({ ...person, documentId: event.target.value })} minLength={4} maxLength={20} required /></label>
            <label className="text-sm">Cargo<input className="w-full mt-1 rounded-lg bg-slate-900 border border-slate-600 p-3" value={person.role} onChange={(event) => setPerson({ ...person, role: event.target.value })} /></label>
            <label className="text-sm">Correo (opcional)<input type="email" className="w-full mt-1 rounded-lg bg-slate-900 border border-slate-600 p-3" value={person.email} onChange={(event) => setPerson({ ...person, email: event.target.value })} /></label>
            <label className="sm:col-span-2 flex gap-3 text-xs leading-5 text-slate-300">
              <input type="checkbox" required className="mt-1 accent-emerald-500" />
              <span>{engine?.consent || "Autorizo la captura y cifrado de una plantilla facial para comprobar mi ingreso; el registro requiere aprobación administrativa."}</span>
            </label>
            <button type="submit" disabled={busy || modelState !== "ready" || !engine} className="sm:col-span-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-3 font-bold text-slate-950">
              {busy ? "Procesando captura…" : "Enviar registro para aprobación"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <button type="button" onClick={verifyFace} disabled={busy || modelState !== "ready" || !cameraReady} className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-3 font-bold text-slate-950">
              {busy ? "Verificando…" : "Verificar ahora"}
            </button>
            <form onSubmit={verifyCode} className="grid gap-3 sm:grid-cols-3">
              <input aria-label="Documento" placeholder="Documento" value={code.documentId} onChange={(event) => setCode({ ...code, documentId: event.target.value })} required />
              <input aria-label="Código alternativo" placeholder="Código de 6 dígitos" inputMode="numeric" value={code.pin} onChange={(event) => setCode({ ...code, pin: event.target.value })} required />
              <button type="submit" disabled={busy} className="rounded-lg bg-slate-600 hover:bg-slate-500 px-3 py-2 text-sm">Usar código alternativo</button>
            </form>
          </div>
        )}

        {error && <p className="status error" role="alert">{error}</p>}
        {message && <p className="status" role="status">{message}</p>}
      </section>
      </div>
    </main>
  );
}
