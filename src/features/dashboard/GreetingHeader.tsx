import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/locales/en';
import type { PeriodSummary } from '@/utils/analytics/summary';
import { formatWeekday } from '@/utils/date';

interface GreetingHeaderProps {
  summary: PeriodSummary;
  userName: string | undefined;
  /** Injectable so the greeting is deterministic in tests. */
  now?: Date;
}

/** Morning until noon, afternoon until six, evening after that. */
function greetingKey(hours: number): TranslationKey {
  if (hours < 12) return 'dashboard.greetingMorning';
  if (hours < 18) return 'dashboard.greetingAfternoon';
  return 'dashboard.greetingEvening';
}

/**
 * The daily opening: who is training, what day it is, and how the week is
 * going so far. Everything is derived from the clock and the weekly summary —
 * nothing here is fixed copy.
 */
export function GreetingHeader({ summary, userName, now = new Date() }: GreetingHeaderProps) {
  const { t, language } = useTranslation();

  const greeting = t(greetingKey(now.getHours()));
  const name = userName?.trim();

  const hasPlan = summary.scheduledStrength + summary.scheduledRunning > 0;
  const progress = hasPlan
    ? t('dashboard.weekProgress', {
        strengthDone: summary.strengthWorkouts,
        strengthPlanned: summary.scheduledStrength,
        cardioDone: summary.runningWorkouts,
        cardioPlanned: summary.scheduledRunning,
      })
    : t('dashboard.weekProgressNoPlan', {
        strengthDone: summary.strengthWorkouts,
        cardioDone: summary.runningWorkouts,
      });

  return (
    <header className="mb-5">
      <h1 className="text-2xl font-extrabold">
        {name ? t('dashboard.greetingWithName', { greeting, name }) : greeting}
      </h1>
      <p className="text-muted mt-1">
        {t('dashboard.todayIs', { weekday: formatWeekday(now, language) })}
      </p>
      <p className="mt-2 text-sm">{progress}</p>
    </header>
  );
}
