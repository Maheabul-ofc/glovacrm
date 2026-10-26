import { Platform, PermissionsAndroid } from 'react-native';

// Safe require for react-native-call-log (in case running in Expo Go or dev client without native linking)
let CallLogs: any = null;
try {
  CallLogs = require('react-native-call-log');
} catch (e) {
  console.log('react-native-call-log not available in current environment');
}

export interface DetectedCallResult {
  found: boolean;
  duration: number; // in seconds
  status: 'COMPLETED' | 'MISSED' | 'FAILED';
  rawEntry?: any;
  timestamp?: number;
}

/**
 * Normalizes phone numbers for reliable comparison
 * e.g. "+91 98765-43210" -> "9876543210"
 * Returns last 10 digits if >= 10 digits
 */
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    return digitsOnly.slice(-10);
  }
  return digitsOnly;
};

/**
 * Request all required Android call tracking permissions
 */
export const requestCallPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
    ]);

    const readCallLogOk =
      granted[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] ===
      PermissionsAndroid.RESULTS.GRANTED;

    const readPhoneStateOk =
      granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] ===
      PermissionsAndroid.RESULTS.GRANTED;

    return readCallLogOk && readPhoneStateOk;
  } catch (err) {
    console.warn('Error requesting call permissions:', err);
    return false;
  }
};

/**
 * Check if Android call log permissions are already granted
 */
export const checkCallPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;

  try {
    const hasReadCallLog = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
    );
    const hasReadPhoneState = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
    );
    return hasReadCallLog && hasReadPhoneState;
  } catch (err) {
    console.warn('Error checking call permissions:', err);
    return false;
  }
};

/**
 * Reads the Android Call Log to find the call made to targetPhone after startTimeMs.
 * Returns the exact duration recorded by the Android OS!
 *
 * @param targetPhone Lead's phone number
 * @param startTimeMs Unix timestamp in ms when the call was triggered (with buffer)
 * @param maxAgeMs Max age in ms to look back (default 15 minutes)
 */
export const detectCallDuration = async (
  targetPhone: string,
  startTimeMs: number,
  maxAgeMs = 15 * 60 * 1000
): Promise<DetectedCallResult> => {
  if (Platform.OS !== 'android') {
    return { found: false, duration: 0, status: 'FAILED' };
  }

  const hasPerm = await checkCallPermissions();
  if (!hasPerm) {
    const granted = await requestCallPermissions();
    if (!granted) {
      return { found: false, duration: 0, status: 'FAILED' };
    }
  }

  if (!CallLogs || typeof CallLogs.load !== 'function') {
    console.log('CallLogs native module not present (likely Expo Go mock mode)');
    return { found: false, duration: 0, status: 'FAILED' };
  }

  try {
    // Query last 20 call log entries
    const logs: any[] = await CallLogs.load(20);
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return { found: false, duration: 0, status: 'FAILED' };
    }

    const normalizedTarget = normalizePhone(targetPhone);
    const minTimestamp = startTimeMs - 15000; // 15 second buffer prior to dial

    // Filter for matching outgoing call
    for (const entry of logs) {
      const entryPhone = normalizePhone(entry.phoneNumber || '');
      const entryTimestamp = parseInt(entry.timestamp || '0', 10);
      const isOutgoing =
        entry.type === 'OUTGOING' ||
        entry.type === '2' ||
        entry.rawType === 2;

      // Phone match (either ends with each other or exact)
      const phoneMatches =
        entryPhone.length >= 7 &&
        (entryPhone.endsWith(normalizedTarget) || normalizedTarget.endsWith(entryPhone));

      if (phoneMatches && isOutgoing && entryTimestamp >= minTimestamp) {
        const durationSec = parseInt(entry.duration || '0', 10);

        let status: 'COMPLETED' | 'MISSED' | 'FAILED' = 'COMPLETED';
        if (durationSec === 0) {
          status = 'MISSED';
        }

        return {
          found: true,
          duration: durationSec,
          status,
          rawEntry: entry,
          timestamp: entryTimestamp,
        };
      }
    }

    return { found: false, duration: 0, status: 'FAILED' };
  } catch (error) {
    console.error('Failed to read Android call log:', error);
    return { found: false, duration: 0, status: 'FAILED' };
  }
};
