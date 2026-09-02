import type { DayOfWeek } from '@/models/common';
import type { RunningSession } from '@/models/running';
import { addDays, getWeekRange, startOfWeek } from '@/utils/date';
import { filterRunsInRange, sumRunningDistance, sumRunningDuration } from './running';

export interface WeeklyRunBucket {
  start: Date;
  runs: number;
  distanceKm: number;
  durationSeconds: number;
}

/**
 * Groups runs into the last `weeks` calendar weeks, oldest first.
 *
 * Empty weeks are kept so the chart shows the gaps rather than silently
 * compressing a break in training.
 */
export function bucketRunsByWeek(
  sessions: RunningSession[],
  weeks: number,
  weekStartsOn: DayOfWeek = 0,
  now: Date = new Date(),
): WeeklyRunBucket[] {
  const currentWeekStart = startOfWeek(now, weekStartsOn);

  return Array.from({ length: weeks }, (_, index) => {
    const start = addDays(currentWeekStart, -(weeks - 1 - index) * 7);
    const range = getWeekRange(start, weekStartsOn);
    const runs = filterRunsInRange(sessions, range);

    return {
      start,
      runs: runs.length,
      distanceKm: sumRunningDistance(runs),
      durationSeconds: sumRunningDuration(runs),
    };
  });
}
