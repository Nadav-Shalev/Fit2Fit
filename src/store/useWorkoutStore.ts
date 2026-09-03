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
  addRestSeconds,
  addSet,
  createWorkoutSession,
  finishWorkoutSession,
  nextIncompleteExercise,
  nextIncompleteSet,
  removeLastSet,
  setExerciseNotes,
  setExerciseRpe,
  setWorkSeconds,
  toggleSetCompleted,
  toggleSkipExercise,
  updateSet,
  type SetPatch,
} from '@/services/workoutSessionService';
import { elapsedSeconds } from '@/utils/analytics/session';
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

/**
 * Where the guided workout currently stands.
 *
 * `overview` is the exercise checklist, `ready` the preparation screen for one
 * set, then countdown → active → rest, and `summary` once nothing is left.
 */
export type LivePhase = 'overview' | 'ready' | 'countdown' | 'active' | 'rest' | 'summary';

/**
 * Live workout position and stopwatch.
 *
 * Like the rest timer, everything is an absolute timestamp so a throttled tab
 * cannot skew the numbers. It is intentionally not persisted: the sets, their
 * `workSeconds` and the rest total are written through on every change, so a
 * refresh returns to the checklist with the results intact and only the
 * in-flight stopwatch lost.
 */
export interface LiveState {
  phase: LivePhase;
  exerciseSessionId: ID | null;
  setId: ID | null;
  /** Origin of the active-set stopwatch. */
  startedAt: number | null;
  /** Set while paused; the frozen span is subtracted from the elapsed time. */
  pausedAt: number | null;
  pausedMs: number;
  countdownEndsAt: number | null;
  /** Origin of the current rest, used to bank the time actually rested. */
  restStartedAt: number | null;
}

const IDLE_LIVE: LiveState = {
  phase: 'overview',
  exerciseSessionId: null,
  setId: null,
  startedAt: null,
  pausedAt: null,
  pausedMs: 0,
  countdownEndsAt: null,
  restStartedAt: null,
};

/** Seconds of "get ready" before a set starts. */
export const COUNTDOWN_SECONDS = 3;

interface WorkoutState {
  session: WorkoutSession | null;
  /** True once the stored active workout has been read back. */
  hydrated: boolean;
  rest: RestTimerState;
  live: LiveState;

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
  extendRest: (seconds: number) => void;

  /** Live workout mode. */
  openExercise: (exerciseSessionId: ID) => void;
  beginCountdown: () => void;
  beginSet: () => void;
  pauseSet: () => void;
  resumeSet: () => void;
  finishSet: (patch?: SetPatch) => void;
  endRestAndPrepareNext: () => void;
  backToOverview: () => void;
  openSummary: () => void;
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

  /** Seconds actually rested since the current rest began. */
  function bankedRestSeconds(): number {
    const { restStartedAt } = get().live;
    if (restStartedAt === null) return 0;
    return Math.max(0, Math.round((Date.now() - restStartedAt) / 1000));
  }

  /** Ends the rest period, adding the time actually spent to the workout total. */
  function closeRest(): void {
    const banked = bankedRestSeconds();
    if (banked > 0) mutate((session) => addRestSeconds(session, banked));
    set({ rest: IDLE_REST, live: { ...get().live, restStartedAt: null } });
  }

