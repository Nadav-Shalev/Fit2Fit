import { useCallback } from 'react';
import { Pause, Play, Plus, SkipForward } from 'lucide-react';
import { Button, ProgressRing } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useRestCountdown } from '@/hooks/useRestCountdown';
import { useRestFeedback } from '@/hooks/useRestFeedback';
import type { ExerciseSession } from '@/models/session';
import { useDataStore } from '@/store/useDataStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { cn } from '@/utils/cn';
import { formatClock } from '@/utils/format';
import { LiveScreen } from './LiveScreen';

interface RestScreenProps {
  exercise: ExerciseSession;
  /** 1-based index of the set that just finished. */
  completedSetIndex: number;
  /** 1-based index of the set coming up. */
  nextSetIndex: number;
  onNext: () => void;
}

const EXTEND_SECONDS = 30;

/**
 * Rest between sets.
 *
 * It starts on its own the moment a set is logged, so the common path costs no
 * taps at all. When it runs out the screen says so and offers the next set —
 * it never forces the transition, because rest is the user's call.
 */
export function RestScreen({
  exercise,
  completedSetIndex,
  nextSetIndex,
  onNext,
}: RestScreenProps) {
  const { t } = useTranslation();
  const settings = useDataStore((state) => state.settings);
  const pauseRest = useWorkoutStore((state) => state.pauseRest);
  const resumeRest = useWorkoutStore((state) => state.resumeRest);
  const extendRest = useWorkoutStore((state) => state.extendRest);

  const notify = useRestFeedback(settings.soundEnabled, settings.vibrationEnabled);
  const onComplete = useCallback(() => notify(), [notify]);
  const countdown = useRestCountdown(onComplete);

  const over = countdown.remainingSeconds <= 0 && !countdown.paused;

  return (
    <LiveScreen
      actions={
        <>
          <Button size="lg" fullWidth icon={<SkipForward size={20} />} onClick={onNext}>
            {over ? t('workout.startSet') : t('workout.skipRest')}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              icon={countdown.paused ? <Play size={18} /> : <Pause size={18} />}
              onClick={countdown.paused ? resumeRest : pauseRest}
            >
              {countdown.paused ? t('workout.resume') : t('workout.pause')}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              icon={<Plus size={18} />}
              onClick={() => extendRest(EXTEND_SECONDS)}
            >
              {t('workout.addThirty')}
            </Button>
          </div>
        </>
      }
    >
      <p className="text-muted text-xl font-semibold">{t('workout.rest')}</p>

      <ProgressRing percent={countdown.percent} size={220} strokeWidth={12}>
        <span
          dir="ltr"
          className={cn(
            'text-6xl font-extrabold tabular-nums',
            over ? 'text-primary animate-pulse-ring' : countdown.paused && 'text-muted',
          )}
        >
          {formatClock(countdown.remainingSeconds)}
        </span>
      </ProgressRing>

      {over ? (
        <p className="text-primary text-lg font-bold">{t('workout.nextSetReady')}</p>
      ) : countdown.paused ? (
        <p className="text-warning font-semibold">{t('workout.paused')}</p>
      ) : null}

      <div className="text-muted flex flex-col gap-1">
        <p dir="ltr" className="tabular-nums">
          {t('workout.setCompleted', { index: completedSetIndex })}
        </p>
        <p dir="ltr" className="font-semibold tabular-nums">
          {t('workout.nextSet', { index: nextSetIndex, total: exercise.sets.length })}
        </p>
      </div>
    </LiveScreen>
  );
}
