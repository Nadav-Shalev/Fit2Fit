import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { ActiveWorkoutBanner } from '@/features/dashboard/ActiveWorkoutBanner';
import { GreetingHeader } from '@/features/dashboard/GreetingHeader';
import { TodayCard } from '@/features/dashboard/TodayCard';
import { WeekOverview } from '@/features/dashboard/WeekOverview';
import { SessionDetailSheet } from '@/features/history/SessionDetailSheet';
import { SessionRow } from '@/features/history/SessionRow';
import { buildHistoryEntries, type HistoryEntry } from '@/features/history/historyEntries';
import { findNextWorkout, todaysPlan } from '@/services/scheduleService';
import { useDataStore } from '@/store/useDataStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { weeklySummary } from '@/utils/analytics/summary';

const RECENT_LIMIT = 4;

/** The daily starting point: who you are, what today asks for, how the week is going. */
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

  const { next, today } = useMemo(() => {
    const input = { schedule, programs, runningPrograms, workoutSessions, runningSessions };
    const now = new Date();
    return {
      next: findNextWorkout(input, now, settings.weekStartsOn),
      today: todaysPlan(input, now, settings.weekStartsOn),
    };
  }, [schedule, programs, runningPrograms, workoutSessions, runningSessions, settings.weekStartsOn]);

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
      <GreetingHeader summary={summary} userName={settings.userName} />

      {activeSession ? <ActiveWorkoutBanner session={activeSession} /> : null}

      <TodayCard
        today={today}
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