  return {
    session: null,
    hydrated: false,
    rest: IDLE_REST,
    live: IDLE_LIVE,

    hydrate: async () => {
      const stored = await repo().getActiveWorkout();
      set({ session: stored, hydrated: true, live: IDLE_LIVE, rest: IDLE_REST });
    },

    start: async (program, exercises, settings) => {
      const byId = new Map<ID, Exercise>(exercises.map((exercise) => [exercise.id, exercise]));
      const session = createWorkoutSession(program, byId, settings);
      await repo().setActiveWorkout(session);
      set({ session, rest: IDLE_REST, live: IDLE_LIVE });
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
      set({ session: null, rest: IDLE_REST, live: IDLE_LIVE });
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
      set({ session: null, rest: IDLE_REST, live: IDLE_LIVE });
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

    extendRest: (seconds) => {
      const { rest } = get();
      if (!rest.active) return;
      const total = rest.totalSeconds + seconds;
      if (rest.endsAt !== null) {
        // Running: push the finish line out, even if it had already passed.
        set({ rest: { ...rest, totalSeconds: total, endsAt: Math.max(rest.endsAt, Date.now()) + seconds * 1000 } });
        return;
      }
      set({
        rest: { ...rest, totalSeconds: total, remainingSeconds: (rest.remainingSeconds ?? 0) + seconds },
      });
    },

    openExercise: (exerciseSessionId) => {
      const session = get().session;
      if (!session) return;
      const exercise = session.exercises.find((item) => item.id === exerciseSessionId);
      if (!exercise) return;

      closeRest();
      set({
        live: {
          ...IDLE_LIVE,
          phase: 'ready',
          exerciseSessionId,
          setId: nextIncompleteSet(exercise)?.id ?? null,
        },
      });
    },

    beginCountdown: () => {
      const { live } = get();
      if (live.exerciseSessionId === null || live.setId === null) return;
      set({
        live: {
          ...live,
          phase: 'countdown',
          countdownEndsAt: Date.now() + COUNTDOWN_SECONDS * 1000,
          startedAt: null,
          pausedAt: null,
          pausedMs: 0,
        },
      });
    },

    beginSet: () => {
      const { live } = get();
      if (live.exerciseSessionId === null || live.setId === null) return;
      set({
        live: {
          ...live,
          phase: 'active',
          countdownEndsAt: null,
          startedAt: Date.now(),
          pausedAt: null,
          pausedMs: 0,
        },
      });
    },

    pauseSet: () => {
      const { live } = get();
      if (live.phase !== 'active' || live.pausedAt !== null) return;
      set({ live: { ...live, pausedAt: Date.now() } });
    },

    resumeSet: () => {
      const { live } = get();
      if (live.pausedAt === null) return;
      set({
        live: { ...live, pausedMs: live.pausedMs + (Date.now() - live.pausedAt), pausedAt: null },
      });
    },

    /**
     * Logs the finished set and decides what comes next: rest when the exercise
     * has more sets, otherwise back to the checklist — or the summary once
     * everything is done.
     */
    finishSet: (patch) => {
      const { live, session } = get();
      const exerciseSessionId = live.exerciseSessionId;
      const setId = live.setId;
      if (!session || exerciseSessionId === null || setId === null) return;

      const worked = elapsedSeconds(live.startedAt, live.pausedMs, live.pausedAt, Date.now());

      mutate((current) => {
        let next = patch ? updateSet(current, exerciseSessionId, setId, patch) : current;
        next = setWorkSeconds(next, exerciseSessionId, setId, worked);
        return toggleSetCompleted(next, exerciseSessionId, setId);
      });

      const updated = get().session;
      if (!updated) return;

      const exercise = updated.exercises.find((item) => item.id === exerciseSessionId);
      const following = exercise ? nextIncompleteSet(exercise) : null;

      if (exercise && following) {
        const restSeconds = exercise.planned.restSeconds;
        if (restSeconds > 0) {
          get().startRest(restSeconds, exerciseSessionId);
          set({
            live: { ...get().live, phase: 'rest', setId: following.id, restStartedAt: Date.now() },
          });
        } else {
          // No rest configured: go straight to preparing the next set.
          set({ live: { ...get().live, phase: 'ready', setId: following.id } });
        }
        return;
      }

      // The exercise is finished — never start a rest timer here.
      const remaining = nextIncompleteExercise(updated, exercise?.order ?? -1);
      set({
        rest: IDLE_REST,
        live: {
          ...IDLE_LIVE,
          phase: remaining ? 'overview' : 'summary',
        },
      });
    },

    /** Leaves the rest screen and prepares the set that follows it. */
    endRestAndPrepareNext: () => {
      const { live } = get();
      closeRest();
      set({ live: { ...get().live, phase: live.setId === null ? 'overview' : 'ready' } });
    },

    backToOverview: () => {
      closeRest();
      set({ live: { ...IDLE_LIVE, phase: 'overview' } });
    },

    openSummary: () => {
      closeRest();
      set({ live: { ...IDLE_LIVE, phase: 'summary' } });
    },
  };
});
