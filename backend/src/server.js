import express from "express";
import cors from "cors";
import * as store from "./store.js";
import { ensureAdmin, loginAdmin, loginWorker, registerWorker, readSession, verifyAdmin } from "./auth.js";
import * as admin from "./admin.js";

const app = express();
const port = process.env.PORT || 4000;

ensureAdmin();

app.use(cors());
app.use(express.json({ limit: "6mb" }));
app.use("/api/uploads", express.static(admin.uploadsDir));

function tokenOf(req) {
  return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

function requireAdmin(req, res, next) {
  if (!verifyAdmin(tokenOf(req))) return res.status(401).json({ message: "Entra como administrador." });
  next();
}

function workerId(req) {
  const session = readSession(tokenOf(req));
  return session?.role === "worker" ? session.id : null;
}

app.post("/api/admin/login", (req, res) => {
  try {
    res.json(loginAdmin(String(req.body?.username || "").trim(), String(req.body?.password || "")));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "No se pudo entrar." });
  }
});

app.post("/api/workers/register", (req, res) => {
  try {
    res.status(201).json(registerWorker(req.body?.name, req.body?.password, req.body?.shift));
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || "No se pudo crear la cuenta." });
  }
});

app.post("/api/workers/login", (req, res) => {
  try {
    res.json(loginWorker(String(req.body?.name || ""), String(req.body?.password || "")));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "No se pudo entrar." });
  }
});

app.use("/api/admin", requireAdmin);

app.get("/api/admin/overview", (_req, res) => {
  res.json(admin.overview());
});

app.post("/api/admin/courses", (req, res, next) => {
  try { res.json(admin.saveCourse(req.body || {})); } catch (error) { next(error); }
});

app.put("/api/admin/courses/:id", (req, res, next) => {
  try { res.json(admin.saveCourse(req.body || {}, req.params.id)); } catch (error) { next(error); }
});

app.delete("/api/admin/courses/:id", (req, res, next) => {
  try { res.json(admin.removeCourse(req.params.id)); } catch (error) { next(error); }
});

app.post("/api/admin/courses/:id/lessons", (req, res, next) => {
  try { res.json(admin.saveLesson(req.params.id, req.body || {})); } catch (error) { next(error); }
});

app.put("/api/admin/courses/:courseId/lessons/:lessonId", (req, res, next) => {
  try { res.json(admin.saveLesson(req.params.courseId, req.body || {}, req.params.lessonId)); } catch (error) { next(error); }
});

app.delete("/api/admin/courses/:courseId/lessons/:lessonId", (req, res, next) => {
  try { res.json(admin.removeLesson(req.params.courseId, req.params.lessonId)); } catch (error) { next(error); }
});

app.post("/api/admin/courses/:courseId/lessons/:lessonId/move", (req, res, next) => {
  try {
    const direction = req.body?.direction === "up" ? -1 : 1;
    res.json(admin.moveLesson(req.params.courseId, req.params.lessonId, direction));
  } catch (error) { next(error); }
});

app.post("/api/admin/team", (req, res, next) => {
  try { res.json(admin.savePerson(req.body || {})); } catch (error) { next(error); }
});

app.put("/api/admin/team/:id", (req, res, next) => {
  try { res.json(admin.savePerson(req.body || {}, req.params.id)); } catch (error) { next(error); }
});

app.delete("/api/admin/team/:id", (req, res, next) => {
  try { res.json(admin.removePerson(req.params.id)); } catch (error) { next(error); }
});

app.post("/api/admin/uploads", (req, res, next) => {
  try { res.json(admin.saveFile(req.body?.name, req.body?.data)); } catch (error) { next(error); }
});

app.delete("/api/admin/uploads/:name", (req, res, next) => {
  try { res.json(admin.removeFile(req.params.name)); } catch (error) { next(error); }
});

app.get("/api/health", (_req, res) => {
  res.json(store.health());
});

app.get("/api/me", (req, res) => {
  res.json(store.me(workerId(req)));
});

app.get("/api/dashboard", (req, res) => {
  res.json(store.dashboard(workerId(req)));
});

app.get("/api/courses", (req, res) => {
  res.json(store.listCourses(workerId(req)));
});

app.get("/api/courses/:id", (req, res) => {
  const course = store.getCourse(req.params.id, workerId(req));
  if (!course) return res.status(404).json({ message: "Ese curso no está en el taller." });
  res.json(course);
});

app.post("/api/courses/:id/lessons/:lessonId/complete", (req, res) => {
  const course = store.toggleLesson(req.params.id, req.params.lessonId, workerId(req));
  if (!course) return res.status(404).json({ message: "No encontré esa lección." });
  res.json(course);
});

app.get("/api/courses/:id/quiz", (req, res) => {
  const quiz = store.getQuiz(req.params.id, workerId(req));
  if (!quiz) return res.status(404).json({ message: "Ese curso no tiene práctica." });
  res.json(quiz);
});

app.post("/api/courses/:id/quiz", (req, res) => {
  try {
    const result = store.submitQuiz(req.params.id, req.body?.answers, workerId(req));
    if (!result) return res.status(404).json({ message: "Ese curso no tiene práctica." });
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "No se pudo guardar la práctica." });
  }
});

app.get("/api/team", (_req, res) => {
  res.json(store.listTeam());
});

app.get("/api/progress", (req, res) => {
  res.json(store.progressReport(workerId(req)));
});

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Esa ruta no existe." });
});

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  res.status(error.status || 500).json({ message: error.message || "No se pudo guardar." });
});

app.listen(port, () => {
  console.log(`API en http://localhost:${port}`);
});
