'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, PhoneOutgoing, PhoneMissed, Clock, CheckCircle, X } from 'lucide-react';
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
  } | null;
  onSuccess: () => void;
}

export default function CallTimerModal({ isOpen, onClose, lead, onSuccess }: CallTimerModalProps) {
  const [phase, setPhase] = useState<'dialing' | 'active' | 'outcome'>('dialing');
  const [elapsed, setElapsed] = useState(0); // seconds
  const [outcome, setOutcome] = useState('COMPLETED');
  const [notes, setNotes] = useState('');
  const [manualDuration, setManualDuration] = useState({ mins: '', secs: '' });
  const [saving, setSaving] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state every time modal opens
  useEffect(() => {
    if (isOpen && lead) {
      setPhase('dialing');
      setElapsed(0);
      setOutcome('COMPLETED');
      setNotes('');
      setManualDuration({ mins: '', secs: '' });
      setCallId(null);

      // Trigger tel: deep-link or React Native WebView bridge
      if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({
          type: 'INITIATE_CALL',
          phone: lead.phone,
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        }));
      } else if (lead.phone) {
        window.location.href = `tel:${lead.phone}`;
      }

      // Create a pending call record in DB
      api.post('/calls/log', {
        leadId: lead.id,
        status: 'INITIATED',
        duration: 0,
      }).then(res => {
        setCallId(res.data?.data?.id || null);
      }).catch(() => {});
    } else {
      stopTimer();
    }
  }, [isOpen, lead]);

  // Listen for auto-detected call duration from Android companion app wrapper
  useEffect(() => {
    const handleNativeCallSynced = (e: any) => {
      const detail = e.detail || (e.data && typeof e.data === 'object' ? e.data : null);
      if (detail && detail.duration !== undefined) {
        stopTimer();
        setPhase('outcome');
        setManualDuration({
          mins: String(Math.floor(detail.duration / 60)),
          secs: String(detail.duration % 60),
        });
        if (detail.status) setOutcome(detail.status);
        toast.success(`Android Call Log auto-detected: ${Math.floor(detail.duration / 60)}m ${detail.duration % 60}s!`);
      }
    };

    window.addEventListener('GLOVA_CALL_SYNCED', handleNativeCallSynced);
    return () => {
      window.removeEventListener('GLOVA_CALL_SYNCED', handleNativeCallSynced);
    };
  }, []);

  const startTimer = () => {
    setPhase('active');
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleCallAnswered = () => startTimer();

  const handleEndCall = () => {
    stopTimer();
    setPhase('outcome');
    setManualDuration({
      mins: String(Math.floor(elapsed / 60)),
      secs: String(elapsed % 60),
    });
  };

  const getFinalDuration = () => {
    const m = parseInt(manualDuration.mins || '0');
    const s = parseInt(manualDuration.secs || '0');
    return m * 60 + s;
  };

  const handleSave = async () => {
    setSaving(true);
    const duration = getFinalDuration();
    try {
      if (callId) {
        await api.patch(`/calls/${callId}`, { status: outcome, duration, notes });
      } else {
        await api.post('/calls/log', { leadId: lead?.id, status: outcome, duration, notes: notes || undefined });
      }
      toast.success(`Call logged — ${outcome.toLowerCase()} (${Math.floor(duration / 60)}m ${duration % 60}s)`);
      onSuccess();
      onClose();
    } catch {
      toast.error('Failed to save call. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  if (!isOpen || !lead) return null;

  const outcomeOptions = [
    { value: 'COMPLETED', label: '✅ Completed', color: 'bg-green-50 border-green-300 text-green-800' },
    { value: 'MISSED', label: '📵 Missed / No Answer', color: 'bg-red-50 border-red-300 text-red-800' },
    { value: 'FAILED', label: '⚠️ Failed / Busy', color: 'bg-amber-50 border-amber-300 text-amber-800' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-6 py-5 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-teal-100 text-xs font-medium uppercase tracking-wider mb-1">Outbound Call</p>
              <h2 className="text-xl font-bold">{lead.firstName} {lead.lastName || ''}</h2>
              <p className="text-teal-200 text-sm mt-0.5">{lead.phone}</p>
            </div>
            <button onClick={() => { stopTimer(); onClose(); }} className="text-teal-200 hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* PHASE: Dialing */}
          {phase === 'dialing' && (
            <div className="text-center space-y-5">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping opacity-60"></div>
                <div className="relative w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center border-2 border-teal-200">
                  <PhoneOutgoing className="w-8 h-8 text-teal-600" />
                </div>
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-lg">Connecting...</p>
                <p className="text-gray-500 text-sm mt-1">Your native dialer has opened. Tap below when the call is answered.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCallAnswered}
                  className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> Call Answered
                </button>
                <button
                  onClick={() => { setOutcome('MISSED'); setPhase('outcome'); setManualDuration({ mins: '0', secs: '0' }); }}
                  className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition-all cursor-pointer"
                >
                  <PhoneMissed className="w-4 h-4" /> No Answer
                </button>
              </div>
            </div>
          )}

          {/* PHASE: Active (timer running) */}
          {phase === 'active' && (
            <div className="text-center space-y-5">
              <div className="bg-teal-50 rounded-xl py-6 border border-teal-100">
                <p className="text-teal-600 text-xs font-semibold uppercase tracking-wider mb-2">Call Duration</p>
                <p className="text-5xl font-mono font-bold text-teal-700 tracking-tight">{formatTime(elapsed)}</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Call in progress
              </div>
              <button
                onClick={handleEndCall}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3.5 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <PhoneOff className="w-5 h-5" /> End Call
              </button>
            </div>
          )}

          {/* PHASE: Outcome form */}
          {phase === 'outcome' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Call Duration</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="number" min="0" max="999"
                      value={manualDuration.mins}
                      onChange={e => setManualDuration(p => ({ ...p, mins: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-center font-mono text-lg font-bold text-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                    <p className="text-[10px] text-gray-400 text-center mt-0.5">minutes</p>
                  </div>
                  <span className="text-gray-400 font-bold text-xl mb-3">:</span>
                  <div className="flex-1">
                    <input
                      type="number" min="0" max="59"
                      value={manualDuration.secs}
                      onChange={e => setManualDuration(p => ({ ...p, secs: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-center font-mono text-lg font-bold text-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                    <p className="text-[10px] text-gray-400 text-center mt-0.5">seconds</p>
                  </div>
                </div>
                {elapsed > 0 && (
                  <p className="text-[11px] text-teal-600 text-center mt-2">Timer recorded: {formatTime(elapsed)} — edit if needed</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Call Outcome</p>
                <div className="space-y-2">
                  {outcomeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOutcome(opt.value)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer ${
                        outcome === opt.value ? opt.color + ' border-2' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add any call notes here..."
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { stopTimer(); onClose(); }}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Call'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
