import type { Exercise } from './exercise';
import type { WorkoutProgram } from './program';
import type { RunningProgram, RunningSession } from './running';
import type { WeeklySchedule } from './schedule';
import type { AppSettings } from './settings';
import type { WorkoutSession } from './session';

/** Storage schema version. Bumped only when existing data needs migrating. */
export const SCHEMA_VERSION = 1;

/** The entire application state — the unit that is persisted, exported and imported. */
export interface Fit2FitDatabase {
  schemaVersion: number;
  exercises: Exercise[];
  programs: WorkoutProgram[];
  workoutSessions: WorkoutSession[];
  runningPrograms: RunningProgram[];
  runningSessions: RunningSession[];
  schedule: WeeklySchedule;
  settings: AppSettings;
  /** The workout currently in progress. Survives a page refresh. */
  activeWorkout: WorkoutSession | null;
}

/** Envelope of an exported backup file. */
export interface Fit2FitBackup {
  app: 'fit2fit';
  schemaVersion: number;
  exportedAt: string;
  data: Fit2FitDatabase;
}
