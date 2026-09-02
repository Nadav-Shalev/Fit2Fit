import { describe, expect, it } from 'vitest';
import { makeExerciseSession, makeWorkoutSession } from '@/test/factories';
import { calcSessionWorkSeconds, elapsedSeconds } from './session';

const SECOND = 1000;
const origin = 1_800_000_000_000;

describe('elapsedSeconds', () => {
  it('is zero before the stopwatch starts', () => {
    expect(elapsedSeconds(null, 0, null, origin)).toBe(0);
  });

  it('counts wall-clock time from the origin', () => {
    expect(elapsedSeconds(origin, 0, null, origin + 42 * SECOND)).toBe(42);
  });

  it('subtracts time already banked in earlier pauses', () => {
    // Ran 60s of wall time, 20s of it paused.
    expect(elapsedSeconds(origin, 20 * SECOND, null, origin + 60 * SECOND)).toBe(40);
  });

  it('freezes while paused', () => {
    const pausedAt = origin + 30 * SECOND;
    expect(elapsedSeconds(origin, 0, pausedAt, pausedAt)).toBe(30);
    // Ten more seconds pass, but the timer is paused so it must not move.
    expect(elapsedSeconds(origin, 0, pausedAt, pausedAt + 10 * SECOND)).toBe(30);
  });

  it('combines banked pauses with a pause in progress', () => {
    const pausedAt = origin + 50 * SECOND;
    expect(elapsedSeconds(origin, 10 * SECOND, pausedAt, pausedAt + 5 * SECOND)).toBe(40);
  });

  it('never goes negative when the clock jumps backwards', () => {
    expect(elapsedSeconds(origin, 0, null, origin - 5 * SECOND)).toBe(0);
  });

  it('stays accurate across a long backgrounded gap', () => {
    // The whole point of deriving from timestamps: a throttled tab cannot drift.
    expect(elapsedSeconds(origin, 0, null, origin + 3_600 * SECOND)).toBe(3600);
  });
});

describe('calcSessionWorkSeconds', () => {
  it('is zero for a workout logged without the guided timer', () => {
    const session = makeWorkoutSession({
      exercises: [makeExerciseSession([{ actualReps: 15 }, { actualReps: 15 }])],
    });
    expect(calcSessionWorkSeconds(session)).toBe(0);
  });

  it('sums the measured time of completed sets', () => {
    const session = makeWorkoutSession({
      exercises: [
        makeExerciseSession([
          { actualReps: 15, workSeconds: 40 },
          { actualReps: 14, workSeconds: 38 },
        ]),
        makeExerciseSession([{ actualReps: 20, workSeconds: 55 }]),
      ],
    });
    expect(calcSessionWorkSeconds(session)).toBe(133);
  });

  it('ignores sets that were never completed', () => {
    const session = makeWorkoutSession({
      exercises: [
        makeExerciseSession([
          { actualReps: 15, workSeconds: 40 },
          { completed: false, workSeconds: 99 },
        ]),
      ],
    });
    expect(calcSessionWorkSeconds(session)).toBe(40);
  });
});
