import { TFunc } from '../i18n';

export function relativeTime(iso: string, t: TFunc): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t('time.now');
  if (mins < 60) return t('time.minutesAgo', { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('time.hoursAgo', { n: hrs });
  return t('time.daysAgo', { n: Math.floor(hrs / 24) });
}
