import { getProgressStages } from "../progressStages.js";

export default function StageProgress({ completedLessons, totalLessons, compact = false }) {
  const progress = getProgressStages(completedLessons, totalLessons);

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Etapas del recorrido</p>
          {!compact && (
            <p className="mt-1 text-xs text-slate-500">
              10 etapas compartidas, calculadas a partir de las lecciones completadas.
            </p>
          )}
        </div>
        <strong className="shrink-0 text-sm text-emerald-800">
          {progress.completed}/{progress.total}
        </strong>
      </div>
      <div
        className="mt-3 grid grid-cols-10 gap-1.5"
        role="progressbar"
        aria-label="Etapas completadas"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.completed}
        aria-valuetext={`${progress.completed} de ${progress.total} etapas`}
      >
        {Array.from({ length: progress.total }, (_, index) => (
          <span
            key={index}
            className={`h-2 rounded-full ${index < progress.completed ? "bg-emerald-600" : "bg-slate-200"}`}
            aria-hidden="true"
          />
        ))}
      </div>
    </section>
  );
}
