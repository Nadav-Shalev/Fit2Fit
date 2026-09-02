import type { DayOfWeek, ID } from './common';

export type ScheduleEntryKind = 'strength' | 'running';

/** Assignment of a program to a fixed weekday. */
export interface ScheduleEntry {
  id: ID;
  dayOfWeek: DayOfWeek;
  kind: ScheduleEntryKind;
  /** A `WorkoutProgram` id or a `RunningProgram` id, depending on `kind`. */
  programId: ID;
}

export interface WeeklySchedule {
  entries: ScheduleEntry[];
}

/**
 * Derived status of a scheduled slot. A workout that was not performed is never
 * deleted from the plan — it is reported as missed.
 */
export type PlannedStatus = 'planned' | 'done' | 'missed';

/** A schedule entry resolved against the sessions that were actually logged. */
export interface ResolvedScheduleItem {
  entry: ScheduleEntry;
  date: Date;
  programName: string;
  status: PlannedStatus;
  /** Id of the session that fulfilled this slot, when there is one. */
  sessionId?: ID;
}
