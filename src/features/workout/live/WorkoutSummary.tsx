import { CheckCircle2, Flag, List } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/i18n';
import type { WorkoutSession } from '@/models/session';
import { calcSessionDurationSeconds, calcSessionWorkSeconds } from '@/utils/analytics/session';
import { countCompletedExercises, countCompletedSets } from '@/utils/analytics/volume';
import { formatDurationHuman } from '@/utils/format';
import { LiveScreen } from './LiveScreen';

interface WorkoutSummaryProps {
  session: WorkoutSession;
  onFinish: () => void;
  onBack: () => void;
}

/** One figure of the completion summary. */
function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border-line rounded-2xl border p-3 text-center">
      <p className="text-muted text-xs">{label}</p>
      <p dir="ltr" className="mt-1 font-bold tabular-nums">
        {value}
      </p>
    </div>
  );
}

/**
 * The workout is done. This screen is the acknowledgement; saving still goes
 * through the finish sheet, because the overall effort rating belongs there.
 */
export function WorkoutSummary({ session, onFinish, onBack }: WorkoutSummaryProps) {
  const { t } = useTranslation();

  const duration = calcSessionDurationSeconds(session);
  const workSeconds = calcSessionWorkSeconds(session);
  const restSeconds = session.totalRestSeconds ?? 0;

  const stats = [
    { label: t('workout.summaryDuration'), value: formatDurationHuman(duration, t) },
    {
      label: t('workout.summaryExercises'),
      value: `${countCompletedExercises(session)}/${session.exercises.length}`,
    },
    { label: t('workout.completedSets'), value: String(countCompletedSets(session)) },
  ];

  // Only meaningful for a workout that ran through the guided flow.
  if (workSeconds > 0) {
    stats.push({ label: t('workout.workTime'), value: formatDurationHuman(workSeconds, t) });
  }
  if (restSeconds > 0) {
    stats.push({ label: t('workout.restTime'), value: formatDurationHuman(restSeconds, t) });
  }

  return (
    <LiveScreen
      actions={
        <>
          <Button size="lg" fullWidth icon={<Flag size={20} />} onClick={onFinish}>
            {t('workout.finish')}
          </Button>
          <Button variant="ghost" fullWidth icon={<List size={16} />} onClick={onBack}>
            {t('workout.backToList')}
          </Button>
        </>
      }
    >
      <CheckCircle2 size={64} className="text-primary" />

      <h2 className="text-2xl font-extrabold text-balance">
        {t('workout.workoutComplete', { name: session.programName })}
      </h2>

      <div className="grid w-full max-w-sm grid-cols-2 gap-2.5">
        {stats.map((stat) => (
          <SummaryStat key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
    </LiveScreen>
  );
}
