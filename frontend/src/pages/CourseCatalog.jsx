import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useApi } from "../api.js";
import { Status } from "../components/Shell.jsx";

export default function CourseCatalog() {
  const { loading, error, data } = useApi("/courses");

  return (
    <Status loading={loading} error={error}>
      <section className="mx-auto max-w-7xl space-y-5 px-1 py-6">
        <p className="eyebrow">Flores El Trigal · Aprendizaje</p>
        <h1>Recorridos del taller</h1>
        <p className="lede">Continúa tus cursos. Tu avance se guarda en tu cuenta y también queda disponible para el panel administrativo.</p>

        {data?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((course) => (
              <article key={course.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                {course.image && (
                  <img
                    src={course.image}
                    alt=""
                    className="h-40 w-full rounded-xl object-cover"
                  />
                )}
                <div>
                  <p className="eyebrow">{course.category} · {course.level}</p>
                  <h2 className="text-xl">{course.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">{course.summary}</p>
                </div>
                <div className="mt-auto">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><BookOpen size={14} /> {course.progress.done} de {course.progress.total} lecciones</span>
                    <span>{course.progress.percent}%</span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`Avance de ${course.title}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={course.progress.percent}
                  >
                    <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${course.progress.percent}%` }} />
                  </div>
                  <Link className="button mt-4 inline-flex items-center gap-2" to={`/cursos/${course.id}`}>
                    {course.progress.percent === 100 ? "Revisar curso" : "Continuar"}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="status">Todavía no hay cursos publicados.</p>
        )}
      </section>
    </Status>
  );
}
