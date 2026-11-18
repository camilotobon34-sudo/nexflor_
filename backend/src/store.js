import { AsyncLocalStorage } from "async_hooks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { enrich } from "./teach.js";

const bundled = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/db.json");
const mysqlRequest = new AsyncLocalStorage();
let mysqlPoolPromise;
let mysqlSchemaPromise;

function dataFile() {
  if (!process.env.VERCEL) return bundled;
  throw new Error("No hay una base temporal disponible en Vercel. Configura MYSQL_URL.");
}

function loadDatabase() {
  const context = mysqlRequest.getStore();
  if (context) return context.data;
  if (process.env.VERCEL || process.env.MYSQL_URL) {
    throw new Error("La base de datos solo se puede consultar dentro de una solicitud inicializada.");
  }
  return JSON.parse(fs.readFileSync(dataFile(), "utf8"));
}

function write(data) {
  const context = mysqlRequest.getStore();
  if (context) {
    context.data = data;
    context.dirty = true;
    return;
  }
  if (process.env.VERCEL || process.env.MYSQL_URL) {
    throw new Error("No se puede guardar fuera de una solicitud inicializada de MySQL.");
  }
  fs.writeFileSync(dataFile(), JSON.stringify(data, null, 2));
}

export function readDb() {
  return loadDatabase();
}

export function writeDb(data) {
  write(data);
}

export function usesMysqlStorage() {
  return Boolean(process.env.VERCEL || process.env.MYSQL_URL);
}

export function parseMysqlUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (!["mysql:", "mysql2:"].includes(url.protocol) || !url.hostname || !url.username || !url.password || url.pathname.length < 2) {
      throw new Error("Invalid MySQL URL.");
    }
    return {
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
    };
  } catch {
    const error = new Error("MYSQL_URL debe ser una URL válida: mysql://usuario:contraseña@host:puerto/base.");
    error.status = 503;
    throw error;
  }
}

export function mysqlTlsOptions(env = process.env) {
  if (env.MYSQL_SSL === "false") return undefined;
  const ca = String(env.MYSQL_SSL_CA || "").trim();
  return {
    rejectUnauthorized: env.MYSQL_SSL_ALLOW_SELF_SIGNED !== "true",
    ...(ca ? { ca } : {}),
  };
}

async function getMysqlPool() {
  if (!process.env.MYSQL_URL) {
    const error = new Error("La base persistente MySQL no está configurada. Define MYSQL_URL en el entorno de despliegue.");
    error.status = 503;
    throw error;
  }
  if (!mysqlPoolPromise) {
    mysqlPoolPromise = import("mysql2/promise")
      .then(({ createPool }) => {
        return createPool({
          ...parseMysqlUrl(process.env.MYSQL_URL),
          waitForConnections: true,
          connectionLimit: Math.max(1, Number(process.env.MYSQL_CONNECTION_LIMIT) || 3),
          maxIdle: 2,
          idleTimeout: 60000,
          enableKeepAlive: true,
          connectTimeout: 10000,
          ssl: mysqlTlsOptions(),
        });
      })
      .catch((error) => {
        mysqlPoolPromise = null;
        throw error;
      });
  }
  const pool = await mysqlPoolPromise;
  if (!mysqlSchemaPromise) {
    mysqlSchemaPromise = pool.query(
      "CREATE TABLE IF NOT EXISTS nexflor_state (id TINYINT UNSIGNED NOT NULL PRIMARY KEY, payload JSON NOT NULL) ENGINE=InnoDB",
    ).catch((error) => {
      mysqlSchemaPromise = null;
      throw error;
    });
  }
  await mysqlSchemaPromise;
  return pool;
}

