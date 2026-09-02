import type { ID } from '@/models/common';
import type { Exercise } from '@/models/exercise';
import type { WorkoutProgram, WorkoutProgramExercise } from '@/models/program';
import type { AppSettings } from '@/models/settings';
import type {
  ExerciseSession,
  ExerciseSessionStatus,
  SetSession,
  WorkoutSession,
} from '@/models/session';
import { calcSessionDurationSeconds } from '@/utils/analytics/session';
import { toCalendarDate } from '@/utils/date';
import { createId } from '@/utils/id';

/**
 * Turns a program template into a live workout.
 *
 * Everything the workout needs is copied in as a snapshot, so editing or
 * deleting the program afterwards cannot alter what the history says happened.
 */

/** Top of a planned rep range is the number to beat; a single value is used as-is. */
function targetRepsFor(entry: WorkoutProgramExercise): number | undefined {
  if (!entry.plannedReps) return undefined;
  return entry.plannedReps.max ?? entry.plannedReps.min;
}

function buildSets(entry: WorkoutProgramExercise, exercise: Exercise): SetSession[] {
  return Array.from({ length: entry.plannedSets }, (_, index) => {
    const set: SetSession = {
      id: createId(),
      index: index + 1,
      completed: false,
    };
    const targetReps = targetRepsFor(entry);
    if (!exercise.isTimed && targetReps !== undefined) set.targetReps = targetReps;
    if (exercise.isTimed && entry.plannedDurationSeconds !== undefined) {
      set.targetDurationSeconds = entry.plannedDurationSeconds;
    }
    if (exercise.isWeighted && entry.targetWeightKg !== undefined) {
      set.targetWeightKg = entry.targetWeightKg;
    }
    return set;
  });
}

export function createWorkoutSession(
  program: WorkoutProgram,
  exercisesById: Map<ID, Exercise>,
  settings: AppSettings,
  now: Date = new Date(),
): WorkoutSession {
  const exercises: ExerciseSession[] = [...program.exercises]
    .sort((a, b) => a.order - b.order)
    .flatMap((entry, index) => {
      const exercise = exercisesById.get(entry.exerciseId);
      // An entry whose catalog exercise vanished is skipped rather than crashing
      // the workout the user is trying to start.
      if (!exercise) return [];

      const session: ExerciseSession = {
        id: createId(),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        category: exercise.category,
        isWeighted: exercise.isWeighted,
        isTimed: exercise.isTimed,
        order: index,
        planned: {
          sets: entry.plannedSets,
          reps: entry.plannedReps,
          restSeconds: entry.restSeconds || settings.defaultRestSeconds,
        },
        sets: buildSets(entry, exercise),
        status: 'pending',
      };

      if (exercise.nameEn) session.exerciseNameEn = exercise.nameEn;
      if (exercise.videoUrl) session.videoUrl = exercise.videoUrl;
      if (entry.plannedDurationSeconds !== undefined) {
        session.planned.durationSeconds = entry.plannedDurationSeconds;
      }
      if (entry.plannedRir) session.planned.rir = entry.plannedRir;
      if (entry.targetWeightKg !== undefined) {
        session.planned.targetWeightKg = entry.targetWeightKg;
      }
      if (entry.notes) session.notes = entry.notes;

      return [session];
    });

  return {
    id: createId(),
    programId: program.id,
    programName: program.name,
    date: toCalendarDate(now),
    startedAt: now.toISOString(),
    durationSeconds: 0,
    status: 'active',
    exercises,
  };
}

/** The first set of an exercise that has not been ticked off. */
export function nextIncompleteSet(exercise: ExerciseSession): SetSession | null {
  return exercise.sets.find((set) => !set.completed) ?? null;
}

/**
 * The exercise the live workout should offer next.
 *
 * Follows the planned order from `afterOrder` onwards and then wraps to the
 * beginning, so finishing something out of order still lands on a sensible
 * suggestion rather than the end of the list.
 */
export function nextIncompleteExercise(
  session: WorkoutSession,
  afterOrder = -1,
): ExerciseSession | null {
  const outstanding = [...session.exercises]
    .filter((exercise) => exercise.status !== 'completed' && exercise.status !== 'skipped')
    .sort((a, b) => a.order - b.order);

  return outstanding.find((exercise) => exercise.order > afterOrder) ?? outstanding[0] ?? null;
}

/** Recomputes an exercise's status from its sets; a skipped exercise stays skipped. */
function deriveStatus(exercise: ExerciseSession): ExerciseSessionStatus {
  if (exercise.status === 'skipped') return 'skipped';
  const completed = exercise.sets.filter((set) => set.completed).length;
  if (completed === 0) return 'pending';
  return completed === exercise.sets.length ? 'completed' : 'in_progress';
}

function mapExercise(
  session: WorkoutSession,
  exerciseSessionId: ID,
  update: (exercise: ExerciseSession) => ExerciseSession,
): WorkoutSession {
  return {
    ...session,
    exercises: session.exercises.map((exercise) => {
      if (exercise.id !== exerciseSessionId) return exercise;
      const updated = update(exercise);
      return { ...updated, status: deriveStatus(updated) };
    }),
  };
}

export type SetPatch = Partial<Pick<SetSession, 'actualReps' | 'actualWeightKg' | 'actualDurationSeconds'>>;

export function updateSet(
  session: WorkoutSession,
  exerciseSessionId: ID,
  setId: ID,
  patch: SetPatch,
): WorkoutSession {
  return mapExercise(session, exerciseSessionId, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
  }));
}

