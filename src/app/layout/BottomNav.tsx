import { NavLink } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { cn } from '@/utils/cn';
import { NAV_ITEMS } from '../navigation';

/** Mobile navigation, fixed to the bottom and clear of the home indicator. */
export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="bg-surface/95 border-line safe-bottom fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur lg:hidden">
      <ul className="flex">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={22} strokeWidth={isActive ? 2.4 : 1.9} />
                  <span className="truncate px-0.5">{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
