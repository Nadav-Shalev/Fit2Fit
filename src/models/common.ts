/** Unique entity identifier (UUID, or a fallback on older browsers). */
export type ID = string;

/** Full ISO 8601 timestamp, e.g. "2026-08-31T18:04:12.000Z". */
export type ISODateTime = string;

/** Local calendar day as "YYYY-MM-DD", used to group activity by date. */
export type CalendarDate = string;

/** A planned numeric target, e.g. 8-12 reps. Omitting `max` means an exact value. */
export interface NumericRange {
  min: number;
  max?: number;
}

/** Muscle groups / exercise categories. Labels live in the i18n catalogs. */
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'glutes',
  'core',
  'fullBody',
  'cardio',
  'other',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Days of the week, 0 = Sunday, matching `Date.getDay()`. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAYS_OF_WEEK: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
