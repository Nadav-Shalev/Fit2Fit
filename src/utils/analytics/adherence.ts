/**
 * Completion percentage. Returns 0 when nothing was planned — it is up to the UI
 * to decide whether to render that as a dash.
 *
 * Deliberately not capped at 100: doing four of three planned workouts is 133%.
 */
export function adherencePercent(completed: number, planned: number): number {
  if (planned <= 0) return 0;
  return Math.round((completed / planned) * 100);
}

/** Percentage change between two periods. `null` when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}
