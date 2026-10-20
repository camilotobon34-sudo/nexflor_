let faceapi;
let ready;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function eyeAspect(points, start) {
  const point = (offset) => points[start + offset];
  const span = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const horizontal = span(point(0), point(3));
  if (!horizontal) return 0;
  return (span(point(1), point(5)) + span(point(2), point(4))) / (2 * horizontal);
}

function average(list) {
  const out = new Array(128).fill(0);
  for (const item of list) {
    for (let index = 0; index < 128; index += 1) out[index] += item[index];
  }
  let norm = 0;
  for (let index = 0; index < 128; index += 1) {
    out[index] /= list.length;
    norm += out[index] * out[index];
  }
  norm = Math.sqrt(norm) || 1;
  return out.map((value) => Number((value / norm).toFixed(6)));
}

export async function prepareModels(onProgress) {
  if (ready) return;
  onProgress?.("Cargando el modelo de rostros…");
  faceapi = await import("@vladmandic/face-api/dist/face-api.esm.js");
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
  await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
  ready = true;
}

export async function measureVideo(video) {
  await prepareModels();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const samples = [];
  const prints = [];
  for (let step = 0; step < 4; step += 1) {
    const width = video.videoWidth || 480;
    const height = video.videoHeight || 360;
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, 32, 32).data;
    prints.push(Array.from(pixels.slice(0, 64)).join(","));
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    const faces = await faceapi.detectAllFaces(canvas, options).withFaceLandmarks().withFaceDescriptors();
    if (faces.length === 1) {
      const points = faces[0].landmarks.positions;
      samples.push({
        descriptor: Array.from(faces[0].descriptor),
        ear: (eyeAspect(points, 36) + eyeAspect(points, 42)) / 2,
        noseX: points[30].x,
        boxWidth: faces[0].detection.box.width || 1,
      });
    }
    if (step < 3) await wait(450);
  }
  const staticImage = prints.every((print) => print === prints[0]);
  if (samples.length < 2) return { quality: false, liveness: false, staticImage, descriptor: null };
  const ears = samples.map((sample) => sample.ear);
  const noses = samples.map((sample) => sample.noseX);
  const moved = Math.max(...noses) - Math.min(...noses) > samples[0].boxWidth * 0.035;
  const blinked = Math.max(...ears) - Math.min(...ears) >= 0.045;
  return {
    quality: true,
    liveness: !staticImage && (blinked || moved),
    staticImage,
    descriptor: average(samples.map((sample) => sample.descriptor)),
  };
}
