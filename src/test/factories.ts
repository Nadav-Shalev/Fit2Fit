import type { Exercise } from '@/models/exercise';
import type { WorkoutProgram, WorkoutProgramExercise } from '@/models/program';
import type { RunningSession } from '@/models/running';
import type { ExerciseSession, SetSession, WorkoutSession } from '@/models/session';
import { DEFAULT_SETTINGS } from '@/models/settings';
import { SCHEMA_VERSION, type Fit2FitDatabase } from '@/models/database';

/**
 * Builders for test fixtures. Each takes a partial override so a test only has
 * to state the fields it actually cares about.
 */

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: nextId('exercise'),
    name: 'Push Ups',
    category: 'chest',
    isWeighted: false,
    isTimed: false,
    defaultRestSeconds: 90,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeProgramExercise(
  overrides: Partial<WorkoutProgramExercise> = {},
): WorkoutProgramExercise {
  return {
    id: nextId('row'),
    exerciseId: nextId('exercise'),
    order: 0,
    plannedSets: 3,
    plannedReps: { min: 15 },
    restSeconds: 90,
    ...overrides,
  };
}

export function makeProgram(overrides: Partial<WorkoutProgram> = {}): WorkoutProgram {
  return {
    id: nextId('program'),
    name: 'Workout A',
    exercises: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeSet(overrides: Partial<SetSession> = {}): SetSession {
  return {
    id: nextId('set'),
    index: 1,
    completed: true,
    ...overrides,
  };
}

/** Builds an exercise session from a compact list of performed sets. */
export function makeExerciseSession(
  sets: Array<Partial<SetSession>>,
  overrides: Partial<ExerciseSession> = {},
): ExerciseSession {
  return {
    id: nextId('exerciseSession'),
    exerciseId: overrides.exerciseId ?? 'exercise-fixed',
    exerciseName: 'Push Ups',
    category: 'chest',
    isWeighted: false,
    isTimed: false,
    order: 0,
    planned: { sets: sets.length, reps: { min: 15 }, restSeconds: 90 },
    sets: sets.map((set, index) => makeSet({ index: index + 1, ...set })),
    status: 'completed',
    ...overrides,
  };
}

export function makeWorkoutSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: nextId('session'),
    programId: 'program-fixed',
    programName: 'Workout A',
    date: '2026-08-31',
    startedAt: '2026-08-31T18:00:00.000Z',
    endedAt: '2026-08-31T18:48:00.000Z',
    durationSeconds: 48 * 60,
    status: 'completed',
    exercises: [],
    rpe: 8,
    ...overrides,
  };
}

export function makeRunningSession(overrides: Partial<RunningSession> = {}): RunningSession {
  return {
    id: nextId('run'),
    programName: 'Intervals',
    type: 'intervals',
    date: '2026-08-29',
    startedAt: '2026-08-29T18:30:00.000Z',
    durationSeconds: 27 * 60,
    distanceKm: 3.1,
    ...overrides,
  };
}

export function makeDatabase(overrides: Partial<Fit2FitDatabase> = {}): Fit2FitDatabase {
  return {
    schemaVersion: SCHEMA_VERSION,
    exercises: [],
    programs: [],
    workoutSessions: [],
    runningPrograms: [],
    runningSessions: [],
    schedule: { entries: [] },
    settings: DEFAULT_SETTINGS,
    activeWorkout: null,
    ...overrides,
  };
}
