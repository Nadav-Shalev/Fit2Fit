import type { DayOfWeek, ID, MuscleGroup } from '@/models/common';
import type { Exercise } from '@/models/exercise';
import type { WorkoutProgram, WorkoutProgramExercise } from '@/models/program';
import type { RunningProgram, RunningSession } from '@/models/running';
import type { WeeklySchedule } from '@/models/schedule';
import type { AppSettings } from '@/models/settings';
import type { WorkoutSession } from '@/models/session';
import type { Fit2FitDatabase } from '@/models/database';
import { SCHEMA_VERSION } from '@/models/database';
import { DEFAULT_SETTINGS } from '@/models/settings';
import type { TranslationKey } from '@/i18n/locales/en';
import { en } from '@/i18n/locales/en';
import type { Language } from '@/i18n/types';
import { translate } from '@/i18n/translate';
import { createWorkoutSession } from '@/services/workoutSessionService';
import { calcPaceSecondsPerKm } from '@/utils/analytics/running';
import { addDays, startOfWeek, toCalendarDate } from '@/utils/date';
import { createId } from '@/utils/id';

/**
 * Seed content so the app is useful the moment it is opened: two strength
 * programs, two running programs, a weekly plan and three weeks of history with
 * a visible upward trend, which is what makes the charts and the progressive
 * overload badges meaningful straight away.
 *
 * All names come from the translation catalogs, so the seed follows whichever
 * language is active on first run.
 */

interface DemoExerciseSpec {
  nameKey: TranslationKey;
  category: MuscleGroup;
  isWeighted: boolean;
  isTimed: boolean;
  restSeconds: number;
  /** Search term used to build a video link that is guaranteed to resolve. */
  videoQuery: string;
}

const DEMO_EXERCISES: DemoExerciseSpec[] = [
  { nameKey: 'demo.ex.pushUps', category: 'chest', isWeighted: false, isTimed: false, restSeconds: 90, videoQuery: 'push up proper form' },
  { nameKey: 'demo.ex.squat', category: 'legs', isWeighted: false, isTimed: false, restSeconds: 90, videoQuery: 'bodyweight squat form' },
  { nameKey: 'demo.ex.lunges', category: 'legs', isWeighted: false, isTimed: false, restSeconds: 90, videoQuery: 'lunges proper form' },
  { nameKey: 'demo.ex.shoulderRaises', category: 'shoulders', isWeighted: true, isTimed: false, restSeconds: 60, videoQuery: 'lateral raise form' },
  { nameKey: 'demo.ex.backpackRow', category: 'back', isWeighted: true, isTimed: false, restSeconds: 90, videoQuery: 'one arm row form' },
  { nameKey: 'demo.ex.gluteBridge', category: 'glutes', isWeighted: false, isTimed: false, restSeconds: 60, videoQuery: 'glute bridge form' },
  { nameKey: 'demo.ex.plank', category: 'core', isWeighted: false, isTimed: true, restSeconds: 60, videoQuery: 'plank proper form' },
  { nameKey: 'demo.ex.backpackDeadlift', category: 'back', isWeighted: true, isTimed: false, restSeconds: 120, videoQuery: 'romanian deadlift form' },
  { nameKey: 'demo.ex.bentOverRow', category: 'back', isWeighted: true, isTimed: false, restSeconds: 90, videoQuery: 'bent over row form' },
  { nameKey: 'demo.ex.bulgarianSplitSquat', category: 'legs', isWeighted: false, isTimed: false, restSeconds: 90, videoQuery: 'bulgarian split squat form' },
  { nameKey: 'demo.ex.pikePushUps', category: 'shoulders', isWeighted: false, isTimed: false, restSeconds: 90, videoQuery: 'pike push up form' },
  { nameKey: 'demo.ex.superman', category: 'back', isWeighted: false, isTimed: false, restSeconds: 60, videoQuery: 'superman exercise form' },
  { nameKey: 'demo.ex.sidePlank', category: 'core', isWeighted: false, isTimed: true, restSeconds: 45, videoQuery: 'side plank form' },
  { nameKey: 'demo.ex.calfRaises', category: 'legs', isWeighted: false, isTimed: false, restSeconds: 45, videoQuery: 'calf raise form' },
];

