/**
 * GlovaCRM Auto Call Detector
 *
 * Native module wrapper that:
 * 1. Starts monitoring Android phone state when a call is initiated
 * 2. Automatically detects call status (COMPLETED / MISSED / FAILED)
 * 3. Measures exact call duration in seconds
 * 4. Reports result to backend — no manual input from telecaller
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { CallDetector: NativeCallDetector } = NativeModules;

const CALL_STATE_EVENT = 'GlovaCRM_CallStateChanged';

export interface CallResult {
  status: 'COMPLETED' | 'MISSED' | 'FAILED' | 'BUSY';
  duration: number; // seconds
  phone: string;
}

export interface CallLogPayload {
  phone: string;
  leadId?: string;
  status: string;
  duration: number;
  notes?: string;
}

let eventEmitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter | null {
  if (Platform.OS !== 'android') return null;
  if (!NativeCallDetector) return null;
  if (!eventEmitter) {
    eventEmitter = new NativeEventEmitter(NativeCallDetector);
  }
  return eventEmitter;
}

/**
 * Start monitoring for a call to the given phone number.
 * Returns a Promise that resolves when the call ends with the result.
 */
export function monitorCall(phoneNumber: string): Promise<CallResult> {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'android' || !NativeCallDetector) {
      reject(new Error('CallDetector only available on Android'));
      return;
    }

    const emitter = getEmitter();
    if (!emitter) {
      reject(new Error('Could not get event emitter'));
      return;
    }

    // Safety timeout: if no call state event in 5 minutes, resolve as MISSED
    const safetyTimer = setTimeout(() => {
      subscription.remove();
      NativeCallDetector.stopMonitoring();
      resolve({ status: 'MISSED', duration: 0, phone: phoneNumber });
    }, 5 * 60 * 1000);

    const subscription = emitter.addListener(CALL_STATE_EVENT, (result: CallResult) => {
      clearTimeout(safetyTimer);
      subscription.remove();
      resolve(result);
    });

    // Start native monitoring
    NativeCallDetector.startMonitoring(phoneNumber);
  });
}

/**
 * Stop monitoring (call cancelled before dialing).
 */
export function stopMonitoring(): void {
  if (Platform.OS === 'android' && NativeCallDetector) {
    NativeCallDetector.stopMonitoring();
  }
}

/**
 * Post the call result to GlovaCRM backend.
 * Finds the lead by phone number automatically.
 */
export async function logCallToBackend(
  backendUrl: string,
  accessToken: string,
  payload: CallLogPayload
): Promise<boolean> {
  try {
    const response = await fetch(`${backendUrl}/api/calls/auto-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        phone: payload.phone,
        leadId: payload.leadId,
        status: payload.status,
        duration: payload.duration,
        direction: 'OUTBOUND',
        provider: 'ANDROID_AUTO',
        notes: payload.notes || `Auto-logged: ${payload.status} call, ${payload.duration}s`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    return response.ok;
  } catch (err) {
    console.error('[CallDetector] Failed to log call:', err);
    return false;
  }
}
