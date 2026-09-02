import type { ID } from '@/models/common';
import type { Exercise } from '@/models/exercise';
import type { WorkoutProgram } from '@/models/program';
import type { RunningProgram, RunningSession } from '@/models/running';
import type { WeeklySchedule } from '@/models/schedule';
import type { AppSettings } from '@/models/settings';
import type { WorkoutSession } from '@/models/session';
import type { Fit2FitDatabase } from '@/models/database';

/** Reported when stored data could not be parsed and had to be reset. */
export interface RecoveryNotice {
  key: string;
  reason: string;
  /** Key the unreadable payload was preserved under, for manual inspection. */
  backupKey?: string;
}

/**
 * Persistence contract for the whole application.
 *
 * Every method is asynchronous even though the current implementation is
 * synchronous localStorage. That is deliberate: a `SupabaseRepository` or
 * `IndexedDBRepository` can be dropped in later without a single component
 * changing, because callers already await these calls.
 */
export interface WorkoutRepository {
  getExercises(): Promise<Exercise[]>;
  saveExercise(exercise: Exercise): Promise<Exercise>;
  deleteExercise(id: ID): Promise<void>;

  getPrograms(): Promise<WorkoutProgram[]>;
  getProgram(id: ID): Promise<WorkoutProgram | null>;
  saveProgram(program: WorkoutProgram): Promise<WorkoutProgram>;
  deleteProgram(id: ID): Promise<void>;

  getWorkoutSessions(): Promise<WorkoutSession[]>;
  saveWorkoutSession(session: WorkoutSession): Promise<WorkoutSession>;
  deleteWorkoutSession(id: ID): Promise<void>;

  /** The workout in progress. Stored separately so ticking a set is a small write. */
  getActiveWorkout(): Promise<WorkoutSession | null>;
  setActiveWorkout(session: WorkoutSession | null): Promise<void>;

  getRunningPrograms(): Promise<RunningProgram[]>;
  saveRunningProgram(program: RunningProgram): Promise<RunningProgram>;
  deleteRunningProgram(id: ID): Promise<void>;

  getRunningSessions(): Promise<RunningSession[]>;
  saveRunningSession(session: RunningSession): Promise<RunningSession>;
  deleteRunningSession(id: ID): Promise<void>;

  getSchedule(): Promise<WeeklySchedule>;
  saveSchedule(schedule: WeeklySchedule): Promise<WeeklySchedule>;

  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<AppSettings>;

  /** Reads everything in one pass — used on app start and for export. */
  loadAll(): Promise<Fit2FitDatabase>;
  /** Overwrites everything — used by import and by the demo seeder. */
  replaceAll(database: Fit2FitDatabase): Promise<void>;
  clearAll(): Promise<void>;

  /** Problems encountered while reading stored data during this session. */
  getRecoveryNotices(): RecoveryNotice[];
}
