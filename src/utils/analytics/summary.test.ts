import { describe, expect, it } from 'vitest';
import type { WeeklySchedule } from '@/models/schedule';
import { makeExerciseSession, makeRunningSession, makeWorkoutSession } from '@/test/factories';
import { getWeekRange } from '@/utils/date';
import { comparePeriods, countScheduledInRange, summarizePeriod, weeklySummary } from './summary';

/** Sunday 2026-08-30 through Saturday 2026-09-05. */
const REFERENCE = new Date(2026, 8, 2); // 2 September 2026, a Wednesday

const schedule: WeeklySchedule = {
  entries: [
    { id: 'a', dayOfWeek: 0, kind: 'strength', programId: 'program-a' },
    { id: 'b', dayOfWeek: 2, kind: 'strength', programId: 'program-b' },
    { id: 'c', dayOfWeek: 4, kind: 'strength', programId: 'program-a' },
    { id: 'd', dayOfWeek: 1, kind: 'running', programId: 'run-1' },
    { id: 'e', dayOfWeek: 5, kind: 'running', programId: 'run-2' },
  ],
};

describe('countScheduledInRange', () => {
  it('counts one occurrence of each entry in a single week', () => {
    expect(countScheduledInRange(schedule, getWeekRange(REFERENCE, 0))).toEqual({
      strength: 3,
      running: 2,
    });
  });

  it('scales across a longer range', () => {
    const twoWeeks = getWeekRange(REFERENCE, 0);
    twoWeeks.end = new Date(twoWeeks.start.getFullYear(), twoWeeks.start.getMonth(), twoWeeks.start.getDate() + 14);
    expect(countScheduledInRange(schedule, twoWeeks)).toEqual({ strength: 6, running: 4 });
  });
});

describe('weeklySummary', () => {
  const workoutSessions = [
    makeWorkoutSession({
      date: '2026-08-30',
      durationSeconds: 48 * 60,
      rpe: 8,
      exercises: [
        makeExerciseSession([{ actualReps: 15 }, { actualReps: 15 }, { actualReps: 13 }]),
        makeExerciseSession([{ actualWeightKg: 20, actualReps: 10 }], { isWeighted: true }),
      ],
    }),
    makeWorkoutSession({
      date: '2026-09-01',
      durationSeconds: 51 * 60,
      rpe: 7,
      exercises: [makeExerciseSession([{ actualReps: 12 }, { completed: false }])],
    }),
    // Outside the week — must not be counted.
    makeWorkoutSession({ date: '2026-08-20', durationSeconds: 40 * 60, rpe: 9 }),
    // Discarded — must not be counted either.
    makeWorkoutSession({ date: '2026-09-01', status: 'aborted', durationSeconds: 10 * 60 }),
  ];

  const runningSessions = [
    makeRunningSession({ date: '2026-08-31', distanceKm: 3.1, durationSeconds: 1620, rpe: 6 }),
    makeRunningSession({ date: '2026-08-10', distanceKm: 9, durationSeconds: 3000 }),
  ];

  const summary = weeklySummary({ workoutSessions, runningSessions, schedule }, REFERENCE, 0);

  it('counts only completed sessions inside the week', () => {
    expect(summary.strengthWorkouts).toBe(2);
    expect(summary.runningWorkouts).toBe(1);
  });

  it('adds strength and running time together', () => {
    expect(summary.totalDurationSeconds).toBe(48 * 60 + 51 * 60 + 1620);
  });

  it('reports set completion against the sets that were planned', () => {
    expect(summary.completedSets).toBe(5);
    expect(summary.plannedSets).toBe(6);
    expect(summary.setCompletionPercent).toBe(83);
  });

  it('totals volume, reps and running distance', () => {
    expect(summary.totalVolumeKg).toBe(200);
    expect(summary.totalReps).toBe(65);
    expect(summary.runningDistanceKm).toBe(3.1);
  });

  it('averages RPE across strength and running', () => {
    expect(summary.averageRpe).toBe(7);
  });

  it('measures adherence against the weekly plan', () => {
    // 3 of 5 planned sessions were done.
    expect(summary.scheduledStrength).toBe(3);
    expect(summary.scheduledRunning).toBe(2);
    expect(summary.adherencePercent).toBe(60);
  });
});

describe('comparePeriods', () => {
  const emptyInput = { workoutSessions: [], runningSessions: [], schedule };

  const previous = summarizePeriod({
    ...emptyInput,
    workoutSessions: [
      makeWorkoutSession({
        date: '2026-08-26',
        durationSeconds: 45 * 60,
        rpe: 6,
        exercises: [makeExerciseSession([{ actualWeightKg: 20, actualReps: 10 }], { isWeighted: true })],
      }),
    ],
    runningSessions: [makeRunningSession({ date: '2026-08-25', distanceKm: 3, durationSeconds: 1500 })],
    range: getWeekRange(new Date(2026, 7, 26), 0),
  });

  const current = summarizePeriod({
    ...emptyInput,
    workoutSessions: [
      makeWorkoutSession({
        date: '2026-08-30',
        durationSeconds: 50 * 60,
        rpe: 8,
        exercises: [makeExerciseSession([{ actualWeightKg: 22, actualReps: 10 }], { isWeighted: true })],
      }),
      makeWorkoutSession({ date: '2026-09-01', durationSeconds: 50 * 60, rpe: 8 }),
    ],
    runningSessions: [
      makeRunningSession({ date: '2026-08-31', distanceKm: 6.5, durationSeconds: 3000 }),
    ],
    range: getWeekRange(REFERENCE, 0),
  });

  const comparison = comparePeriods(current, previous);

  it('reports the change in session count', () => {
    expect(comparison.workoutsDelta).toBe(1);
    expect(comparison.strengthDelta).toBe(1);
    expect(comparison.runningDelta).toBe(0);
  });

  it('reports volume change as a percentage', () => {
    // 200 kg last week, 220 kg this week.
    expect(comparison.volumeDeltaPercent).toBe(10);
  });

  it('reports the running distance difference', () => {
    expect(comparison.runningDistanceDeltaKm).toBe(3.5);
  });

  it('reports the RPE difference when both periods were rated', () => {
    expect(comparison.rpeDelta).toBe(2);
  });

  it('has no volume percentage when the previous period had none', () => {
    const blank = summarizePeriod({ ...emptyInput, range: getWeekRange(new Date(2026, 0, 5), 0) });
    expect(comparePeriods(current, blank).volumeDeltaPercent).toBeNull();
  });
});
