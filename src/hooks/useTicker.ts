import { useEffect, useState } from 'react';

/**
 * Returns `Date.now()`, refreshed on an interval while `active`.
 *
 * Durations are always derived from timestamps rather than accumulated, so a
 * throttled background tab or a sleeping phone cannot make a timer drift. The
 * visibility listener pulls the clock forward the instant the app is reopened.
 */
export function useTicker(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;

    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);

    const resync = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', resync);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', resync);
    };
  }, [active, intervalMs]);

  return now;
}
