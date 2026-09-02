import { describe, expect, it } from 'vitest';
import type { ID } from '@/models/common';
import type { Exercise } from '@/models/exercise';
import { DEFAULT_SETTINGS } from '@/models/settings';
import { makeExercise, makeProgram, makeProgramExercise } from '@/test/factories';
import {
  abortWorkoutSession,
  addSet,
  createWorkoutSession,
  finishWorkoutSession,
  removeLastSet,
  toggleSetCompleted,
  toggleSkipExercise,
  updateSet,
} from './workoutSessionService';

const pushUps = makeExercise({ id: 'push', name: 'Push Ups', nameEn: 'Push Ups' });
const row = makeExercise({ id: 'row', name: 'Row', isWeighted: true, category: 'back' });
const plank = makeExercise({ id: 'plank', name: 'Plank', isTimed: true, category: 'core' });

const catalog = new Map<ID, Exercise>([
  [pushUps.id, pushUps],
  [row.id, row],
  [plank.id, plank],
]);

const program = makeProgram({
  name: 'Workout A',
  exercises: [
    makeProgramExercise({ exerciseId: 'push', order: 0, plannedSets: 3, plannedReps: { min: 15 } }),
    makeProgramExercise({
      exerciseId: 'row',
      order: 1,
      plannedSets: 2,
      plannedReps: { min: 8, max: 12 },
      targetWeightKg: 20,
    }),
    makeProgramExercise({
      exerciseId: 'plank',
      order: 2,
      plannedSets: 2,
      plannedReps: null,
      plannedDurationSeconds: 60,
    }),
  ],
});

const startedAt = new Date(2026, 8, 2, 19, 0, 0);

describe('createWorkoutSession', () => {
  const session = createWorkoutSession(program, catalog, DEFAULT_SETTINGS, startedAt);

  it('snapshots the program name and date', () => {
    expect(session.programName).toBe('Workout A');
    expect(session.date).toBe('2026-09-02');
    expect(session.status).toBe('active');
  });

  it('creates one set per planned set', () => {
    expect(session.exercises.map((exercise) => exercise.sets.length)).toEqual([3, 2, 2]);
  });

  it('snapshots exercise details rather than referencing the catalog', () => {
    const [first] = session.exercises;
    expect(first?.exerciseName).toBe('Push Ups');
    expect(first?.exerciseId).toBe('push');
    expect(first?.planned.reps).toEqual({ min: 15 });
  });

  it('targets the top of a rep range', () => {
    expect(session.exercises[1]?.sets[0]?.targetReps).toBe(12);
  });

  it('carries the target weight onto weighted sets only', () => {
    expect(session.exercises[1]?.sets[0]?.targetWeightKg).toBe(20);
    expect(session.exercises[0]?.sets[0]?.targetWeightKg).toBeUndefined();
  });

  it('uses seconds instead of reps for timed exercises', () => {
    expect(session.exercises[2]?.sets[0]?.targetDurationSeconds).toBe(60);
    expect(session.exercises[2]?.sets[0]?.targetReps).toBeUndefined();
  });

  it('drops rows whose catalog exercise no longer exists', () => {
    const orphaned = makeProgram({
      exercises: [makeProgramExercise({ exerciseId: 'deleted-exercise' })],
    });
    expect(createWorkoutSession(orphaned, catalog, DEFAULT_SETTINGS, startedAt).exercises).toHaveLength(0);
  });
});

