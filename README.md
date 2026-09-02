# Fit2Fit

A personal strength and running tracker, built to be used **during** a workout from a phone and
to work just as well on a desktop. No backend, no account — everything lives in your browser and
can be exported to a file at any time.

Fully bilingual (Hebrew / English) with complete RTL support, switchable at any time from the
header or from Settings.

---

## Features

| Area | What it does |
| --- | --- |
| **Home** | Next workout from your weekly plan, this week's progress ring, recent activity, and a resume banner for an unfinished session |
| **Programs** | Create, edit, delete and reorder programs; each exercise carries sets, rep ranges, RIR, rest, notes and a video link |
| **Workout mode** | One scrolling screen with a sticky timer, per-set entry, previous-workout results, rest timer with pause/reset/skip, per-exercise RPE and notes |
| **Running** | Interval programs with repeat blocks (`6 × 2 min run / 1 min walk`), run logging with automatic pace calculation |
| **Progress** | Per-exercise trends (reps, volume, best set, top weight), running charts (distance, pace, duration, weekly volume), weekly and monthly summaries with period-over-period comparison |
| **History** | Full history with filters by type, program and date range, plus a month calendar view |
| **Weekly plan** | Assign programs to weekdays; slots are reported as planned, done or missed |
| **Progressive overload** | Each exercise is compared against your last performance using volume, reps and sets — not weight alone |
| **Data** | JSON export and validated import (merge or replace), demo data, and full deletion |
| **PWA** | Installable to the home screen with offline support |

---

## Requirements

- **Node.js 20.19+ or 22+** (developed on 22)
- npm 10+

---

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The app is served at `http://localhost:5173`.

## Verification

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript, strict mode
npm run test       # Vitest — unit + end-to-end tests
npm run build      # Production build into dist/
npm run preview    # Serve the production build locally
```

`npm run icons` regenerates the PWA icons in `public/icons/` (only needed if you change the artwork
in `scripts/generate-icons.mjs`).

---

## Publishing to GitHub

1. Create a new **empty** repository on GitHub (no README, no .gitignore — this project has both).
2. Push the code:

   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```

### Enabling GitHub Pages

1. In the repository, open **Settings → Pages**.
2. Under **Source**, choose **GitHub Actions**.
3. That's it. Every push to `main` runs lint, typecheck, tests and build, then deploys.

Your app will be live at `https://<your-username>.github.io/<repo-name>/`.

### About the base path

Vite needs to know the sub-path the app is served from. `vite.config.ts` derives it automatically:

- Local development and local builds → `/`
- GitHub Actions → `/<repo-name>/`, read from the `GITHUB_REPOSITORY` environment variable
- Override with `VITE_BASE` when needed, e.g. `VITE_BASE=/ npm run build` for a custom domain

So **renaming the repository requires no code changes**. Routing uses `HashRouter`, which means
refreshing a deep link or opening one directly works on Pages without any server rewrite rules.

---

## Where your data is stored

Everything is kept in the browser's **localStorage**, under keys prefixed `fit2fit:v1:`:

| Key | Contents |
| --- | --- |
| `fit2fit:v1:exercises` | Exercise catalog |
| `fit2fit:v1:programs` | Workout programs |
| `fit2fit:v1:workoutSessions` | Completed workouts |
| `fit2fit:v1:runningPrograms` | Running programs |
| `fit2fit:v1:runningSessions` | Logged runs |
| `fit2fit:v1:schedule` | Weekly plan |
| `fit2fit:v1:settings` | Preferences |
| `fit2fit:v1:activeWorkout` | The workout currently in progress |

Consequences worth knowing:

- Data is **per browser and per device**. It does not sync.
- Clearing site data deletes it. Export a backup first.
- The active workout is written on every change, so a refresh, a locked screen or a closed tab
  never loses a session. Timers are computed from timestamps, so they stay accurate too.
- Anything unreadable is quarantined under a `fit2fit:corrupt:*` key and replaced with a safe
  default rather than crashing the app.

### Backup, export and import

**Settings → Data**:

- **Export data** downloads `fit2fit-backup-YYYY-MM-DD.json` containing everything.
- **Import data** validates the file completely before writing anything, shows you what it
  contains, and lets you choose:
  - **Merge** — keeps what is on this device and adds records it does not have (safe for combining
    two devices).
  - **Replace** — discards local data in favour of the file.

An invalid, truncated or foreign JSON file is rejected with a specific reason and changes nothing.

---

## Architecture

There is no backend — one was not needed. Instead the code is layered strictly inside `src/`, with
`services`, `utils` and `repositories` containing no React at all:

```
src/
├─ app/            Shell: router, layout, navigation, error boundary
├─ components/     Reusable presentational components (ui/, charts/)
├─ features/       Feature-scoped components: dashboard, programs, workout,
│                  running, history, progress, schedule, settings
├─ pages/          Thin route components that compose features
├─ models/         TypeScript interfaces — the domain vocabulary
├─ data/           Zod schemas and demo seed data
├─ repositories/   Persistence abstraction + localStorage implementation
├─ services/       Domain logic: sessions, backup, schedule resolution
├─ store/          Zustand stores (app data, active workout, toasts)
├─ hooks/          Reusable React hooks (timers, theme, media queries)
├─ utils/          Pure helpers, including all analytics
└─ i18n/           Translation catalogs and the language provider
```

### Templates vs. performed workouts

`WorkoutProgram` is a template; `WorkoutSession` is what actually happened. A session stores a
**snapshot** of every exercise name and target at the moment it ran, so editing or deleting a
program later can never rewrite your history.

### Analytics

All calculations live in `src/utils/analytics/` as pure functions — volume, total reps, session
duration, weekly/monthly summaries, adherence, average RPE, running pace, weekly distance and
exercise progression. Components only render their results.

---

## Moving to Supabase (or anything else) later

Every component talks to storage through the `WorkoutRepository` interface in
`src/repositories/types.ts`. All of its methods are **already asynchronous**, even though
localStorage is synchronous — that was deliberate, so switching backends requires no changes
upstream.

To migrate:

1. Implement the interface:

   ```ts
   // src/repositories/supabaseRepository.ts
   export class SupabaseRepository implements WorkoutRepository {
     async getPrograms(): Promise<WorkoutProgram[]> {
       const { data, error } = await supabase.from('programs').select('*');
       if (error) throw error;
       return data;
     }
     // ...the rest of the interface
   }
   ```

2. Return it from the factory in `src/repositories/index.ts`:

   ```ts
   export function createRepository(): WorkoutRepository {
     if (!instance) instance = new SupabaseRepository();
     return instance;
   }
   ```

That is the entire change. No component, page, hook or store is touched, because none of them
import a concrete implementation. The same approach applies to an `IndexedDBRepository` if you
outgrow localStorage but still want to stay local.

---

## Testing

```bash
npm run test
```

Covers the logic that would be expensive to get wrong:

- Total volume, reps, best set and set counting
- Running pace, including division by zero and distance-weighted averages
- Weekly and monthly summaries, week boundaries and period comparison
- Progressive-overload comparison for weighted, bodyweight and timed exercises
- Backup import validation — bad JSON, foreign files, unsupported versions, wrong types
- Repository round-trips and recovery from corrupt storage
- A full end-to-end pass through the real app: boot, start a workout, log a set, finish it, see it
  in history, and confirm an interrupted workout survives a reload

---

## Licence

MIT
