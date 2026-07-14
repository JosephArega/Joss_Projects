import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { haversineKm } from './geo';
import { getDeviceKey } from './identity';
import { supabase } from './supabase';
import { typeMeta } from '../constants/reportTypes';
import { TFunc } from '../i18n';
import { LatLng, Report, Settings } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Guzo alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    }).catch(() => {});
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Foreground proximity alert: fired when a realtime report lands within the
 * user's alert radius. Background delivery is handled server-side by the
 * notify-nearby edge function (see supabase/functions).
 */
export async function maybeNotifyNearby(
  report: Report,
  coords: LatLng | null,
  settings: Settings,
  t: TFunc
): Promise<void> {
  if (!settings.notifyEnabled || !coords) return;
  const km = haversineKm(coords.latitude, coords.longitude, report.lat, report.lng);
  if (km > settings.notifyRadiusKm) return;
  const meta = typeMeta(report.type);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notify.nearbyTitle', { label: `${meta.emoji} ${t(meta.labelKey)}` }),
      body: t('notify.nearbyBody', {
        km: km.toFixed(1),
        place: report.neighborhood ?? '',
      }),
      data: { reportId: report.id },
    },
    trigger: null,
  }).catch(() => {});
}

/**
 * Best-effort registration of this device for server-side push
 * (requires a physical device and an EAS projectId in app.json).
 */
export async function registerDeviceForPush(
  coords: LatLng | null,
  settings: Settings
): Promise<void> {
  if (!supabase || !Device.isDevice) return;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = projectId
      ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
      : null;
    const deviceKey = await getDeviceKey();
    await supabase.rpc('register_device', {
      p_device_key: deviceKey,
      p_token: token,
      p_lat: coords?.latitude ?? null,
      p_lng: coords?.longitude ?? null,
      p_enabled: settings.notifyEnabled,
      p_radius_km: settings.notifyRadiusKm,
      p_language: settings.lang,
    });
  } catch {
    // push registration is optional; foreground alerts still work
  }
}
