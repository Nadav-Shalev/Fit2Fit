import { useEffect, useState } from 'react';

/** Subscribes to a CSS media query, for layout decisions JS has to make. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/** Matches Tailwind's `lg` breakpoint, where the sidebar replaces bottom navigation. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
