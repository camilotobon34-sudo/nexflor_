import { useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, ArrowLeft, Camera, CameraOff, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const KEYPOINT_THRESHOLD = 0.3;
const ALERT_ANGLE = 28;
const ALERT_DELAY_MS = 1600;
const FRAME_INTERVAL_MS = 140;

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

function drawPose(canvas, video, pose) {
  if (!canvas || !video.videoWidth || !video.videoHeight) return;
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);

  const keypoints = new Map(pose.keypoints.map((point) => [point.name, point]));
  const segments = [
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

  context.lineWidth = Math.max(2, canvas.width / 240);
  context.strokeStyle = "#34d399";
  context.fillStyle = "#facc15";
  for (const [startName, endName] of segments) {
    const start = keypoints.get(startName);
    const end = keypoints.get(endName);
    if (!start || !end || start.score < KEYPOINT_THRESHOLD || end.score < KEYPOINT_THRESHOLD) continue;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }
  for (const point of pose.keypoints) {
    if (point.score < KEYPOINT_THRESHOLD) continue;
    context.beginPath();
    context.arc(point.x, point.y, Math.max(3, canvas.width / 120), 0, Math.PI * 2);
    context.fill();
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
  const badSinceRef = useRef(0);
  const lastBeepRef = useRef(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  const [angle, setAngle] = useState(null);
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
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    detectorRef.current?.dispose();
    detectorRef.current = null;
    badSinceRef.current = 0;
    frameBusyRef.current = false;
    if (updateState) {
      setCameraOn(false);
      setAlertActive(false);
      setAngle(null);
    }
  }

  useEffect(() => () => {
    stopCamera(false);
    if (audioRef.current && audioRef.current.state !== "closed") {
      audioRef.current.close().catch((audioError) => console.error("No se pudo cerrar el audio:", audioError));
    }
  }, []);

  async function startCamera() {
    setError("");
    setLoading(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Este navegador requiere una conexión HTTPS para acceder a la cámara.");
      }

      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!audioRef.current && AudioContextConstructor) audioRef.current = new AudioContextConstructor();
      if (audioRef.current?.state === "suspended") await audioRef.current.resume();

      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (!videoRef.current) throw new Error("No se pudo preparar la vista de cámara.");
      videoRef.current.srcObject = streamRef.current;
      await videoRef.current.play();

      const tf = await import("@tensorflow/tfjs");
      const webglReady = await tf.setBackend("webgl");
      if (!webglReady) await tf.setBackend("cpu");
      await tf.ready();
      const poseDetection = await import("@tensorflow-models/pose-detection");
      detectorRef.current = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      });

      setCameraOn(true);
      frameRef.current = requestAnimationFrame(detectFrame);
    } catch (cameraError) {
      stopCamera();
      setError(cameraError.message || "No se pudo iniciar el análisis de postura.");
    } finally {
      setLoading(false);
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
          const poses = await detectorRef.current.estimatePoses(video, { maxPoses: 1, flipHorizontal: false });
          const pose = poses[0];
          if (pose) {
            drawPose(overlayRef.current, video, pose);
            const measuredAngle = torsoAngle(pose);
            setAngle(measuredAngle);
            const now = performance.now();
            if (measuredAngle !== null && measuredAngle >= ALERT_ANGLE) {
              if (!badSinceRef.current) badSinceRef.current = now;
              const shouldAlert = now - badSinceRef.current >= ALERT_DELAY_MS;
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
            const canvas = overlayRef.current;
            canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
            setAngle(null);
            setAlertActive(false);
          }
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
          {cameraOn ? "Cámara activa · análisis local" : "Cámara apagada"}
        </span>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <section className="card">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-950">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" aria-label="Vista previa para análisis de postura" />
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
              <button type="button" className="button inline-flex items-center gap-2" onClick={() => stopCamera()}>
                <CameraOff size={17} /> Detener cámara
              </button>
            )}
          </div>
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
                    : cameraOn && angle !== null
                      ? `Inclinación estimada del torso: ${angle}°`
                      : cameraOn
                        ? "Encuadra hombros y cadera; coloca la cámara de lado."
                        : "La detección se activa únicamente al encender la cámara."}
                </p>
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg">Cómo usarlo</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
              <li>Coloca el dispositivo a un lado y encuadra hombros y cadera.</li>
              <li>Permite el acceso a la cámara y mantente dentro del cuadro.</li>
              <li>Si la inclinación estimada persiste, verás una alerta visual y sonora.</li>
            </ol>
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-950">
              <CheckCircle2 className="mr-1 inline" size={15} />
              El video se analiza en este dispositivo y no se envía al servidor. Es una ayuda educativa aproximada, no un diagnóstico ni sustituto de las pausas y recomendaciones de seguridad laboral.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
