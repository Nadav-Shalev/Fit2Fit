import type { CalendarDate, ID, ISODateTime } from './common';

export const RUNNING_INTERVAL_KINDS = ['warmup', 'run', 'walk', 'rest', 'cooldown'] as const;
export type RunningIntervalKind = (typeof RUNNING_INTERVAL_KINDS)[number];

/** A single segment of a running program, defined by time or by distance. */
export interface RunningInterval {
  id: ID;
  kind: RunningIntervalKind;
  /** Duration in seconds. Either this or `distanceMeters` is set. */
  durationSeconds?: number;
  distanceMeters?: number;
  label?: string;
}

/**
 * A block within a running program. `repeat` expresses "x6: 2 min run / 1 min walk"
 * as one block of two intervals instead of twelve duplicated segments.
 */
export interface RunningStep {
  id: ID;
  repeat: number;
  intervals: RunningInterval[];
}

export const RUNNING_PROGRAM_TYPES = ['easy', 'intervals', 'long', 'tempo', 'custom'] as const;
export type RunningProgramType = (typeof RUNNING_PROGRAM_TYPES)[number];

/** A running template. */
export interface RunningProgram {
  id: ID;
  name: string;
  type: RunningProgramType;
  description?: string;
  steps: RunningStep[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** A run that was actually performed. */
export interface RunningSession {
  id: ID;
  programId?: ID;
  /** Snapshot of the program name; empty for a free run. */
  programName: string;
  type: RunningProgramType;
  date: CalendarDate;
  startedAt: ISODateTime;
  endedAt?: ISODateTime;
  durationSeconds: number;
  distanceKm?: number;
  /** Seconds per kilometre, derived from duration/distance and stored for fast queries. */
  paceSecondsPerKm?: number;
  rpe?: number;
  notes?: string;
}
