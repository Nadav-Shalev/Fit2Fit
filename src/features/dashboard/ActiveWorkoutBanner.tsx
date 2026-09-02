import { Link } from 'react-router-dom';
import { Timer } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useTicker } from '@/hooks/useTicker';
import type { WorkoutSession } from '@/models/session';
import { formatDuration } from '@/utils/format';
import { calcSessionProgress } from '@/utils/analytics/session';

/**
 * Surfaces an unfinished workout at the top of the dashboard.
 * This is what a user sees after refreshing the page mid-session.
 */
export function ActiveWorkoutBanner({ session }: { session: WorkoutSession }) {
  const { t } = useTranslation();
  const now = useTicker(true);
  const progress = calcSessionProgress(session);
  const elapsed = Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000));

  return (
    <Link
      to="/workout"
      className="bg-primary-soft border-primary/30 mb-5 flex items-center gap-4 rounded-2xl border p-4 transition-colors hover:brightness-110"
    >
      <span className="bg-primary text-primary-fg flex size-11 shrink-0 items-center justify-center rounded-xl">
        <Timer size={22} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-primary text-sm font-bold">{t('dashboard.resumeWorkout')}</p>
        <p className="text-muted truncate text-xs">
          {session.programName} ·{' '}
          {t('workout.exercisesProgress', {
            done: progress.completedExercises,
            total: progress.totalExercises,
          })}
        </p>
      </div>

      <span className="text-primary shrink-0 text-lg font-bold tabular-nums">
        {formatDuration(elapsed)}
      </span>
    </Link>
  );
}
