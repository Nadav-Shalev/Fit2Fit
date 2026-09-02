import { z } from 'zod';
import { MUSCLE_GROUPS } from '@/models/common';
import { CARDIO_ACTIVITIES, RUNNING_INTERVAL_KINDS, RUNNING_PROGRAM_TYPES } from '@/models/running';
import type { Fit2FitBackup, Fit2FitDatabase } from '@/models/database';
import { SCHEMA_VERSION } from '@/models/database';
import type { AppSettings } from '@/models/settings';
import { DEFAULT_SETTINGS } from '@/models/settings';
import { LANGUAGES } from '@/i18n/types';

/**
 * Validation schemas for every persisted structure.
 *
 * They serve two purposes at once:
 *  1. Validating an imported JSON backup before it is written.
 *  2. Detecting corrupt localStorage content so the app can recover instead of crashing.
 *
 * Messages here are intentionally technical and in English; user-facing copy is
 * resolved from the i18n catalogs at display time.
 */

const idSchema = z.string().min(1);
const isoDateTimeSchema = z.string().min(1);
const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const dayOfWeekSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const numericRangeSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(0).optional(),
});

export const exerciseSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  nameEn: z.string().optional(),
  category: z.enum(MUSCLE_GROUPS),
  isWeighted: z.boolean(),
  isTimed: z.boolean(),
  defaultRestSeconds: z.number().min(0),
  videoUrl: z.string().optional(),
  notes: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const workoutProgramExerciseSchema = z.object({
  id: idSchema,
  exerciseId: idSchema,
  order: z.number().int().min(0),
  plannedSets: z.number().int().min(1),
  plannedReps: numericRangeSchema.nullable(),
  plannedDurationSeconds: z.number().min(0).optional(),
  plannedRir: numericRangeSchema.optional(),
  restSeconds: z.number().min(0),
  targetWeightKg: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const workoutProgramSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  exercises: z.array(workoutProgramExerciseSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const setSessionSchema = z.object({
  id: idSchema,
  index: z.number().int().min(1),
  targetReps: z.number().min(0).optional(),
  targetDurationSeconds: z.number().min(0).optional(),
  targetWeightKg: z.number().min(0).optional(),
  actualReps: z.number().min(0).optional(),
  actualWeightKg: z.number().min(0).optional(),
  actualDurationSeconds: z.number().min(0).optional(),
  workSeconds: z.number().min(0).optional(),
  completed: z.boolean(),
  completedAt: isoDateTimeSchema.optional(),
});

export const plannedSnapshotSchema = z.object({
  sets: z.number().int().min(0),
  reps: numericRangeSchema.nullable(),
  durationSeconds: z.number().min(0).optional(),
  rir: numericRangeSchema.optional(),
  restSeconds: z.number().min(0),
  targetWeightKg: z.number().min(0).optional(),
});

export const exerciseSessionSchema = z.object({
  id: idSchema,
  exerciseId: idSchema,
  exerciseName: z.string().min(1),
  exerciseNameEn: z.string().optional(),
  category: z.enum(MUSCLE_GROUPS),
  isWeighted: z.boolean(),
  isTimed: z.boolean(),
  videoUrl: z.string().optional(),
  order: z.number().int().min(0),
  planned: plannedSnapshotSchema,
  sets: z.array(setSessionSchema),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
});

export const workoutSessionSchema = z.object({
  id: idSchema,
  programId: idSchema.optional(),
  programName: z.string(),
  date: calendarDateSchema,
  startedAt: isoDateTimeSchema,
  endedAt: isoDateTimeSchema.optional(),
  durationSeconds: z.number().min(0),
  totalRestSeconds: z.number().min(0).optional(),
  status: z.enum(['active', 'completed', 'aborted']),
  exercises: z.array(exerciseSessionSchema),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

export const runningIntervalSchema = z.object({
  id: idSchema,
  kind: z.enum(RUNNING_INTERVAL_KINDS),
  durationSeconds: z.number().min(0).optional(),
  distanceMeters: z.number().min(0).optional(),
  label: z.string().optional(),
});

export const runningStepSchema = z.object({
  id: idSchema,
  repeat: z.number().int().min(1),
  intervals: z.array(runningIntervalSchema),
});

export const runningProgramSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  type: z.enum(RUNNING_PROGRAM_TYPES),
  // Absent on everything saved before walking existed; read as a run.
  activity: z.enum(CARDIO_ACTIVITIES).optional(),
  description: z.string().optional(),
  steps: z.array(runningStepSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const runningSessionSchema = z.object({
  id: idSchema,
  programId: idSchema.optional(),
  programName: z.string(),
  type: z.enum(RUNNING_PROGRAM_TYPES),
  activity: z.enum(CARDIO_ACTIVITIES).optional(),
  date: calendarDateSchema,
  startedAt: isoDateTimeSchema,
  endedAt: isoDateTimeSchema.optional(),
  durationSeconds: z.number().min(0),
  distanceKm: z.number().min(0).optional(),
  paceSecondsPerKm: z.number().min(0).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

export const scheduleEntrySchema = z.object({
  id: idSchema,
  dayOfWeek: dayOfWeekSchema,
  kind: z.enum(['strength', 'running']),
  programId: idSchema,
});

export const weeklyScheduleSchema = z.object({
  entries: z.array(scheduleEntrySchema),
});

/**
 * Settings tolerate unknown or missing values: a single bad preference should
 * never block the whole database from loading, so each field falls back.
 */
export const appSettingsSchema: z.ZodType<AppSettings, z.ZodTypeDef, unknown> = z.object({
  userName: z.string().optional().catch(undefined),
  language: z.enum(LANGUAGES).catch(DEFAULT_SETTINGS.language),
  theme: z.enum(['dark', 'light', 'system']).catch(DEFAULT_SETTINGS.theme),
  weightUnit: z.enum(['kg', 'lb']).catch(DEFAULT_SETTINGS.weightUnit),
  defaultRestSeconds: z.number().min(0).catch(DEFAULT_SETTINGS.defaultRestSeconds),
  soundEnabled: z.boolean().catch(DEFAULT_SETTINGS.soundEnabled),
  vibrationEnabled: z.boolean().catch(DEFAULT_SETTINGS.vibrationEnabled),
  weekStartsOn: dayOfWeekSchema.catch(DEFAULT_SETTINGS.weekStartsOn),
  showPreviousPerformance: z.boolean().catch(DEFAULT_SETTINGS.showPreviousPerformance),
});

export const databaseSchema: z.ZodType<Fit2FitDatabase, z.ZodTypeDef, unknown> = z.object({
  schemaVersion: z.number().int().min(1),
  exercises: z.array(exerciseSchema),
  programs: z.array(workoutProgramSchema),
  workoutSessions: z.array(workoutSessionSchema),
  runningPrograms: z.array(runningProgramSchema),
  runningSessions: z.array(runningSessionSchema),
  schedule: weeklyScheduleSchema,
  settings: appSettingsSchema,
  activeWorkout: workoutSessionSchema.nullable(),
});

/** The backup file exactly as written to disk. */
export const backupSchema: z.ZodType<Fit2FitBackup, z.ZodTypeDef, unknown> = z.object({
  app: z.literal('fit2fit'),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string(),
  data: databaseSchema,
});

/** Highest schema version this build knows how to read. */
export const MAX_SUPPORTED_SCHEMA_VERSION = SCHEMA_VERSION;
