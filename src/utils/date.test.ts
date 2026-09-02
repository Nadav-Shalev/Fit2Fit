import { describe, expect, it } from 'vitest';
import {
  eachDayOfRange,
  getMonthRange,
  getWeekRange,
  isCalendarDateWithinRange,
  parseCalendarDate,
  startOfWeek,
  toCalendarDate,
} from './date';

describe('toCalendarDate', () => {
  it('uses local time so a late evening workout keeps its own date', () => {
    // 23:30 local on 31 August would roll into 1 September under UTC.
    expect(toCalendarDate(new Date(2026, 7, 31, 23, 30))).toBe('2026-08-31');
  });

  it('pads single digit months and days', () => {
    expect(toCalendarDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('round-trips through parseCalendarDate', () => {
    const original = new Date(2026, 8, 2);
    expect(parseCalendarDate(toCalendarDate(original)).getTime()).toBe(original.getTime());
  });
});

describe('startOfWeek', () => {
  it('rewinds to Sunday by default', () => {
    // 2026-09-02 is a Wednesday.
    expect(toCalendarDate(startOfWeek(new Date(2026, 8, 2)))).toBe('2026-08-30');
  });

  it('honours a Monday start', () => {
    expect(toCalendarDate(startOfWeek(new Date(2026, 8, 2), 1))).toBe('2026-08-31');
  });

  it('keeps a day that is already the first of the week', () => {
    expect(toCalendarDate(startOfWeek(new Date(2026, 7, 30)))).toBe('2026-08-30');
  });
});

describe('getWeekRange', () => {
  const range = getWeekRange(new Date(2026, 8, 2));

  it('spans exactly seven days', () => {
    expect(eachDayOfRange(range)).toHaveLength(7);
  });

  it('includes the first day and excludes the day the next week starts', () => {
    expect(isCalendarDateWithinRange('2026-08-30', range)).toBe(true);
    expect(isCalendarDateWithinRange('2026-09-05', range)).toBe(true);
    expect(isCalendarDateWithinRange('2026-09-06', range)).toBe(false);
    expect(isCalendarDateWithinRange('2026-08-29', range)).toBe(false);
  });
});

describe('getMonthRange', () => {
  it('covers every day of the month', () => {
    expect(eachDayOfRange(getMonthRange(new Date(2026, 8, 15)))).toHaveLength(30);
  });

  it('handles February in a leap year', () => {
    expect(eachDayOfRange(getMonthRange(new Date(2028, 1, 10)))).toHaveLength(29);
  });
});
