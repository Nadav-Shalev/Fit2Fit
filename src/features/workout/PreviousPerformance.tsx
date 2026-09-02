import { History } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { WeightUnit } from '@/models/settings';
import type { ExerciseSession } from '@/models/session';
import { formatWeight } from '@/utils/format';

interface PreviousPerformanceProps {
  previous: ExerciseSession | null;
  weightUnit: WeightUnit;
}

/**
 * "Last time: 15 / 15 / 13" — the number to beat.
 * Weighted exercises show load and reps per set instead.
 */
export function PreviousPerformance({ previous, weightUnit }: PreviousPerformanceProps) {
  const { t } = useTranslation();

  if (!previous) {
    return (
      <p className="text-muted/70 flex items-center gap-1.5 text-xs">
        <History size={13} />
        {t('workout.previousNone')}
      </p>
    );
  }

  const completed = previous.sets.filter((set) => set.completed);
  if (completed.length === 0) return null;

  const summary = completed
    .map((set) => {
      if (previous.isTimed) return `${set.actualDurationSeconds ?? 0}${t('units.sec')}`;
      if (previous.isWeighted && set.actualWeightKg) {
        return `${formatWeight(set.actualWeightKg, weightUnit, t)} × ${set.actualReps ?? 0}`;
      }
      return String(set.actualReps ?? 0);
    })
    .join(' / ');

  return (
    <p className="text-muted flex items-center gap-1.5 text-xs">
      <History size={13} className="shrink-0" />
      <span className="font-medium">{t('workout.previous')}:</span>
      <span className="truncate tabular-nums">{summary}</span>
    </p>
  );
}
