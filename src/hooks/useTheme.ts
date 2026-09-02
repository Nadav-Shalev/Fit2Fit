import { useEffect } from 'react';
import type { ThemeMode } from '@/models/settings';

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  const dark = mode === 'dark' || (mode === 'system' && prefersDark());
  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
}

/** Keeps the theme class on `<html>` in sync with the setting and the OS. */
export function useTheme(mode: ThemeMode): void {
  useEffect(() => {
    applyTheme(mode);
    if (mode !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => applyTheme('system');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [mode]);
}
