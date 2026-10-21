import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { enrich } from "./teach.js";

const require = createRequire(import.meta.url);
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/db.json");
const seed = require("../data/db.json");
let memory = null;

function read() {
  if (memory) return memory;
  try {
    memory = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    memory = JSON.parse(JSON.stringify(seed));
  }
  return memory;
}

function write(data) {
  memory = data;
  const tmp = `${file}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    try {
      fs.renameSync(tmp, file);
    } catch {
      fs.copyFileSync(tmp, file);
      fs.unlinkSync(tmp);
    }
  } catch (error) {
    if (!["EROFS", "EPERM", "EACCES", "ENOENT"].includes(error.code)) throw error;
  }
}

export function readDb() {
  return read();
}

export function writeDb(data) {
  write(data);
}

function lessonKey(courseId, lessonId) {
  return `${courseId}:${lessonId}`;
}

function courseProgress(course, completed) {
  const total = course.lessons.length;
  const done = course.lessons.filter((lesson) => completed.has(lessonKey(course.id, lesson.id))).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

function publicCourse(course, completed) {
  const progress = courseProgress(course, completed);
  return {
    id: course.id,
    title: course.title,
    summary: course.summary,
    category: course.category,
    minutes: course.minutes,
    level: course.level,
    image: course.image,
    lessons: course.lessons.length,
    progress,
    gameTitle: course.game?.title || null,
  };
}

function completedSet(db) {
  return new Set(db.progress.completedLessons);
}

export function health() {
  return { ok: true };
}

export function me() {
  const db = read();
  return db.user;
}

export function listCourses() {
  const db = read();
  const completed = completedSet(db);
  return db.courses.map((course) => publicCourse(enrich(course), completed));
}

export function getCourse(id) {
  const db = read();
  const found = db.courses.find((item) => item.id === id);
  if (!found) return null;
  const course = enrich(found);
  const completed = completedSet(db);
  const progress = courseProgress(course, completed);
  const lastAttempt = [...db.progress.attempts].reverse().find((attempt) => attempt.courseId === id) || null;
  return {
    ...publicCourse(course, completed),
    gallery: course.gallery,
    lessons: course.lessons.map((lesson) => ({
      ...lesson,
      done: completed.has(lessonKey(course.id, lesson.id)),
    })),
    progress,
    game: course.game,
    quiz: {
      questions: course.quiz.length,
      lastScore: lastAttempt ? lastAttempt.percent : null,
    },
  };
}

export function toggleLesson(courseId, lessonId) {
  const db = read();
  const course = db.courses.find((item) => item.id === courseId);
  if (!course) return null;
  const lesson = course.lessons.find((item) => item.id === lessonId);
  if (!lesson) return null;
  const key = lessonKey(courseId, lessonId);
  const list = db.progress.completedLessons;
  const index = list.indexOf(key);
  if (index >= 0) list.splice(index, 1);
  else list.push(key);
  const completed = completedSet(db);
  const laura = db.team.find((person) => person.id === "laura");
  if (laura) {
    const all = db.courses.reduce((sum, item) => sum + item.lessons.length, 0);
    const done = db.progress.completedLessons.length;
    laura.progress = all ? Math.round((done / all) * 100) : 0;
  }
  write(db);
  return getCourse(courseId);
}

export function getQuiz(courseId) {
  const db = read();
  const course = db.courses.find((item) => item.id === courseId);
  if (!course) return null;
  const lastAttempt = [...db.progress.attempts].reverse().find((attempt) => attempt.courseId === courseId) || null;
  return {
    courseId: course.id,
    courseTitle: course.title,
    title: "Pon en práctica lo que aprendiste",
    summary: "Cuatro situaciones del mesón. No hay trampa: es lo mismo que se hace en el turno.",
    questions: course.quiz.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options.map(({ id, text }) => ({ id, text })),
    })),
    lastAttempt: lastAttempt
      ? { percent: lastAttempt.percent, score: lastAttempt.score, total: lastAttempt.total, at: lastAttempt.at }
      : null,
  };
}

export function submitQuiz(courseId, answers) {
  const db = read();
  const course = db.courses.find((item) => item.id === courseId);
  if (!course) return null;
  if (!answers || typeof answers !== "object") {
    const error = new Error("Faltan las respuestas.");
    error.status = 400;
    throw error;
  }
  const results = course.quiz.map((question) => {
    const chosen = answers[question.id] || null;
    return {
      id: question.id,
      chosen,
      correctOptionId: question.correct,
      correct: chosen === question.correct,
    };
  });
  const score = results.filter((item) => item.correct).length;
  const total = results.length;
  const attempt = {
    courseId,
    score,
    total,
    percent: total ? Math.round((score / total) * 100) : 0,
    at: new Date().toISOString(),
  };
  db.progress.attempts.push(attempt);
  write(db);
  return { ...attempt, results };
}

export function listTeam() {
  const db = read();
  const average = db.team.length
    ? Math.round(db.team.reduce((sum, person) => sum + person.progress, 0) / db.team.length)
    : 0;
  return {
    title: "Un equipo que crece seguro",
    summary: "Cada persona tiene un recorrido. Aquí se ve quién va al día y quién necesita un rato en el mesón.",
    stats: [
      { label: "Personas", value: String(db.team.length) },
      { label: "Turno mañana", value: String(db.team.filter((person) => person.shift === "Mañana").length) },
      { label: "Turno tarde", value: String(db.team.filter((person) => person.shift === "Tarde").length) },
      { label: "Avance del equipo", value: `${average}%` },
    ],
    people: db.team,
  };
}

export function progressReport() {
  const db = read();
  const completed = completedSet(db);
  const courses = db.courses.map((course) => {
    const progress = courseProgress(course, completed);
    return {
      id: course.id,
      title: course.title,
      category: course.category,
      percent: progress.percent,
      done: progress.done,
      total: progress.total,
      minutes: course.minutes,
    };
  });
  const minutesDone = db.courses.reduce((sum, course) => {
    const doneMinutes = course.lessons
      .filter((lesson) => completed.has(lessonKey(course.id, lesson.id)))
      .reduce((inner, lesson) => inner + lesson.minutes, 0);
    return sum + doneMinutes;
  }, 0);
  const pendingPractice = db.courses.filter((course) => {
    const attempt = db.progress.attempts.some((item) => item.courseId === course.id);
    const progress = courseProgress(course, completed);
    return progress.percent > 0 && !attempt;
  }).length;
  return {
    title: "Aprendizaje de cada recorrido",
    summary: "Lo que Laura ya cerró y lo que sigue abierto en el taller.",
    stats: [
      { label: "Cursos sin empezar", value: String(courses.filter((course) => course.percent === 0).length) },
      { label: "Lecciones listas", value: String(courses.reduce((sum, course) => sum + course.done, 0)) },
      { label: "Minutos vistos", value: String(minutesDone) },
      { label: "Prácticas pendientes", value: String(pendingPractice) },
    ],
    courses,
    people: db.team.map((person) => ({
      id: person.id,
      name: person.name,
      role: person.role,
      focus: person.focus,
      progress: person.progress,
    })),
  };
}

export function dashboard() {
  const db = read();
  const completed = completedSet(db);
  const courses = db.courses.map((course) => ({ course, progress: courseProgress(course, completed) }));
  const continueCourse = db.courses.find((course) => course.id === db.user.continueCourseId) || db.courses[0];
  const continueProgress = courseProgress(continueCourse, completed);
  const nextLesson = continueCourse.lessons.find((lesson) => !completed.has(lessonKey(continueCourse.id, lesson.id)))
    || continueCourse.lessons[0];
  const lessonsDone = courses.reduce((sum, item) => sum + item.progress.done, 0);
  const lessonsTotal = courses.reduce((sum, item) => sum + item.progress.total, 0);
  const average = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;
  const openCourses = courses.filter((item) => item.progress.percent > 0 && item.progress.percent < 100).length;
  const pendingQuiz = courses.filter((item) => !db.progress.attempts.some((attempt) => attempt.courseId === item.course.id)).length;

  const tasks = db.courses.flatMap((course) => course.lessons
    .filter((lesson) => !completed.has(lessonKey(course.id, lesson.id)))
    .slice(0, 1)
    .map((lesson) => ({
      id: lessonKey(course.id, lesson.id),
      title: lesson.title,
      meta: course.title,
      href: `/cursos/${course.id}`,
    }))).slice(0, 4);

  const hour = new Date().getHours();
  const hello = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return {
    greeting: `${hello}, ${db.user.name}`,
    subtitle: "El turno del taller, los cursos y el equipo, en la misma mesa.",
    banner: {
      kicker: "Sigue donde lo dejaste",
      title: "El bienestar de tu equipo, en un solo lugar.",
      text: `${continueCourse.title}. Lección abierta: ${nextLesson.title}.`,
      cta: "Continuar",
      href: `/cursos/${continueCourse.id}`,
      image: continueCourse.image,
    },
    stats: [
      { label: "Lecciones listas", value: String(lessonsDone), hint: `de ${lessonsTotal}` },
      { label: "Avance general", value: `${average}%`, hint: "de todo el recorrido" },
      { label: "Cursos abiertos", value: String(openCourses), hint: "empezados y sin cerrar" },
      { label: "Prácticas por hacer", value: String(pendingQuiz), hint: "aún sin intento" },
    ],
    tasks,
    tracks: courses.slice(0, 3).map((item) => ({
      id: item.course.id,
      label: item.course.title,
      value: item.progress.percent,
    })),
    continueProgress,
  };
}
