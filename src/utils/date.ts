import type { CalendarDate, DayOfWeek } from '@/models/common';
import type { Language, Translator } from '@/i18n/types';
import { LOCALE_BY_LANGUAGE } from '@/i18n/types';

/** Half-open date range: [start, end). */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Formats a date as "YYYY-MM-DD" in **local time**.
 * `toISOString()` would push a 23:00 workout into the next day.
 */
export function toCalendarDate(date: Date): CalendarDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses "YYYY-MM-DD" as local midnight. */
export function parseCalendarDate(value: CalendarDate): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toCalendarDate(a) === toCalendarDate(b);
}

/** Start of the week containing `date`, honouring the configured first weekday. */
export function startOfWeek(date: Date, weekStartsOn: DayOfWeek = 0): Date {
  const result = startOfDay(date);
  const diff = (result.getDay() - weekStartsOn + 7) % 7;
  return addDays(result, -diff);
}

/** The week as [firstDay, nextWeeksFirstDay). */
export function getWeekRange(date: Date, weekStartsOn: DayOfWeek = 0): DateRange {
  const start = startOfWeek(date, weekStartsOn);
  return { start, end: addDays(start, 7) };
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthRange(date: Date): DateRange {
  const start = startOfMonth(date);
  return { start, end: new Date(date.getFullYear(), date.getMonth() + 1, 1) };
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Whether `date` falls inside [start, end). */
export function isWithinRange(date: Date, range: DateRange): boolean {
  const time = date.getTime();
  return time >= range.start.getTime() && time < range.end.getTime();
}

export function isCalendarDateWithinRange(value: CalendarDate, range: DateRange): boolean {
  return isWithinRange(parseCalendarDate(value), range);
}

/** Every day in the range, used to render calendars and count scheduled slots. */
export function eachDayOfRange(range: DateRange): Date[] {
  const days: Date[] = [];
  let cursor = startOfDay(range.start);
  while (cursor.getTime() < range.end.getTime()) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/**
 * `Intl` formatters are comparatively expensive to construct, and these run on
 * every history row, so they are memoized per locale + preset.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/** "31/08" */
export function formatDayMonth(date: Date, language: Language): string {
  return getFormatter(LOCALE_BY_LANGUAGE[language], {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

/** "31 August 2026" */
export function formatFullDate(date: Date, language: Language): string {
  return getFormatter(LOCALE_BY_LANGUAGE[language], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** "August 2026" */
export function formatMonthYear(date: Date, language: Language): string {
  return getFormatter(LOCALE_BY_LANGUAGE[language], { month: 'long', year: 'numeric' }).format(
    date,
  );
}

/** "Monday" */
export function formatWeekday(date: Date, language: Language): string {
  return getFormatter(LOCALE_BY_LANGUAGE[language], { weekday: 'long' }).format(date);
}

/** Single-letter weekday initial, for the calendar header row. */
export function formatWeekdayNarrow(date: Date, language: Language): string {
  return getFormatter(LOCALE_BY_LANGUAGE[language], { weekday: 'narrow' }).format(date);
}

/** "18:04" */
export function formatTime(date: Date, language: Language): string {
  return getFormatter(LOCALE_BY_LANGUAGE[language], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Weekday name for a `DayOfWeek` index, derived from a known Sunday. */
export function weekdayName(day: DayOfWeek, language: Language): string {
  // 2024-01-07 was a Sunday, so adding `day` lands on the requested weekday.
  return formatWeekday(new Date(2024, 0, 7 + day), language);
}

/** "Today" / "Yesterday" / "31/08" for history rows. */
export function formatRelativeDay(
  date: Date,
  language: Language,
  t: Translator,
  now: Date = new Date(),
): string {
  if (isSameDay(date, now)) return t('common.today');
  if (isSameDay(date, addDays(now, -1))) return t('common.yesterday');
  return formatDayMonth(date, language);
}
