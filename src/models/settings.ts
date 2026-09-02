import type { Language } from '@/i18n/types';
import type { DayOfWeek } from './common';

export type ThemeMode = 'dark' | 'light' | 'system';
export type WeightUnit = 'kg' | 'lb';

export interface AppSettings {
  language: Language;
  theme: ThemeMode;
  weightUnit: WeightUnit;
  /** Fallback rest time when an exercise does not define its own. */
  defaultRestSeconds: number;
  /** Play a sound when the rest timer ends. */
  soundEnabled: boolean;
  /** Vibrate when the rest timer ends (mainly Android). */
  vibrationEnabled: boolean;
  /** First day of the week for summary calculations. 0 = Sunday. */
  weekStartsOn: DayOfWeek;
  /** Show the previous workout's sets next to each exercise. */
  showPreviousPerformance: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'he',
  theme: 'dark',
  weightUnit: 'kg',
  defaultRestSeconds: 90,
  soundEnabled: true,
  vibrationEnabled: true,
  weekStartsOn: 0,
  showPreviousPerformance: true,
};