function installResponseCommit(res, connection, context) {
  const originalEnd = res.end.bind(res);
  let ending = false;

  res.end = function end(...args) {
    if (ending) return res;
    ending = true;

    (async () => {
      try {
        if (context.dirty && res.statusCode < 400) {
          await connection.execute(
            "UPDATE nexflor_state SET payload = CAST(? AS JSON) WHERE id = 1",
            [JSON.stringify(context.data)],
          );
          await connection.commit();
        } else {
          await connection.rollback();
        }
      } catch (error) {
        await connection.rollback().catch(() => {});
        console.error("MySQL transaction:", error);
        res.statusCode = error.status || 503;
        res.removeHeader("Content-Length");
        res.removeHeader("ETag");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        args = [JSON.stringify({
          message: error.status ? error.message : "No se pudo guardar en la base de datos.",
        })];
      } finally {
        connection.release();
        originalEnd(...args);
      }
    })();

    return res;
  };
}

export async function withDatabaseRequest(_req, res, next) {
  if (!usesMysqlStorage()) return next();

  let connection;
  try {
    const pool = await getMysqlPool();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [seed] = await connection.execute(
      "INSERT IGNORE INTO nexflor_state (id, payload) VALUES (1, CAST(? AS JSON))",
      [fs.readFileSync(bundled, "utf8")],
    );
    const [rows] = await connection.query(
      "SELECT CAST(payload AS CHAR) AS payload FROM nexflor_state WHERE id = 1 FOR UPDATE",
    );
    if (!rows.length) throw new Error("La base MySQL no tiene el registro inicial de Nexflor.");

    const payload = rows[0].payload;
    const context = {
      data: typeof payload === "string" ? JSON.parse(payload) : payload,
      dirty: seed.affectedRows > 0,
    };
    const [{ ensureAdmin, resetInitialAdminPasswords, resetAdminPasswordOnce }, { ensureStaff }, face] = await Promise.all([
      import("./auth.js"),
      import("./staff.js"),
      import("./faceStore.js"),
    ]);
    installResponseCommit(res, connection, context);
    mysqlRequest.run(context, () => {
      if (seed.affectedRows > 0) resetInitialAdminPasswords();
      ensureAdmin();
      const adminPasswordResetId = String(process.env.ADMIN_PASSWORD_RESET_ID || "").trim();
      if (adminPasswordResetId) resetAdminPasswordOnce("camilo", adminPasswordResetId);
      ensureStaff();
      face.ensureFace(context.data);
      next();
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
      connection.release();
    }
    next(error);
  }
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

function progressBag(db, workerId) {
  if (!workerId) return db.progress;
  const worker = (db.workers || []).find((item) => item.id === workerId);
  if (!worker) return { completedLessons: [], attempts: [] };
  if (!Array.isArray(worker.completedLessons)) worker.completedLessons = [];
  if (!Array.isArray(worker.attempts)) worker.attempts = [];
  return worker;
}

function completedSet(db, workerId) {
  return new Set(progressBag(db, workerId).completedLessons);
}

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function health() {
  return { ok: true };
}

export function me(workerId) {
  const db = loadDatabase();
  const worker = workerId && (db.workers || []).find((item) => item.id === workerId);
  if (!worker) return db.user;
  return {
    id: worker.id,
    name: worker.name.split(" ")[0],
    fullName: worker.name,
    role: "Trabajador",
    initials: initials(worker.name),
    continueCourseId: worker.continueCourseId || db.user.continueCourseId,
  };
}

export function listCourses(workerId) {
  const db = loadDatabase();
  const completed = completedSet(db, workerId);
  return db.courses.map((course) => publicCourse(enrich(course), completed));
}

export function getCourse(id, workerId) {
  const db = loadDatabase();
  const found = db.courses.find((item) => item.id === id);
  if (!found) return null;
  const course = enrich(found);
  const completed = completedSet(db, workerId);
  const progress = courseProgress(course, completed);
  const lastAttempt = [...progressBag(db, workerId).attempts].reverse().find((attempt) => attempt.courseId === id) || null;
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

export function toggleLesson(courseId, lessonId, workerId) {
  const db = loadDatabase();
  const course = db.courses.find((item) => item.id === courseId);
  if (!course) return null;
  const lesson = course.lessons.find((item) => item.id === lessonId);
  if (!lesson) return null;
  const key = lessonKey(courseId, lessonId);
  const bag = progressBag(db, workerId);
  const list = bag.completedLessons;
  const index = list.indexOf(key);
  if (index >= 0) list.splice(index, 1);
  else list.push(key);
  const all = db.courses.reduce((sum, item) => sum + item.lessons.length, 0);
  const percent = all ? Math.round(list.length / all * 100) : 0;
  const personId = workerId || "laura";
  const person = db.team.find((item) => item.id === personId);
  if (person) person.progress = percent;
  if (workerId) {
    const worker = (db.workers || []).find((item) => item.id === workerId);
    if (worker) worker.progress = percent;
  }
  write(db);
  return getCourse(courseId, workerId);
}

export function getQuiz(courseId, workerId) {
  const db = loadDatabase();
  const course = db.courses.find((item) => item.id === courseId);
  if (!course) return null;
  const lastAttempt = [...progressBag(db, workerId).attempts].reverse().find((attempt) => attempt.courseId === courseId) || null;
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

export function submitQuiz(courseId, answers, workerId) {
  const db = loadDatabase();
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
  progressBag(db, workerId).attempts.push(attempt);
  write(db);
  return { ...attempt, results };
}

export function listTeam() {
  const db = loadDatabase();
  const average = db.team.length
    ? Math.round(db.team.reduce((sum, person) => sum + person.progress, 0) / db.team.length)
    : 0;
  return {
    title: "El equipo del cultivo",
    summary: "Cada persona tiene su recorrido. Aquí se ve quién va al día en las camas, la poscosecha y la seguridad.",
    stats: [
      { label: "Personas", value: String(db.team.length) },
      { label: "Turno mañana", value: String(db.team.filter((person) => person.shift === "Mañana").length) },
      { label: "Turno tarde", value: String(db.team.filter((person) => person.shift === "Tarde").length) },
      { label: "Avance del equipo", value: `${average}%` },
    ],
    people: db.team,
  };
}

export function progressReport(workerId) {
  const db = loadDatabase();
  const completed = completedSet(db, workerId);
  const bag = progressBag(db, workerId);
  const learner = workerId ? me(workerId).name : db.user.name;
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
    const attempt = bag.attempts.some((item) => item.courseId === course.id);
    const progress = courseProgress(course, completed);
    return progress.percent > 0 && !attempt;
  }).length;
  return {
    title: "Aprendizaje de cada recorrido",
    summary: `Lo que ${learner} ya cerró y lo que sigue abierto en el taller.`,
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

export function dashboard(workerId) {
  const db = loadDatabase();
  const person = me(workerId);
  const completed = completedSet(db, workerId);
  const bag = progressBag(db, workerId);
  const courses = db.courses.map((course) => ({ course, progress: courseProgress(course, completed) }));
  const continueCourse = db.courses.find((course) => course.id === person.continueCourseId) || db.courses[0];
  const continueProgress = courseProgress(continueCourse, completed);
  const nextLesson = continueCourse.lessons.find((lesson) => !completed.has(lessonKey(continueCourse.id, lesson.id)))
    || continueCourse.lessons[0];
  const lessonsDone = courses.reduce((sum, item) => sum + item.progress.done, 0);
  const lessonsTotal = courses.reduce((sum, item) => sum + item.progress.total, 0);
  const average = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;
  const openCourses = courses.filter((item) => item.progress.percent > 0 && item.progress.percent < 100).length;
  const pendingQuiz = courses.filter((item) => !bag.attempts.some((attempt) => attempt.courseId === item.course.id)).length;

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
    greeting: `${hello}, ${person.name}`,
    subtitle: "Las plantas, las camas y el despacho, en el orden en que se trabaja.",
    banner: {
      kicker: "Sigue donde lo dejaste",
      title: "El cultivo, paso a paso.",
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
