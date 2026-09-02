import type { DayOfWeek, ID } from '@/models/common';
import type { WorkoutProgram } from '@/models/program';
import type { RunningProgram, RunningSession } from '@/models/running';
import type { PlannedStatus, ResolvedScheduleItem, WeeklySchedule } from '@/models/schedule';
import type { WorkoutSession } from '@/models/session';
import { getWeekRange, isSameDay, parseCalendarDate, startOfDay } from '@/utils/date';

interface ResolveInput {
  schedule: WeeklySchedule;
  programs: WorkoutProgram[];
  runningPrograms: RunningProgram[];
  workoutSessions: WorkoutSession[];
  runningSessions: RunningSession[];
}

function programNameFor(
  entry: { kind: 'strength' | 'running'; programId: ID },
  programs: WorkoutProgram[],
  runningPrograms: RunningProgram[],
): string | null {
  if (entry.kind === 'strength') {
    return programs.find((program) => program.id === entry.programId)?.name ?? null;
  }
  return runningPrograms.find((program) => program.id === entry.programId)?.name ?? null;
}

/**
 * Expands the weekly plan across a specific week and marks each slot against
 * what was actually logged.
 *
 * A slot that was not trained is never dropped — past days become `missed`,
 * today and future days stay `planned`.
 */
export function resolveWeek(
  input: ResolveInput,
  referenceDate: Date = new Date(),
  weekStartsOn: DayOfWeek = 0,
): ResolvedScheduleItem[] {
  const { start } = getWeekRange(referenceDate, weekStartsOn);
  const today = startOfDay(referenceDate);
  const items: ResolvedScheduleItem[] = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const dayOfWeek = date.getDay() as DayOfWeek;

    for (const entry of input.schedule.entries) {
      if (entry.dayOfWeek !== dayOfWeek) continue;

      const programName = programNameFor(entry, input.programs, input.runningPrograms);
      // A slot pointing at a deleted program is not shown at all.
      if (programName === null) continue;

      const session =
        entry.kind === 'strength'
          ? input.workoutSessions.find(
              (candidate) =>
                candidate.status === 'completed' &&
                candidate.programId === entry.programId &&
                isSameDay(parseCalendarDate(candidate.date), date),
            )
          : input.runningSessions.find(
              (candidate) =>
                candidate.programId === entry.programId &&
                isSameDay(parseCalendarDate(candidate.date), date),
            );

      const status: PlannedStatus = session
        ? 'done'
        : date.getTime() < today.getTime()
          ? 'missed'
          : 'planned';

      const item: ResolvedScheduleItem = { entry, date, programName, status };
      if (session) item.sessionId = session.id;
      items.push(item);
    }
  }

  return items;
}

export interface NextWorkout {
  kind: 'strength' | 'running';
  programId: ID;
  programName: string;
  date: Date;
  /** True when the slot is scheduled for today. */
  isToday: boolean;
}

/**
 * The workout the home screen should offer next.
 *
 * Prefers an outstanding slot from today, then the next upcoming day this week,
 * and finally wraps to the earliest slot of next week so the card is never empty
 * for a user who has a plan.
 */
export function findNextWorkout(
  input: ResolveInput,
  referenceDate: Date = new Date(),
  weekStartsOn: DayOfWeek = 0,
): NextWorkout | null {
  const thisWeek = resolveWeek(input, referenceDate, weekStartsOn);
  const today = startOfDay(referenceDate);

  const upcoming = thisWeek
    .filter((item) => item.status !== 'done' && item.date.getTime() >= today.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  const chosen =
    upcoming ??
    resolveWeek(input, new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), weekStartsOn).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    )[0];

  if (!chosen) return null;

  return {
    kind: chosen.entry.kind,
    programId: chosen.entry.programId,
    programName: chosen.programName,
    date: chosen.date,
    isToday: isSameDay(chosen.date, today),
  };
}

/** Scheduled slots for a specific day, used by the calendar detail panel. */
export function scheduleForDay(
  schedule: WeeklySchedule,
  date: Date,
): WeeklySchedule['entries'] {
  const dayOfWeek = date.getDay() as DayOfWeek;
  return schedule.entries.filter((entry) => entry.dayOfWeek === dayOfWeek);
}
