import { useEffect, useRef, useState } from "react";

const DEFAULT_SETTINGS = {
  tolerance: 6000,
  repeat: 4000,
  volume: 0.35,
  enabled: true,
  sensitivity: 0.12,
};

const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [8, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [17, 19], [19, 21], [12, 14], [14, 16],
  [16, 18], [18, 20], [20, 22], [11, 23], [12, 24], [23, 25], [25, 27], [27, 29],
  [29, 31], [24, 26], [26, 28], [28, 30], [30, 32], [23, 24], [11, 12],
];

const REQUIRED_LANDMARKS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

function averagePoint(a, b) {
  if (!a || !b) return null;
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getLandmark(landmarks, index) {
  const point = landmarks[index];
  if (!point || (point.visibility !== undefined && point.visibility < 0.5)) return null;
  return { x: point.x, y: point.y, z: point.z ?? 0 };
}

function drawSkeleton(context, landmarks) {
  if (!context || !landmarks?.length) return;

  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.lineWidth = 3;
  context.strokeStyle = "rgba(128, 255, 176, 0.9)";

  for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
    const start = getLandmark(landmarks, startIndex);
    const end = getLandmark(landmarks, endIndex);
    if (!start || !end) continue;

    context.beginPath();
    context.moveTo(start.x * context.canvas.width, start.y * context.canvas.height);
    context.lineTo(end.x * context.canvas.width, end.y * context.canvas.height);
    context.stroke();
  }

  context.fillStyle = "#7af7c8";
  for (const index of REQUIRED_LANDMARKS) {
    const point = getLandmark(landmarks, index);
    if (!point) continue;
    context.beginPath();
    context.arc(point.x * context.canvas.width, point.y * context.canvas.height, 5, 0, Math.PI * 2);
    context.fill();
  }
}

function classifyDistance(boundingBoxHeight, boundingBoxWidth) {
  const heightRatio = boundingBoxHeight;
  const widthRatio = boundingBoxWidth;

  if (heightRatio < 0.28 || widthRatio > 0.8) {
    return "demasiado cerca";
  }
  if (heightRatio > 0.92) {
    return "demasiado lejos";
  }
  return "correcta";
}

function buildRecommendations(issues) {
  const map = {
    headForward: "Levanta la mirada y manten la pantalla a la altura de los ojos.",
    neckSide: "Centra el cuello y evita la inclinación lateral prolongada.",
    shoulderMisalignment: "Alinea los hombros y relaja los brazos sin elevar un lado.",
    torsoLean: "Reequilibra el tronco para que la espalda y la cadera estén alineadas.",
    archBack: "Estira la columna y no encorves la espalda mientras trabajas.",
    distance: "Ajusta tu ubicación para que el cuerpo quede bien centrado frente a la cámara.",
  };

  if (!issues.length) {
    return ["Mantén la cabeza alineada con los hombros y la mirada nivelada."];
  }

  return issues.map((item) => map[item]).filter(Boolean);
}

