import type { ExerciseSession, WorkoutSession } from '@/models/session';
import type { WorkoutProgram } from '@/models/program';

/**
 * Workout length in seconds.
 *
 * Derived from timestamps rather than an incrementing counter, so a page
 * refresh, a locked screen or a backgrounded tab cannot skew the result.
 */
export function calcSessionDurationSeconds(
  session: Pick<WorkoutSession, 'startedAt' | 'endedAt'>,
  now: Date = new Date(),
): number {
  const start = new Date(session.startedAt).getTime();
  const end = session.endedAt ? new Date(session.endedAt).getTime() : now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

/** Whether every set of an exercise has been ticked off. */
export function isExerciseComplete(exercise: ExerciseSession): boolean {
  return exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
}

export interface SessionProgress {
  completedExercises: number;
  totalExercises: number;
  completedSets: number;
  totalSets: number;
  percent: number;
}

/** Live progress of the active workout, shown in the sticky header. */
export function calcSessionProgress(session: WorkoutSession): SessionProgress {
  const totalExercises = session.exercises.length;
  const completedExercises = session.exercises.filter(
    (exercise) => exercise.status === 'completed' || exercise.status === 'skipped',
  ).length;
  const totalSets = session.exercises.reduce((total, ex) => total + ex.sets.length, 0);
  const completedSets = session.exercises.reduce(
    (total, ex) => total + ex.sets.filter((set) => set.completed).length,
    0,
  );

  return {
    completedExercises,
    totalExercises,
    completedSets,
    totalSets,
    percent: totalSets === 0 ? 0 : Math.round((completedSets / totalSets) * 100),
  };
}

/** Assumed working time per set when the exercise is not time-based. */
const ASSUMED_SET_SECONDS = 40;

/**
 * Rough estimate of a program's length in minutes: working time plus the
 * configured rest for every set. Accurate enough to answer "do I have time?".
 */
export function estimateProgramMinutes(program: WorkoutProgram): number {
  const seconds = program.exercises.reduce((total, exercise) => {
    const workSeconds = exercise.plannedDurationSeconds ?? ASSUMED_SET_SECONDS;
    return total + exercise.plannedSets * (workSeconds + exercise.restSeconds);
  }, 0);
  return Math.max(1, Math.round(seconds / 60));
}

/** Total planned sets in a program. */
export function countProgramSets(program: WorkoutProgram): number {
  return program.exercises.reduce((total, exercise) => total + exercise.plannedSets, 0);
}
