export const TOTAL_PROGRESS_STAGES = 10;

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

export function getProgressStages(completedLessons, totalLessons) {
  const total = nonNegativeInteger(totalLessons);
  const completed = Math.min(total, nonNegativeInteger(completedLessons));
  const completedStages = total
    ? Math.floor((completed * TOTAL_PROGRESS_STAGES) / total)
    : 0;

  return {
    completed: Math.min(TOTAL_PROGRESS_STAGES, completedStages),
    total: TOTAL_PROGRESS_STAGES,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}
