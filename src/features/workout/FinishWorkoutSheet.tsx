import { useState } from 'react';
import { Button, RpeScale, Sheet, TextAreaField } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { WorkoutSession } from '@/models/session';
import {
  calcSessionTotalReps,
  calcSessionVolume,
  countCompletedExercises,
  countCompletedSets,
  countPlannedSets,
} from '@/utils/analytics/volume';
import { calcSessionDurationSeconds } from '@/utils/analytics/session';
import { formatDurationHuman } from '@/utils/format';

interface FinishWorkoutSheetProps {
  open: boolean;
  session: WorkoutSession;
  onClose: () => void;
  onFinish: (rpe: number, notes: string) => void;
}

/**
 * End-of-workout summary.
 *
 * The overall effort rating is required here, which is the one moment it is
 * genuinely worth interrupting the user for.
 */
export function FinishWorkoutSheet({ open, session, onClose, onFinish }: FinishWorkoutSheetProps) {
  const { t } = useTranslation();
  const [rpe, setRpe] = useState<number | undefined>(session.rpe);
  const [notes, setNotes] = useState(session.notes ?? '');
  const [error, setError] = useState(false);

  const duration = calcSessionDurationSeconds(session);
  const volume = calcSessionVolume(session);

  const stats = [
    { label: t('workout.summaryDuration'), value: formatDurationHuman(duration, t) },
    {
      label: t('workout.summaryExercises'),
      value: `${countCompletedExercises(session)}/${session.exercises.length}`,
    },
    {
      label: t('workout.summarySets'),
      value: `${countCompletedSets(session)}/${countPlannedSets(session)}`,
    },
    {
      label: volume > 0 ? t('workout.summaryVolume') : t('workout.summaryReps'),
      value:
        volume > 0
          ? `${Math.round(volume).toLocaleString()} ${t('units.kg')}`
          : String(calcSessionTotalReps(session)),
    },
  ];

  const submit = () => {
    if (rpe === undefined) {
      setError(true);
      return;
    }
    onFinish(rpe, notes);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={t('workout.summaryTitle')}
      description={session.programName}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button fullWidth onClick={submit}>
            {t('workout.save')}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-elevated rounded-xl p-3">
            <p className="text-muted text-xs">{stat.label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-3 font-semibold">{t('rpe.question')}</p>
        <RpeScale
          value={rpe}
          clearable={false}
          onChange={(value) => {
            setRpe(value);
            setError(false);
          }}
        />
        {error ? <p className="text-danger mt-1 text-xs">{t('rpe.required')}</p> : null}
      </div>

      <div className="mt-4">
        <TextAreaField
          label={`${t('workout.overallNote')} (${t('common.optional')})`}
          placeholder={t('workout.overallNotePlaceholder')}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
    </Sheet>
  );
}
