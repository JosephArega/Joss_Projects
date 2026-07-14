import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEY = 'guzo.deviceKey.v1';
let cached: string | null = null;

/**
 * Anonymous per-install identity: a random UUID generated on first launch.
 * Used as the reporter/voter key so no account is ever required.
 */
export async function getDeviceKey(): Promise<string> {
  if (cached) return cached;
  let key = await AsyncStorage.getItem(KEY);
  if (!key) {
    key = Crypto.randomUUID();
    await AsyncStorage.setItem(KEY, key);
  }
  cached = key;
  return key;
}
