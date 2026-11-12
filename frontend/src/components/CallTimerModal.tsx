'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  CheckCircle,
  Lock,
  Smartphone,
  Calendar,
  X,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface CallTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    firstName: string;
    lastName?: string;
    phone: string;
    status?: string;
  } | null;
  onSuccess: () => void;
}

interface SyncedCallState {
  callId: string | null;
  resolvedLeadId: string | null;
  callKey: string;
  status: 'COMPLETED' | 'MISSED' | 'BUSY' | 'FAILED' | 'NO_ANSWER';
  duration: number;
  detectedFrom: string;
}

const isInsideAndroidApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).ReactNativeWebView || (window as any).__GLOVA_ANDROID_APP__);
};

export default function CallTimerModal({ isOpen, onClose, lead, onSuccess }: CallTimerModalProps) {
  const [inAndroidApp, setInAndroidApp] = useState(false);
  const [phase, setPhase] = useState<'waiting' | 'feedback' | 'web_blocked'>('waiting');
  const [syncedCall, setSyncedCall] = useState<SyncedCallState | null>(null);

  // Post-call feedback fields (NEVER duration!)
  const [unansweredReason, setUnansweredReason] = useState<'MISSED' | 'BUSY' | 'FAILED'>('MISSED');
  const [notes, setNotes] = useState('');
  const [leadStatus, setLeadStatus] = useState('');
  const [revenue, setRevenue] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');
  const [saving, setSaving] = useState(false);

  const activeCallKeyRef = React.useRef<string>('');
  const processedCallKeyRef = React.useRef<string>('');

  const ensureAutoLoggedOnBackend = useCallback(
    async (detail: any): Promise<{ callId: string | null; leadId: string | null }> => {
      if (!lead) return { callId: null, leadId: null };
      if (detail.autoSaved && detail.callId) {
        return {
          callId: detail.callId as string,
          leadId: (detail.leadId || lead.id || null) as string | null,
        };
      }

      try {
        const res = await api.post('/calls/auto-log', {
          phone: detail.phone || lead.phone,
          leadId: (detail.leadId || lead.id) || undefined,
          status: detail.status,
          duration: detail.duration ?? 0,
          direction: 'OUTBOUND',
          callKey: detail.callKey,
          detectedFrom: detail.detectedFrom || 'ANDROID_CALL_LOG',
        });
        return {
          callId: (res.data?.data?.callId || res.data?.data?.id || null) as string | null,
          leadId: (res.data?.data?.leadId || lead.id || null) as string | null,
        };
      } catch (err) {
        console.error('Fallback auto-log error:', err);
        return { callId: null, leadId: lead.id || null };
      }
    },
    [lead]
  );

  // Reset & initiate Android dialer when modal opens
  useEffect(() => {
    if (!isOpen || !lead) return;

    const android = isInsideAndroidApp();
    setInAndroidApp(android);
    setSyncedCall(null);
    setUnansweredReason('MISSED');
    setNotes('');
    setLeadStatus('');
    setRevenue('');
    setCancelReason('');
    setNextFollowUpAt('');
    setSaving(false);

    if (!android) {
      setPhase('web_blocked');
      return;
    }

    setPhase('waiting');

    const callKey = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    activeCallKeyRef.current = callKey;
    processedCallKeyRef.current = '';
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'INITIATE_CALL',
          phone: lead.phone,
          leadId: lead.id || undefined,
          leadName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
          callKey,
          accessToken,
        })
      );
    }
  }, [isOpen, lead]);

  // Listen for OS-verified call result from Android wrapper
  useEffect(() => {
    if (!isOpen || !lead) return;

    const handleNativeCallSynced = async (e: any) => {
      const detail = e.detail || (e.data && typeof e.data === 'object' ? e.data : null);
      if (!detail || !detail.callKey) return;

      // Acknowledge delivery back to React Native so it stops re-sending
      if ((window as any).ReactNativeWebView && detail.callKey) {
        try {
          (window as any).ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'CALL_SYNC_ACK', callKey: detail.callKey })
          );
        } catch (_) {}
      }

      if (detail.callKey && activeCallKeyRef.current && detail.callKey !== activeCallKeyRef.current) {
        return;
      }
      if (detail.callKey && processedCallKeyRef.current === detail.callKey) {
        return;
      }
      if (detail.callKey) {
        processedCallKeyRef.current = detail.callKey;
      }

      if (detail.cancelled) {
        if (detail.permissionDenied) {
          toast.error('Please allow Phone & Call Log permissions to track calls automatically.');
        } else {
          toast.info('Call cancelled — nothing was logged.');
        }
        onClose();
        return;
      }

      const verifiedDuration = Math.max(0, parseInt(String(detail.duration ?? 0), 10) || 0);
      const verifiedStatus: SyncedCallState['status'] =
        verifiedDuration > 0
          ? 'COMPLETED'
          : detail.status === 'BUSY'
            ? 'BUSY'
            : detail.status === 'FAILED'
              ? 'FAILED'
              : 'MISSED';

      const saved = await ensureAutoLoggedOnBackend({
        ...detail,
        status: verifiedStatus,
        duration: verifiedDuration,
      });

      setSyncedCall({
        callId: saved.callId,
        resolvedLeadId: saved.leadId,
        callKey: detail.callKey || '',
        status: verifiedStatus,
        duration: verifiedDuration,
        detectedFrom: detail.detectedFrom || 'ANDROID_CALL_LOG',
      });

      if (verifiedDuration === 0) {
        setUnansweredReason(
          verifiedStatus === 'BUSY' ? 'BUSY' : verifiedStatus === 'FAILED' ? 'FAILED' : 'MISSED'
        );
      }

      setPhase('feedback');
      // Refresh parent lead/calls immediately because call is already auto-logged!
      onSuccess();
    };

    window.addEventListener('GLOVA_CALL_SYNCED', handleNativeCallSynced);
    return () => {
      window.removeEventListener('GLOVA_CALL_SYNCED', handleNativeCallSynced);
    };
  }, [isOpen, lead, ensureAutoLoggedOnBackend, onClose, onSuccess]);

  const handleCancelWaiting = () => {
    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      try {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'CANCEL_CALL_MONITOR' }));
      } catch (_) {}
    }
    onClose();
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !syncedCall) return;

    setSaving(true);
    try {
      const promises: Promise<any>[] = [];

      // 1. Save notes / unanswered reason tag (backend strictly blocks editing duration or faking COMPLETED)
      const isUnanswered = syncedCall.duration === 0;
      const reasonChanged = isUnanswered && unansweredReason !== syncedCall.status;
      if (syncedCall.callId && (notes.trim() || reasonChanged)) {
        promises.push(
          api.patch(`/calls/${syncedCall.callId}`, {
            ...(reasonChanged ? { status: unansweredReason } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          })
        );
      }

      const targetLeadId = syncedCall.resolvedLeadId || lead.id;

      // 2. Optionally update lead status
      if (leadStatus && targetLeadId) {
        promises.push(
          api.patch(`/leads/${targetLeadId}/status`, {
            status: leadStatus,
            revenueAmount: leadStatus === 'CONVERTED' && revenue ? Number(revenue) : undefined,
            cancelReason: leadStatus === 'CLOSED' && cancelReason ? cancelReason : undefined,
            notes: notes.trim() || undefined,
          })
        );
      }

      // 3. Optionally schedule next follow-up
      if (nextFollowUpAt && targetLeadId) {
        promises.push(
          api.post(`/leads/${targetLeadId}/follow-up`, {
            nextFollowUpAt: new Date(nextFollowUpAt).toISOString(),
            note: notes.trim() || 'Follow-up scheduled after call',
          })
        );
      }

      await Promise.all(promises);
      toast.success('Post-call notes & follow-up saved!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save follow-up notes.');
    } finally {
      setSaving(false);
    }
  };

  const formatDuration = (secs: number) => {
    if (!secs || secs <= 0) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-6 py-4 text-white flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-teal-100 text-[11px] font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Auto-Tracked Call
              </p>
              <h2 className="text-lg font-bold leading-tight">
                {lead.firstName} {lead.lastName || ''}
              </h2>
              <p className="text-teal-100 text-sm mt-0.5 font-mono">{lead.phone}</p>
            </div>
            <button
              onClick={phase === 'waiting' ? handleCancelWaiting : onClose}
              className="text-teal-200 hover:text-white transition-colors p-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto">
          {/* PHASE: Desktop Web Blocked */}
          {phase === 'web_blocked' && (
            <div className="text-center space-y-4 py-2">
              <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200">
                <Smartphone className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Use GlovaCRM Android App to Call</h3>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                  Manual call duration entry is disabled to keep call logs 100% genuine. Open this lead in the{' '}
                  <span className="font-semibold text-teal-700">GlovaCRM Android App</span> to dial and auto-record exact call duration.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-sm font-mono text-gray-800">
                {lead.phone}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          )}

          {/* PHASE: Waiting for Android dialer call to finish */}
          {phase === 'waiting' && inAndroidApp && (
            <div className="text-center space-y-5 py-2">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping opacity-60"></div>
                <div className="relative w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center border-2 border-teal-200">
                  <PhoneOutgoing className="w-8 h-8 text-teal-600" />
                </div>
              </div>
              <div>
                <p className="text-gray-900 font-bold text-base">Dialing via Phone App...</p>
                <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
                  Your phone dialer has opened. Complete the call — GlovaCRM is automatically tracking status and exact talk duration in the background.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-xl py-2.5 px-3 font-medium">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>OS Call Log auto-sync active</span>
              </div>
              <button
                type="button"
                onClick={handleCancelWaiting}
                className="w-full py-2.5 border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel Tracking
              </button>
            </div>
          )}

          {/* PHASE: Post-Call Verified Summary + Notes / Lead Update */}
          {phase === 'feedback' && syncedCall && (
            <form onSubmit={handleSaveFeedback} className="space-y-4">
              {/* Locked Call Verification Card */}
              <div
                className={`rounded-xl p-4 border ${
                  syncedCall.duration > 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {syncedCall.duration > 0 ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <PhoneMissed className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`text-xs font-bold uppercase tracking-wider ${
                          syncedCall.duration > 0 ? 'text-emerald-800' : 'text-red-800'
                        }`}
                      >
                        {syncedCall.duration > 0 ? 'Call Completed' : 'Not Answered'}
                      </p>
                      <p className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                        <Lock className="w-3 h-3" /> Verified by Android Call Log
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xl font-mono font-extrabold flex items-center gap-1 ${
                        syncedCall.duration > 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      {formatDuration(syncedCall.duration)}
                    </div>
                    <p className="text-[10px] text-gray-500">Locked · Saved</p>
                  </div>
                </div>
              </div>

              {/* For 0s unanswered calls only: allow tagging Missed vs Busy vs Failed (NEVER Completed) */}
              {syncedCall.duration === 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Unanswered Reason (0s Locked)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'MISSED' as const, label: 'No Answer' },
                      { value: 'BUSY' as const, label: 'Line Busy' },
                      { value: 'FAILED' as const, label: 'Switched Off' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setUnansweredReason(opt.value)}
                        className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          unansweredReason === opt.value
                            ? 'bg-red-600 text-white border-red-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Call Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Summary of customer conversation..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                />
              </div>

              {/* Lead Status Update */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Update Lead Status (Optional)
                </label>
                <select
                  value={leadStatus}
                  onChange={(e) => setLeadStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="">-- Keep Current ({lead.status || 'Active'}) --</option>
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                  <option value="CONVERTED">Converted / Won</option>
                  <option value="CLOSED">Closed / Lost</option>
                </select>
              </div>

              {leadStatus === 'CONVERTED' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Revenue Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              )}

              {leadStatus === 'CLOSED' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Closure Reason
                  </label>
                  <input
                    type="text"
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for closing lead..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              )}

              {/* Next Follow-up */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" /> Next Follow-up (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={nextFollowUpAt}
                  onChange={(e) => setNextFollowUpAt(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Done
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
