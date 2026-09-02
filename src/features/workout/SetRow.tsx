import { Check } from 'lucide-react';
import { NumberStepper } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { WeightUnit } from '@/models/settings';
import type { ExerciseSession, SetSession } from '@/models/session';
import type { SetPatch } from '@/services/workoutSessionService';
import { cn } from '@/utils/cn';
import { displayToKg, kgToDisplay } from '@/utils/format';

interface SetRowProps {
  set: SetSession;
  exercise: ExerciseSession;
  weightUnit: WeightUnit;
  onChange: (patch: SetPatch) => void;
  onToggle: () => void;
}

/**
 * One set: what was lifted, how many reps, and whether it is done.
 *
 * The tick is the primary action and stays a large target, because it is what
 * gets pressed dozens of times per session.
 */
export function SetRow({ set, exercise, weightUnit, onChange, onToggle }: SetRowProps) {
  const { t } = useTranslation();

  const target = exercise.isTimed
    ? set.targetDurationSeconds
    : set.targetReps;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl px-2 py-2 transition-colors',
        set.completed ? 'bg-primary-soft' : 'bg-elevated/60',
      )}
    >
      <div className="w-11 shrink-0">
        <p className="text-muted text-[11px] leading-tight font-semibold">
          {t('workout.set')} {set.index}
        </p>
        {target !== undefined ? (
          <p className="text-muted/70 text-[11px] leading-tight tabular-nums">{target}</p>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 gap-2">
        {exercise.isWeighted ? (
          <NumberStepper
            size="sm"
            className="flex-1"
            label={t('workout.weight')}
            step={2.5}
            max={999}
            placeholder={t(`units.${weightUnit}`)}
            value={
              set.actualWeightKg === undefined
                ? undefined
                : Math.round(kgToDisplay(set.actualWeightKg, weightUnit) * 10) / 10
            }
            onChange={(value) =>
              onChange({
                actualWeightKg: value === undefined ? undefined : displayToKg(value, weightUnit),
              })
            }
          />
        ) : null}

        {exercise.isTimed ? (
          <NumberStepper
            size="sm"
            className="flex-1"
            label={t('workout.seconds')}
            step={5}
            max={3600}
            placeholder={t('units.sec')}
            value={set.actualDurationSeconds}
            onChange={(value) => onChange({ actualDurationSeconds: value })}
          />
        ) : (
          <NumberStepper
            size="sm"
            className="flex-1"
            label={t('workout.reps')}
            max={500}
            placeholder={String(set.targetReps ?? '')}
            value={set.actualReps}
            onChange={(value) => onChange({ actualReps: value })}
          />
        )}
      </div>

      <button
        type="button"
        aria-pressed={set.completed}
        aria-label={`${t('workout.set')} ${set.index}`}
        onClick={onToggle}
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl border-2 transition-colors',
          set.completed
            ? 'bg-primary border-primary text-primary-fg'
            : 'border-line text-muted hover:border-primary hover:text-primary',
        )}
      >
        <Check size={20} strokeWidth={3} />
      </button>
    </div>
  );
}
