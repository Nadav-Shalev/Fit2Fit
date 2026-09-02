import { Card, StatTile } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { PeriodComparison, PeriodSummary } from '@/utils/analytics/summary';
import { cn } from '@/utils/cn';
import {
  formatDistance,
  formatDurationHuman,
  formatSignedNumber,
  formatSignedPercent,
} from '@/utils/format';

interface PeriodSummaryCardProps {
  title: string;
  summary: PeriodSummary;
  comparison: PeriodComparison;
  comparisonLabel: string;
  hasPreviousData: boolean;
}

/** Signed delta, coloured green when it moved in the desired direction. */
function Delta({ text, positive }: { text: string; positive: boolean }) {
  return (
    <span className={cn('font-semibold', positive ? 'text-success' : 'text-muted')}>{text}</span>
  );
}

/** Weekly or monthly totals with a comparison against the previous period. */
export function PeriodSummaryCard({
  title,
  summary,
  comparison,
  comparisonLabel,
  hasPreviousData,
}: PeriodSummaryCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <h3 className="mb-3 font-bold">{title}</h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label={t('progress.workouts')}
          value={summary.strengthWorkouts + summary.runningWorkouts}
          delta={
            hasPreviousData ? (
              <Delta
                text={`${formatSignedNumber(comparison.workoutsDelta)} ${comparisonLabel}`}
                positive={comparison.workoutsDelta > 0}
              />
            ) : undefined
          }
        />

        <StatTile
          label={t('progress.trainingTime')}
          value={formatDurationHuman(summary.totalDurationSeconds, t)}
        />

        <StatTile label={t('progress.sets')} value={summary.completedSets} />

        <StatTile
          label={t('progress.volume')}
          value={`${summary.totalVolumeKg.toLocaleString()} ${t('units.kg')}`}
          delta={
            hasPreviousData && comparison.volumeDeltaPercent !== null ? (
              <Delta
                text={formatSignedPercent(comparison.volumeDeltaPercent)}
                positive={comparison.volumeDeltaPercent > 0}
              />
            ) : undefined
          }
        />

        <StatTile
          tone="run"
          label={t('progress.runningDistance')}
          value={formatDistance(summary.runningDistanceKm, t)}
          delta={
            hasPreviousData ? (
              <Delta
                text={`${formatSignedNumber(comparison.runningDistanceDeltaKm, 1)} ${t('units.km')}`}
                positive={comparison.runningDistanceDeltaKm > 0}
              />
            ) : undefined
          }
        />

        <StatTile
          label={t('rpe.average')}
          value={summary.averageRpe === null ? '—' : summary.averageRpe.toFixed(1)}
        />
      </div>

      <div className="text-muted mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span>
          {t('progress.setCompletion')}: <b className="text-fg">{summary.setCompletionPercent}%</b>
        </span>
        {summary.scheduledStrength + summary.scheduledRunning > 0 ? (
          <span>
            {t('progress.adherence')}: <b className="text-fg">{summary.adherencePercent}%</b>
          </span>
        ) : null}
      </div>

      {!hasPreviousData ? (
        <p className="text-muted mt-2 text-xs">{t('progress.noComparison')}</p>
      ) : null}
    </Card>
  );
}
