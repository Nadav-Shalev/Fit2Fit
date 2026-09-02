import type { CardioActivity, RunningProgram, RunningSession } from '@/models/running';
import type { DateRange } from '@/utils/date';
import { isCalendarDateWithinRange } from '@/utils/date';

/**
 * Resolves the activity of a stored record.
 *
 * `activity` was added when walking was introduced, so everything saved before
 * that is missing it — and every one of those records is a run. Reading the
 * field through here is what keeps old history valid.
 */
export function cardioActivityOf(record: Pick<RunningSession, 'activity'>): CardioActivity {
  return record.activity ?? 'run';
}

/** Keeps only the sessions of one activity; `undefined` keeps everything. */
export function filterByActivity(
  sessions: RunningSession[],
  activity: CardioActivity | undefined,
): RunningSession[] {
  if (!activity) return sessions;
  return sessions.filter((session) => cardioActivityOf(session) === activity);
}

/**
 * Pace in seconds per kilometre: pace = duration / distance.
 * Returns `undefined` without a distance — dividing by zero is not a pace.
 */
export function calcPaceSecondsPerKm(
  durationSeconds: number,
  distanceKm: number | undefined,
): number | undefined {
  if (!distanceKm || distanceKm <= 0) return undefined;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return undefined;
  return durationSeconds / distanceKm;
}

/** Average speed in km/h. */
export function calcSpeedKmh(
  durationSeconds: number,
  distanceKm: number | undefined,
): number | undefined {
  const pace = calcPaceSecondsPerKm(durationSeconds, distanceKm);
  return pace === undefined ? undefined : 3600 / pace;
}

export function filterRunsInRange(sessions: RunningSession[], range: DateRange): RunningSession[] {
  return sessions.filter((session) => isCalendarDateWithinRange(session.date, range));
}

export function sumRunningDistance(sessions: RunningSession[]): number {
  const total = sessions.reduce((sum, session) => sum + (session.distanceKm ?? 0), 0);
  return Math.round(total * 100) / 100;
}

export function sumRunningDuration(sessions: RunningSession[]): number {
  return sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
}

/**
 * Distance-weighted average pace. Averaging the individual paces instead would
 * over-weight short runs.
 */
export function averagePace(sessions: RunningSession[]): number | undefined {
  const withDistance = sessions.filter((session) => (session.distanceKm ?? 0) > 0);
  if (withDistance.length === 0) return undefined;
  return calcPaceSecondsPerKm(sumRunningDuration(withDistance), sumRunningDistance(withDistance));
}

/** Planned duration of a running program in seconds, expanding repeats. */
export function calcRunningProgramDuration(program: RunningProgram): number {
  return program.steps.reduce((total, step) => {
    const stepSeconds = step.intervals.reduce(
      (sum, interval) => sum + (interval.durationSeconds ?? 0),
      0,
    );
    return total + stepSeconds * step.repeat;
  }, 0);
}

/** Planned distance of a running program in kilometres, expanding repeats. */
export function calcRunningProgramDistanceKm(program: RunningProgram): number {
  const meters = program.steps.reduce((total, step) => {
    const stepMeters = step.intervals.reduce(
      (sum, interval) => sum + (interval.distanceMeters ?? 0),
      0,
    );
    return total + stepMeters * step.repeat;
  }, 0);
  return Math.round((meters / 1000) * 100) / 100;
}
