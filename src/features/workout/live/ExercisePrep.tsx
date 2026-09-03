import { List, Play } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { ExerciseSession } from '@/models/session';
import type { WeightUnit } from '@/models/settings';
import { ExerciseVideo } from '@/features/exercises/ExerciseVideo';
import { formatWeight } from '@/utils/format';
import { LiveScreen } from './LiveScreen';

interface ExercisePrepProps {
  exercise: ExerciseSession;
  /** 1-based position of the set about to be performed. */
  setIndex: number;
  weightUnit: WeightUnit;
  onStart: () => void;
  onBack: () => void;
}

/**
 * The moment before a set: what is about to happen, and one button to begin.
 * The video is available but deliberately secondary — it must not compete with
 * the start action.
 */
export function ExercisePrep({
  exercise,
  setIndex,
  weightUnit,
  onStart,
  onBack,
}: ExercisePrepProps) {
  const { t } = useTranslation();

  const set = exercise.sets[setIndex - 1];
  const targetReps = set?.targetReps;
  const targetHold = set?.targetDurationSeconds ?? exercise.planned.durationSeconds;
  const targetWeight = set?.targetWeightKg ?? exercise.planned.targetWeightKg;

  return (
    <LiveScreen
      actions={
        <>
          <Button size="lg" fullWidth icon={<Play size={22} />} onClick={onStart}>
            {t('workout.startSet')}
          </Button>
          <Button variant="ghost" fullWidth icon={<List size={16} />} onClick={onBack}>
            {t('workout.backToList')}
          </Button>
        </>
      }
    >
      <h2 className="text-3xl font-extrabold text-balance">{exercise.exerciseName}</h2>

      <p dir="ltr" className="text-primary text-xl font-bold tabular-nums">
        {t('workout.setOf', { index: setIndex, total: exercise.sets.length })}
      </p>

      <div className="text-muted flex flex-col gap-1 text-lg">
        {exercise.isTimed && targetHold !== undefined ? (
          <p dir="ltr" className="tabular-nums">
            {t('workout.targetHold', { count: targetHold })}
          </p>
        ) : targetReps !== undefined ? (
          <p dir="ltr" className="tabular-nums">
            {t('workout.targetReps', { count: targetReps })}
          </p>
        ) : null}

        {exercise.isWeighted && targetWeight !== undefined ? (
          <p dir="ltr" className="tabular-nums">
            {formatWeight(targetWeight, weightUnit, t)}
          </p>
        ) : null}

        <p dir="ltr" className="tabular-nums">
          {t('workout.restLabel', { seconds: exercise.planned.restSeconds })}
        </p>
      </div>

      <ExerciseVideo url={exercise.videoUrl} compact />
    </LiveScreen>
  );
}