/** Program rows, expressed against the exercise keys above. */
interface DemoProgramEntry {
  nameKey: TranslationKey;
  sets: number;
  reps?: number;
  repsMax?: number;
  durationSeconds?: number;
  weightKg?: number;
  rirMin?: number;
  rirMax?: number;
}

const PROGRAM_A: DemoProgramEntry[] = [
  { nameKey: 'demo.ex.pushUps', sets: 3, reps: 15, rirMin: 1, rirMax: 2 },
  { nameKey: 'demo.ex.squat', sets: 3, reps: 15, rirMin: 1, rirMax: 2 },
  { nameKey: 'demo.ex.lunges', sets: 3, reps: 12, rirMin: 1, rirMax: 2 },
  { nameKey: 'demo.ex.shoulderRaises', sets: 3, reps: 15, weightKg: 6, rirMin: 1, rirMax: 2 },
  { nameKey: 'demo.ex.backpackRow', sets: 3, reps: 15, weightKg: 12, rirMin: 1, rirMax: 2 },
  { nameKey: 'demo.ex.gluteBridge', sets: 3, reps: 20, rirMin: 1, rirMax: 2 },
  { nameKey: 'demo.ex.plank', sets: 3, durationSeconds: 60 },
];

const PROGRAM_B: DemoProgramEntry[] = [
  { nameKey: 'demo.ex.backpackDeadlift', sets: 4, reps: 10, repsMax: 12, weightKg: 16, rirMin: 1, rirMax: 2 },
  { nameKey: 'demo.ex.bentOverRow', sets: 3, reps: 12, weightKg: 14, rirMin: 1, rirMax: 2 },
  { nameKey: 'demo.ex.bulgarianSplitSquat', sets: 3, reps: 10, rirMin: 2 },
  { nameKey: 'demo.ex.pikePushUps', sets: 3, reps: 8, repsMax: 12, rirMin: 1, rirMax: 2 },
  { nameKey: 'demo.ex.superman', sets: 3, reps: 15 },
  { nameKey: 'demo.ex.sidePlank', sets: 2, durationSeconds: 45 },
  { nameKey: 'demo.ex.calfRaises', sets: 3, reps: 20 },
];

