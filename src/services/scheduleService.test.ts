import { describe, expect, it } from 'vitest';
import type { WeeklySchedule } from '@/models/schedule';
import { makeProgram, makeRunningSession, makeWorkoutSession } from '@/test/factories';
import { toCalendarDate } from '@/utils/date';
import { findNextWorkout, resolveWeek } from './scheduleService';

const programA = makeProgram({ id: 'program-a', name: 'Workout A' });
const programB = makeProgram({ id: 'program-b', name: 'Workout B' });

const runningProgram = {
  id: 'run-1',
  name: 'Intervals',
  type: 'intervals' as const,
  steps: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const schedule: WeeklySchedule = {
  entries: [
    { id: 'e1', dayOfWeek: 0, kind: 'strength', programId: 'program-a' },
    { id: 'e2', dayOfWeek: 1, kind: 'running', programId: 'run-1' },
    { id: 'e3', dayOfWeek: 2, kind: 'strength', programId: 'program-b' },
    { id: 'e4', dayOfWeek: 4, kind: 'strength', programId: 'program-a' },
  ],
};

/** Wednesday 2 September 2026; the week runs Sun 30 Aug - Sat 5 Sep. */
const wednesday = new Date(2026, 8, 2);
/** Tuesday 1 September 2026, the day the Workout B slot falls on. */
const tuesday = new Date(2026, 8, 1);

const baseInput = {
  schedule,
  programs: [programA, programB],
  runningPrograms: [runningProgram],
  workoutSessions: [],
  runningSessions: [],
};

describe('resolveWeek', () => {
  it('expands every scheduled slot across the week', () => {
    const items = resolveWeek(baseInput, wednesday, 0);
    expect(items).toHaveLength(4);
    expect(items.map((item) => toCalendarDate(item.date))).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-03',
    ]);
  });

  it('marks past slots with no session as missed rather than dropping them', () => {
    const items = resolveWeek(baseInput, wednesday, 0);
    // Sunday, Monday and Tuesday have all passed by Wednesday.
    expect(items.slice(0, 3).map((item) => item.status)).toEqual(['missed', 'missed', 'missed']);
  });

  it('marks future slots as planned', () => {
    const items = resolveWeek(baseInput, wednesday, 0);
    expect(items[3]?.status).toBe('planned');
  });

  it('treats a slot falling on today as still planned, not missed', () => {
    const items = resolveWeek(baseInput, tuesday, 0);
    expect(items[2]?.status).toBe('planned');
  });

  it('marks a slot as done when a matching workout was completed that day', () => {
    const items = resolveWeek(
      {
        ...baseInput,
        workoutSessions: [
          makeWorkoutSession({ id: 'done-1', programId: 'program-a', date: '2026-08-30' }),
        ],
      },
      wednesday,
      0,
    );
    expect(items[0]?.status).toBe('done');
    expect(items[0]?.sessionId).toBe('done-1');
  });

  it('does not count an unfinished workout as done', () => {
    const items = resolveWeek(
      {
        ...baseInput,
        workoutSessions: [
          makeWorkoutSession({ programId: 'program-a', date: '2026-08-30', status: 'active' }),
        ],
      },
      wednesday,
      0,
    );
    expect(items[0]?.status).toBe('missed');
  });

  it('matches running slots against logged runs', () => {
    const items = resolveWeek(
      {
        ...baseInput,
        runningSessions: [makeRunningSession({ programId: 'run-1', date: '2026-08-31' })],
      },
      wednesday,
      0,
    );
    expect(items[1]?.status).toBe('done');
  });

  it('hides slots whose program was deleted', () => {
    const items = resolveWeek({ ...baseInput, programs: [programA] }, wednesday, 0);
    expect(items.map((item) => item.entry.id)).not.toContain('e3');
  });
});

describe('findNextWorkout', () => {
  it('picks today when today is still outstanding', () => {
    const next = findNextWorkout(baseInput, tuesday, 0);
    expect(next?.programName).toBe('Workout B');
    expect(next?.isToday).toBe(true);
  });

  it('skips days that have already passed', () => {
    const next = findNextWorkout(baseInput, wednesday, 0);
    expect(toCalendarDate(next!.date)).toBe('2026-09-03');
    expect(next?.isToday).toBe(false);
  });

  it('moves to the next day once today is done', () => {
    const next = findNextWorkout(
      {
        ...baseInput,
        workoutSessions: [makeWorkoutSession({ programId: 'program-b', date: '2026-09-01' })],
      },
      tuesday,
      0,
    );
    expect(next?.programName).toBe('Workout A');
    expect(toCalendarDate(next!.date)).toBe('2026-09-03');
    expect(next?.isToday).toBe(false);
  });

  it('wraps into next week once the current week is fully done', () => {
    const saturday = new Date(2026, 8, 5);
    const next = findNextWorkout(baseInput, saturday, 0);
    expect(toCalendarDate(next!.date)).toBe('2026-09-06');
  });

  it('returns null when nothing is scheduled', () => {
    expect(findNextWorkout({ ...baseInput, schedule: { entries: [] } }, wednesday, 0)).toBeNull();
  });
});
