'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Search, Filter, PhoneIncoming, PhoneOutgoing, PhoneMissed, PlayCircle, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import CallTimerModal from '@/components/CallTimerModal';

const getRecordingSrc = (recordingUrl: string) => {
  if (/^https?:\/\//i.test(recordingUrl)) return recordingUrl;
  const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
  return `${base}${recordingUrl}`;
};

export default function CallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [dialPhone, setDialPhone] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [callingLead, setCallingLead] = useState<{
    id: string;
    firstName: string;
    lastName?: string;
    phone: string;
    status?: string;
  } | null>(null);
  const [isCallTimerOpen, setIsCallTimerOpen] = useState(false);
  const [activeAudio, setActiveAudio] = useState<string | null>(null);

  useEffect(() => {
    fetchCalls();
  }, [search]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchCalls = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get(`/calls${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setCalls(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await api.get('/leads?limit=200');
      setLeads(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch leads for dialer', err);
    }
  };

  const getCallIcon = (direction: string, status: string) => {
    if (status === 'MISSED' || status === 'BUSY' || status === 'FAILED' || status === 'NO_ANSWER') {
      return <PhoneMissed className="w-4 h-4 text-red-500" />;
    }
    if (direction === 'INBOUND') return <PhoneIncoming className="w-4 h-4 text-blue-500" />;
    return <PhoneOutgoing className="w-4 h-4 text-emerald-500" />;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const found = leads.find((l) => l.id === leadId);
    if (found?.phone) {
      setDialPhone(found.phone);
    }
  };

  const handleStartAutoCall = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedLead = leads.find((l) => l.id === selectedLeadId);
    const phoneToDial = (dialPhone || matchedLead?.phone || '').trim();
    if (!phoneToDial) return;

    setCallingLead({
      id: matchedLead?.id || '',
      firstName: matchedLead?.firstName || 'Outbound',
      lastName: matchedLead?.lastName || 'Call',
      phone: phoneToDial,
      status: matchedLead?.status,
    });
    setIsDialerOpen(false);
    setIsCallTimerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            View all automatically tracked and verified calls made by your team.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => {
              setSelectedLeadId('');
              setDialPhone('');
              setIsDialerOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            <Phone className="-ml-1 mr-2 h-4 w-4" />
            Open Dialer
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            placeholder="Search by phone number..."
          />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <Filter className="-ml-1 mr-2 h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Recording</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">Loading call logs...</td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No calls recorded yet.
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getCallIcon(call.direction, call.status)}
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {call.status.toLowerCase().replace(/_/g, ' ')}
                        </span>
                        {call.provider === 'ANDROID_AUTO' && (
                          <span
                            title="Duration & status automatically verified from phone call log"
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                          >
                            <ShieldCheck className="w-3 h-3" /> Auto
                          </span>
                        )}
                      </div>
                      {call.notes && (
                        <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate" title={call.notes}>
                          {call.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {call.lead?.firstName} {call.lead?.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{call.phoneNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {call.user?.firstName || 'System'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {formatDuration(call.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(call.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {call.recordingUrl ? (
                        activeAudio === call.recordingUrl ? (
                          <div className="flex justify-end items-center gap-2">
                            <audio
                              controls
                              autoPlay
                              src={getRecordingSrc(call.recordingUrl)}
                              className="h-8 w-48"
                            />
                            <button onClick={() => setActiveAudio(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                          </div>
                        ) : (
                          <button onClick={() => setActiveAudio(call.recordingUrl)} className="text-teal-600 hover:text-teal-900">
                            <PlayCircle className="w-5 h-5 ml-auto" />
                          </button>
                        )
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead / Phone Dialer Modal (launches TeleCRM-style Auto Call Tracking) */}
      {isDialerOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transition-all">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-5 h-5 text-teal-600" /> Auto-Tracked Dialer
              </h3>
              <button onClick={() => setIsDialerOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleStartAutoCall} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                  Select Lead (Optional)
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => handleSelectLead(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm"
                >
                  <option value="">-- Choose a Lead or type number below --</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.firstName} {lead.lastName} {lead.phone ? `(${lead.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={dialPhone}
                  onChange={(e) => setDialPhone(e.target.value)}
                  className="w-full text-center text-xl tracking-wider border border-gray-300 rounded-lg px-3 py-3 text-gray-900 font-mono focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  placeholder="+91 9876543210"
                  autoFocus
                />
              </div>

              <p className="text-xs text-gray-500 text-center">
                Opens your Android phone dialer and automatically verifies call outcome &amp; talk duration.
              </p>

              <button
                type="submit"
                disabled={!dialPhone.trim()}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center mx-auto transition-colors shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                title="Start Auto-Tracked Call"
              >
                <Phone className="w-7 h-7 fill-current" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TeleCRM-Style Auto Call & Post-Call Feedback Modal */}
      <CallTimerModal
        isOpen={isCallTimerOpen}
        onClose={() => {
          setIsCallTimerOpen(false);
          setCallingLead(null);
        }}
        lead={callingLead}
        onSuccess={() => fetchCalls(true)}
      />
    </div>
  );
}
