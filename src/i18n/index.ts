import { useCallback } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import type { Language } from '../stores/settingsStore';
import en from './locales/en';
import zh from './locales/zh';

type TranslationDict = typeof en;

const dictionaries: Record<Language, TranslationDict> = {
  en,
  zh,
};

/**
 * Simple path-based translation accessor. Supports dot notation:
 *   t('sidebar.search') => 'Search APIs...'
 *   t('request.urlPlaceholder') => 'Enter request URL...'
 */
export function useI18n() {
  const language = useSettingsStore((s) => s.language);
  const dict = dictionaries[language];

  const t = useCallback(
    (path: string): string => {
      const keys = path.split('.');
      let value: unknown = dict;
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = (value as Record<string, unknown>)[key];
        } else {
          return path; // fallback: show the key path itself
        }
      }
      return typeof value === 'string' ? value : path;
    },
    [dict]
  );

  return { t, language };
}

export type { TranslationDict };
