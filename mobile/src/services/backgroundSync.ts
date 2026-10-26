import { Linking } from 'react-native';
import { getPendingMobileCalls, syncMobileCallResult } from './api';
import { detectCallDuration } from './callDetection';

export interface ActivePendingCall {
  callId: string;
  leadId: string;
  phone: string;
  leadName: string;
  dialedAt: number;
}

type SyncCallback = (call: ActivePendingCall) => void;

class BackgroundSyncService {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private onCallReceivedListener: SyncCallback | null = null;
  private activeCall: ActivePendingCall | null = null;

  start(intervalMs = 6000, onCallReceived?: SyncCallback) {
    if (this.isRunning) return;
    this.isRunning = true;
    if (onCallReceived) {
      this.onCallReceivedListener = onCallReceived;
    }

    this.timer = setInterval(() => {
      this.checkPendingCalls();
    }, intervalMs);

    // Initial check right away
    this.checkPendingCalls();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  getStatus(): boolean {
    return this.isRunning;
  }

  setActiveCall(call: ActivePendingCall | null) {
    this.activeCall = call;
  }

  getActiveCall(): ActivePendingCall | null {
    return this.activeCall;
  }

  private async checkPendingCalls() {
    // If a call is already active, don't interrupt
    if (this.activeCall) return;

    try {
      const calls = await getPendingMobileCalls();
      if (calls && calls.length > 0) {
        const nextCall = calls[0];
        const phone = nextCall.lead?.phone;
        if (!phone) return;

        const pending: ActivePendingCall = {
          callId: nextCall.id,
          leadId: nextCall.leadId,
          phone: phone,
          leadName: `${nextCall.lead?.firstName || ''} ${nextCall.lead?.lastName || ''}`.trim() || 'Lead',
          dialedAt: Date.now(),
        };

        this.activeCall = pending;

        if (this.onCallReceivedListener) {
          this.onCallReceivedListener(pending);
        }

        // Open native dialer
        Linking.openURL(`tel:${phone}`);
      }
    } catch (e) {
      // Backend polling error (offline or unauthenticated)
    }
  }

  /**
   * Called when telecaller returns to app after call completes
   */
  async resolveActiveCall(): Promise<{ status: string; duration: number } | null> {
    if (!this.activeCall) return null;

    const { callId, phone, dialedAt } = this.activeCall;
    const detected = await detectCallDuration(phone, dialedAt);

    const status = detected.found
      ? detected.status
      : 'COMPLETED';
    const duration = detected.found ? detected.duration : 0;

    try {
      await syncMobileCallResult({
        callId,
        status: status as any,
        duration,
      });
    } catch (err) {
      console.warn('Failed to sync mobile call result to backend:', err);
    }

    this.activeCall = null;
    return { status, duration };
  }
}

export const backgroundSync = new BackgroundSyncService();
