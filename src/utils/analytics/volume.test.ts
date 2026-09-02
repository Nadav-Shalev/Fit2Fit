import { describe, expect, it } from 'vitest';
import { makeExerciseSession, makeWorkoutSession } from '@/test/factories';
import {
  calcBestSet,
  calcExerciseReps,
  calcExerciseVolume,
  calcSessionTotalReps,
  calcSessionVolume,
  calcSetVolume,
  calcTopWeight,
  countCompletedSets,
  countPlannedSets,
} from './volume';

describe('calcSetVolume', () => {
  it('multiplies weight by reps', () => {
    expect(calcSetVolume({ id: 's', index: 1, completed: true, actualWeightKg: 20, actualReps: 12 })).toBe(240);
  });

  it('ignores sets that were not completed', () => {
    expect(
      calcSetVolume({ id: 's', index: 1, completed: false, actualWeightKg: 20, actualReps: 12 }),
    ).toBe(0);
  });

  it('is zero for bodyweight sets, which are measured in reps instead', () => {
    expect(calcSetVolume({ id: 's', index: 1, completed: true, actualReps: 15 })).toBe(0);
  });
});

describe('calcExerciseVolume', () => {
  it('sums volume across sets', () => {
    const exercise = makeExerciseSession(
      [
        { actualWeightKg: 20, actualReps: 12 },
        { actualWeightKg: 20, actualReps: 11 },
        { actualWeightKg: 20, actualReps: 10 },
      ],
      { isWeighted: true },
    );
    expect(calcExerciseVolume(exercise)).toBe(660);
  });

  it('excludes incomplete sets from the total', () => {
    const exercise = makeExerciseSession(
      [
        { actualWeightKg: 20, actualReps: 12 },
        { actualWeightKg: 20, actualReps: 10, completed: false },
      ],
      { isWeighted: true },
    );
    expect(calcExerciseVolume(exercise)).toBe(240);
  });
});

describe('reps totals', () => {
  it('sums completed reps for an exercise', () => {
    const exercise = makeExerciseSession([
      { actualReps: 15 },
      { actualReps: 15 },
      { actualReps: 13 },
    ]);
    expect(calcExerciseReps(exercise)).toBe(43);
  });

  it('sums reps across every exercise in a session', () => {
    const session = makeWorkoutSession({
      exercises: [
        makeExerciseSession([{ actualReps: 15 }, { actualReps: 13 }]),
        makeExerciseSession([{ actualReps: 20 }]),
      ],
    });
    expect(calcSessionTotalReps(session)).toBe(48);
  });
});

describe('calcSessionVolume', () => {
  it('adds up weighted work and ignores bodyweight exercises', () => {
    const session = makeWorkoutSession({
      exercises: [
        makeExerciseSession([{ actualWeightKg: 20, actualReps: 10 }], { isWeighted: true }),
        makeExerciseSession([{ actualReps: 15 }]),
      ],
    });
    expect(calcSessionVolume(session)).toBe(200);
  });
});

describe('set counting', () => {
  it('counts completed and planned sets', () => {
    const session = makeWorkoutSession({
      exercises: [
        makeExerciseSession([{ actualReps: 15 }, { completed: false }, { completed: false }]),
        makeExerciseSession([{ actualReps: 12 }, { actualReps: 12 }]),
      ],
    });
    expect(countCompletedSets(session)).toBe(3);
    expect(countPlannedSets(session)).toBe(5);
  });

  it('leaves skipped exercises out of the planned total', () => {
    const session = makeWorkoutSession({
      exercises: [
        makeExerciseSession([{ actualReps: 15 }, { actualReps: 15 }]),
        makeExerciseSession([{ completed: false }, { completed: false }], { status: 'skipped' }),
      ],
    });
    expect(countPlannedSets(session)).toBe(2);
  });
});

describe('calcBestSet', () => {
  it('picks the highest volume set when weighted', () => {
    const exercise = makeExerciseSession(
      [
        { actualWeightKg: 20, actualReps: 12 },
        { actualWeightKg: 25, actualReps: 10 },
      ],
      { isWeighted: true },
    );
    expect(calcBestSet(exercise)?.volume).toBe(250);
  });

  it('picks the highest rep set for bodyweight work', () => {
    const exercise = makeExerciseSession([{ actualReps: 15 }, { actualReps: 18 }]);
    expect(calcBestSet(exercise)?.reps).toBe(18);
  });

  it('returns null when nothing was completed', () => {
    const exercise = makeExerciseSession([{ completed: false }]);
    expect(calcBestSet(exercise)).toBeNull();
  });
});

describe('calcTopWeight', () => {
  it('returns the heaviest completed load', () => {
    const exercise = makeExerciseSession(
      [
        { actualWeightKg: 20, actualReps: 10 },
        { actualWeightKg: 30, actualReps: 6, completed: false },
        { actualWeightKg: 25, actualReps: 8 },
      ],
      { isWeighted: true },
    );
    expect(calcTopWeight(exercise)).toBe(25);
  });
});
