import { create } from 'zustand';
import type { ID } from '@/models/common';
import type { Exercise } from '@/models/exercise';
import type { WorkoutProgram } from '@/models/program';
import type { AppSettings } from '@/models/settings';
import type { WorkoutSession } from '@/models/session';
import { createRepository } from '@/repositories';
import type { WorkoutRepository } from '@/repositories/types';
import {
  abortWorkoutSession,
  addSet,
  createWorkoutSession,
  finishWorkoutSession,
  removeLastSet,
  setExerciseNotes,
  setExerciseRpe,
  toggleSetCompleted,
  toggleSkipExercise,
  updateSet,
  type SetPatch,
} from '@/services/workoutSessionService';
import { useDataStore } from './useDataStore';

/**
 * Rest timer state.
 *
 * `endsAt` is an absolute timestamp rather than a countdown, so the remaining
 * time stays correct while the tab is backgrounded and the interval throttled.
 */
export interface RestTimerState {
  active: boolean;
  totalSeconds: number;
  endsAt: number | null;
  /** Set while paused; `endsAt` is recomputed from it on resume. */
  remainingSeconds: number | null;
  exerciseSessionId: ID | null;
}

const IDLE_REST: RestTimerState = {
  active: false,
  totalSeconds: 0,
  endsAt: null,
  remainingSeconds: null,
  exerciseSessionId: null,
};

interface WorkoutState {
  session: WorkoutSession | null;
  /** True once the stored active workout has been read back. */
  hydrated: boolean;
  rest: RestTimerState;

  hydrate: () => Promise<void>;
  start: (
    program: WorkoutProgram,
    exercises: Exercise[],
    settings: AppSettings,
  ) => Promise<WorkoutSession>;

  updateSetValue: (exerciseSessionId: ID, setId: ID, patch: SetPatch) => void;
  toggleSet: (exerciseSessionId: ID, setId: ID, restSeconds?: number) => void;
  appendSet: (exerciseSessionId: ID) => void;
  dropLastSet: (exerciseSessionId: ID) => void;
  updateExerciseNotes: (exerciseSessionId: ID, notes: string) => void;
  updateExerciseRpe: (exerciseSessionId: ID, rpe: number | undefined) => void;
  toggleSkip: (exerciseSessionId: ID) => void;

  finish: (rpe: number, notes?: string) => Promise<WorkoutSession | null>;
  discard: () => Promise<void>;

  startRest: (seconds: number, exerciseSessionId: ID) => void;
  pauseRest: () => void;
  resumeRest: () => void;
  resetRest: () => void;
  stopRest: () => void;
}

let repository: WorkoutRepository | null = null;

function repo(): WorkoutRepository {
  if (!repository) repository = createRepository();
  return repository;
}

/**
 * Owns the workout currently in progress.
 *
 * Every mutation writes the session straight back to storage, which is what
 * makes an active workout survive a page refresh, a closed tab or a phone that
 * went to sleep mid-set.
 */
export const useWorkoutStore = create<WorkoutState>((set, get) => {
  /** Applies a pure transform to the session and persists the result. */
  function mutate(transform: (session: WorkoutSession) => WorkoutSession): void {
    const current = get().session;
    if (!current) return;
    const next = transform(current);
    set({ session: next });
    void repo().setActiveWorkout(next);
  }

  return {
    session: null,
    hydrated: false,
    rest: IDLE_REST,

    hydrate: async () => {
      const stored = await repo().getActiveWorkout();
      set({ session: stored, hydrated: true });
    },

    start: async (program, exercises, settings) => {
      const byId = new Map<ID, Exercise>(exercises.map((exercise) => [exercise.id, exercise]));
      const session = createWorkoutSession(program, byId, settings);
      await repo().setActiveWorkout(session);
      set({ session, rest: IDLE_REST });
      return session;
    },

    updateSetValue: (exerciseSessionId, setId, patch) => {
      mutate((session) => updateSet(session, exerciseSessionId, setId, patch));
    },

    toggleSet: (exerciseSessionId, setId, restSeconds) => {
      const before = get().session;
      if (!before) return;

      const wasCompleted = before.exercises
        .find((exercise) => exercise.id === exerciseSessionId)
        ?.sets.find((item) => item.id === setId)?.completed;

      mutate((session) => toggleSetCompleted(session, exerciseSessionId, setId));

      // Rest only starts when a set was just ticked off, never when undone.
      if (!wasCompleted && restSeconds && restSeconds > 0) {
        get().startRest(restSeconds, exerciseSessionId);
      }
    },

    appendSet: (exerciseSessionId) => {
      mutate((session) => addSet(session, exerciseSessionId));
    },

    dropLastSet: (exerciseSessionId) => {
      mutate((session) => removeLastSet(session, exerciseSessionId));
    },

    updateExerciseNotes: (exerciseSessionId, notes) => {
      mutate((session) => setExerciseNotes(session, exerciseSessionId, notes));
    },

    updateExerciseRpe: (exerciseSessionId, rpe) => {
      mutate((session) => setExerciseRpe(session, exerciseSessionId, rpe));
    },

    toggleSkip: (exerciseSessionId) => {
      mutate((session) => toggleSkipExercise(session, exerciseSessionId));
    },

    finish: async (rpe, notes) => {
      const current = get().session;
      if (!current) return null;

      const finished = finishWorkoutSession(current, rpe, notes);
      await useDataStore.getState().saveWorkoutSession(finished);
      await repo().setActiveWorkout(null);
      set({ session: null, rest: IDLE_REST });
      return finished;
    },

    discard: async () => {
      const current = get().session;
      if (!current) return;

      // Discarded workouts are recorded rather than erased, so a mistaken tap is
      // recoverable and statistics can still ignore them by status.
      const aborted = abortWorkoutSession(current);
      const hasAnyData = aborted.exercises.some((exercise) =>
        exercise.sets.some((item) => item.completed),
      );
      if (hasAnyData) {
        await useDataStore.getState().saveWorkoutSession(aborted);
      }
      await repo().setActiveWorkout(null);
      set({ session: null, rest: IDLE_REST });
    },

    startRest: (seconds, exerciseSessionId) => {
      set({
        rest: {
          active: true,
          totalSeconds: seconds,
          endsAt: Date.now() + seconds * 1000,
          remainingSeconds: null,
          exerciseSessionId,
        },
      });
    },

    pauseRest: () => {
      const { rest } = get();
      if (!rest.active || rest.endsAt === null) return;
      const remaining = Math.max(0, Math.round((rest.endsAt - Date.now()) / 1000));
      set({ rest: { ...rest, endsAt: null, remainingSeconds: remaining } });
    },

    resumeRest: () => {
      const { rest } = get();
      if (!rest.active || rest.remainingSeconds === null) return;
      set({
        rest: {
          ...rest,
          endsAt: Date.now() + rest.remainingSeconds * 1000,
          remainingSeconds: null,
        },
      });
    },

    resetRest: () => {
      const { rest } = get();
      if (!rest.active) return;
      set({ rest: { ...rest, endsAt: Date.now() + rest.totalSeconds * 1000, remainingSeconds: null } });
    },

    stopRest: () => set({ rest: IDLE_REST }),
  };
});
