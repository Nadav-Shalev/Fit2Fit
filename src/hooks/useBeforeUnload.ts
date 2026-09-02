import { useEffect } from 'react';

/**
 * Warns before the tab is closed or reloaded while `enabled`.
 *
 * The active workout itself is already persisted, so this is a courtesy prompt
 * rather than the thing that protects the data.
 */
export function useBeforeUnload(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Browsers ignore custom text but still require returnValue to be set.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);
}
