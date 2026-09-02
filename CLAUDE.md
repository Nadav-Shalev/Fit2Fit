# Fit2Fit — working notes

Personal strength and running tracker. React 19 + TypeScript (strict) + Vite + Tailwind v4,
deployed to GitHub Pages. No backend.

## Commands

```bash
npm run dev        # dev server
npm run lint       # ESLint, must stay clean
npm run typecheck  # tsc --noEmit
npm run test       # Vitest
npm run build      # tsc -b && vite build
npm run icons      # regenerate PWA icons
```

## Conventions

- **Code and comments are English only.** All user-facing text goes through the i18n catalogs in
  `src/i18n/locales/`. `en.ts` is the source of truth for keys; `he.ts` is typed against it, so a
  missing translation is a compile error.
- **Layering is one-directional**: `pages`/`features`/`components` → `services`/`utils`/`models` →
  `repositories`. Nothing below the UI layer imports React.
- **No calculations in components.** Anything numeric belongs in `src/utils/analytics/` as a pure,
  tested function.
- **Templates are never mutated by history.** `WorkoutSession` snapshots exercise names and targets;
  editing a `WorkoutProgram` must never change what a past workout says.
- **Storage access goes through `WorkoutRepository`** (`src/repositories/types.ts`). Every method is
  async so the backend can be swapped without touching callers.
- **Timers derive from timestamps**, never from an accumulating counter, so backgrounded tabs and
  refreshes stay accurate.
- Use Tailwind **logical properties** (`ps`/`pe`/`ms`/`me`/`start`/`end`) so RTL and LTR both work.

## Things that are easy to get wrong

- `toCalendarDate` uses local time on purpose — `toISOString()` would move a late-evening workout to
  the next day.
- Recharts is rendered inside `.ltr-chart`; a time axis must read left-to-right in both languages.
- The sidebar and bottom navigation are both in the DOM and hidden by CSS, so tests must expect two
  matches for a nav link.
- `vite.config.ts` derives `base` from `GITHUB_REPOSITORY`; do not hardcode a repository name.
