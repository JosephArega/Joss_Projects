import { useCallback } from 'react';
import en from './en.json';
import am from './am.json';
import { Lang } from '../types';
import { useSettings } from '../state/SettingsContext';

const dicts: Record<Lang, Record<string, string>> = {
  en: en as Record<string, string>,
  am: am as Record<string, string>,
};

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

export function translate(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>
): string {
  let s = dicts[lang][key] ?? dicts.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

export function useI18n() {
  const { settings, update } = useSettings();
  const t: TFunc = useCallback(
    (key, vars) => translate(settings.lang, key, vars),
    [settings.lang]
  );
  const toggleLang = () => update({ lang: settings.lang === 'en' ? 'am' : 'en' });
  return { t, lang: settings.lang, toggleLang };
}
