import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { ChartCard } from '@/components/charts/ChartCard';
import { TrendChart, type TrendPoint } from '@/components/charts/TrendChart';
import { Card, EmptyState, SelectField } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/locales/en';
import { useDataStore } from '@/store/useDataStore';
import { buildExerciseProgress } from '@/utils/analytics/progression';
import { formatDayMonth, parseCalendarDate } from '@/utils/date';
import { formatWeight } from '@/utils/format';

type Metric = 'reps' | 'volume' | 'bestSet' | 'topWeight' | 'duration';

const METRIC_LABELS: Record<Metric, TranslationKey> = {
  reps: 'progress.metricReps',
  volume: 'progress.metricVolume',
  bestSet: 'progress.metricBestSet',
  topWeight: 'progress.metricTopWeight',
  duration: 'progress.metricDuration',
};

/**
 * Per-exercise progress over time.
 *
 * The metric list adapts to the exercise: a bodyweight movement has no volume
 * to plot, so it offers reps and best set instead of an empty chart.
 */
export function ExerciseProgress() {
  const { t, language } = useTranslation();
  const exercises = useDataStore((state) => state.exercises);
  const workoutSessions = useDataStore((state) => state.workoutSessions);
  const weightUnit = useDataStore((state) => state.settings.weightUnit);

  // Only exercises with recorded history are worth offering.
  const trained = useMemo(() => {
    const performed = new Set(
      workoutSessions
        .filter((session) => session.status === 'completed')
        .flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId)),
    );
    return exercises.filter((exercise) => performed.has(exercise.id));
  }, [exercises, workoutSessions]);

  const [exerciseId, setExerciseId] = useState('');
  const selectedId = exerciseId || trained[0]?.id || '';
  const selected = trained.find((exercise) => exercise.id === selectedId);

  const availableMetrics = useMemo<Metric[]>(() => {
    if (!selected) return ['reps'];
    if (selected.isTimed) return ['duration', 'bestSet'];
    if (selected.isWeighted) return ['volume', 'topWeight', 'reps', 'bestSet'];
    return ['reps', 'bestSet'];
  }, [selected]);

  const [metric, setMetric] = useState<Metric>('reps');
  const activeMetric = availableMetrics.includes(metric) ? metric : (availableMetrics[0] ?? 'reps');

  const series = useMemo(
    () => (selectedId ? buildExerciseProgress(workoutSessions, selectedId) : []),
    [workoutSessions, selectedId],
  );

  if (trained.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp size={30} />}
        title={t('progress.noExerciseData')}
        description={t('progress.noExerciseDataHint')}
      />
    );
  }

  const points: TrendPoint[] = series.map((point) => ({
    label: formatDayMonth(parseCalendarDate(point.date), language),
    value:
      activeMetric === 'reps'
        ? point.totalReps
        : activeMetric === 'volume'
          ? point.totalVolumeKg
          : activeMetric === 'topWeight'
            ? point.topWeightKg
            : activeMetric === 'duration'
              ? point.totalDurationSeconds
              : selected?.isWeighted
                ? point.bestSetVolume
                : point.bestSetReps,
  }));

  const formatValue = (value: number) => {
    if (activeMetric === 'topWeight') return formatWeight(value, weightUnit, t);
    if (activeMetric === 'duration') return `${value}${t('units.sec')}`;
    return String(Math.round(value));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label={t('progress.selectExercise')}
          value={selectedId}
          onChange={(event) => setExerciseId(event.target.value)}
        >
          {trained.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label={t('progress.metric')}
          value={activeMetric}
          onChange={(event) => setMetric(event.target.value as Metric)}
        >
          {availableMetrics.map((option) => (
            <option key={option} value={option}>
              {t(METRIC_LABELS[option])}
            </option>
          ))}
        </SelectField>
      </div>

      {points.length === 0 ? (
        <EmptyState
          title={t('progress.noExerciseData')}
          description={t('progress.noExerciseDataHint')}
        />
      ) : (
        <>
          <ChartCard title={selected?.name ?? ''} subtitle={t(METRIC_LABELS[activeMetric])}>
            <TrendChart
              data={points}
              type={activeMetric === 'topWeight' ? 'bar' : 'line'}
              valueFormatter={formatValue}
            />
          </ChartCard>

          <Card>
            <h3 className="mb-3 font-bold">{t('progress.sessionsList')}</h3>
            <ul className="flex flex-col gap-2">
              {[...series].reverse().map((point) => (
                <li
                  key={point.sessionId}
                  className="border-line flex items-baseline justify-between gap-3 border-b pb-2 text-sm last:border-0 last:pb-0"
                >
                  <span className="text-muted shrink-0 tabular-nums">
                    {formatDayMonth(parseCalendarDate(point.date), language)}
                  </span>
                  <span className="truncate font-semibold tabular-nums">
                    {point.repsPerSet.join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
