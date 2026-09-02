import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { ActiveWorkoutBanner } from '@/features/dashboard/ActiveWorkoutBanner';
import { NextWorkoutCard } from '@/features/dashboard/NextWorkoutCard';
import { WeekOverview } from '@/features/dashboard/WeekOverview';
import { SessionDetailSheet } from '@/features/history/SessionDetailSheet';
import { SessionRow } from '@/features/history/SessionRow';
import { buildHistoryEntries, type HistoryEntry } from '@/features/history/historyEntries';
import { findNextWorkout } from '@/services/scheduleService';
import { useDataStore } from '@/store/useDataStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { weeklySummary } from '@/utils/analytics/summary';

const RECENT_LIMIT = 4;

/** Dashboard: what to do next, how the week is going, and what was done lately. */
export function HomePage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  const programs = useDataStore((state) => state.programs);
  const runningPrograms = useDataStore((state) => state.runningPrograms);
  const workoutSessions = useDataStore((state) => state.workoutSessions);
  const runningSessions = useDataStore((state) => state.runningSessions);
  const schedule = useDataStore((state) => state.schedule);
  const settings = useDataStore((state) => state.settings);
  const activeSession = useWorkoutStore((state) => state.session);

  const next = useMemo(
    () =>
      findNextWorkout(
        { schedule, programs, runningPrograms, workoutSessions, runningSessions },
        new Date(),
        settings.weekStartsOn,
      ),
    [schedule, programs, runningPrograms, workoutSessions, runningSessions, settings.weekStartsOn],
  );

  const summary = useMemo(
    () =>
      weeklySummary(
        { workoutSessions, runningSessions, schedule },
        new Date(),
        settings.weekStartsOn,
      ),
    [workoutSessions, runningSessions, schedule, settings.weekStartsOn],
  );

  const recent = useMemo(
    () => buildHistoryEntries(workoutSessions, runningSessions).slice(0, RECENT_LIMIT),
    [workoutSessions, runningSessions],
  );

  return (
    <div className="py-2">
      <PageHeader title={t('app.name')} subtitle={t('app.tagline')} />

      {activeSession ? <ActiveWorkoutBanner session={activeSession} /> : null}

      <NextWorkoutCard
        next={next}
        programs={programs}
        runningPrograms={runningPrograms}
        disabled={activeSession !== null}
      />

      <WeekOverview summary={summary} />

      <section>
        <h2 className="mb-3 text-base font-bold">{t('dashboard.recentActivity')}</h2>

        {recent.length === 0 ? (
          <EmptyState
            icon={<History size={30} />}
            title={t('dashboard.noRecentActivity')}
            description={t('dashboard.noRecentActivityHint')}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {recent.map((entry) => (
              <SessionRow key={entry.id} entry={entry} onClick={() => setSelected(entry)} />
            ))}
          </div>
        )}
      </section>

      <SessionDetailSheet entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
