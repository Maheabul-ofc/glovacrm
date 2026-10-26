'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Search, Filter, PhoneIncoming, PhoneOutgoing, PhoneMissed, PlayCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function CallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [dialPhone, setDialPhone] = useState('');

  const [showOutcome, setShowOutcome] = useState(false);
  const [outcomeStatus, setOutcomeStatus] = useState('COMPLETED');
  const [durationMins, setDurationMins] = useState('');
  const [durationSecs, setDurationSecs] = useState('');
  
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
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
    if (status === 'MISSED') return <PhoneMissed className="w-4 h-4 text-red-500" />;
    if (direction === 'INBOUND') return <PhoneIncoming className="w-4 h-4 text-blue-500" />;
    return <PhoneOutgoing className="w-4 h-4 text-emerald-500" />;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const handleDial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialPhone && !selectedLeadId) return;
    
    // 1. Trigger the native deep-link dialer
    if (dialPhone) {
      window.location.href = `tel:${dialPhone}`;
    }
    
    // 2. Switch UI to outcome form
    setShowOutcome(true);
  };

  const handleLogOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const totalSeconds = (parseInt(durationMins) || 0) * 60 + (parseInt(durationSecs) || 0);

      const formData = new FormData();
      if (dialPhone) formData.append('toPhone', dialPhone);
      if (selectedLeadId) formData.append('leadId', selectedLeadId);
      formData.append('status', outcomeStatus);
      formData.append('duration', totalSeconds.toString());
      if (recordingFile) {
        formData.append('recording', recordingFile);
      }

      await api.post('/calls/log', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Call logged successfully!');
      setIsDialerOpen(false);
      setShowOutcome(false);
      setDialPhone('');
      setSelectedLeadId('');
      setRecordingFile(null);
      setDurationMins('');
      setDurationSecs('');
      setOutcomeStatus('COMPLETED');
      fetchCalls();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to log call. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            View all incoming and outgoing calls made by your team.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={() => {
              setShowOutcome(false);
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
                          {call.status.toLowerCase()}
                        </span>
                      </div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                              src={`http://localhost:5000${call.recordingUrl}`} 
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

      {/* Dialer & Outcome Modal */}
      {isDialerOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transition-all">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-5 h-5 text-teal-600" /> {showOutcome ? 'Log Call Outcome' : 'Web Dialer'}
              </h3>
              <button onClick={() => setIsDialerOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            
            {!showOutcome ? (
              <form onSubmit={handleDial} className="p-6 space-y-6 text-center">
                <div>
                  <input 
                    type="tel" 
                    value={dialPhone} 
                    onChange={e => setDialPhone(e.target.value)} 
                    className="w-full text-center text-2xl tracking-widest border border-gray-300 rounded-lg px-3 py-4 text-gray-900 font-mono focus:ring-2 focus:ring-teal-500 outline-none bg-white" 
                    placeholder="+91" 
                    autoFocus
                  />
                </div>
                <div className="pt-2 text-sm text-gray-500 mb-4">
                  This will open your computer's native phone app.
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={!dialPhone} className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center mx-auto transition-colors shadow-lg shadow-emerald-500/30 disabled:opacity-50">
                    <Phone className="w-8 h-8 fill-current" />
                  </button>
                </div>
                <div className="text-sm text-gray-400 mt-2 cursor-pointer hover:text-teal-600" onClick={() => setShowOutcome(true)}>
                  Skip dialing, just log a call
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogOutcome} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Lead</label>
                  <select 
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none sm:text-sm"
                  >
                    <option value="">-- Select a Lead (Optional) --</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName} {lead.phone ? `(${lead.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Call Status</label>
                  <select 
                    value={outcomeStatus}
                    onChange={(e) => setOutcomeStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none sm:text-sm"
                  >
                    <option value="COMPLETED">Completed</option>
                    <option value="NO_ANSWER">No Answer</option>
                    <option value="BUSY">Busy</option>
                    <option value="MISSED">Missed</option>
                  </select>
                </div>

                {outcomeStatus === 'COMPLETED' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Duration</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input 
                          type="number" 
                          min="0"
                          value={durationMins}
                          onChange={(e) => setDurationMins(e.target.value)}
                          placeholder="00"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none sm:text-sm text-center"
                        />
                        <span className="absolute right-3 top-2 text-xs text-gray-400 font-medium">MIN</span>
                      </div>
                      <span className="text-gray-500 font-bold">:</span>
                      <div className="flex-1 relative">
                        <input 
                          type="number" 
                          min="0"
                          max="59"
                          value={durationSecs}
                          onChange={(e) => setDurationSecs(e.target.value)}
                          placeholder="00"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none sm:text-sm text-center"
                        />
                        <span className="absolute right-3 top-2 text-xs text-gray-400 font-medium">SEC</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Recording (Optional)</label>
                  <input 
                    type="file"
                    accept="audio/*,video/*"
                    onChange={(e) => setRecordingFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 border border-gray-300 rounded-lg bg-white p-1"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
                  >
                    Save Call Log
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