describe('toggleSetCompleted', () => {
  const session = createWorkoutSession(program, catalog, DEFAULT_SETTINGS, startedAt);
  const exercise = session.exercises[0]!;
  const set = exercise.sets[0]!;

  it('fills the actual value from the target on a single tap', () => {
    const next = toggleSetCompleted(session, exercise.id, set.id);
    const updated = next.exercises[0]?.sets[0];
    expect(updated?.completed).toBe(true);
    expect(updated?.actualReps).toBe(15);
    expect(updated?.completedAt).toBeDefined();
  });

  it('keeps a value the user typed instead of overwriting it', () => {
    const typed = updateSet(session, exercise.id, set.id, { actualReps: 13 });
    expect(toggleSetCompleted(typed, exercise.id, set.id).exercises[0]?.sets[0]?.actualReps).toBe(13);
  });

  it('fills the weight for weighted exercises', () => {
    const weightedExercise = session.exercises[1]!;
    const next = toggleSetCompleted(session, weightedExercise.id, weightedExercise.sets[0]!.id);
    expect(next.exercises[1]?.sets[0]?.actualWeightKg).toBe(20);
  });

  it('fills seconds for timed exercises', () => {
    const timed = session.exercises[2]!;
    const next = toggleSetCompleted(session, timed.id, timed.sets[0]!.id);
    expect(next.exercises[2]?.sets[0]?.actualDurationSeconds).toBe(60);
  });

  it('undoes a completed set and clears its timestamp', () => {
    const done = toggleSetCompleted(session, exercise.id, set.id);
    const undone = toggleSetCompleted(done, exercise.id, set.id);
    expect(undone.exercises[0]?.sets[0]?.completed).toBe(false);
    expect(undone.exercises[0]?.sets[0]?.completedAt).toBeUndefined();
  });

  it('moves the exercise through pending, in progress and completed', () => {
    expect(session.exercises[0]?.status).toBe('pending');
    const one = toggleSetCompleted(session, exercise.id, exercise.sets[0]!.id);
    expect(one.exercises[0]?.status).toBe('in_progress');
    const two = toggleSetCompleted(one, exercise.id, exercise.sets[1]!.id);
    const three = toggleSetCompleted(two, exercise.id, exercise.sets[2]!.id);
    expect(three.exercises[0]?.status).toBe('completed');
  });
});

describe('set management', () => {
  const session = createWorkoutSession(program, catalog, DEFAULT_SETTINGS, startedAt);
  const exercise = session.exercises[1]!;

  it('adds a set that inherits the previous targets', () => {
    const next = addSet(session, exercise.id);
    expect(next.exercises[1]?.sets).toHaveLength(3);
    expect(next.exercises[1]?.sets[2]?.targetReps).toBe(12);
    expect(next.exercises[1]?.sets[2]?.targetWeightKg).toBe(20);
    expect(next.exercises[1]?.sets[2]?.index).toBe(3);
  });

  it('removes the last set but never the only one', () => {
    const once = removeLastSet(session, exercise.id);
    expect(once.exercises[1]?.sets).toHaveLength(1);
    const twice = removeLastSet(once, exercise.id);
    expect(twice.exercises[1]?.sets).toHaveLength(1);
  });
});

describe('toggleSkipExercise', () => {
  const session = createWorkoutSession(program, catalog, DEFAULT_SETTINGS, startedAt);

  it('marks an exercise as skipped and back again', () => {
    const skipped = toggleSkipExercise(session, session.exercises[0]!.id);
    expect(skipped.exercises[0]?.status).toBe('skipped');
    expect(toggleSkipExercise(skipped, session.exercises[0]!.id).exercises[0]?.status).toBe('pending');
  });

  it('restores the derived status when unskipping a partly done exercise', () => {
    const exercise = session.exercises[0]!;
    const partial = toggleSetCompleted(session, exercise.id, exercise.sets[0]!.id);
    const skipped = toggleSkipExercise(partial, exercise.id);
    expect(toggleSkipExercise(skipped, exercise.id).exercises[0]?.status).toBe('in_progress');
  });
});

describe('finishWorkoutSession', () => {
  it('freezes duration from the timestamps and stores the rating', () => {
    const session = createWorkoutSession(program, catalog, DEFAULT_SETTINGS, startedAt);
    const endedAt = new Date(startedAt.getTime() + 52 * 60 * 1000);
    const finished = finishWorkoutSession(session, 8, '  felt strong  ', endedAt);

    expect(finished.status).toBe('completed');
    expect(finished.durationSeconds).toBe(52 * 60);
    expect(finished.rpe).toBe(8);
    expect(finished.notes).toBe('felt strong');
    expect(finished.endedAt).toBe(endedAt.toISOString());
  });

  it('omits an empty note', () => {
    const session = createWorkoutSession(program, catalog, DEFAULT_SETTINGS, startedAt);
    expect(finishWorkoutSession(session, 7, '   ').notes).toBeUndefined();
  });
});

describe('abortWorkoutSession', () => {
  it('marks the workout as discarded so statistics skip it', () => {
    const session = createWorkoutSession(program, catalog, DEFAULT_SETTINGS, startedAt);
    expect(abortWorkoutSession(session).status).toBe('aborted');
  });
});
