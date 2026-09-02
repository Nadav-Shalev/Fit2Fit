import { useMemo, useState } from 'react';
import { PageHeader, SegmentedControl } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { ExerciseProgress } from '@/features/progress/ExerciseProgress';
import { PeriodSummaryCard } from '@/features/progress/PeriodSummaryCard';
import { RunningProgress } from '@/features/progress/RunningProgress';
import { useDataStore } from '@/store/useDataStore';
import { comparePeriods, monthlySummary, weeklySummary } from '@/utils/analytics/summary';
import { addDays, addMonths } from '@/utils/date';

type Tab = 'exercises' | 'running' | 'summary';

/** Progress: exercise trends, running trends, and period summaries. */
export function ProgressPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('exercises');

  const workoutSessions = useDataStore((state) => state.workoutSessions);
  const runningSessions = useDataStore((state) => state.runningSessions);
  const schedule = useDataStore((state) => state.schedule);
  const weekStartsOn = useDataStore((state) => state.settings.weekStartsOn);

  const summaries = useMemo(() => {
    const input = { workoutSessions, runningSessions, schedule };
    const now = new Date();

    const thisWeek = weeklySummary(input, now, weekStartsOn);
    const lastWeek = weeklySummary(input, addDays(now, -7), weekStartsOn);
    const thisMonth = monthlySummary(input, now);
    const lastMonth = monthlySummary(input, addMonths(now, -1));

    return {
      thisWeek,
      lastWeek,
      thisMonth,
      lastMonth,
      weekComparison: comparePeriods(thisWeek, lastWeek),
      monthComparison: comparePeriods(thisMonth, lastMonth),
    };
  }, [workoutSessions, runningSessions, schedule, weekStartsOn]);

  const hasPreviousWeek =
    summaries.lastWeek.strengthWorkouts + summaries.lastWeek.runningWorkouts > 0;
  const hasPreviousMonth =
    summaries.lastMonth.strengthWorkouts + summaries.lastMonth.runningWorkouts > 0;

  return (
    <div className="py-2">
      <PageHeader title={t('progress.title')} />

      <SegmentedControl
        className="mb-5"
        ariaLabel={t('progress.title')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'exercises', label: t('progress.tabExercises') },
          { value: 'running', label: t('progress.tabRunning') },
          { value: 'summary', label: t('progress.tabSummary') },
        ]}
      />

      {tab === 'exercises' ? <ExerciseProgress /> : null}
      {tab === 'running' ? <RunningProgress /> : null}
      {tab === 'summary' ? (
        <div className="flex flex-col gap-4">
          <PeriodSummaryCard
            title={t('progress.weeklySummary')}
            summary={summaries.thisWeek}
            comparison={summaries.weekComparison}
            comparisonLabel={t('progress.vsPreviousWeek')}
            hasPreviousData={hasPreviousWeek}
          />
          <PeriodSummaryCard
            title={t('progress.monthlySummary')}
            summary={summaries.thisMonth}
            comparison={summaries.monthComparison}
            comparisonLabel={t('progress.vsPreviousMonth')}
            hasPreviousData={hasPreviousMonth}
          />
        </div>
      ) : null}
    </div>
  );
}
