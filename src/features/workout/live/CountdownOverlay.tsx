import { useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { useTicker } from '@/hooks/useTicker';

interface CountdownOverlayProps {
  /** Absolute timestamp the countdown ends at. */
  endsAt: number;
  onComplete: () => void;
}

/**
 * The "3 · 2 · 1" before a set starts.
 *
 * Derived from the end timestamp rather than a counter, and tappable, because
 * waiting three seconds is not always what the user wants.
 */
export function CountdownOverlay({ endsAt, onComplete }: CountdownOverlayProps) {
  const { t } = useTranslation();
  const now = useTicker(true, 100);
  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));

  useEffect(() => {
    if (remaining <= 0) onComplete();
  }, [remaining, onComplete]);

  return (
    <button
      type="button"
      onClick={onComplete}
      aria-label={t('workout.tapToSkip')}
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6"
    >
      <p className="text-muted text-xl font-semibold">{t('workout.getReady')}</p>
      <p
        key={remaining}
        dir="ltr"
        className="text-primary animate-slide-up text-[8rem] leading-none font-extrabold tabular-nums"
      >
        {Math.max(1, remaining)}
      </p>
      <p className="text-muted text-sm">{t('workout.tapToSkip')}</p>
    </button>
  );
}
