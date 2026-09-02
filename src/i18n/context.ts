import { createContext } from 'react';
import type { Language, TextDirection, Translator } from './types';

export interface I18nContextValue {
  language: Language;
  direction: TextDirection;
  /** BCP 47 tag for `Intl` formatters. */
  locale: string;
  t: Translator;
  setLanguage: (language: Language) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
