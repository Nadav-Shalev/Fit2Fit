import type { NumericRange } from '@/models/common';
import type { WeightUnit } from '@/models/settings';
import type { Translator } from '@/i18n/types';

const KG_TO_LB = 2.20462;
const EMPTY = '—';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "00:37:42" — the workout timer. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** "01:30" — the rest timer. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
}

/**
 * "52 minutes", "1 hour and 12 minutes".
 * Takes a translator because plural forms differ per language (Hebrew, for
 * instance, has a dedicated dual form for two hours).
 */
export function formatDurationHuman(totalSeconds: number, t: Translator): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.round((safe % 3600) / 60);

  const minutesText = minutes === 1 ? t('time.oneMinute') : t('time.minutes', { count: minutes });

  if (hours === 0) {
    if (minutes === 0) return t('time.lessThanMinute');
    return minutesText;
  }

  const hoursText =
    hours === 1 ? t('time.oneHour') : hours === 2 ? t('time.twoHours') : t('time.hours', { count: hours });

  if (minutes === 0) return hoursText;
  return t('time.hoursAndMinutes', { hours: hoursText, minutes: minutesText });
}

/** "7:35" — running pace, minutes and seconds per kilometre. */
export function formatPace(secondsPerKm: number | undefined): string {
  if (secondsPerKm === undefined || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) {
    return EMPTY;
  }
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  // Rounding 59.6s must roll over into the next minute rather than print "7:60".
  if (seconds === 60) return `${minutes + 1}:00`;
  return `${minutes}:${pad(seconds)}`;
}

/** "7:35 min/km" */
export function formatPaceWithUnit(secondsPerKm: number | undefined, t: Translator): string {
  const pace = formatPace(secondsPerKm);
  return pace === EMPTY ? pace : `${pace} ${t('units.perKm')}`;
}

/** Trims trailing zeros so 3.20 reads as "3.2" and 5.00 as "5". */
function trimNumber(value: number, fractionDigits: number): string {
  return value.toFixed(fractionDigits).replace(/\.?0+$/, '');
}

/** "3.2 km" */
export function formatDistance(km: number | undefined, t: Translator): string {
  if (km === undefined || !Number.isFinite(km)) return EMPTY;
  return `${trimNumber(km, 2)} ${t('units.km')}`;
}

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg * KG_TO_LB : kg;
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value / KG_TO_LB : value;
}

/** "20 kg" / "44 lb" */
export function formatWeight(
  kg: number | undefined,
  unit: WeightUnit,
  t: Translator,
): string {
  if (kg === undefined || !Number.isFinite(kg)) return EMPTY;
  const value = kgToDisplay(kg, unit);
  return `${trimNumber(value, 1)} ${unit === 'lb' ? t('units.lb') : t('units.kg')}`;
}

/** "15" or "8-12" */
export function formatRange(range: NumericRange | null | undefined): string {
  if (!range) return EMPTY;
  if (range.max === undefined || range.max === range.min) return String(range.min);
  return `${range.min}–${range.max}`;
}

/** "3 x 15" or "3 x 60s" — an exercise target. */
export function formatTarget(
  sets: number,
  reps: NumericRange | null | undefined,
  durationSeconds: number | undefined,
  t: Translator,
): string {
  if (durationSeconds) return `${sets} × ${durationSeconds} ${t('units.sec')}`;
  return `${sets} × ${formatRange(reps)}`;
}

/** "+12%" / "-3%" / "0%" */
export function formatSignedPercent(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}%` : `${rounded}%`;
}

/** "+1" / "-2" / "0" / "+3.5" */
export function formatSignedNumber(value: number, fractionDigits = 0): string {
  const text = fractionDigits > 0 ? trimNumber(value, fractionDigits) : value.toFixed(0);
  return Number(text) > 0 ? `+${text}` : text;
}

/** Compact number for stat tiles: 12500 -> "12.5k". */
export function formatCompactNumber(value: number): string {
  if (Math.abs(value) < 1000) return String(Math.round(value));
  return `${trimNumber(value / 1000, 1)}k`;
}
