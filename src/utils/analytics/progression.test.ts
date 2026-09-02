import { describe, expect, it } from 'vitest';
import { makeExerciseSession, makeWorkoutSession } from '@/test/factories';
import {
  buildExerciseProgress,
  compareExercisePerformance,
  findPreviousExercisePerformance,
  progressionLabelKey,
} from './progression';

const weighted = (sets: Array<[number, number]>) =>
  makeExerciseSession(
    sets.map(([weight, reps]) => ({ actualWeightKg: weight, actualReps: reps })),
    { isWeighted: true, exerciseId: 'bench' },
  );

const bodyweight = (reps: number[]) =>
  makeExerciseSession(
    reps.map((value) => ({ actualReps: value })),
    { exerciseId: 'pushups' },
  );

describe('compareExercisePerformance', () => {
  it('treats more reps at the same weight as an improvement', () => {
    const previous = weighted([
      [80, 10],
      [80, 9],
      [80, 8],
    ]);
    const current = weighted([
      [80, 11],
      [80, 10],
      [80, 9],
    ]);

    const result = compareExercisePerformance(current, previous);
    expect(result.direction).toBe('up');
    expect(result.metric).toBe('volume');
    expect(result.repsDelta).toBe(3);
    expect(result.volumeDelta).toBe(240);
  });

  it('treats fewer reps at a heavier weight by total volume, not by weight alone', () => {
    const previous = weighted([[80, 10]]); // 800 kg
    const current = weighted([[85, 8]]); // 680 kg
    expect(compareExercisePerformance(current, previous).direction).toBe('down');
  });

  it('counts an extra set as progress', () => {
    const previous = weighted([
      [20, 10],
      [20, 10],
    ]);
    const current = weighted([
      [20, 10],
      [20, 10],
      [20, 10],
    ]);

    const result = compareExercisePerformance(current, previous);
    expect(result.direction).toBe('up');
    expect(result.setsDelta).toBe(1);
  });

  it('compares bodyweight exercises on total reps', () => {
    expect(compareExercisePerformance(bodyweight([16, 15, 15]), bodyweight([15, 15, 13])).direction).toBe('up');
    expect(compareExercisePerformance(bodyweight([15, 15, 13]), bodyweight([15, 15, 13])).metric).toBe('reps');
  });

  it('reports no change for an identical performance', () => {
    const result = compareExercisePerformance(bodyweight([15, 15, 13]), bodyweight([15, 15, 13]));
    expect(result.direction).toBe('same');
    expect(result.percentChange).toBe(0);
  });

  it('reports a decline when reps drop', () => {
    expect(compareExercisePerformance(bodyweight([12, 12, 10]), bodyweight([15, 15, 13])).direction).toBe('down');
  });

  it('compares timed exercises on seconds held', () => {
    const previous = makeExerciseSession([{ actualDurationSeconds: 60 }], { isTimed: true });
    const current = makeExerciseSession([{ actualDurationSeconds: 75 }], { isTimed: true });
    const result = compareExercisePerformance(current, previous);
    expect(result.metric).toBe('duration');
    expect(result.direction).toBe('up');
    expect(result.durationDelta).toBe(15);
  });

  it('marks a first-ever performance as new', () => {
    const result = compareExercisePerformance(bodyweight([15]), null);
    expect(result.direction).toBe('new');
    expect(result.percentChange).toBeNull();
    expect(progressionLabelKey(result.direction)).toBe('workout.progressNew');
  });

  it('reports percentage change on the deciding metric', () => {
    const result = compareExercisePerformance(bodyweight([20]), bodyweight([10]));
    expect(result.percentChange).toBe(100);
  });
});

describe('findPreviousExercisePerformance', () => {
  const sessions = [
    makeWorkoutSession({
      id: 'older',
      startedAt: '2026-08-23T18:00:00.000Z',
      exercises: [bodyweight([15, 15, 13])],
    }),
    makeWorkoutSession({
      id: 'newer',
      startedAt: '2026-08-26T18:00:00.000Z',
      exercises: [bodyweight([15, 15, 15])],
    }),
    makeWorkoutSession({
      id: 'current',
      startedAt: '2026-08-30T18:00:00.000Z',
      exercises: [bodyweight([16, 15, 15])],
    }),
  ];

  it('returns the most recent earlier performance', () => {
    const found = findPreviousExercisePerformance(sessions, 'pushups', 'current');
    expect(found?.session.id).toBe('newer');
  });

  it('ignores workouts that were not completed', () => {
    const withActive = [
      ...sessions,
      makeWorkoutSession({
        id: 'in-progress',
        status: 'active',
        startedAt: '2026-09-01T18:00:00.000Z',
        exercises: [bodyweight([20])],
      }),
    ];
    expect(findPreviousExercisePerformance(withActive, 'pushups', 'current')?.session.id).toBe('newer');
  });

  it('returns null for an exercise never performed before', () => {
    expect(findPreviousExercisePerformance(sessions, 'deadlift')).toBeNull();
  });
});

describe('buildExerciseProgress', () => {
  it('builds an ordered series with per-set reps', () => {
    const sessions = [
      makeWorkoutSession({
        date: '2026-08-26',
        startedAt: '2026-08-26T18:00:00.000Z',
        exercises: [bodyweight([15, 15, 15])],
      }),
      makeWorkoutSession({
        date: '2026-08-23',
        startedAt: '2026-08-23T18:00:00.000Z',
        exercises: [bodyweight([15, 15, 13])],
      }),
    ];

    const series = buildExerciseProgress(sessions, 'pushups');
    expect(series.map((point) => point.date)).toEqual(['2026-08-23', '2026-08-26']);
    expect(series[0]?.totalReps).toBe(43);
    expect(series[1]?.totalReps).toBe(45);
    expect(series[0]?.repsPerSet).toEqual([15, 15, 13]);
    expect(series[1]?.bestSetReps).toBe(15);
  });

  it('skips exercises with no completed sets', () => {
    const sessions = [
      makeWorkoutSession({
        exercises: [makeExerciseSession([{ completed: false }], { exerciseId: 'pushups' })],
      }),
    ];
    expect(buildExerciseProgress(sessions, 'pushups')).toHaveLength(0);
  });
});
