import { useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, ArrowLeft, Camera, CameraOff, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { chooseTrackedPose } from "../postureTracking.js";

const KEYPOINT_THRESHOLD = 0.3;
const ALERT_ANGLE = 28;
const ALERT_DELAY_MS = 1600;
const FRAME_INTERVAL_MS = 140;
const SKELETON_SEGMENTS = [
  ["left_shoulder", "right_shoulder"],
  ["left_hip", "right_hip"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

function midpoint(pose, leftName, rightName) {
  const left = pose.keypoints.find((point) => point.name === leftName);
  const right = pose.keypoints.find((point) => point.name === rightName);
  if (!left || !right || left.score < KEYPOINT_THRESHOLD || right.score < KEYPOINT_THRESHOLD) return null;
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function torsoAngle(pose) {
  const shoulders = midpoint(pose, "left_shoulder", "right_shoulder");
  const hips = midpoint(pose, "left_hip", "right_hip");
  if (!shoulders || !hips) return null;
  const vertical = Math.abs(hips.y - shoulders.y);
  if (vertical < 1) return null;
  return Math.round(Math.atan2(Math.abs(shoulders.x - hips.x), vertical) * 180 / Math.PI);
}

function drawPoses(canvas, video, poses, selectedTrackId, postureWarning) {
  if (!canvas || !video.videoWidth || !video.videoHeight) return;
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.lineWidth = Math.max(2, canvas.width / 240);
  for (const [index, pose] of poses.entries()) {
    const selected = pose.id === selectedTrackId;
    const color = selected && postureWarning ? "#fb7185" : selected ? "#34d399" : "#60a5fa";
    const keypoints = new Map(pose.keypoints.map((point) => [point.name, point]));
    const visible = pose.keypoints.filter((point) => point.score >= KEYPOINT_THRESHOLD);
    if (!visible.length) continue;

    context.strokeStyle = color;
    context.fillStyle = selected ? "#facc15" : "#bfdbfe";
    for (const [startName, endName] of SKELETON_SEGMENTS) {
      const start = keypoints.get(startName);
      const end = keypoints.get(endName);
      if (!start || !end || start.score < KEYPOINT_THRESHOLD || end.score < KEYPOINT_THRESHOLD) continue;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
    for (const point of visible) {
      context.beginPath();
      context.arc(point.x, point.y, Math.max(3, canvas.width / 120), 0, Math.PI * 2);
      context.fill();
    }

    const bounds = pose.box || {
      xMin: Math.min(...visible.map((point) => point.x)),
      yMin: Math.min(...visible.map((point) => point.y)),
      xMax: Math.max(...visible.map((point) => point.x)),
      yMax: Math.max(...visible.map((point) => point.y)),
    };
    const padding = Math.max(8, canvas.width * 0.015);
    const x = Math.max(0, bounds.xMin - padding);
    const y = Math.max(0, bounds.yMin - padding);
    const width = Math.min(canvas.width - x, bounds.xMax - bounds.xMin + padding * 2);
    const height = Math.min(canvas.height - y, bounds.yMax - bounds.yMin + padding * 2);
    context.strokeStyle = color;
    context.lineWidth = Math.max(3, canvas.width / 180);
    context.strokeRect(x, y, width, height);
    context.font = `600 ${Math.max(14, canvas.width / 32)}px sans-serif`;
    context.fillStyle = color;
    const label = Number.isFinite(pose.id) ? `Pista ${pose.id + 1}` : `Persona ${index + 1}`;
    context.fillText(selected ? `Seguimiento · ${label}` : label, x + 5, Math.max(18, y - 8));
  }
}

export default function Posture() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const audioRef = useRef(null);
  const oscillatorRef = useRef(null);
  const frameRef = useRef(0);
  const frameBusyRef = useRef(false);
  const lastFrameRef = useRef(0);
  const startupIdRef = useRef(0);
  const badSinceRef = useRef(0);
  const lastBeepRef = useRef(0);
  const selectedTrackIdRef = useRef(null);
  const lastCenterRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  const [angle, setAngle] = useState(null);
  const [poseCount, setPoseCount] = useState(0);
  const [trackId, setTrackId] = useState(null);
  const [trackVisible, setTrackVisible] = useState(false);
  const [movementDetected, setMovementDetected] = useState(false);
  const [cameraAspect, setCameraAspect] = useState("4 / 3");
  const [error, setError] = useState("");

  function playAlert() {
    const context = audioRef.current;
    if (!context || context.state !== "running") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    gain.gain.setValueAtTime(0.08, context.currentTime);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillatorRef.current = oscillator;
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      if (oscillatorRef.current === oscillator) oscillatorRef.current = null;
    };
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
  }

  function stopCamera(updateState = true) {
    startupIdRef.current += 1;
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    detectorRef.current?.dispose();
    detectorRef.current = null;
    badSinceRef.current = 0;
    selectedTrackIdRef.current = null;
    lastCenterRef.current = null;
    frameBusyRef.current = false;
    overlayRef.current?.getContext("2d")?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    if (updateState) {
      setCameraOn(false);
      setLoading(false);
      setModelReady(false);
      setAlertActive(false);
      setAngle(null);
      setPoseCount(0);
      setTrackId(null);
      setTrackVisible(false);
      setMovementDetected(false);
      setCameraAspect("4 / 3");
    }
  }

  useEffect(() => () => {
    stopCamera(false);
    if (audioRef.current && audioRef.current.state !== "closed") {
      audioRef.current.close().catch((audioError) => console.error("No se pudo cerrar el audio:", audioError));
    }
  }, []);

  async function startCamera() {
    const startupId = ++startupIdRef.current;
    setError("");
    setLoading(true);
    setModelReady(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Este navegador requiere una conexión HTTPS para acceder a la cámara.");
      }

      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!audioRef.current && AudioContextConstructor) audioRef.current = new AudioContextConstructor();
      if (audioRef.current?.state === "suspended") await audioRef.current.resume();
      if (startupId !== startupIdRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (startupId !== startupIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (!videoRef.current) throw new Error("No se pudo preparar la vista de cámara.");
      videoRef.current.srcObject = streamRef.current;
      setCameraAspect(`${videoRef.current.videoWidth || 4} / ${videoRef.current.videoHeight || 3}`);
      await videoRef.current.play();
      if (startupId !== startupIdRef.current) return;
      setCameraOn(true);

      const tf = await import("@tensorflow/tfjs");
      if (startupId !== startupIdRef.current) return;
      let webglReady = false;
      try {
        webglReady = await tf.setBackend("webgl");
      } catch (backendError) {
        console.warn("WebGL no está disponible; se usará CPU para el análisis:", backendError);
      }
      if (!webglReady) await tf.setBackend("cpu");
      await tf.ready();
      if (startupId !== startupIdRef.current) return;
      const poseDetection = await import("@tensorflow-models/pose-detection");
      const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
        enableTracking: true,
        enableSmoothing: true,
      });
      if (startupId !== startupIdRef.current) {
        detector.dispose();
        return;
      }
      detectorRef.current = detector;

      selectedTrackIdRef.current = null;
      lastCenterRef.current = null;
      setTrackId(null);
      setTrackVisible(false);
      setPoseCount(0);
      setModelReady(true);
      frameRef.current = requestAnimationFrame(detectFrame);
    } catch (cameraError) {
      if (startupId === startupIdRef.current) {
        detectorRef.current?.dispose();
        detectorRef.current = null;
        if (!streamRef.current) stopCamera();
        setModelReady(false);
        setError(cameraError.message || "No se pudo iniciar el análisis de postura.");
      }
    } finally {
      if (startupId === startupIdRef.current) setLoading(false);
    }
  }

  async function detectFrame(timestamp) {
    if (!streamRef.current || !detectorRef.current) return;
    if (timestamp - lastFrameRef.current >= FRAME_INTERVAL_MS && !frameBusyRef.current) {
      frameBusyRef.current = true;
      lastFrameRef.current = timestamp;
      try {
        const video = videoRef.current;
        if (video?.readyState >= 2) {
          const poses = await detectorRef.current.estimatePoses(video, { maxPoses: 6, flipHorizontal: false });
          setPoseCount((current) => current === poses.length ? current : poses.length);
          const tracked = chooseTrackedPose(poses, selectedTrackIdRef.current);
          selectedTrackIdRef.current = tracked.trackId;
          setTrackId((current) => current === tracked.trackId ? current : tracked.trackId);
          const pose = tracked.pose;
          setTrackVisible(Boolean(pose));
          let shouldAlert = false;
          if (pose) {
            const shoulders = midpoint(pose, "left_shoulder", "right_shoulder");
            const hips = midpoint(pose, "left_hip", "right_hip");
            const center = shoulders && hips
              ? { x: (shoulders.x + hips.x) / 2, y: (shoulders.y + hips.y) / 2 }
              : null;
            if (center && lastCenterRef.current) {
              const distance = Math.hypot(center.x - lastCenterRef.current.x, center.y - lastCenterRef.current.y);
              setMovementDetected(distance > Math.max(8, video.videoWidth * 0.015));
            } else {
              setMovementDetected(false);
            }
            lastCenterRef.current = center;
            const measuredAngle = torsoAngle(pose);
            setAngle(measuredAngle);
            const now = performance.now();
            if (measuredAngle !== null && measuredAngle >= ALERT_ANGLE) {
              if (!badSinceRef.current) badSinceRef.current = now;
              shouldAlert = now - badSinceRef.current >= ALERT_DELAY_MS;
              setAlertActive((active) => active === shouldAlert ? active : shouldAlert);
              if (shouldAlert && now - lastBeepRef.current >= 2200) {
                playAlert();
                lastBeepRef.current = now;
              }
            } else {
              badSinceRef.current = 0;
              setAlertActive(false);
            }
          } else {
            lastCenterRef.current = null;
            setTrackVisible(false);
            setMovementDetected(false);
            setAngle(null);
            setAlertActive(false);
            badSinceRef.current = 0;
          }
          drawPoses(overlayRef.current, video, poses, tracked.trackId, shouldAlert);
        }

      } catch (analysisError) {
        stopCamera();
        setError(`No se pudo analizar la imagen: ${analysisError.message}`);
        return;
      } finally {
        frameBusyRef.current = false;
      }
    }
    frameRef.current = requestAnimationFrame(detectFrame);
  }

  function chooseAnotherPerson() {
    selectedTrackIdRef.current = null;
    lastCenterRef.current = null;
    badSinceRef.current = 0;
    setTrackId(null);
    setTrackVisible(false);
    setMovementDetected(false);
    setAlertActive(false);
    setAngle(null);
  }

  function updateCameraAspect() {
    const video = videoRef.current;
    if (video?.videoWidth && video?.videoHeight) {
      setCameraAspect(`${video.videoWidth} / ${video.videoHeight}`);
    }
  }

  return (
    <section className="page">
      <Link to="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
        <span className="inline-flex items-center gap-2"><ArrowLeft size={16} /> Volver al taller</span>
      </Link>

      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Herramientas · Flores El Trigal</p>
          <h1>NEXFLOR Posture</h1>
          <p className="lede">Orientación ergonómica en tiempo real para prácticas del taller.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cameraOn ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
          {cameraOn
            ? modelReady
              ? "Cámara activa · análisis local"
              : loading
                ? "Cámara activa · cargando modelo"
                : "Cámara activa · análisis no disponible"
            : "Cámara apagada"}
        </span>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <section className="card">
          <div className="relative overflow-hidden rounded-xl bg-slate-950" style={{ aspectRatio: cameraAspect }}>
            <video ref={videoRef} onLoadedMetadata={updateCameraAspect} autoPlay playsInline muted className="h-full w-full object-contain" aria-label="Vista previa para análisis de postura" />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
            {!cameraOn && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-slate-300">
                <div>
                  <CameraOff className="mx-auto mb-3 text-slate-500" size={36} />
                  <p>Enciende la cámara para iniciar el análisis.</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {!cameraOn ? (
              <button type="button" className="button inline-flex items-center gap-2" onClick={startCamera} disabled={loading}>
                <Camera size={17} /> {loading ? "Preparando el modelo…" : "Encender cámara y analizar"}
              </button>
            ) : (
              <>
                <button type="button" className="button inline-flex items-center gap-2" onClick={chooseAnotherPerson} disabled={!modelReady}>
                  <Camera size={17} /> Reiniciar seguimiento
                </button>
                <button type="button" className="button inline-flex items-center gap-2" onClick={() => stopCamera()}>
                  <CameraOff size={17} /> Detener cámara
                </button>
              </>
            )}
          </div>
          {cameraOn && (
            <p className="mt-3 text-sm text-slate-600" role="status" aria-live="polite">
              {!modelReady
                ? loading
                  ? "Cámara encendida; preparando el modelo de detección. Puedes detenerla mientras carga."
                  : "El análisis no está disponible. Detén y vuelve a iniciar la cámara para intentarlo de nuevo."
                : poseCount === 0
                ? "Buscando personas en el encuadre…"
                : trackId === null
                  ? `Se detectaron ${poseCount} ${poseCount === 1 ? "persona" : "personas"}; preparando seguimiento.`
                  : !trackVisible
                    ? `Se perdió de vista la pista ${trackId + 1}; no se cambiará a otra persona.`
                  : poseCount > 1
                    ? `Siguiendo a una persona entre ${poseCount} detectadas · pista ${trackId + 1}.`
                    : `Persona en seguimiento · pista ${trackId + 1}.`}
            </p>
          )}
          {error && <p className="status error mt-4" role="alert">{error}</p>}
        </section>

        <aside className="space-y-5">
          <section className={`card border-l-4 ${alertActive ? "border-l-amber-500" : "border-l-emerald-600"}`} aria-live="polite">
            <p className="eyebrow">Lectura actual</p>
            <div className="mt-3 flex items-center gap-3">
              {alertActive ? <AlertTriangle className="text-amber-600" size={28} /> : <Activity className="text-emerald-700" size={28} />}
              <div>
                <h2 className="text-xl">{alertActive ? "Revisa tu alineación" : cameraOn ? "Postura en observación" : "Listo para empezar"}</h2>
                <p className="text-sm text-slate-600">
                  {alertActive
                    ? "El torso se mantiene inclinado. Haz una pausa y reajusta tu posición."
                    : trackVisible
                      ? `Persona seguida · movimiento ${movementDetected ? "detectado" : "estable"}${angle !== null ? ` · inclinación del torso: ${angle}°` : ""}`
                    : cameraOn && angle !== null
                      ? `Inclinación estimada del torso: ${angle}°`
                      : cameraOn
                        ? "Encuadra una persona de cuerpo completo; coloca la cámara de lado."
                        : "La detección se activa únicamente al encender la cámara."}
                </p>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg">Cómo usarlo</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
              <li>Enciende la cámara y encuadra a las personas de cuerpo completo; se dibujan hasta seis esqueletos detectados.</li>
              <li>El sistema selecciona la persona con detección más clara y mantiene su seguimiento aunque detecte a otras.</li>
              <li>Si pierde de vista a la persona, no cambia a otra; pulsa “Reiniciar seguimiento” para seleccionarla de nuevo.</li>
              <li>Tras 1,6 segundos de inclinación sostenida de la persona seguida, aparece una alerta visual y suena un aviso.</li>
            </ol>
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-950">
              <CheckCircle2 className="mr-1 inline" size={15} />
              El seguimiento es visual y anónimo: no reconoce nombres ni guarda imágenes; el video se analiza en este dispositivo y no se envía al servidor. Es una ayuda educativa aproximada, no un diagnóstico ni sustituto de las pausas y recomendaciones de seguridad laboral.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
