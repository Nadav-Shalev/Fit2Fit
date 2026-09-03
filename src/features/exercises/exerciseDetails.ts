import type { MuscleGroup, NumericRange } from '@/models/common';
import type { Exercise } from '@/models/exercise';
import type { WorkoutProgramExercise } from '@/models/program';
import type { ExerciseSession } from '@/models/session';

/**
 * Everything the details view shows, flattened from whichever source it came
 * from — a program row plus its catalog entry, or the snapshot inside a
 * performed workout.
 */
export interface ExerciseDetails {
  name: string;
  secondaryName?: string;
  category?: MuscleGroup;
  isWeighted: boolean;
  isTimed: boolean;
  sets: number;
  reps: NumericRange | null;
  durationSeconds?: number;
  rir?: NumericRange;
  restSeconds: number;
  targetWeightKg?: number;
  videoUrl?: string;
  notes?: string;
}

/** Details for a row of a program being edited or viewed. */
export function detailsFromProgramRow(
  row: WorkoutProgramExercise,
  exercise: Exercise | undefined,
  fallbackRestSeconds: number,
): ExerciseDetails {
  const details: ExerciseDetails = {
    name: exercise?.name ?? row.exerciseId,
    isWeighted: exercise?.isWeighted ?? false,
    isTimed: exercise?.isTimed ?? false,
    sets: row.plannedSets,
    reps: row.plannedReps,
    // A rest of 0 has never been storable through the editor, so it means "unset".
    restSeconds: row.restSeconds || exercise?.defaultRestSeconds || fallbackRestSeconds,
  };

  if (exercise?.nameEn) details.secondaryName = exercise.nameEn;
  if (exercise?.category) details.category = exercise.category;
  if (row.plannedDurationSeconds !== undefined) {
    details.durationSeconds = row.plannedDurationSeconds;
  }
  if (row.plannedRir) details.rir = row.plannedRir;
  if (row.targetWeightKg !== undefined) details.targetWeightKg = row.targetWeightKg;
  if (exercise?.videoUrl) details.videoUrl = exercise.videoUrl;

  // The row's own note is the specific instruction; the catalog note is general.
  const notes = [row.notes, exercise?.notes].filter(Boolean).join('\n\n');
  if (notes) details.notes = notes;

  return details;
}

/** Details for an exercise inside a workout, read from its snapshot. */
export function detailsFromSession(exercise: ExerciseSession): ExerciseDetails {
  const details: ExerciseDetails = {
    name: exercise.exerciseName,
    isWeighted: exercise.isWeighted,
    isTimed: exercise.isTimed,
    sets: exercise.planned.sets,
    reps: exercise.planned.reps,
    restSeconds: exercise.planned.restSeconds,
  };

  if (exercise.exerciseNameEn) details.secondaryName = exercise.exerciseNameEn;
  details.category = exercise.category;
  if (exercise.planned.durationSeconds !== undefined) {
    details.durationSeconds = exercise.planned.durationSeconds;
  }
  if (exercise.planned.rir) details.rir = exercise.planned.rir;
  if (exercise.planned.targetWeightKg !== undefined) {
    details.targetWeightKg = exercise.planned.targetWeightKg;
  }
  if (exercise.videoUrl) details.videoUrl = exercise.videoUrl;
  if (exercise.notes) details.notes = exercise.notes;

  return details;
}
