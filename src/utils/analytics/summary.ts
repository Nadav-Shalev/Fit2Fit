import type { DayOfWeek } from '@/models/common';
import type { RunningSession } from '@/models/running';
import type { WeeklySchedule } from '@/models/schedule';
import type { WorkoutSession } from '@/models/session';
import type { DateRange } from '@/utils/date';
import {
  eachDayOfRange,
  getMonthRange,
  getWeekRange,
  isCalendarDateWithinRange,
} from '@/utils/date';
import { adherencePercent, percentChange } from './adherence';
import { averageRpe } from './rpe';
import {
  calcSessionTotalReps,
  calcSessionVolume,
  countCompletedSets,
  countPlannedSets,
} from './volume';
import { sumRunningDistance, sumRunningDuration } from './running';

export interface PeriodSummary {
  range: DateRange;
  strengthWorkouts: number;
  runningWorkouts: number;
  /** Strength plus running time. */
  totalDurationSeconds: number;
  strengthDurationSeconds: number;
  runningDurationSeconds: number;
  completedSets: number;
  plannedSets: number;
  /** Sets completed out of those planned in the workouts that were performed. */
  setCompletionPercent: number;
  totalVolumeKg: number;
  totalReps: number;
  runningDistanceKm: number;
  averageRpe: number | null;
  scheduledStrength: number;
  scheduledRunning: number;
  /** Workouts performed against workouts planned in the weekly schedule. */
  adherencePercent: number;
}

export interface SummaryInput {
  workoutSessions: WorkoutSession[];
  runningSessions: RunningSession[];
  schedule: WeeklySchedule;
  range: DateRange;
}

/** How many scheduled slots fall inside a range, per the weekly plan. */
export function countScheduledInRange(
  schedule: WeeklySchedule,
  range: DateRange,
): { strength: number; running: number } {
  let strength = 0;
  let running = 0;

  for (const day of eachDayOfRange(range)) {
    const dayOfWeek = day.getDay() as DayOfWeek;
    for (const entry of schedule.entries) {
      if (entry.dayOfWeek !== dayOfWeek) continue;
      if (entry.kind === 'strength') strength += 1;
      else running += 1;
    }
  }

  return { strength, running };
}

export function summarizePeriod({
  workoutSessions,
  runningSessions,
  schedule,
  range,
}: SummaryInput): PeriodSummary {
  const workouts = workoutSessions.filter(
    (session) => session.status === 'completed' && isCalendarDateWithinRange(session.date, range),
  );
  const runs = runningSessions.filter((session) => isCalendarDateWithinRange(session.date, range));

  const completedSets = workouts.reduce((total, session) => total + countCompletedSets(session), 0);
  const plannedSets = workouts.reduce((total, session) => total + countPlannedSets(session), 0);
  const strengthDurationSeconds = workouts.reduce(
    (total, session) => total + session.durationSeconds,
    0,
  );
  const runningDurationSeconds = sumRunningDuration(runs);
  const scheduled = countScheduledInRange(schedule, range);

  return {
    range,
    strengthWorkouts: workouts.length,
    runningWorkouts: runs.length,
    totalDurationSeconds: strengthDurationSeconds + runningDurationSeconds,
    strengthDurationSeconds,
    runningDurationSeconds,
    completedSets,
    plannedSets,
    setCompletionPercent: adherencePercent(completedSets, plannedSets),
    totalVolumeKg: Math.round(
      workouts.reduce((total, session) => total + calcSessionVolume(session), 0),
    ),
    totalReps: workouts.reduce((total, session) => total + calcSessionTotalReps(session), 0),
    runningDistanceKm: sumRunningDistance(runs),
    averageRpe: averageRpe([
      ...workouts.map((session) => session.rpe),
      ...runs.map((session) => session.rpe),
    ]),
    scheduledStrength: scheduled.strength,
    scheduledRunning: scheduled.running,
    adherencePercent: adherencePercent(
      workouts.length + runs.length,
      scheduled.strength + scheduled.running,
    ),
  };
}

export function weeklySummary(
  input: Omit<SummaryInput, 'range'>,
  date: Date = new Date(),
  weekStartsOn: DayOfWeek = 0,
): PeriodSummary {
  return summarizePeriod({ ...input, range: getWeekRange(date, weekStartsOn) });
}

export function monthlySummary(
  input: Omit<SummaryInput, 'range'>,
  date: Date = new Date(),
): PeriodSummary {
  return summarizePeriod({ ...input, range: getMonthRange(date) });
}

export interface PeriodComparison {
  workoutsDelta: number;
  strengthDelta: number;
  runningDelta: number;
  /** Volume change in percent; `null` when the previous period had no volume. */
  volumeDeltaPercent: number | null;
  runningDistanceDeltaKm: number;
  durationDeltaSeconds: number;
  rpeDelta: number | null;
}

/** Period-over-period deltas: "+1 workout, +12% volume, +3.5 km". */
export function comparePeriods(current: PeriodSummary, previous: PeriodSummary): PeriodComparison {
  return {
    workoutsDelta:
      current.strengthWorkouts +
      current.runningWorkouts -
      (previous.strengthWorkouts + previous.runningWorkouts),
    strengthDelta: current.strengthWorkouts - previous.strengthWorkouts,
    runningDelta: current.runningWorkouts - previous.runningWorkouts,
    volumeDeltaPercent: percentChange(current.totalVolumeKg, previous.totalVolumeKg),
    runningDistanceDeltaKm:
      Math.round((current.runningDistanceKm - previous.runningDistanceKm) * 100) / 100,
    durationDeltaSeconds: current.totalDurationSeconds - previous.totalDurationSeconds,
    rpeDelta:
      current.averageRpe !== null && previous.averageRpe !== null
        ? Math.round((current.averageRpe - previous.averageRpe) * 10) / 10
        : null,
  };
}
