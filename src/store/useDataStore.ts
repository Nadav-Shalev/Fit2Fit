import { create } from 'zustand';
import type { ID } from '@/models/common';
import type { Exercise } from '@/models/exercise';
import type { WorkoutProgram } from '@/models/program';
import type { RunningProgram, RunningSession } from '@/models/running';
import type { WeeklySchedule } from '@/models/schedule';
import type { AppSettings } from '@/models/settings';
import type { WorkoutSession } from '@/models/session';
import type { Fit2FitDatabase } from '@/models/database';
import { SCHEMA_VERSION } from '@/models/database';
import { DEFAULT_SETTINGS } from '@/models/settings';
import { createDemoDatabase, createEmptyDatabase } from '@/data/demoData';
import { createRepository } from '@/repositories';
import type { RecoveryNotice, WorkoutRepository } from '@/repositories/types';

export type DataStatus = 'idle' | 'loading' | 'ready' | 'error';

interface DataState {
  status: DataStatus;
  error: string | null;
  recoveryNotices: RecoveryNotice[];

  exercises: Exercise[];
  programs: WorkoutProgram[];
  workoutSessions: WorkoutSession[];
  runningPrograms: RunningProgram[];
  runningSessions: RunningSession[];
  schedule: WeeklySchedule;
  settings: AppSettings;

  initialize: (repository?: WorkoutRepository) => Promise<void>;

  saveExercise: (exercise: Exercise) => Promise<void>;
  deleteExercise: (id: ID) => Promise<void>;

  saveProgram: (program: WorkoutProgram) => Promise<void>;
  deleteProgram: (id: ID) => Promise<void>;

  saveWorkoutSession: (session: WorkoutSession) => Promise<void>;
  deleteWorkoutSession: (id: ID) => Promise<void>;

  saveRunningProgram: (program: RunningProgram) => Promise<void>;
  deleteRunningProgram: (id: ID) => Promise<void>;

  saveRunningSession: (session: RunningSession) => Promise<void>;
  deleteRunningSession: (id: ID) => Promise<void>;

  saveSchedule: (schedule: WeeklySchedule) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;

  /** Snapshot of everything, for export. */
  snapshot: () => Fit2FitDatabase;
  replaceDatabase: (database: Fit2FitDatabase) => Promise<void>;
  restoreDemo: () => Promise<void>;
  clearAll: () => Promise<void>;
}

/** Replaces a matching item by id, otherwise appends. */
function upsert<T extends { id: ID }>(items: T[], item: T): T[] {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) return [...items, item];
  return items.map((candidate, position) => (position === index ? item : candidate));
}

let repository: WorkoutRepository | null = null;

function repo(): WorkoutRepository {
  if (!repository) repository = createRepository();
  return repository;
}

/**
 * Holds every persisted collection in memory and writes through to the
 * repository. Components never touch storage directly — they call these
 * actions, which is what keeps the storage backend swappable.
 */
