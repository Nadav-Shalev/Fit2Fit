import type { TranslationKey } from '@/i18n/locales/en';

/**
 * Effort levels. The stored value is always numeric (1-10); the descriptive
 * label is presentation only and resolved through the i18n catalogs.
 */
export interface RpeLevel {
  min: number;
  max: number;
  labelKey: TranslationKey;
}

export const RPE_LEVELS: RpeLevel[] = [
  { min: 1, max: 2, labelKey: 'rpe.veryEasy' },
  { min: 3, max: 4, labelKey: 'rpe.easy' },
  { min: 5, max: 6, labelKey: 'rpe.moderate' },
  { min: 7, max: 8, labelKey: 'rpe.hard' },
  { min: 9, max: 10, labelKey: 'rpe.veryHard' },
];

export const RPE_MIN = 1;
export const RPE_MAX = 10;

/** The translation key describing a numeric RPE value. */
export function rpeLabelKey(value: number): TranslationKey | null {
  const level = RPE_LEVELS.find((item) => value >= item.min && value <= item.max);
  return level?.labelKey ?? null;
}

/** Average RPE across sessions, ignoring unrated ones. `null` when none were rated. */
export function averageRpe(values: Array<number | undefined>): number | null {
  const rated = values.filter((value): value is number => typeof value === 'number');
  if (rated.length === 0) return null;
  const sum = rated.reduce((total, value) => total + value, 0);
  return Math.round((sum / rated.length) * 10) / 10;
}
