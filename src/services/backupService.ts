import type { ID } from '@/models/common';
import type { Fit2FitBackup, Fit2FitDatabase } from '@/models/database';
import { SCHEMA_VERSION } from '@/models/database';
import { backupSchema, MAX_SUPPORTED_SCHEMA_VERSION } from '@/data/schemas';
import type { TranslationKey } from '@/i18n/locales/en';

export type ImportMode = 'replace' | 'merge';

/** Why an import was rejected. The key is resolved to copy by the UI. */
export interface ImportError {
  messageKey: TranslationKey;
  /** Technical detail, useful when reporting a problem. Never translated. */
  detail?: string;
}

export interface ImportPreview {
  exercises: number;
  programs: number;
  workoutSessions: number;
  runningPrograms: number;
  runningSessions: number;
  exportedAt: string;
}

export type ParseBackupResult =
  | { ok: true; backup: Fit2FitBackup; preview: ImportPreview }
  | { ok: false; error: ImportError };

/** Wraps the current database in the exported file envelope. */
export function buildBackup(database: Fit2FitDatabase): Fit2FitBackup {
  return {
    app: 'fit2fit',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: { ...database, schemaVersion: SCHEMA_VERSION },
  };
}

export function serializeBackup(database: Fit2FitDatabase): string {
  return JSON.stringify(buildBackup(database), null, 2);
}

/** Filename such as "fit2fit-backup-2026-09-02.json". */
export function backupFileName(now: Date = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  return `fit2fit-backup-${date}.json`;
}

/**
 * Validates a backup file before any of it is written.
 *
 * Order matters: JSON syntax, then that it is a Fit2Fit file at all, then that
 * this build is new enough to read it, and only then the full structure — so
 * the user gets the most specific reason available.
 */
export function parseBackup(raw: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: { messageKey: 'backup.invalidJson' } };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: { messageKey: 'backup.notBackupFile' } };
  }

  const envelope = parsed as Record<string, unknown>;
  if (envelope.app !== 'fit2fit') {
    return { ok: false, error: { messageKey: 'backup.notBackupFile' } };
  }

  if (
    typeof envelope.schemaVersion === 'number' &&
    envelope.schemaVersion > MAX_SUPPORTED_SCHEMA_VERSION
  ) {
    return { ok: false, error: { messageKey: 'backup.unsupportedVersion' } };
  }

  const result = backupSchema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    const error: ImportError = { messageKey: 'backup.invalidStructure' };
    if (issue) error.detail = `${issue.path.join('.')}: ${issue.message}`;
    return { ok: false, error };
  }

  const { data } = result.data;
  return {
    ok: true,
    backup: result.data,
    preview: {
      exercises: data.exercises.length,
      programs: data.programs.length,
      workoutSessions: data.workoutSessions.length,
      runningPrograms: data.runningPrograms.length,
      runningSessions: data.runningSessions.length,
      exportedAt: result.data.exportedAt,
    },
  };
}

/** Keeps existing records and appends only ids that are not present yet. */
function mergeById<T extends { id: ID }>(current: T[], incoming: T[]): T[] {
  const known = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !known.has(item.id))];
}

/**
 * Applies an imported backup.
 *
 * `replace` swaps the database wholesale; `merge` keeps what is on the device
 * and adds unseen records, which is the safe choice when combining two devices.
 */
export function applyImport(
  current: Fit2FitDatabase,
  incoming: Fit2FitDatabase,
  mode: ImportMode,
): Fit2FitDatabase {
  if (mode === 'replace') {
    return { ...incoming, schemaVersion: SCHEMA_VERSION, activeWorkout: current.activeWorkout };
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    exercises: mergeById(current.exercises, incoming.exercises),
    programs: mergeById(current.programs, incoming.programs),
    workoutSessions: mergeById(current.workoutSessions, incoming.workoutSessions),
    runningPrograms: mergeById(current.runningPrograms, incoming.runningPrograms),
    runningSessions: mergeById(current.runningSessions, incoming.runningSessions),
    // The weekly plan and preferences are single objects; keeping the device's
    // own avoids silently rewriting the user's current setup.
    schedule: current.schedule.entries.length > 0 ? current.schedule : incoming.schedule,
    settings: current.settings,
    activeWorkout: current.activeWorkout,
  };
}
