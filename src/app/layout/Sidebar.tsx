import { NavLink } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { cn } from '@/utils/cn';
import { NAV_ITEMS } from '../navigation';

/** Desktop navigation. Replaces the bottom bar from the `lg` breakpoint up. */
export function Sidebar() {
  const { t } = useTranslation();

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
      isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:text-fg hover:bg-elevated',
    );

  return (
    <aside className="border-line bg-surface/60 fixed inset-y-0 start-0 z-40 hidden w-60 flex-col border-e p-4 lg:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="bg-primary text-primary-fg flex size-9 items-center justify-center rounded-xl text-sm font-black">
          F2
        </span>
        <div className="min-w-0">
          <p className="truncate font-extrabold">{t('app.name')}</p>
          <p className="text-muted truncate text-xs">{t('app.tagline')}</p>
        </div>
      </div>

      <nav className="flex-1">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.to === '/'} className={linkClasses}>
                <item.icon size={19} />
                {t(item.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <NavLink to="/settings" className={linkClasses}>
        <Settings size={19} />
        {t('nav.settings')}
      </NavLink>
    </aside>
  );
}
