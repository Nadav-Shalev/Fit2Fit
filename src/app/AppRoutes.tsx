import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { HistoryPage } from '@/pages/HistoryPage';
import { HomePage } from '@/pages/HomePage';
import { ProgramsPage } from '@/pages/ProgramsPage';
import { RunningPage } from '@/pages/RunningPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { WorkoutPage } from '@/pages/WorkoutPage';

// The charting library is by far the largest dependency and is only needed on
// the progress screen, so it is kept out of the bundle that loads at the gym.
const ProgressPage = lazy(() =>
  import('@/pages/ProgressPage').then((module) => ({ default: module.ProgressPage })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <Loader2 className="text-primary animate-spin" size={24} />
    </div>
  );
}

/** Route table. Unknown paths fall back to the dashboard. */
export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/workout" element={<WorkoutPage />} />
        <Route path="/running" element={<RunningPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
