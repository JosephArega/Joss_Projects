import AsyncStorage from '@react-native-async-storage/async-storage';
import { Report, Tip } from '../types';

const REPORTS_KEY = 'guzo.cache.reports.v1';
const TIPS_KEY = 'guzo.cache.tips.v1';

export async function cacheReports(reports: Report[]): Promise<void> {
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(reports)).catch(() => {});
}

export async function loadCachedReports(): Promise<Report[] | null> {
  try {
    const raw = await AsyncStorage.getItem(REPORTS_KEY);
    return raw ? (JSON.parse(raw) as Report[]) : null;
  } catch {
    return null;
  }
}

export async function cacheTips(tips: Tip[]): Promise<void> {
  await AsyncStorage.setItem(TIPS_KEY, JSON.stringify(tips)).catch(() => {});
}

export async function loadCachedTips(): Promise<Tip[] | null> {
  try {
    const raw = await AsyncStorage.getItem(TIPS_KEY);
    return raw ? (JSON.parse(raw) as Tip[]) : null;
  } catch {
    return null;
  }
}
