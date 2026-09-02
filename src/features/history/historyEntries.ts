import type { RunningSession } from '@/models/running';
import type { WorkoutSession } from '@/models/session';

/** A single row in history: either a strength workout or a run. */
export type HistoryEntry =
  | { kind: 'strength'; id: string; startedAt: string; date: string; session: WorkoutSession }
  | { kind: 'running'; id: string; startedAt: string; date: string; session: RunningSession };

/**
 * Merges both kinds of session into one timeline, newest first.
 * Discarded workouts are left out so history reflects real training.
 */
export function buildHistoryEntries(
  workoutSessions: WorkoutSession[],
  runningSessions: RunningSession[],
): HistoryEntry[] {
  const strength: HistoryEntry[] = workoutSessions
    .filter((session) => session.status === 'completed')
    .map((session) => ({
      kind: 'strength',
      id: session.id,
      startedAt: session.startedAt,
      date: session.date,
      session,
    }));

  const running: HistoryEntry[] = runningSessions.map((session) => ({
    kind: 'running',
    id: session.id,
    startedAt: session.startedAt,
    date: session.date,
    session,
  }));

  return [...strength, ...running].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
