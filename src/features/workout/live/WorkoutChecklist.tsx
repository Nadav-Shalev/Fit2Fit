import { Check, Circle, Flag, MoreHorizontal, Play, Trash2 } from 'lucide-react';
import { Button, IconButton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { ExerciseSession, WorkoutSession } from '@/models/session';
import { nextIncompleteExercise } from '@/services/workoutSessionService';
import { cn } from '@/utils/cn';
import { formatTarget } from '@/utils/format';

interface WorkoutChecklistProps {
  session: WorkoutSession;
  onStart: (exerciseSessionId: string) => void;
  onReview: (exercise: ExerciseSession) => void;
  onFinish: () => void;
  onDiscard: () => void;
}

function statusOf(exercise: ExerciseSession): 'done' | 'skipped' | 'open' {
  if (exercise.status === 'completed') return 'done';
  if (exercise.status === 'skipped') return 'skipped';
  return 'open';
}

/**
 * The workout at a glance: what is done, what is left, and one obvious next
 * exercise. The planned order is the suggestion, never a restriction — any
 * outstanding exercise can be started directly.
 */
export function WorkoutChecklist({
  session,
  onStart,
  onReview,
  onFinish,
  onDiscard,
}: WorkoutChecklistProps) {
  const { t } = useTranslation();

  const ordered = [...session.exercises].sort((a, b) => a.order - b.order);
  const done = ordered.filter((exercise) => statusOf(exercise) !== 'open').length;
  const next = nextIncompleteExercise(session);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="text-muted mb-3 text-sm font-semibold">
          <span dir="ltr" className="inline-block tabular-nums">
            {t('workout.exercisesDone', { done, total: ordered.length })}
          </span>
        </p>

        <ul className="flex flex-col gap-2">
          {ordered.map((exercise) => {
            const state = statusOf(exercise);
            const isNext = next?.id === exercise.id;

            return (
              <li
                key={exercise.id}
                className={cn(
                  'bg-surface border-line flex items-center gap-1 rounded-2xl border',
                  isNext && 'border-primary/50',
                  state === 'skipped' && 'opacity-50',
                )}
              >
                <button
                  type="button"
                  onClick={() => (state === 'open' ? onStart(exercise.id) : onReview(exercise))}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3.5 text-start"
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full',
                      state === 'done' ? 'bg-primary text-primary-fg' : 'text-muted',
                    )}
                  >
                    {state === 'done' ? <Check size={17} strokeWidth={3} /> : <Circle size={19} />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate font-semibold',
                        state === 'done' && 'text-muted line-through',
                      )}
                    >
                      {exercise.exerciseName}
                    </span>
                    <span dir="ltr" className="text-muted block text-xs tabular-nums">
                      {formatTarget(
                        exercise.sets.length,
                        exercise.planned.reps,
                        exercise.planned.durationSeconds,
                        t,
                      )}
                    </span>
                  </span>

                  {state === 'open' ? (
                    <Play size={18} className="text-primary shrink-0" />
                  ) : null}
                </button>

                <IconButton
                  size="sm"
                  className="me-1.5"
                  label={t('workout.reviewExercise')}
                  icon={<MoreHorizontal size={18} />}
                  onClick={() => onReview(exercise)}
                />
              </li>
            );
          })}
        </ul>

        <Button
          variant="ghost"
          fullWidth
          className="mt-4"
          icon={<Trash2 size={16} />}
          onClick={onDiscard}
        >
          {t('workout.discard')}
        </Button>
      </div>

      <div className="safe-bottom border-line bg-bg shrink-0 border-t px-4 pt-3 pb-4">
        {next ? (
          <>
            <p className="text-muted mb-2 truncate text-sm">
              {t('workout.nextExercise', { name: next.exerciseName })}
            </p>
            <Button size="lg" fullWidth icon={<Play size={20} />} onClick={() => onStart(next.id)}>
              {t('common.start')}
            </Button>
            {/* Stopping early is normal; it must never mean discarding the work. */}
            <Button variant="ghost" fullWidth className="mt-1.5" onClick={onFinish}>
              {t('workout.finish')}
            </Button>
          </>
        ) : (
          <>
            <p className="text-primary mb-2 text-sm font-semibold">
              {t('workout.allExercisesDone')}
            </p>
            <Button size="lg" fullWidth icon={<Flag size={20} />} onClick={onFinish}>
              {t('workout.finish')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
