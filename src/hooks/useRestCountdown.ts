import { useEffect, useRef } from 'react';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useTicker } from './useTicker';

export interface RestCountdown {
  active: boolean;
  paused: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  /** 0-100, for the progress ring. */
  percent: number;
}

/**
 * Derives the live rest countdown from the store's absolute end timestamp and
 * fires `onComplete` exactly once when it reaches zero.
 */
export function useRestCountdown(onComplete?: () => void): RestCountdown {
  const rest = useWorkoutStore((state) => state.rest);
  const now = useTicker(rest.active && rest.endsAt !== null, 250);
  const firedRef = useRef(false);

  const paused = rest.active && rest.endsAt === null;
  const remainingSeconds = rest.active
    ? rest.endsAt !== null
      ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000))
      : (rest.remainingSeconds ?? 0)
    : 0;

  useEffect(() => {
    if (!rest.active) {
      firedRef.current = false;
      return;
    }
    if (remainingSeconds <= 0 && !paused && !firedRef.current) {
      firedRef.current = true;
      onComplete?.();
    }
  }, [rest.active, remainingSeconds, paused, onComplete]);

  return {
    active: rest.active,
    paused,
    remainingSeconds,
    totalSeconds: rest.totalSeconds,
    percent:
      rest.totalSeconds > 0
        ? Math.min(100, Math.round(((rest.totalSeconds - remainingSeconds) / rest.totalSeconds) * 100))
        : 0,
  };
}
