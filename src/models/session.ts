import type { CalendarDate, ID, ISODateTime, MuscleGroup, NumericRange } from './common';

/** A single set as actually performed. */
export interface SetSession {
  id: ID;
  /** Set number, 1-based — shown to the user as "Set 1". */
  index: number;
  /** Targets copied from the program when the workout was started. */
  targetReps?: number;
  targetDurationSeconds?: number;
  targetWeightKg?: number;
  /** What was actually done. */
  actualReps?: number;
  actualWeightKg?: number;
  actualDurationSeconds?: number;
  completed: boolean;
  completedAt?: ISODateTime;
}

export type ExerciseSessionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/**
 * The targets as they stood when the workout ran.
 * This is a snapshot: editing the program later must never rewrite history.
 */
export interface PlannedSnapshot {
  sets: number;
  reps: NumericRange | null;
  durationSeconds?: number;
  rir?: NumericRange;
  restSeconds: number;
  targetWeightKg?: number;
}

/** One exercise inside a performed workout. */
export interface ExerciseSession {
  id: ID;
  /** Points back at the catalog entry, enabling progress tracking over time. */
  exerciseId: ID;
  /** Snapshot of the name so history stays readable after edits or deletions. */
  exerciseName: string;
  exerciseNameEn?: string;
  category: MuscleGroup;
  isWeighted: boolean;
  isTimed: boolean;
  videoUrl?: string;
  order: number;
  planned: PlannedSnapshot;
  sets: SetSession[];
  /** Optional per-exercise effort rating, 1-10. */
  rpe?: number;
  notes?: string;
  status: ExerciseSessionStatus;
}

export type WorkoutSessionStatus = 'active' | 'completed' | 'aborted';

/** A strength workout that was performed, or is being performed right now. */
export interface WorkoutSession {
  id: ID;
  /** Program the workout started from; may be missing if that program was deleted. */
  programId?: ID;
  /** Snapshot of the program name. */
  programName: string;
  /** Local "YYYY-MM-DD" used for day grouping. */
  date: CalendarDate;
  startedAt: ISODateTime;
  endedAt?: ISODateTime;
  /** Elapsed seconds; finalized when the workout ends. */
  durationSeconds: number;
  status: WorkoutSessionStatus;
  exercises: ExerciseSession[];
  /** Overall effort rating, 1-10. Required to finish a workout. */
  rpe?: number;
  notes?: string;
}
