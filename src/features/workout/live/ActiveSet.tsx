import { useState } from 'react';
import { Check, Pause, Play } from 'lucide-react';
import { Button, NumberStepper } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useTicker } from '@/hooks/useTicker';
import type { ExerciseSession } from '@/models/session';
import type { WeightUnit } from '@/models/settings';
import type { SetPatch } from '@/services/workoutSessionService';
import { elapsedSeconds } from '@/utils/analytics/session';
import { displayToKg, formatDuration, kgToDisplay } from '@/utils/format';
import { LiveClock, LiveScreen } from './LiveScreen';

interface ActiveSetProps {
  exercise: ExerciseSession;
  setIndex: number;
  weightUnit: WeightUnit;
  startedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  onPause: () => void;
  onResume: () => void;
  onFinish: (patch: SetPatch) => void;
}

/**
 * A set in progress.
 *
 * The stopwatch counts up from an absolute origin so it stays honest across a
 * locked screen. Everything else on the screen is the minimum needed to know
 * what to do and to record what was actually done.
 */
export function ActiveSet({
  exercise,
  setIndex,
  weightUnit,
  startedAt,
  pausedAt,
  pausedMs,
  onPause,
  onResume,
  onFinish,
}: ActiveSetProps) {
  const { t } = useTranslation();
  const paused = pausedAt !== null;
  const now = useTicker(!paused, 500);
  const elapsed = elapsedSeconds(startedAt, pausedMs, pausedAt, now);

  const set = exercise.sets[setIndex - 1];

  // Pre-filled with the target: hitting the plan exactly stays a single tap.
  const [reps, setReps] = useState<number | undefined>(set?.actualReps ?? set?.targetReps);
  const [hold, setHold] = useState<number | undefined>(
    set?.actualDurationSeconds ?? set?.targetDurationSeconds,
  );
  const [weight, setWeight] = useState<number | undefined>(() => {
    const kg = set?.actualWeightKg ?? set?.targetWeightKg ?? exercise.planned.targetWeightKg;
    return kg === undefined ? undefined : Math.round(kgToDisplay(kg, weightUnit) * 10) / 10;
  });

  const submit = () => {
    const patch: SetPatch = {};
    if (exercise.isTimed) {
      if (hold !== undefined) patch.actualDurationSeconds = hold;
    } else if (reps !== undefined) {
      patch.actualReps = reps;
    }
    if (exercise.isWeighted && weight !== undefined) {
      patch.actualWeightKg = displayToKg(weight, weightUnit);
    }
    onFinish(patch);
  };

  return (
    <LiveScreen
      actions={
        <>
          <Button size="lg" fullWidth icon={<Check size={22} />} onClick={submit}>
            {t('workout.setDone')}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            icon={paused ? <Play size={18} /> : <Pause size={18} />}
            onClick={paused ? onResume : onPause}
          >
            {paused ? t('workout.resume') : t('workout.pause')}
          </Button>
        </>
      }
    >
      <h2 className="truncate text-xl font-bold">{exercise.exerciseName}</h2>
      <p dir="ltr" className="text-muted font-semibold tabular-nums">
        {t('workout.setOf', { index: setIndex, total: exercise.sets.length })}
      </p>

      <LiveClock value={formatDuration(elapsed)} tone={paused ? 'muted' : 'primary'} />
      {paused ? <p className="text-warning font-semibold">{t('workout.paused')}</p> : null}

      {exercise.isTimed ? (
        set?.targetDurationSeconds !== undefined ? (
          <p dir="ltr" className="text-lg font-semibold tabular-nums">
            {t('workout.targetHold', { count: set.targetDurationSeconds })}
          </p>
        ) : null
      ) : set?.targetReps !== undefined ? (
        <p dir="ltr" className="text-lg font-semibold tabular-nums">
          {t('workout.targetReps', { count: set.targetReps })}
        </p>
      ) : null}

      <div className="flex w-full max-w-xs flex-col gap-3">
        {exercise.isTimed ? (
          <NumberStepper
            value={hold}
            onChange={setHold}
            label={t('workout.seconds')}
            step={5}
            max={3600}
          />
        ) : (
          <NumberStepper value={reps} onChange={setReps} label={t('workout.reps')} max={500} />
        )}

        {exercise.isWeighted ? (
          <NumberStepper
            value={weight}
            onChange={setWeight}
            label={t('workout.weight')}
            step={2.5}
            max={999}
          />
        ) : null}
      </div>
    </LiveScreen>
  );
}
