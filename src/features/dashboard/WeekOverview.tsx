import { Dumbbell, Footprints, Timer } from 'lucide-react';
import { Card, ProgressRing } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { PeriodSummary } from '@/utils/analytics/summary';
import { formatDurationHuman } from '@/utils/format';

/**
 * "3/3 strength, 2/2 running" plus total time and a completion ring.
 * Counts are shown against the weekly plan whenever one exists.
 */
export function WeekOverview({ summary }: { summary: PeriodSummary }) {
  const { t } = useTranslation();
  const hasPlan = summary.scheduledStrength + summary.scheduledRunning > 0;

  const rows = [
    {
      key: 'strength',
      icon: <Dumbbell size={16} />,
      label: t('dashboard.strengthWorkouts'),
      done: summary.strengthWorkouts,
      planned: summary.scheduledStrength,
    },
    {
      key: 'running',
      icon: <Footprints size={16} />,
      label: t('dashboard.runningWorkouts'),
      done: summary.runningWorkouts,
      planned: summary.scheduledRunning,
    },
  ];

  return (
    <Card className="mb-5">
      <h2 className="mb-4 text-base font-bold">{t('dashboard.thisWeek')}</h2>

      <div className="flex items-center gap-5">
        <ProgressRing percent={hasPlan ? summary.adherencePercent : summary.setCompletionPercent}>
          <span className="text-lg font-extrabold tabular-nums">
            {hasPlan ? summary.adherencePercent : summary.setCompletionPercent}%
          </span>
        </ProgressRing>

        <div className="min-w-0 flex-1 space-y-2.5">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center gap-2 text-sm">
              <span className="text-muted">{row.icon}</span>
              <span className="text-muted flex-1 truncate">{row.label}</span>
              <span className="font-bold tabular-nums">
                {row.planned > 0 ? `${row.done}/${row.planned}` : row.done}
              </span>
            </div>
          ))}

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">
              <Timer size={16} />
            </span>
            <span className="text-muted flex-1 truncate">{t('dashboard.totalTime')}</span>
            <span className="font-bold">{formatDurationHuman(summary.totalDurationSeconds, t)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
