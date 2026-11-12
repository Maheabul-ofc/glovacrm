import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { CallDetector: NativeCallDetector } = NativeModules;

export interface NativeCallResult {
  status: 'COMPLETED' | 'MISSED' | 'BUSY' | 'FAILED' | 'CANCELLED';
  duration: number;
  phone: string;
  callKey: string;
  callLogType: number;
  detectedFrom: 'ANDROID_CALL_LOG' | 'TELEPHONY_NO_LOG' | 'NONE';
  found: boolean;
}

export interface CallPermissionStatus {
  phoneState: boolean;
  callLog: boolean;
  granted: boolean;
}

let eventEmitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter | null {
  if (Platform.OS !== 'android' || !NativeCallDetector) return null;
  if (!eventEmitter) {
    eventEmitter = new NativeEventEmitter(NativeCallDetector);
  }
  return eventEmitter;
}

export async function hasCallDetectorPermissions(): Promise<CallPermissionStatus> {
  if (Platform.OS !== 'android' || !NativeCallDetector?.hasRequiredPermissions) {
    return { phoneState: false, callLog: false, granted: false };
  }
  try {
    return await NativeCallDetector.hasRequiredPermissions();
  } catch (err) {
    console.warn('[CallDetector] Failed to check permissions:', err);
    return { phoneState: false, callLog: false, granted: false };
  }
}

export function monitorCall(phoneNumber: string, callKey: string): Promise<NativeCallResult> {
  return new Promise((resolve, reject) => {
    const emitter = getEmitter();
    if (!emitter || !NativeCallDetector) {
      reject(new Error('CallDetector native module is only available on Android'));
      return;
    }

    let settled = false;
    const subscription = emitter.addListener('GlovaCRM_CallStateChanged', (event: NativeCallResult) => {
      if (event.callKey && event.callKey !== callKey) {
        return;
      }
      if (settled) return;
      settled = true;
      subscription.remove();
      resolve({
        status: event.status,
        duration: typeof event.duration === 'number' ? Math.max(0, Math.round(event.duration)) : 0,
        phone: event.phone || phoneNumber,
        callKey: event.callKey || callKey,
        callLogType: event.callLogType ?? 0,
        detectedFrom: event.detectedFrom || 'NONE',
        found: Boolean(event.found),
      });
    });

    try {
      NativeCallDetector.startMonitoring(phoneNumber, callKey);
    } catch (err) {
      if (!settled) {
        settled = true;
        subscription.remove();
        reject(err);
      }
    }
  });
}

export async function checkAfterAppResume(): Promise<{
  monitoring: boolean;
  state: string;
  sawOffHook?: boolean;
}> {
  if (Platform.OS !== 'android' || !NativeCallDetector?.checkAfterAppResume) {
    return { monitoring: false, state: 'UNAVAILABLE' };
  }
  try {
    return await NativeCallDetector.checkAfterAppResume();
  } catch (err) {
    console.warn('[CallDetector] checkAfterAppResume failed:', err);
    return { monitoring: false, state: 'ERROR' };
  }
}

export function stopCallMonitoring(): void {
  if (Platform.OS === 'android' && NativeCallDetector?.stopMonitoring) {
    try {
      NativeCallDetector.stopMonitoring();
    } catch (err) {
      console.warn('[CallDetector] stopMonitoring error:', err);
    }
  }
}

export async function logCallToBackend(params: {
  apiBaseUrl: string;
  accessToken: string | null;
  phone: string;
  leadId?: string;
  status: 'COMPLETED' | 'MISSED' | 'BUSY' | 'FAILED';
  duration: number;
  callKey: string;
  detectedFrom: string;
}): Promise<{ ok: boolean; callId: string | null; leadId: string | null }> {
  const { apiBaseUrl, accessToken, phone, leadId, status, duration, callKey, detectedFrom } = params;

  if (!accessToken) {
    return { ok: false, callId: null, leadId: leadId || null };
  }

  const safeDuration = status === 'COMPLETED' && duration > 0 ? Math.round(duration) : 0;
  const safeStatus = safeDuration > 0 ? 'COMPLETED' : status === 'COMPLETED' ? 'MISSED' : status;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${apiBaseUrl}/api/calls/auto-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        phone,
        leadId: leadId || undefined,
        status: safeStatus,
        duration: safeDuration,
        direction: 'OUTBOUND',
        callKey,
        detectedFrom,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, callId: null, leadId: leadId || null };
    }

    const json = await res.json();
    return {
      ok: true,
      callId: json?.data?.callId || json?.data?.id || null,
      leadId: json?.data?.leadId || leadId || null,
    };
  } catch (err) {
    console.warn('[CallDetector] Auto-log fetch failed:', err);
    return { ok: false, callId: null, leadId: leadId || null };
  } finally {
    clearTimeout(timer);
  }
}
