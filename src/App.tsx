import { useCallback, useEffect, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppRoutes } from '@/app/AppRoutes';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { AppShell } from '@/app/layout/AppShell';
import { I18nProvider, useTranslation } from '@/i18n';
import type { Language } from '@/i18n/types';
import { useTheme } from '@/hooks/useTheme';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';

/** Shown while the stored database is being read back. */
function SplashScreen() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <Loader2 className="text-primary animate-spin" size={28} />
      <p className="text-muted text-sm">{t('common.loading')}</p>
    </div>
  );
}

function LoadFailure() {
  const { t } = useTranslation();
  const error = useDataStore((state) => state.error);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold">{t('errors.title')}</h1>
      <p className="text-muted max-w-sm text-sm">{error ?? t('errors.loadFailed')}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="bg-primary text-primary-fg h-11 rounded-xl px-5 font-semibold"
      >
        {t('errors.reload')}
      </button>
    </div>
  );
}

/** Renders the shell once data is ready, and reports any storage recovery. */
function AppContent() {
  const { t } = useTranslation();
  const status = useDataStore((state) => state.status);
  const recoveryNotices = useDataStore((state) => state.recoveryNotices);
  const pushToast = useToastStore((state) => state.push);
  const noticeShown = useRef(false);

  useEffect(() => {
    if (noticeShown.current || recoveryNotices.length === 0) return;
    noticeShown.current = true;
    pushToast(t('errors.storageRecovered'), 'error');
  }, [recoveryNotices, pushToast, t]);

  if (status === 'error') return <LoadFailure />;
  if (status !== 'ready') return <SplashScreen />;

  return (
    <AppShell>
      <AppRoutes />
    </AppShell>
  );
}

/**
 * Application root.
 *
 * Boots the database, restores any workout that was in progress, and provides
 * language and theme to the tree. HashRouter is used deliberately: it makes
 * deep links and refreshes work on GitHub Pages without a server rewrite rule.
 */
export function App() {
  const settings = useDataStore((state) => state.settings);
  const initialize = useDataStore((state) => state.initialize);
  const updateSettings = useDataStore((state) => state.updateSettings);
  const hydrateWorkout = useWorkoutStore((state) => state.hydrate);

  useEffect(() => {
    void (async () => {
      await initialize();
      await hydrateWorkout();
    })();
  }, [initialize, hydrateWorkout]);

  useTheme(settings.theme);

  const handleLanguageChange = useCallback(
    (language: Language) => {
      void updateSettings({ language });
    },
    [updateSettings],
  );

  return (
    <ErrorBoundary>
      <I18nProvider language={settings.language} onLanguageChange={handleLanguageChange}>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </I18nProvider>
    </ErrorBoundary>
  );
}
