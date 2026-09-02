import { useCallback } from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { IconButton, ProgressRing } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useRestCountdown } from '@/hooks/useRestCountdown';
import { useRestFeedback } from '@/hooks/useRestFeedback';
import { useDataStore } from '@/store/useDataStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { cn } from '@/utils/cn';
import { formatClock } from '@/utils/format';

/**
 * Floating rest timer.
 *
 * It sits above the finish bar rather than in a dialog, so the set that was just
 * logged stays visible and the next one can be started without dismissing anything.
 */
export function RestTimerBar() {
  const { t } = useTranslation();
  const settings = useDataStore((state) => state.settings);
  const pauseRest = useWorkoutStore((state) => state.pauseRest);
  const resumeRest = useWorkoutStore((state) => state.resumeRest);
  const resetRest = useWorkoutStore((state) => state.resetRest);
  const stopRest = useWorkoutStore((state) => state.stopRest);

  const notify = useRestFeedback(settings.soundEnabled, settings.vibrationEnabled);
  const onComplete = useCallback(() => notify(), [notify]);
  const countdown = useRestCountdown(onComplete);

  if (!countdown.active) return null;

  const finished = countdown.remainingSeconds <= 0 && !countdown.paused;

  return (
    <div
      className={cn(
        'bg-surface border-line animate-slide-up flex items-center gap-3 rounded-2xl border p-2.5 shadow-card',
        finished && 'border-primary',
      )}
    >
      <ProgressRing percent={countdown.percent} size={52} strokeWidth={5}>
        <span className="text-xs font-bold tabular-nums">
          {formatClock(countdown.remainingSeconds)}
        </span>
      </ProgressRing>

      <p className={cn('min-w-0 flex-1 text-sm font-semibold', finished && 'text-primary animate-pulse-ring')}>
        {finished ? t('workout.restOver') : t('workout.restTimer')}
      </p>

      <div className="flex shrink-0 items-center">
        <IconButton
          size="sm"
          label={countdown.paused ? t('workout.resume') : t('workout.pause')}
          icon={countdown.paused ? <Play size={17} /> : <Pause size={17} />}
          onClick={countdown.paused ? resumeRest : pauseRest}
        />
        <IconButton
          size="sm"
          label={t('workout.reset')}
          icon={<RotateCcw size={17} />}
          onClick={resetRest}
        />
        <IconButton
          size="sm"
          tone="primary"
          label={t('workout.skipRest')}
          icon={<SkipForward size={17} />}
          onClick={stopRest}
        />
      </div>
    </div>
  );
}
