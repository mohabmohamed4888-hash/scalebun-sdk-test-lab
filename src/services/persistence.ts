import AsyncStorage from '@react-native-async-storage/async-storage';

/** Namespaced AsyncStorage helpers. Test Lab state only — never secrets. */
const NS = 'sdk_test_lab:';

export const KEYS = {
  profile: 'profile',
  customOverrides: 'custom_overrides',
  results: 'results',
  runId: 'run_id',
  lastInstallationId: 'last_installation_id',
  crashMarker: 'crash_marker',
  restartMarker: 'restart_marker',
  offlineWizard: 'offline_wizard',
  pushEnabled: 'push_enabled',
  otaLog: 'ota_log',
  bootCount: 'boot_count',
} as const;

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

export async function readJson<T>(key: StorageKey, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(NS + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export async function writeJson(key: StorageKey, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    // storage full / unavailable: the Test Lab keeps working in-memory
  }
}

export async function remove(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(NS + key);
  } catch {
    // ignore
  }
}
