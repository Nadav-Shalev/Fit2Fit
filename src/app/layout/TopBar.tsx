import { Link } from 'react-router-dom';
import { Settings, Timer } from 'lucide-react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from '@/i18n';
import { useTicker } from '@/hooks/useTicker';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { formatDuration } from '@/utils/format';

/**
 * Slim top bar. On mobile it carries the brand; on every size it surfaces the
 * live workout timer so an active session is never more than one tap away.
 */
export function TopBar() {
  const { t } = useTranslation();
  const session = useWorkoutStore((state) => state.session);
  const now = useTicker(session !== null);

  const elapsed = session
    ? Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000))
    : 0;

  return (
    <header className="bg-bg/90 safe-top sticky top-0 z-30 backdrop-blur lg:bg-transparent">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 lg:hidden">
          <span className="bg-primary text-primary-fg flex size-8 items-center justify-center rounded-lg text-xs font-black">
            F2
          </span>
          <span className="font-extrabold">{t('app.name')}</span>
        </Link>
        <div className="hidden lg:block" />

        <div className="flex items-center gap-2">
          {session ? (
            <Link
              to="/workout"
              className="bg-primary-soft text-primary flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums"
            >
              <Timer size={15} />
              {formatDuration(elapsed)}
            </Link>
          ) : null}

          <LanguageToggle />

          <Link
            to="/settings"
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
            className="text-muted hover:text-fg hover:bg-elevated flex size-9 items-center justify-center rounded-xl transition-colors lg:hidden"
          >
            <Settings size={19} />
          </Link>
        </div>
      </div>
    </header>
  );
}
