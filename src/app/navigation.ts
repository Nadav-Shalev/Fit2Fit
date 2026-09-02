import {
  CalendarDays,
  ClipboardList,
  Dumbbell,
  Footprints,
  Home,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { TranslationKey } from '@/i18n/locales/en';

export interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}

/** Primary destinations, in the order they appear in both navigations. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/programs', labelKey: 'nav.programs', icon: ClipboardList },
  { to: '/workout', labelKey: 'nav.workout', icon: Dumbbell },
  { to: '/running', labelKey: 'nav.running', icon: Footprints },
  { to: '/progress', labelKey: 'nav.progress', icon: TrendingUp },
  { to: '/history', labelKey: 'nav.history', icon: CalendarDays },
];
