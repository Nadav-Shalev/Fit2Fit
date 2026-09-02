import type { ExerciseSession, SetSession, WorkoutSession } from '@/models/session';

/**
 * Volume of a single set in kilograms: weight x reps.
 * Sets that were not ticked off do not count, and neither do bodyweight sets,
 * which have no weight to multiply by — measure those in reps instead.
 */
export function calcSetVolume(set: SetSession): number {
  if (!set.completed) return 0;
  const weight = set.actualWeightKg ?? 0;
  const reps = set.actualReps ?? 0;
  if (weight <= 0 || reps <= 0) return 0;
  return weight * reps;
}

export function calcExerciseVolume(exercise: ExerciseSession): number {
  return exercise.sets.reduce((total, set) => total + calcSetVolume(set), 0);
}

/** Total workout volume in kilograms. */
export function calcSessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce((total, exercise) => total + calcExerciseVolume(exercise), 0);
}

export function calcExerciseReps(exercise: ExerciseSession): number {
  return exercise.sets.reduce(
    (total, set) => total + (set.completed ? (set.actualReps ?? 0) : 0),
    0,
  );
}

export function calcSessionTotalReps(session: WorkoutSession): number {
  return session.exercises.reduce((total, exercise) => total + calcExerciseReps(exercise), 0);
}

/** Total seconds held in time-based exercises such as planks. */
export function calcExerciseDuration(exercise: ExerciseSession): number {
  return exercise.sets.reduce(
    (total, set) => total + (set.completed ? (set.actualDurationSeconds ?? 0) : 0),
    0,
  );
}

export function countCompletedSets(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.completed).length,
    0,
  );
}

/** Sets that were planned, excluding exercises the user deliberately skipped. */
export function countPlannedSets(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, exercise) => (exercise.status === 'skipped' ? total : total + exercise.sets.length),
    0,
  );
}

export function countCompletedExercises(session: WorkoutSession): number {
  return session.exercises.filter((exercise) => exercise.status === 'completed').length;
}

export interface BestSet {
  weightKg: number;
  reps: number;
  volume: number;
  durationSeconds: number;
}

/** Ranks a set: volume when weighted, otherwise reps, otherwise seconds held. */
function scoreSet(set: BestSet): number {
  if (set.volume > 0) return set.volume;
  if (set.reps > 0) return set.reps;
  return set.durationSeconds;
}

/** The strongest set of an exercise, or `null` when nothing was completed. */
export function calcBestSet(exercise: ExerciseSession): BestSet | null {
  let best: BestSet | null = null;

  for (const set of exercise.sets) {
    if (!set.completed) continue;
    const candidate: BestSet = {
      weightKg: set.actualWeightKg ?? 0,
      reps: set.actualReps ?? 0,
      volume: calcSetVolume(set),
      durationSeconds: set.actualDurationSeconds ?? 0,
    };
    if (!best || scoreSet(candidate) > scoreSet(best)) best = candidate;
  }

  return best;
}

/** Heaviest weight lifted in an exercise. */
export function calcTopWeight(exercise: ExerciseSession): number {
  return exercise.sets.reduce(
    (max, set) => (set.completed ? Math.max(max, set.actualWeightKg ?? 0) : max),
    0,
  );
}
