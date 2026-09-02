import { z } from 'zod';
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
import {
  appSettingsSchema,
  exerciseSchema,
  runningProgramSchema,
  runningSessionSchema,
  weeklyScheduleSchema,
  workoutProgramSchema,
  workoutSessionSchema,
} from '@/data/schemas';
import { SafeStorage, resolveStorage, type KeyValueStorage } from './storageDriver';
import type { RecoveryNotice, WorkoutRepository } from './types';

const PREFIX = 'fit2fit:v1';

export const STORAGE_KEYS = {
  meta: `${PREFIX}:meta`,
  exercises: `${PREFIX}:exercises`,
  programs: `${PREFIX}:programs`,
  workoutSessions: `${PREFIX}:workoutSessions`,
  runningPrograms: `${PREFIX}:runningPrograms`,
  runningSessions: `${PREFIX}:runningSessions`,
  schedule: `${PREFIX}:schedule`,
  settings: `${PREFIX}:settings`,
  activeWorkout: `${PREFIX}:activeWorkout`,
} as const;

const metaSchema = z.object({ schemaVersion: z.number().int().min(1) });
const EMPTY_SCHEDULE: WeeklySchedule = { entries: [] };

/** Replaces an item with a matching id, or appends it when it is new. */
function upsert<T extends { id: ID }>(items: T[], item: T): T[] {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) return [...items, item];
  return items.map((candidate, position) => (position === index ? item : candidate));
}

/**
 * localStorage-backed implementation.
 *
 * Collections live under separate keys so that ticking a set during a workout
 * rewrites only the active workout, not the entire history.
 */
export class LocalStorageRepository implements WorkoutRepository {
  private readonly store: SafeStorage;

  constructor(storage: KeyValueStorage = resolveStorage()) {
    this.store = new SafeStorage(storage);
  }

  async getExercises(): Promise<Exercise[]> {
    return this.store.read(STORAGE_KEYS.exercises, z.array(exerciseSchema), []);
  }

  async saveExercise(exercise: Exercise): Promise<Exercise> {
    const exercises = await this.getExercises();
    this.store.write(STORAGE_KEYS.exercises, upsert(exercises, exercise));
    return exercise;
  }

  async deleteExercise(id: ID): Promise<void> {
    const exercises = await this.getExercises();
    this.store.write(
      STORAGE_KEYS.exercises,
      exercises.filter((exercise) => exercise.id !== id),
    );
  }

  async getPrograms(): Promise<WorkoutProgram[]> {
    return this.store.read(STORAGE_KEYS.programs, z.array(workoutProgramSchema), []);
  }

  async getProgram(id: ID): Promise<WorkoutProgram | null> {
    const programs = await this.getPrograms();
    return programs.find((program) => program.id === id) ?? null;
  }

  async saveProgram(program: WorkoutProgram): Promise<WorkoutProgram> {
    const programs = await this.getPrograms();
    this.store.write(STORAGE_KEYS.programs, upsert(programs, program));
    return program;
  }

  async deleteProgram(id: ID): Promise<void> {
    const programs = await this.getPrograms();
    this.store.write(
      STORAGE_KEYS.programs,
      programs.filter((program) => program.id !== id),
    );
  }

  async getWorkoutSessions(): Promise<WorkoutSession[]> {
    return this.store.read(STORAGE_KEYS.workoutSessions, z.array(workoutSessionSchema), []);
  }

  async saveWorkoutSession(session: WorkoutSession): Promise<WorkoutSession> {
    const sessions = await this.getWorkoutSessions();
    this.store.write(STORAGE_KEYS.workoutSessions, upsert(sessions, session));
    return session;
  }

  async deleteWorkoutSession(id: ID): Promise<void> {
    const sessions = await this.getWorkoutSessions();
    this.store.write(
      STORAGE_KEYS.workoutSessions,
      sessions.filter((session) => session.id !== id),
    );
  }

  async getActiveWorkout(): Promise<WorkoutSession | null> {
    return this.store.read(STORAGE_KEYS.activeWorkout, workoutSessionSchema.nullable(), null);
  }

