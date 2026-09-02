import type { TranslationKey } from './locales/en';

export const LANGUAGES = ['he', 'en'] as const;

export type Language = (typeof LANGUAGES)[number];

export type TextDirection = 'rtl' | 'ltr';

/** Values interpolated into a translation string via `{name}` placeholders. */
export type TranslationVars = Record<string, string | number>;

/**
 * Translator function injected into pure helpers (formatters, services) so they
 * stay free of hardcoded UI copy while still producing localized output.
 */
export type Translator = (key: TranslationKey, vars?: TranslationVars) => string;

export const DIRECTION_BY_LANGUAGE: Record<Language, TextDirection> = {
  he: 'rtl',
  en: 'ltr',
};

export const LOCALE_BY_LANGUAGE: Record<Language, string> = {
  he: 'he-IL',
  en: 'en-US',
};

/** Each language labelled in its own script, for the language switcher. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  he: 'עברית',
  en: 'English',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