export const useDataStore = create<DataState>((set, get) => ({
  status: 'idle',
  error: null,
  recoveryNotices: [],

  exercises: [],
  programs: [],
  workoutSessions: [],
  runningPrograms: [],
  runningSessions: [],
  schedule: { entries: [] },
  settings: DEFAULT_SETTINGS,

  initialize: async (injected) => {
    if (injected) repository = injected;
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });

    try {
      let database = await repo().loadAll();

      // A missing schema version means this browser has never run the app,
      // so seed it with demo content rather than showing empty screens.
      if (database.schemaVersion === 0) {
        database = createDemoDatabase(database.settings.language, new Date(), database.settings);
        await repo().replaceAll(database);
      } else if (database.schemaVersion !== SCHEMA_VERSION) {
        // Only one schema version exists so far; future migrations hook in here.
        await repo().replaceAll({ ...database, schemaVersion: SCHEMA_VERSION });
      }

      set({
        status: 'ready',
        exercises: database.exercises,
        programs: database.programs,
        workoutSessions: database.workoutSessions,
        runningPrograms: database.runningPrograms,
        runningSessions: database.runningSessions,
        schedule: database.schedule,
        settings: database.settings,
        recoveryNotices: repo().getRecoveryNotices(),
      });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  saveExercise: async (exercise) => {
    await repo().saveExercise(exercise);
    set({ exercises: upsert(get().exercises, exercise) });
  },

  deleteExercise: async (id) => {
    await repo().deleteExercise(id);
    set({ exercises: get().exercises.filter((exercise) => exercise.id !== id) });
  },

  saveProgram: async (program) => {
    await repo().saveProgram(program);
    set({ programs: upsert(get().programs, program) });
  },

  deleteProgram: async (id) => {
    await repo().deleteProgram(id);
    const schedule = {
      entries: get().schedule.entries.filter(
        (entry) => !(entry.kind === 'strength' && entry.programId === id),
      ),
    };
    await repo().saveSchedule(schedule);
    set({ programs: get().programs.filter((program) => program.id !== id), schedule });
  },

  saveWorkoutSession: async (session) => {
    await repo().saveWorkoutSession(session);
    set({ workoutSessions: upsert(get().workoutSessions, session) });
  },

  deleteWorkoutSession: async (id) => {
    await repo().deleteWorkoutSession(id);
    set({ workoutSessions: get().workoutSessions.filter((session) => session.id !== id) });
  },

  saveRunningProgram: async (program) => {
    await repo().saveRunningProgram(program);
    set({ runningPrograms: upsert(get().runningPrograms, program) });
  },

  deleteRunningProgram: async (id) => {
    await repo().deleteRunningProgram(id);
    const schedule = {
      entries: get().schedule.entries.filter(
        (entry) => !(entry.kind === 'running' && entry.programId === id),
      ),
    };
    await repo().saveSchedule(schedule);
    set({
      runningPrograms: get().runningPrograms.filter((program) => program.id !== id),
      schedule,
    });
  },

  saveRunningSession: async (session) => {
    await repo().saveRunningSession(session);
    set({ runningSessions: upsert(get().runningSessions, session) });
  },

  deleteRunningSession: async (id) => {
    await repo().deleteRunningSession(id);
    set({ runningSessions: get().runningSessions.filter((session) => session.id !== id) });
  },

  saveSchedule: async (schedule) => {
    await repo().saveSchedule(schedule);
    set({ schedule });
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    await repo().saveSettings(settings);
    set({ settings });
  },

  snapshot: () => {
    const state = get();
    return {
      schemaVersion: SCHEMA_VERSION,
      exercises: state.exercises,
      programs: state.programs,
      workoutSessions: state.workoutSessions,
      runningPrograms: state.runningPrograms,
      runningSessions: state.runningSessions,
      schedule: state.schedule,
      settings: state.settings,
      activeWorkout: null,
    };
  },

  replaceDatabase: async (database) => {
    await repo().replaceAll(database);
    set({
      exercises: database.exercises,
      programs: database.programs,
      workoutSessions: database.workoutSessions,
      runningPrograms: database.runningPrograms,
      runningSessions: database.runningSessions,
      schedule: database.schedule,
      settings: database.settings,
    });
  },

  restoreDemo: async () => {
    const state = get();
    const demo = createDemoDatabase(state.settings.language, new Date(), state.settings);
    // Demo programs are added alongside existing history rather than replacing it.
    const merged: Fit2FitDatabase = {
      ...demo,
      exercises: [...state.exercises, ...demo.exercises],
      programs: [...state.programs, ...demo.programs],
      runningPrograms: [...state.runningPrograms, ...demo.runningPrograms],
      workoutSessions: state.workoutSessions,
      runningSessions: state.runningSessions,
      schedule: state.schedule.entries.length > 0 ? state.schedule : demo.schedule,
      settings: state.settings,
    };
    await get().replaceDatabase(merged);
  },

  clearAll: async () => {
    await repo().clearAll();
    const empty = createEmptyDatabase(get().settings);
    await repo().replaceAll(empty);
    set({
      exercises: [],
      programs: [],
      workoutSessions: [],
      runningPrograms: [],
      runningSessions: [],
      schedule: { entries: [] },
    });
  },
}));
