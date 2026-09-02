import { useMemo } from 'react';
import { Footprints } from 'lucide-react';
import { ChartCard } from '@/components/charts/ChartCard';
import { TrendChart, type TrendPoint } from '@/components/charts/TrendChart';
import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useDataStore } from '@/store/useDataStore';
import { bucketRunsByWeek } from '@/utils/analytics/trends';
import { formatDayMonth, parseCalendarDate } from '@/utils/date';
import { formatPace } from '@/utils/format';

const RECENT_RUNS = 12;
const WEEKS = 8;

/** Distance, duration, pace and weekly volume trends for running. */
export function RunningProgress() {
  const { t, language } = useTranslation();
  const runningSessions = useDataStore((state) => state.runningSessions);
  const weekStartsOn = useDataStore((state) => state.settings.weekStartsOn);

  const recent = useMemo(
    () =>
      [...runningSessions]
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
        .slice(-RECENT_RUNS),
    [runningSessions],
  );

  const weeks = useMemo(
    () => bucketRunsByWeek(runningSessions, WEEKS, weekStartsOn),
    [runningSessions, weekStartsOn],
  );

  if (runningSessions.length === 0) {
    return (
      <EmptyState
        icon={<Footprints size={30} />}
        title={t('progress.noRunningData')}
        description={t('progress.noRunningDataHint')}
      />
    );
  }

  const labelFor = (date: string) => formatDayMonth(parseCalendarDate(date), language);

  const distanceSeries: TrendPoint[] = recent.map((run) => ({
    label: labelFor(run.date),
    value: run.distanceKm ?? 0,
  }));

  const durationSeries: TrendPoint[] = recent.map((run) => ({
    label: labelFor(run.date),
    value: Math.round(run.durationSeconds / 60),
  }));

  // Runs without a distance have no pace, so they are left out of that chart
  // rather than plotted as zero.
  const paceSeries: TrendPoint[] = recent
    .filter((run) => run.paceSecondsPerKm !== undefined)
    .map((run) => ({ label: labelFor(run.date), value: run.paceSecondsPerKm ?? 0 }));

  const weekLabels = weeks.map((week) => formatDayMonth(week.start, language));

  return (
    <div className="flex flex-col gap-4">
      <ChartCard title={t('progress.distanceOverTime')}>
        <TrendChart
          data={distanceSeries}
          type="bar"
          color="var(--app-run)"
          valueFormatter={(value) => `${Math.round(value * 10) / 10}`}
        />
      </ChartCard>

      {paceSeries.length > 0 ? (
        <ChartCard title={t('progress.paceOverTime')} subtitle={t('units.perKm')}>
          <TrendChart
            data={paceSeries}
            color="var(--app-primary)"
            domainFromZero={false}
            valueFormatter={(value) => formatPace(value)}
          />
        </ChartCard>
      ) : null}

      <ChartCard title={t('progress.durationOverTime')} subtitle={t('units.min')}>
        <TrendChart data={durationSeries} color="var(--app-run)" />
      </ChartCard>

      <ChartCard title={t('progress.weeklyDistance')} subtitle={t('units.km')}>
        <TrendChart
          data={weeks.map((week, index) => ({
            label: weekLabels[index] ?? '',
            value: week.distanceKm,
          }))}
          type="bar"
          color="var(--app-run)"
        />
      </ChartCard>

      <ChartCard title={t('progress.runsPerWeek')}>
        <TrendChart
          data={weeks.map((week, index) => ({
            label: weekLabels[index] ?? '',
            value: week.runs,
          }))}
          type="bar"
          color="var(--app-primary)"
        />
      </ChartCard>
    </div>
  );
}