  async setActiveWorkout(session: WorkoutSession | null): Promise<void> {
    if (session === null) {
      this.store.remove(STORAGE_KEYS.activeWorkout);
      return;
    }
    this.store.write(STORAGE_KEYS.activeWorkout, session);
  }

  async getRunningPrograms(): Promise<RunningProgram[]> {
    return this.store.read(STORAGE_KEYS.runningPrograms, z.array(runningProgramSchema), []);
  }

  async saveRunningProgram(program: RunningProgram): Promise<RunningProgram> {
    const programs = await this.getRunningPrograms();
    this.store.write(STORAGE_KEYS.runningPrograms, upsert(programs, program));
    return program;
  }

  async deleteRunningProgram(id: ID): Promise<void> {
    const programs = await this.getRunningPrograms();
    this.store.write(
      STORAGE_KEYS.runningPrograms,
      programs.filter((program) => program.id !== id),
    );
  }

  async getRunningSessions(): Promise<RunningSession[]> {
    return this.store.read(STORAGE_KEYS.runningSessions, z.array(runningSessionSchema), []);
  }

  async saveRunningSession(session: RunningSession): Promise<RunningSession> {
    const sessions = await this.getRunningSessions();
    this.store.write(STORAGE_KEYS.runningSessions, upsert(sessions, session));
    return session;
  }

  async deleteRunningSession(id: ID): Promise<void> {
    const sessions = await this.getRunningSessions();
    this.store.write(
      STORAGE_KEYS.runningSessions,
      sessions.filter((session) => session.id !== id),
    );
  }

  async getSchedule(): Promise<WeeklySchedule> {
    return this.store.read(STORAGE_KEYS.schedule, weeklyScheduleSchema, EMPTY_SCHEDULE);
  }

  async saveSchedule(schedule: WeeklySchedule): Promise<WeeklySchedule> {
    this.store.write(STORAGE_KEYS.schedule, schedule);
    return schedule;
  }

  async getSettings(): Promise<AppSettings> {
    const stored = this.store.read(STORAGE_KEYS.settings, appSettingsSchema, DEFAULT_SETTINGS);
    // Merge so preferences added in a later version get their defaults.
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    this.store.write(STORAGE_KEYS.settings, settings);
    return settings;
  }

  async loadAll(): Promise<Fit2FitDatabase> {
    const [
      exercises,
      programs,
      workoutSessions,
      runningPrograms,
      runningSessions,
      schedule,
      settings,
      activeWorkout,
    ] = await Promise.all([
      this.getExercises(),
      this.getPrograms(),
      this.getWorkoutSessions(),
      this.getRunningPrograms(),
      this.getRunningSessions(),
      this.getSchedule(),
      this.getSettings(),
      this.getActiveWorkout(),
    ]);

    const meta = this.store.read(STORAGE_KEYS.meta, metaSchema, { schemaVersion: 0 });

    return {
      schemaVersion: meta.schemaVersion,
      exercises,
      programs,
      workoutSessions,
      runningPrograms,
      runningSessions,
      schedule,
      settings,
      activeWorkout,
    };
  }

  async replaceAll(database: Fit2FitDatabase): Promise<void> {
    this.store.write(STORAGE_KEYS.meta, { schemaVersion: SCHEMA_VERSION });
    this.store.write(STORAGE_KEYS.exercises, database.exercises);
    this.store.write(STORAGE_KEYS.programs, database.programs);
    this.store.write(STORAGE_KEYS.workoutSessions, database.workoutSessions);
    this.store.write(STORAGE_KEYS.runningPrograms, database.runningPrograms);
    this.store.write(STORAGE_KEYS.runningSessions, database.runningSessions);
    this.store.write(STORAGE_KEYS.schedule, database.schedule);
    this.store.write(STORAGE_KEYS.settings, database.settings);
    await this.setActiveWorkout(database.activeWorkout);
  }

  async clearAll(): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(PREFIX) || key.startsWith('fit2fit:corrupt:')) {
        this.store.remove(key);
      }
    }
  }

  getRecoveryNotices(): RecoveryNotice[] {
    return this.store.getNotices();
  }
}
