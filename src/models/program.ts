import type { ID, ISODateTime, NumericRange } from './common';

/**
 * One planned row inside a workout program.
 * References the catalog `Exercise` by id and adds everything that is specific
 * to this program.
 */
export interface WorkoutProgramExercise {
  id: ID;
  exerciseId: ID;
  /** Position within the program, 0-based. */
  order: number;
  plannedSets: number;
  /** Planned reps. `null` for exercises measured in time. */
  plannedReps: NumericRange | null;
  /** Planned seconds per set, for holds such as planks. */
  plannedDurationSeconds?: number;
  /** Planned reps in reserve; 0 means training to failure. */
  plannedRir?: NumericRange;
  /** Overrides the exercise's default rest for this program. */
  restSeconds: number;
  /** Target weight in kilograms; only meaningful for weighted exercises. */
  targetWeightKg?: number;
  notes?: string;
}

/** A workout template. Holds no performance data — see `WorkoutSession`. */
export interface WorkoutProgram {
  id: ID;
  name: string;
  description?: string;
  exercises: WorkoutProgramExercise[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
