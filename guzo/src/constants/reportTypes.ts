import { ReportType } from '../types';

export interface ReportTypeMeta {
  key: ReportType;
  emoji: string;
  color: string;
  labelKey: string;
  /** Free-text note is the content itself (driver tips). */
  noteRequired?: boolean;
}

export const REPORT_TYPES: ReportTypeMeta[] = [
  { key: 'traffic', emoji: '🚗', color: '#FFB300', labelKey: 'types.traffic' },
  { key: 'police', emoji: '👮', color: '#5C6BC0', labelKey: 'types.police' },
  { key: 'blocked', emoji: '🚧', color: '#FF7043', labelKey: 'types.blocked' },
  { key: 'pothole', emoji: '🕳️', color: '#A1887F', labelKey: 'types.pothole' },
  { key: 'flood', emoji: '🌊', color: '#26C6DA', labelKey: 'types.flood' },
  { key: 'accident', emoji: '💥', color: '#EF5350', labelKey: 'types.accident' },
  { key: 'fuel', emoji: '⛽', color: '#AB47BC', labelKey: 'types.fuel' },
  { key: 'tip', emoji: '💬', color: '#66BB6A', labelKey: 'types.tip', noteRequired: true },
];

export const typeMeta = (key: ReportType): ReportTypeMeta =>
  REPORT_TYPES.find((t) => t.key === key) ?? REPORT_TYPES[0];
