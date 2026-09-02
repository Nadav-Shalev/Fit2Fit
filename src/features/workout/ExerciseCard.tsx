import { useState } from 'react';
import {
  ChevronDown,
  Minus,
  MoveRight,
  Plus,
  StickyNote,
  TrendingDown,
  TrendingUp,
  Video,
} from 'lucide-react';
import { Badge, IconButton, RpeScale } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { WeightUnit } from '@/models/settings';
import type { ExerciseSession } from '@/models/session';
import type { SetPatch } from '@/services/workoutSessionService';
import {
  compareExercisePerformance,
  progressionLabelKey,
  type ProgressDirection,
} from '@/utils/analytics/progression';
import { cn } from '@/utils/cn';
import { formatRange, formatTarget } from '@/utils/format';
import { PreviousPerformance } from './PreviousPerformance';
import { SetRow } from './SetRow';

interface ExerciseCardProps {
  exercise: ExerciseSession;
  previous: ExerciseSession | null;
  weightUnit: WeightUnit;
  showPrevious: boolean;
  onSetChange: (setId: string, patch: SetPatch) => void;
  onToggleSet: (setId: string) => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
  onNotesChange: (notes: string) => void;
  onRpeChange: (rpe: number | undefined) => void;
  onToggleSkip: () => void;
}

function ProgressBadge({ direction }: { direction: ProgressDirection }) {
  const { t } = useTranslation();
  if (direction === 'new') return null;

  const tone = direction === 'up' ? 'success' : direction === 'down' ? 'danger' : 'neutral';
  const icon =
    direction === 'up' ? (
      <TrendingUp size={12} />
    ) : direction === 'down' ? (
      <TrendingDown size={12} />
    ) : (
      <MoveRight size={12} />
    );

  return (
    <Badge tone={tone} icon={icon}>
      {t(progressionLabelKey(direction))}
    </Badge>
  );
}

/**
 * A single exercise during a workout: target, last time's result, today's sets,
 * and the optional extras (note, effort rating, video) tucked behind a toggle so
 * the card stays scannable mid-set.
 */
export function ExerciseCard({
  exercise,
  previous,
  weightUnit,
  showPrevious,
  onSetChange,
  onToggleSet,
  onAddSet,
  onRemoveSet,
  onNotesChange,
  onRpeChange,
  onToggleSkip,
}: ExerciseCardProps) {
  const { t } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const completedSets = exercise.sets.filter((set) => set.completed).length;
  const remaining = exercise.sets.length - completedSets;
  const skipped = exercise.status === 'skipped';

  // Only judge progress once there is something to judge.
  const comparison =
    completedSets > 0 ? compareExercisePerformance(exercise, previous) : null;

  return (
    <article
      className={cn(
        'bg-surface border-line rounded-2xl border p-3.5 transition-opacity',
        skipped && 'opacity-50',
        exercise.status === 'completed' && 'border-primary/40',
      )}
    >
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold">{exercise.exerciseName}</h3>
          {exercise.exerciseNameEn && exercise.exerciseNameEn !== exercise.exerciseName ? (
            <p className="text-muted/70 truncate text-xs">{exercise.exerciseNameEn}</p>
          ) : null}

          <p className="text-muted mt-1 text-xs tabular-nums">
            {formatTarget(
              exercise.planned.sets,
              exercise.planned.reps,
              exercise.planned.durationSeconds,
              t,
            )}
            {exercise.planned.rir ? ` · ${t('exercise.rir')} ${formatRange(exercise.planned.rir)}` : ''}
            {` · ${t('workout.rest')} ${exercise.planned.restSeconds}${t('units.sec')}`}
          </p>
        </div>

        {exercise.videoUrl ? (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t('exercise.openVideo')}
            title={t('exercise.openVideo')}
            className="text-muted hover:text-primary hover:bg-elevated flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors"
          >
            <Video size={18} />
          </a>
        ) : null}

        <IconButton
          size="sm"
          label={skipped ? t('workout.unskipExercise') : t('workout.skipExercise')}
          icon={<MoveRight size={18} />}
          onClick={onToggleSkip}
        />
      </header>

      {showPrevious && !skipped ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PreviousPerformance previous={previous} weightUnit={weightUnit} />
          {comparison ? <ProgressBadge direction={comparison.direction} /> : null}
        </div>
      ) : null}

      {skipped ? (
        <p className="text-muted mt-3 text-sm">{t('workout.skipped')}</p>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-1.5">
            {exercise.sets.map((set) => (
              <SetRow
                key={set.id}
                set={set}
                exercise={exercise}
                weightUnit={weightUnit}
                onChange={(patch) => onSetChange(set.id, patch)}
                onToggle={() => onToggleSet(set.id)}
              />
            ))}
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <p className="text-muted text-xs">
              {remaining > 0 ? t('workout.setsRemaining', { count: remaining }) : t('workout.allSetsDone')}
            </p>

            <div className="flex items-center gap-1">
              <IconButton
                size="sm"
                label={t('workout.removeSet')}
                icon={<Minus size={16} />}
                disabled={exercise.sets.length <= 1}
                onClick={onRemoveSet}
              />
              <IconButton
                size="sm"
                label={t('workout.addSet')}
                icon={<Plus size={16} />}
                onClick={onAddSet}
              />
              <button
                type="button"
                onClick={() => setDetailsOpen((open) => !open)}
                className="text-muted hover:text-fg flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold"
              >
                <StickyNote size={15} />
                <ChevronDown
                  size={14}
                  className={cn('transition-transform', detailsOpen && 'rotate-180')}
                />
              </button>
            </div>
          </div>

          {detailsOpen ? (
            <div className="border-line mt-3 flex flex-col gap-3 border-t pt-3">
              <textarea
                rows={2}
                value={exercise.notes ?? ''}
                onChange={(event) => onNotesChange(event.target.value)}
                placeholder={t('workout.notePlaceholder')}
                className="bg-elevated border-line placeholder:text-muted/60 w-full rounded-xl border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />

              <div>
                <p className="text-muted mb-2 text-xs font-semibold">{t('rpe.exerciseQuestion')}</p>
                <RpeScale size="sm" value={exercise.rpe} onChange={onRpeChange} />
              </div>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
