import { en, type TranslationKey } from './locales/en';
import { he } from './locales/he';
import type { Language, TranslationVars } from './types';

export const CATALOGS: Record<Language, Record<TranslationKey, string>> = { en, he };

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Resolves a key against a catalog and substitutes `{name}` placeholders.
 * Falls back to the key itself so a missing translation is visible rather than blank.
 */
export function translate(
  language: Language,
  key: TranslationKey,
  vars?: TranslationVars,
): string {
  const template = CATALOGS[language][key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(PLACEHOLDER, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
