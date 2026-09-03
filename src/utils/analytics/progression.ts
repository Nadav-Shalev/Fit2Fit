import type { CalendarDate, ID } from '@/models/common';
import type { ExerciseSession, WorkoutSession } from '@/models/session';
import type { TranslationKey } from '@/i18n/locales/en';
import type { SetBreakdownEntry } from '@/utils/format';
import {
  calcBestSet,
  calcExerciseDuration,
  calcExerciseReps,
  calcExerciseVolume,
  calcTopWeight,
} from './volume';

/** One point on an exercise's progress chart. */
export interface ExerciseProgressPoint {
  sessionId: ID;
  date: CalendarDate;
  startedAt: string;
  totalReps: number;
  totalVolumeKg: number;
  topWeightKg: number;
  bestSetReps: number;
  bestSetVolume: number;
  completedSets: number;
  totalDurationSeconds: number;
  /** The sets as performed, for the "15, 15, 13" breakdown. */
  repsPerSet: number[];
  /** The same sets with their load, for the "3 × 10 @ 80 kg" chart detail. */
  setDetails: SetBreakdownEntry[];
}

function hasCompletedSets(exercise: ExerciseSession): boolean {
  return exercise.sets.some((set) => set.completed);
}

/** Every finished workout containing this exercise, oldest first. */
export function collectExerciseSessions(
  sessions: WorkoutSession[],
  exerciseId: ID,
): Array<{ session: WorkoutSession; exercise: ExerciseSession }> {
  return sessions
    .filter((session) => session.status === 'completed')
    .flatMap((session) =>
      session.exercises
        .filter((exercise) => exercise.exerciseId === exerciseId && hasCompletedSets(exercise))
        .map((exercise) => ({ session, exercise })),
    )
    .sort((a, b) => a.session.startedAt.localeCompare(b.session.startedAt));
}

/** Chart series for one exercise. */
export function buildExerciseProgress(
  sessions: WorkoutSession[],
  exerciseId: ID,
): ExerciseProgressPoint[] {
  return collectExerciseSessions(sessions, exerciseId).map(({ session, exercise }) => {
    const best = calcBestSet(exercise);
    const completed = exercise.sets.filter((set) => set.completed);
    return {
      sessionId: session.id,
      date: session.date,
      startedAt: session.startedAt,
      totalReps: calcExerciseReps(exercise),
      totalVolumeKg: Math.round(calcExerciseVolume(exercise)),
      topWeightKg: calcTopWeight(exercise),
      bestSetReps: best?.reps ?? 0,
      bestSetVolume: Math.round(best?.volume ?? 0),
      completedSets: completed.length,
      totalDurationSeconds: calcExerciseDuration(exercise),
      repsPerSet: completed.map((set) => set.actualReps ?? set.actualDurationSeconds ?? 0),
      setDetails: completed.map((set) => {
        const entry: SetBreakdownEntry = { reps: set.actualReps ?? 0 };
        if (set.actualWeightKg !== undefined) entry.weightKg = set.actualWeightKg;
        if (exercise.isTimed && set.actualDurationSeconds !== undefined) {
          entry.durationSeconds = set.actualDurationSeconds;
        }
        return entry;
      }),
    };
  });
}

/**
 * The most recent performance of an exercise before the current workout.
 * This is the "last time" line shown during a workout — the bar to beat.
 */
export function findPreviousExercisePerformance(
  sessions: WorkoutSession[],
  exerciseId: ID,
  excludeSessionId?: ID,
): { session: WorkoutSession; exercise: ExerciseSession } | null {
  const history = collectExerciseSessions(sessions, exerciseId).filter(
    ({ session }) => session.id !== excludeSessionId,
  );
  return history.length > 0 ? (history[history.length - 1] ?? null) : null;
}

export type ProgressDirection = 'up' | 'same' | 'down' | 'new';

/** Which metric decided the comparison. */
export type ProgressMetric = 'volume' | 'reps' | 'duration';

export interface ProgressionComparison {
  direction: ProgressDirection;
  metric: ProgressMetric;
  volumeDelta: number;
  repsDelta: number;
  setsDelta: number;
  durationDelta: number;
  /** Percentage change of the deciding metric; `null` without a baseline. */
  percentChange: number | null;
}

interface ExerciseMetrics {
  volume: number;
  reps: number;
  sets: number;
  duration: number;
}

function measure(exercise: ExerciseSession): ExerciseMetrics {
  return {
    volume: calcExerciseVolume(exercise),
    reps: calcExerciseReps(exercise),
    sets: exercise.sets.filter((set) => set.completed).length,
    duration: calcExerciseDuration(exercise),
  };
}

/**
 * Compares a performance against the previous one (progressive overload).
 *
 * The verdict is deliberately not based on weight alone: weighted exercises are
 * judged on total volume (weight x reps x sets), bodyweight exercises on total
 * reps, and holds on total seconds. That way adding reps at the same weight, or
 * adding a set, both register as progress.
 */
export function compareExercisePerformance(
  current: ExerciseSession,
  previous: ExerciseSession | null,
): ProgressionComparison {
  const currentMetrics = measure(current);

  if (!previous) {
    return {
      direction: 'new',
      metric: currentMetrics.volume > 0 ? 'volume' : 'reps',
      volumeDelta: 0,
      repsDelta: 0,
      setsDelta: 0,
      durationDelta: 0,
      percentChange: null,
    };
  }

  const previousMetrics = measure(previous);

  const metric: ProgressMetric =
    currentMetrics.volume > 0 || previousMetrics.volume > 0
      ? 'volume'
      : currentMetrics.reps > 0 || previousMetrics.reps > 0
        ? 'reps'
        : 'duration';

  const currentValue = currentMetrics[metric];
  const previousValue = previousMetrics[metric];
  const delta = currentValue - previousValue;
  // Small tolerance so fractional kilograms are not reported as an improvement.
  const epsilon = metric === 'volume' ? 0.01 : 0;

  return {
    direction: delta > epsilon ? 'up' : delta < -epsilon ? 'down' : 'same',
    metric,
    volumeDelta: Math.round((currentMetrics.volume - previousMetrics.volume) * 10) / 10,
    repsDelta: currentMetrics.reps - previousMetrics.reps,
    setsDelta: currentMetrics.sets - previousMetrics.sets,
    durationDelta: currentMetrics.duration - previousMetrics.duration,
    percentChange:
      previousValue > 0 ? Math.round(((currentValue - previousValue) / previousValue) * 100) : null,
  };
}

/** Translation key describing a comparison result. */
export function progressionLabelKey(direction: ProgressDirection): TranslationKey {
  switch (direction) {
    case 'new':
      return 'workout.progressNew';
    case 'up':
      return 'workout.progressUp';
    case 'down':
      return 'workout.progressDown';
    case 'same':
      return 'workout.progressSame';
  }
}