export default function Posture() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const toneRef = useRef(null);
  const lastUiUpdateRef = useRef(0);
  const lastAnalysisAtRef = useRef(0);
  const badStartRef = useRef(0);
  const lastAlertRef = useRef(0);
  const trackingRef = useRef(false);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const badFramesRef = useRef(0);
  const goodFramesRef = useRef(0);
  const postureBadRef = useRef(false);
  const [isTracking, setIsTracking] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [status, setStatus] = useState("Esperando inicio");
  const [alertState, setAlertState] = useState("espera");
  const [score, setScore] = useState(0);
  const [issues, setIssues] = useState([]);
  const [recommendations, setRecommendations] = useState([
    "Mantén la cabeza alineada con los hombros y la mirada nivelada.",
  ]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [cameraLabel, setCameraLabel] = useState("Sin cámara activa");
  const [detection, setDetection] = useState(false);
  const [viewMode, setViewMode] = useState("frontal");
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    return () => {
      trackingRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      landmarkerRef.current?.close();
      audioContextRef.current?.close();
    };
  }, []);

  async function ensureLandmarker() {
    if (landmarkerRef.current) return;

    const [{ PoseLandmarker, FilesetResolver }] = await Promise.all([
      import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3"),
    ]);

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm",
    );

    landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      outputSegmentationMasks: false,
    });
  }

  function getAudioContext() {
    if (!audioContextRef.current) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      audioContextRef.current = new AudioCtor();
    }
    return audioContextRef.current;
  }

  function triggerAlertTone() {
    const currentSettings = settingsRef.current;
    if (!currentSettings.enabled || toneRef.current) return;

    const context = getAudioContext();
    if (!context) return;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 920;
    gainNode.gain.value = clamp(currentSettings.volume, 0.05, 0.75) * 0.18;

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    toneRef.current = oscillator;
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
      if (toneRef.current === oscillator) toneRef.current = null;
    };
    oscillator.start();
    oscillator.stop(context.currentTime + 0.14);
  }

  function stopAlertTone() {
    if (toneRef.current) {
      try {
        toneRef.current.stop();
      } catch {
        toneRef.current = null;
      }
    }
    lastAlertRef.current = 0;
  }

  async function startCamera() {
    if (isStarting || trackingRef.current) return;
    setCameraError("");
    if (!window.isSecureContext) {
      setCameraError("El navegador solo permite usar la cámara en HTTPS o en localhost.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Este navegador no tiene soporte para la cámara. Revisa los permisos o usa un navegador compatible.");
      return;
    }

    setIsStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      const audioContext = getAudioContext();
      if (audioContext?.state === "suspended") {
        await audioContext.resume();
      }
      await ensureLandmarker();
      trackingRef.current = true;
      setCameraReady(true);
      setCameraLabel("Cámara activa");
      setIsTracking(true);
      setStatus("Analizando postura");
      setAlertState("correcta");
      setScore(0);
      setIssues([]);
      setRecommendations(["Mantén la cabeza alineada con los hombros y la mirada nivelada."]);
      badStartRef.current = 0;
      badFramesRef.current = 0;
      goodFramesRef.current = 0;
      postureBadRef.current = false;
      lastAnalysisAtRef.current = 0;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(loopAnalysis);
      setDetection(false);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraReady(false);
      setIsTracking(false);
      trackingRef.current = false;
      setCameraError(error.name === "NotAllowedError"
        ? "Necesitas permitir el acceso a la cámara para utilizar Nexflor Posture."
        : "No se pudo iniciar el seguimiento. Revisa la cámara, la conexión y vuelve a intentarlo.");
      setCameraLabel(error.name === "NotAllowedError" ? "Permiso de cámara requerido" : "Seguimiento no disponible");
      setDetection(false);
      setStatus("Seguimiento no disponible");
    } finally {
      setIsStarting(false);
    }
  }

  function stopCamera() {
    trackingRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    stopAlertTone();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    const context = canvasRef.current?.getContext("2d");
    if (context) context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    setCameraReady(false);
    setIsTracking(false);
    setCameraLabel("Cámara detenida");
    setDetection(false);
    setStatus("Seguimiento detenido");
    setAlertState("espera");
    setScore(0);
    setIssues([]);
    setRecommendations(["Mantén la cabeza alineada con los hombros y la mirada nivelada."]);
    badStartRef.current = 0;
    badFramesRef.current = 0;
    goodFramesRef.current = 0;
    postureBadRef.current = false;
    lastAnalysisAtRef.current = 0;
  }

  function analyzeLandmarks(landmarks) {
    const nose = getLandmark(landmarks, 0);
    const leftShoulder = getLandmark(landmarks, 11);
    const rightShoulder = getLandmark(landmarks, 12);
    const leftHip = getLandmark(landmarks, 23);
    const rightHip = getLandmark(landmarks, 24);
    const leftKnee = getLandmark(landmarks, 25);
    const rightKnee = getLandmark(landmarks, 26);
    const leftAnkle = getLandmark(landmarks, 27);
    const rightAnkle = getLandmark(landmarks, 28);

    if (!nose || !leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return {
        detected: false,
        issues: [],
        score: 100,
        label: "Esperando detección",
        recommendation: "Ajusta la posición para que la cámara vea todo el torso.",
      };
    }

    const shoulderMid = averagePoint(leftShoulder, rightShoulder);
    const hipsMid = averagePoint(leftHip, rightHip);
    const minX = Math.min(...[nose.x, leftShoulder.x, rightShoulder.x, leftHip.x, rightHip.x, leftKnee?.x ?? nose.x, rightKnee?.x ?? nose.x, leftAnkle?.x ?? nose.x, rightAnkle?.x ?? nose.x]);
    const maxX = Math.max(...[nose.x, leftShoulder.x, rightShoulder.x, leftHip.x, rightHip.x, leftKnee?.x ?? nose.x, rightKnee?.x ?? nose.x, leftAnkle?.x ?? nose.x, rightAnkle?.x ?? nose.x]);
    const minY = Math.min(...[nose.y, leftShoulder.y, rightShoulder.y, leftHip.y, rightHip.y, leftKnee?.y ?? nose.y, rightKnee?.y ?? nose.y, leftAnkle?.y ?? nose.y, rightAnkle?.y ?? nose.y]);
    const maxY = Math.max(...[nose.y, leftShoulder.y, rightShoulder.y, leftHip.y, rightHip.y, leftKnee?.y ?? nose.y, rightKnee?.y ?? nose.y, leftAnkle?.y ?? nose.y, rightAnkle?.y ?? nose.y]);

    const boxHeight = Math.max(0.05, maxY - minY);
    const boxWidth = Math.max(0.05, maxX - minX);
    const distanceState = classifyDistance(boxHeight, boxWidth);
    const torsoHeight = Math.max(0.1, Math.abs(hipsMid.y - shoulderMid.y));
    const shoulderWidth = Math.max(0.05, Math.abs(leftShoulder.x - rightShoulder.x));
    const sensitivity = settingsRef.current.sensitivity;

    const issues = [];
    if (viewMode === "frontal" && Math.abs(nose.x - shoulderMid.x) / shoulderWidth > 0.2) {
      issues.push("neckSide");
    }
    if (viewMode === "frontal" && Math.abs(leftShoulder.y - rightShoulder.y) / shoulderWidth > sensitivity) {
      issues.push("shoulderMisalignment");
    }
    if (viewMode === "frontal" && Math.abs(shoulderMid.x - hipsMid.x) / torsoHeight > sensitivity) {
      issues.push("torsoLean");
    }
    if (viewMode === "perfil" && Math.abs(nose.x - shoulderMid.x) / torsoHeight > 0.16) {
      issues.push("headForward");
    }
    if (viewMode === "perfil" && Math.abs(shoulderMid.x - hipsMid.x) / torsoHeight > sensitivity) {
      issues.push("archBack");
    }
    const distanceIssue = distanceState !== "correcta";
    const score = clamp(100 - (issues.length + Number(distanceIssue)) * 18, 0, 100);
    const label = issues.length
      ? score >= 45 ? "Atención recomendada" : "Postura inadecuada"
      : distanceIssue ? "Ajusta la distancia" : "Postura correcta";
    const recommendation = buildRecommendations([
      ...issues,
      ...(distanceIssue ? ["distance"] : []),
    ])[0] || "Mantén la cabeza alineada con los hombros y la mirada nivelada.";

    return {
      detected: true,
      issues,
      score,
      label,
      recommendation,
      distanceState,
      distanceIssue,
    };
  }

  function loopAnalysis() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !canvas || !landmarker || !trackingRef.current) {
      return;
    }

    const frameTime = performance.now();
    if (frameTime - lastAnalysisAtRef.current < 50) {
      animationRef.current = requestAnimationFrame(loopAnalysis);
      return;
    }
    lastAnalysisAtRef.current = frameTime;

    if (video.readyState >= 2) {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const result = landmarker.detectForVideo(video, frameTime);
      const landmarks = result.landmarks?.[0];

      if (landmarks?.length) {
        drawSkeleton(canvas.getContext("2d"), landmarks);
        const analysis = analyzeLandmarks(landmarks);
        const now = Date.now();
        if (!analysis.detected) {
          postureBadRef.current = false;
          badStartRef.current = 0;
          badFramesRef.current = 0;
          goodFramesRef.current = 0;
          stopAlertTone();
          if (now - lastUiUpdateRef.current > 120) {
            lastUiUpdateRef.current = now;
            setDetection(false);
            setStatus("Sin cuerpo detectado");
            setCameraLabel("Ajusta el encuadre");
            setIssues([]);
            setScore(0);
            setRecommendations(["Ajusta la cámara para que se vean la cabeza, los hombros y la cadera."]);
            setAlertState("atencion");
          }
        } else {
        const nextIssues = analysis.issues;
        if (nextIssues.length) {
          badFramesRef.current += 1;
          goodFramesRef.current = 0;
          if (!postureBadRef.current && badFramesRef.current >= 3) {
            postureBadRef.current = true;
            badStartRef.current = now;
          }
        } else {
          badFramesRef.current = 0;
          if (postureBadRef.current) {
            goodFramesRef.current += 1;
            if (goodFramesRef.current >= 5) {
              postureBadRef.current = false;
              badStartRef.current = 0;
              goodFramesRef.current = 0;
            }
          } else {
            goodFramesRef.current = 0;
          }
        }

        const inBadState = postureBadRef.current;
        const elapsedBad = inBadState && badStartRef.current ? now - badStartRef.current : 0;
        const shouldAlert = inBadState && elapsedBad >= settingsRef.current.tolerance;

        if (shouldAlert) {
          if (settingsRef.current.enabled && now - lastAlertRef.current >= settingsRef.current.repeat) {
            triggerAlertTone();
            lastAlertRef.current = now;
          }
          setAlertState("alerta");
        } else {
          stopAlertTone();
          setAlertState(inBadState || analysis.distanceIssue ? "atencion" : "correcta");
        }

        if (now - lastUiUpdateRef.current > 120) {
          lastUiUpdateRef.current = now;
          setDetection(true);
          const currentIssues = inBadState ? nextIssues : [];
          setIssues(currentIssues);
          setStatus(inBadState || analysis.distanceIssue ? analysis.label : "Postura correcta");
          setScore(analysis.score);
          setRecommendations(buildRecommendations([
            ...currentIssues,
            ...(analysis.distanceIssue ? ["distance"] : []),
          ]));
          setCameraLabel(analysis.distanceState === "correcta" ? "Distancia correcta" : `Distancia ${analysis.distanceState}`);
        }
        }
      } else {
        setDetection(false);
        setStatus("Sin cuerpo detectado");
        setCameraLabel("Ajusta el encuadre");
        setIssues([]);
        setScore(0);
        setRecommendations(["Ajusta la cámara para que se vean la cabeza, los hombros y la cadera."]);
        postureBadRef.current = false;
        badStartRef.current = 0;
        badFramesRef.current = 0;
        goodFramesRef.current = 0;
        setAlertState("atencion");
        stopAlertTone();
      }
    }

    if (trackingRef.current) {
      animationRef.current = requestAnimationFrame(loopAnalysis);
    }
  }

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="page posture-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Ergonomía digital</p>
          <h1>Nexflor Posture</h1>
          <p className="lede">Supervisa tu postura corporal desde la cámara y recibe alertas preventivas cuando la posición se vuelve incómoda o riesgosa.</p>
          <p className="muted">La vista frontal evalúa inclinación lateral y hombros; el perfil ayuda a detectar cabeza adelantada y tronco inclinado. Son señales preventivas, no un diagnóstico.</p>
        </div>
      </div>

      <section className="posture-shell">
        <div className="posture-hero">
          <div className="posture-video-wrap">
            <video ref={videoRef} playsInline muted autoPlay />
            <canvas ref={canvasRef} />
            {!cameraReady && (
              <div className="camera-placeholder">
                <strong>{cameraLabel}</strong>
                <p>La cámara se activa cuando presionas “Iniciar seguimiento de postura”.</p>
              </div>
            )}
          </div>

          <aside className="posture-status-panel">
            <label className="posture-view-select">
              Vista de cámara
              <select value={viewMode} onChange={(event) => setViewMode(event.target.value)} disabled={isTracking}>
                <option value="frontal">Frontal</option>
                <option value="perfil">Perfil lateral</option>
              </select>
            </label>
            <div className={`posture-badge ${alertState}`}>
              {alertState === "correcta" ? "Postura correcta" : alertState === "atencion" ? "Atención" : alertState === "alerta" ? "Alerta activa" : "En espera"}
            </div>
            <h2>{status}</h2>
            <div
              className="score-ring"
              style={{ "--posture-score": `${Math.round(score) * 3.6}deg` }}
              aria-label={`Indicador preventivo ${Math.round(score)} por ciento`}
            >
              <span>{Math.round(score)}%</span>
            </div>
            <p className="muted">Sistema de monitoreo preventivo, no diagnóstico médico.</p>

            <div className="posture-actions">
              {!isTracking ? (
                <button type="button" className="button" onClick={startCamera} disabled={isStarting}>
                  {isStarting ? "Preparando seguimiento…" : "Iniciar seguimiento de postura"}
                </button>
              ) : (
                <button type="button" className="button secondary" onClick={stopCamera}>Detener seguimiento</button>
              )}
            </div>

            <div className="posture-mini-status">
              <span className={detection ? "live on" : "live"}>{detection ? "Detectando cuerpo" : "Sin detección"}</span>
              <span className="muted">{issues.length ? `${issues.length} señales de alerta` : "Sin riesgos detectados"}</span>
            </div>
          </aside>
        </div>

        {cameraError && <p className="status error">{cameraError}</p>}

        <div className="posture-grid">
          <section className="card posture-card">
            <h3>Estado actual de la postura</h3>
            <ul className="plain posture-list">
              <li><strong>Detección:</strong> <span>{detection ? "Activo" : "Inactivo"}</span></li>
              <li><strong>Estado:</strong> <span>{status}</span></li>
              <li><strong>Riesgo:</strong> <span>{issues.length ? "Se necesita corregir la posición" : "No se reportan riesgos"}</span></li>
              <li><strong>Distancia cámara:</strong> <span>{cameraLabel}</span></li>
            </ul>
          </section>

          <section className="card posture-card">
            <h3>Alertas y configuración</h3>
            <div className="alert-settings">
              <label>
                <span>Tolerancia antes de alerta</span>
                <input type="range" min="2000" max="18000" step="500" value={settings.tolerance} onChange={(event) => updateSetting("tolerance", Number(event.target.value))} />
                <small>{settings.tolerance / 1000}s</small>
              </label>
              <label>
                <span>Frecuencia de repetición</span>
                <input type="range" min="1000" max="12000" step="500" value={settings.repeat} onChange={(event) => updateSetting("repeat", Number(event.target.value))} />
                <small>{settings.repeat / 1000}s</small>
              </label>
              <label>
                <span>Volumen</span>
                <input type="range" min="0.05" max="0.75" step="0.05" value={settings.volume} onChange={(event) => updateSetting("volume", Number(event.target.value))} />
                <small>{settings.volume.toFixed(2)}</small>
              </label>
              <label>
                <span>Sensibilidad de alineación</span>
                <input type="range" min="0.08" max="0.2" step="0.01" value={settings.sensitivity} onChange={(event) => updateSetting("sensitivity", Number(event.target.value))} />
                <small>{settings.sensitivity.toFixed(2)}</small>
              </label>
              <label className="toggle-row">
                <span>Sonido activo</span>
                <input type="checkbox" checked={settings.enabled} onChange={(event) => updateSetting("enabled", event.target.checked)} />
              </label>
            </div>
          </section>

          <section className="card posture-card recommendations-card">
            <h3>Recomendaciones</h3>
            <ul>
              {recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