function videoUrlFor(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function buildExercises(language: Language, now: Date): Map<TranslationKey, Exercise> {
  const timestamp = now.toISOString();
  const map = new Map<TranslationKey, Exercise>();

  for (const spec of DEMO_EXERCISES) {
    const name = translate(language, spec.nameKey);
    const nameEn = en[spec.nameKey];
    const exercise: Exercise = {
      id: createId(),
      name,
      category: spec.category,
      isWeighted: spec.isWeighted,
      isTimed: spec.isTimed,
      defaultRestSeconds: spec.restSeconds,
      videoUrl: videoUrlFor(spec.videoQuery),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    // Only carry a secondary name when it actually differs from the primary one.
    if (nameEn !== name) exercise.nameEn = nameEn;
    map.set(spec.nameKey, exercise);
  }

  return map;
}

function buildProgramExercises(
  entries: DemoProgramEntry[],
  exercises: Map<TranslationKey, Exercise>,
): WorkoutProgramExercise[] {
  return entries.flatMap((entry, index) => {
    const exercise = exercises.get(entry.nameKey);
    if (!exercise) return [];

    const row: WorkoutProgramExercise = {
      id: createId(),
      exerciseId: exercise.id,
      order: index,
      plannedSets: entry.sets,
      plannedReps: entry.reps === undefined ? null : { min: entry.reps },
      restSeconds: exercise.defaultRestSeconds,
    };
    if (entry.reps !== undefined && entry.repsMax !== undefined) {
      row.plannedReps = { min: entry.reps, max: entry.repsMax };
    }
    if (entry.durationSeconds !== undefined) row.plannedDurationSeconds = entry.durationSeconds;
    if (entry.weightKg !== undefined) row.targetWeightKg = entry.weightKg;
    if (entry.rirMin !== undefined) {
      row.plannedRir = entry.rirMax === undefined
        ? { min: entry.rirMin }
        : { min: entry.rirMin, max: entry.rirMax };
    }
    return [row];
  });
}

function buildRunningPrograms(language: Language, now: Date): RunningProgram[] {
  const timestamp = now.toISOString();

  const intervals: RunningProgram = {
    id: createId(),
    name: translate(language, 'demo.runIntervals'),
    type: 'intervals',
    description: translate(language, 'demo.runIntervalsDescription'),
    steps: [
      {
        id: createId(),
        repeat: 1,
        intervals: [{ id: createId(), kind: 'warmup', durationSeconds: 300 }],
      },
      {
        id: createId(),
        repeat: 6,
        intervals: [
          { id: createId(), kind: 'run', durationSeconds: 120 },
          { id: createId(), kind: 'walk', durationSeconds: 60 },
        ],
      },
      {
        id: createId(),
        repeat: 1,
        intervals: [{ id: createId(), kind: 'cooldown', durationSeconds: 300 }],
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const easy: RunningProgram = {
    id: createId(),
    name: translate(language, 'demo.runEasy'),
    type: 'easy',
    description: translate(language, 'demo.runEasyDescription'),
    steps: [
      {
        id: createId(),
        repeat: 1,
        intervals: [
          { id: createId(), kind: 'warmup', durationSeconds: 300 },
          { id: createId(), kind: 'run', durationSeconds: 1500 },
          { id: createId(), kind: 'cooldown', durationSeconds: 300 },
        ],
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return [intervals, easy];
}

/** Weekly plan matching the generated history: A / run / B / A / run. */
const SCHEDULE_PLAN: Array<{ day: DayOfWeek; kind: 'strength' | 'running'; slot: number }> = [
  { day: 0, kind: 'strength', slot: 0 },
  { day: 1, kind: 'running', slot: 0 },
  { day: 2, kind: 'strength', slot: 1 },
  { day: 4, kind: 'strength', slot: 0 },
  { day: 5, kind: 'running', slot: 1 },
];

/**
 * Fills a generated workout with plausible performed values.
 *
 * `weekIndex` drives a mild upward trend, and later sets in an exercise drop a
 * rep or two, which is what real fatigue looks like in the charts.
 */
function performWorkout(
  session: WorkoutSession,
  weekIndex: number,
  startedAt: Date,
  durationMinutes: number,
  rpe: number,
): WorkoutSession {
  const endedAt = new Date(startedAt.getTime() + durationMinutes * 60_000);

  return {
    ...session,
    status: 'completed',
    endedAt: endedAt.toISOString(),
    durationSeconds: durationMinutes * 60,
    rpe,
    exercises: session.exercises.map((exercise) => ({
      ...exercise,
      status: 'completed',
      sets: exercise.sets.map((set, setIndex) => {
        const fatigue = Math.max(0, setIndex - 1);
        const completed = {
          ...set,
          completed: true,
          completedAt: endedAt.toISOString(),
        };

        if (exercise.isTimed) {
          const base = set.targetDurationSeconds ?? 60;
          completed.actualDurationSeconds = base + weekIndex * 5 - fatigue * 5;
        } else {
          const base = set.targetReps ?? 10;
          completed.actualReps = Math.max(1, base + weekIndex - fatigue);
        }

        if (exercise.isWeighted) {
          const base = set.targetWeightKg ?? exercise.planned.targetWeightKg ?? 0;
          // A small load increase every other week.
          completed.actualWeightKg = base + Math.floor(weekIndex / 2) * 2;
        }

        return completed;
      }),
    })),
  };
}

function buildRun(
  program: RunningProgram,
  date: Date,
  distanceKm: number,
  durationSeconds: number,
  rpe: number,
): RunningSession {
  const startedAt = new Date(date);
  startedAt.setHours(18, 30, 0, 0);
  const pace = calcPaceSecondsPerKm(durationSeconds, distanceKm);

  const run: RunningSession = {
    id: createId(),
    programId: program.id,
    programName: program.name,
    type: program.type,
    date: toCalendarDate(date),
    startedAt: startedAt.toISOString(),
    endedAt: new Date(startedAt.getTime() + durationSeconds * 1000).toISOString(),
    durationSeconds,
    distanceKm,
    rpe,
  };
  if (pace !== undefined) run.paceSecondsPerKm = pace;
  return run;
}

const HISTORY_WEEKS = 3;

/** Builds the complete seed database. */
export function createDemoDatabase(
  language: Language = DEFAULT_SETTINGS.language,
  now: Date = new Date(),
  settings: AppSettings = DEFAULT_SETTINGS,
): Fit2FitDatabase {
  const timestamp = now.toISOString();
  const exerciseMap = buildExercises(language, now);
  const exercises = [...exerciseMap.values()];
  const exercisesById = new Map<ID, Exercise>(exercises.map((exercise) => [exercise.id, exercise]));

  const programA: WorkoutProgram = {
    id: createId(),
    name: translate(language, 'demo.programA'),
    description: translate(language, 'demo.programADescription'),
    exercises: buildProgramExercises(PROGRAM_A, exerciseMap),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const programB: WorkoutProgram = {
    id: createId(),
    name: translate(language, 'demo.programB'),
    description: translate(language, 'demo.programBDescription'),
    exercises: buildProgramExercises(PROGRAM_B, exerciseMap),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const programs = [programA, programB];
  const runningPrograms = buildRunningPrograms(language, now);

  const schedule: WeeklySchedule = {
    entries: SCHEDULE_PLAN.flatMap(({ day, kind, slot }) => {
      const program = kind === 'strength' ? programs[slot] : runningPrograms[slot];
      if (!program) return [];
      return [{ id: createId(), dayOfWeek: day, kind, programId: program.id }];
    }),
  };

  // History covers the weeks before the current one, so "this week" starts fresh.
  const currentWeekStart = startOfWeek(now, settings.weekStartsOn);
  const workoutSessions: WorkoutSession[] = [];
  const runningSessions: RunningSession[] = [];

  for (let week = 0; week < HISTORY_WEEKS; week += 1) {
    const weekStart = addDays(currentWeekStart, -(HISTORY_WEEKS - week) * 7);
    const weekIndex = week;

    for (const { day, kind, slot } of SCHEDULE_PLAN) {
      const date = addDays(weekStart, day);
      if (date.getTime() > now.getTime()) continue;

      if (kind === 'strength') {
        const program = programs[slot];
        if (!program) continue;
        const startedAt = new Date(date);
        startedAt.setHours(19, 0, 0, 0);
        const blank = createWorkoutSession(program, exercisesById, settings, startedAt);
        const duration = 46 + weekIndex * 2 + slot * 3;
        workoutSessions.push(
          performWorkout(blank, weekIndex, startedAt, duration, 7 + (slot === 1 ? 1 : 0)),
        );
      } else {
        const program = runningPrograms[slot];
        if (!program) continue;
        const distance = Math.round((3 + weekIndex * 0.25 + slot * 0.4) * 10) / 10;
        const durationSeconds = Math.round(distance * (470 - weekIndex * 8));
        runningSessions.push(buildRun(program, date, distance, durationSeconds, 6 + slot));
      }
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    exercises,
    programs,
    workoutSessions,
    runningPrograms,
    runningSessions,
    schedule,
    settings: { ...settings, language },
    activeWorkout: null,
  };
}

/** Empty database used when the user clears everything. */
export function createEmptyDatabase(settings: AppSettings = DEFAULT_SETTINGS): Fit2FitDatabase {
  return {
    schemaVersion: SCHEMA_VERSION,
    exercises: [],
    programs: [],
    workoutSessions: [],
    runningPrograms: [],
    runningSessions: [],
    schedule: { entries: [] },
    settings,
    activeWorkout: null,
  };
}