/** Records how long a set took, as measured by the live workout stopwatch. */
export function setWorkSeconds(
  session: WorkoutSession,
  exerciseSessionId: ID,
  setId: ID,
  workSeconds: number,
): WorkoutSession {
  return mapExercise(session, exerciseSessionId, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) =>
      set.id === setId ? { ...set, workSeconds: Math.max(0, Math.round(workSeconds)) } : set,
    ),
  }));
}

/** Adds finished rest time to the workout's running total. */
export function addRestSeconds(session: WorkoutSession, seconds: number): WorkoutSession {
  if (seconds <= 0) return session;
  return {
    ...session,
    totalRestSeconds: (session.totalRestSeconds ?? 0) + Math.round(seconds),
  };
}

/**
 * Marks a set done or undoes it.
 *
 * On completion any field the user left blank is filled from the target, so the
 * common case of hitting the plan exactly is a single tap.
 */
export function toggleSetCompleted(
  session: WorkoutSession,
  exerciseSessionId: ID,
  setId: ID,
  now: Date = new Date(),
): WorkoutSession {
  return mapExercise(session, exerciseSessionId, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => {
      if (set.id !== setId) return set;

      if (set.completed) {
        const { completedAt: _completedAt, ...rest } = set;
        return { ...rest, completed: false };
      }

      const completed: SetSession = { ...set, completed: true, completedAt: now.toISOString() };
      if (exercise.isTimed) {
        completed.actualDurationSeconds = set.actualDurationSeconds ?? set.targetDurationSeconds ?? 0;
      } else {
        completed.actualReps = set.actualReps ?? set.targetReps ?? 0;
      }
      if (exercise.isWeighted && completed.actualWeightKg === undefined) {
        const fallback = set.targetWeightKg ?? exercise.planned.targetWeightKg;
        if (fallback !== undefined) completed.actualWeightKg = fallback;
      }
      return completed;
    }),
  }));
}

export function addSet(session: WorkoutSession, exerciseSessionId: ID): WorkoutSession {
  return mapExercise(session, exerciseSessionId, (exercise) => {
    const last = exercise.sets[exercise.sets.length - 1];
    const next: SetSession = {
      id: createId(),
      index: exercise.sets.length + 1,
      completed: false,
    };
    // A new set inherits the previous set's targets so the user rarely retypes.
    if (last?.targetReps !== undefined) next.targetReps = last.targetReps;
    if (last?.targetDurationSeconds !== undefined) {
      next.targetDurationSeconds = last.targetDurationSeconds;
    }
    const inheritedWeight = last?.actualWeightKg ?? last?.targetWeightKg;
    if (inheritedWeight !== undefined) next.targetWeightKg = inheritedWeight;

    return { ...exercise, sets: [...exercise.sets, next] };
  });
}

/** Removes the last set, keeping at least one so an exercise never becomes empty. */
export function removeLastSet(session: WorkoutSession, exerciseSessionId: ID): WorkoutSession {
  return mapExercise(session, exerciseSessionId, (exercise) =>
    exercise.sets.length <= 1 ? exercise : { ...exercise, sets: exercise.sets.slice(0, -1) },
  );
}

export function setExerciseNotes(
  session: WorkoutSession,
  exerciseSessionId: ID,
  notes: string,
): WorkoutSession {
  return mapExercise(session, exerciseSessionId, (exercise) => ({ ...exercise, notes }));
}

export function setExerciseRpe(
  session: WorkoutSession,
  exerciseSessionId: ID,
  rpe: number | undefined,
): WorkoutSession {
  return mapExercise(session, exerciseSessionId, (exercise) => {
    if (rpe === undefined) {
      const { rpe: _rpe, ...rest } = exercise;
      return rest;
    }
    return { ...exercise, rpe };
  });
}

export function toggleSkipExercise(
  session: WorkoutSession,
  exerciseSessionId: ID,
): WorkoutSession {
  return {
    ...session,
    exercises: session.exercises.map((exercise) => {
      if (exercise.id !== exerciseSessionId) return exercise;
      if (exercise.status === 'skipped') {
        return { ...exercise, status: deriveStatus({ ...exercise, status: 'pending' }) };
      }
      return { ...exercise, status: 'skipped' };
    }),
  };
}

/** Finalizes a workout: stamps the end time, freezes the duration and stores the RPE. */
export function finishWorkoutSession(
  session: WorkoutSession,
  rpe: number,
  notes: string | undefined,
  now: Date = new Date(),
): WorkoutSession {
  const endedAt = now.toISOString();
  const finished: WorkoutSession = {
    ...session,
    status: 'completed',
    endedAt,
    durationSeconds: calcSessionDurationSeconds({ startedAt: session.startedAt, endedAt }),
    rpe,
    exercises: session.exercises.map((exercise) => ({ ...exercise, status: deriveStatus(exercise) })),
  };
  if (notes && notes.trim()) finished.notes = notes.trim();
  return finished;
}

/** Marks a workout as discarded, keeping it out of statistics. */
export function abortWorkoutSession(
  session: WorkoutSession,
  now: Date = new Date(),
): WorkoutSession {
  const endedAt = now.toISOString();
  return {
    ...session,
    status: 'aborted',
    endedAt,
    durationSeconds: calcSessionDurationSeconds({ startedAt: session.startedAt, endedAt }),
  };
}
