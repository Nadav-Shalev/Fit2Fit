import { useTranslation } from '@/i18n';
import { LANGUAGES, type Language } from '@/i18n/types';
import { useDataStore } from '@/store/useDataStore';
import { cn } from '@/utils/cn';

const SHORT_LABELS: Record<Language, string> = {
  he: 'HE',
  en: 'EN',
};

/**
 * Language switch. Writes to settings so the choice persists, and the provider
 * flips the document direction from there.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { language, t } = useTranslation();
  const updateSettings = useDataStore((state) => state.updateSettings);

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className={cn('bg-elevated border-line flex items-center rounded-lg border p-0.5', className)}
    >
      {LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === language}
          onClick={() => void updateSettings({ language: option })}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-bold transition-colors',
            option === language ? 'bg-primary text-primary-fg' : 'text-muted hover:text-fg',
          )}
        >
          {SHORT_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
