import type { ID, ISODateTime, MuscleGroup } from './common';

/**
 * A catalog exercise — stored once and referenced by any number of programs.
 * This separation is what lets progress tracking follow an exercise across
 * program changes.
 *
 * Note this is only the exercise *definition*; planned sets and reps belong to
 * `WorkoutProgramExercise` because they can differ per program.
 */
export interface Exercise {
  id: ID;
  /** Primary display name, in whichever language the user typed it. */
  name: string;
  /** Secondary name shown underneath, typically the English name. */
  nameEn?: string;
  category: MuscleGroup;
  /** Whether the exercise is logged with a weight. Bodyweight moves are `false`. */
  isWeighted: boolean;
  /** Whether the exercise is measured in seconds rather than reps (planks, holds). */
  isTimed: boolean;
  /** Suggested rest between sets, in seconds. */
  defaultRestSeconds: number;
  /** Link to a demonstration video (YouTube or otherwise). */
  videoUrl?: string;
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
