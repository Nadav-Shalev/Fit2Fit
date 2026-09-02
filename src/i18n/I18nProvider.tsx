import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { I18nContext, type I18nContextValue } from './context';
import { translate } from './translate';
import { DIRECTION_BY_LANGUAGE, LOCALE_BY_LANGUAGE, type Language } from './types';
import type { TranslationKey } from './locales/en';
import type { TranslationVars } from './types';

interface I18nProviderProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  children: ReactNode;
}

/**
 * Supplies the active language to the tree and keeps the document's `lang`/`dir`
 * attributes in sync, so RTL and LTR layouts both work without page reloads.
 */
export function I18nProvider({ language, onLanguageChange, children }: I18nProviderProps) {
  const direction = DIRECTION_BY_LANGUAGE[language];

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = direction;
  }, [language, direction]);

  const t = useCallback(
    (key: TranslationKey, vars?: TranslationVars) => translate(language, key, vars),
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      direction,
      locale: LOCALE_BY_LANGUAGE[language],
      t,
      setLanguage: onLanguageChange,
    }),
    [language, direction, t, onLanguageChange],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
