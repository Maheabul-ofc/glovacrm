'use client';

import React, { useState, useEffect, use, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Mail, Building, MapPin, Calendar, Activity, Edit, UserPlus, MessageSquare, MessageSquareText, Send, X, PhoneOff, PhoneOutgoing, PhoneMissed, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';
import CallTimerModal from '@/components/CallTimerModal';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  onSuccess: () => void;
}

function TemplatePickerModal({ isOpen, onClose, leadId, onSuccess }: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    } else {
      setTemplates([]);
      setSelectedTemplateId('');
      setPreviewContent('');
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/wa-templates?status=ACTIVE');
      setTemplates(res.data?.data || res.data || []);
    } catch (error) {
      toast.error('Failed to load templates');
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setPreviewContent('');
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post(`/wa-templates/${templateId}/preview`, { leadId });
      setPreviewContent(res.data.resolved || res.data.content || '');
    } catch (error) {
      toast.error('Failed to preview template');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedTemplateId || !previewContent) return;
    setSending(true);
    try {
      await api.post(`/wa-templates/${selectedTemplateId}/send`, { leadId, finalContent: previewContent });
      toast.success('Template message sent successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to send template message');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Send Template Message</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Select Template</label>
            <select 
              value={selectedTemplateId} 
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none sm:text-sm text-gray-900"
            >
              <option value="">-- Choose a template --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          
          {loading && <div className="text-sm text-teal-600 font-medium">Loading preview...</div>}
          
          {!loading && selectedTemplateId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Preview & Edit Content</label>
              <textarea 
                value={previewContent} 
                onChange={(e) => setPreviewContent(e.target.value)}
                rows={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none sm:text-sm text-gray-900"
              />
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSend} 
            disabled={!selectedTemplateId || !previewContent || sending}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'whatsapp' | 'calls'>('activity');
  const [messageText, setMessageText] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCallTimerOpen, setIsCallTimerOpen] = useState(false);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [callLogsLoading, setCallLogsLoading] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    companyName: '',
    designation: ''
  });

  useEffect(() => {
    fetchLead();
  }, [id]);

  // Fetch call logs when Calls tab is opened
  useEffect(() => {
    if (activeTab === 'calls' && id) {
      fetchCallLogs();
    }
  }, [activeTab, id]);

  const fetchCallLogs = async () => {
    setCallLogsLoading(true);
    try {
      const res = await api.get(`/calls?leadId=${id}`);
      setCallLogs(res.data?.data || []);
    } catch {
      toast.error('Failed to load call logs');
    } finally {
      setCallLogsLoading(false);
    }
  };


  const fetchLead = async () => {
    try {
      const res = await api.get(`/leads/${id}`);
      setLead(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    try {
      await api.post('/whatsapp/send', {
        leadId: lead.id,
        toPhone: lead.phone,
        content: messageText
      });
      setMessageText('');
      fetchLead(); // Refresh to see the new activity
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/leads/${id}`, editData);
      toast.success('Lead updated successfully');
      setIsEditModalOpen(false);
      fetchLead();
    } catch (error: any) {
      console.error(error.response?.data || error.message);
      toast.error('Failed to update lead: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
    </div>
  );

  if (!lead) return <div>Lead not found</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Lead Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-r from-teal-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                  {lead.firstName?.charAt(0)}{lead.lastName?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{lead.firstName} {lead.lastName}</h2>
                  <p className="text-sm text-gray-500">{lead.designation || 'Unknown Role'} at {lead.companyName || 'Unknown Company'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-3 text-gray-400" />
                {lead.phone}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-3 text-gray-400" />
                {lead.email || 'No email provided'}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Building className="w-4 h-4 mr-3 text-gray-400" />
                {lead.companyName || 'No company'}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <UserPlus className="w-4 h-4 mr-3 text-gray-400" />
                Assigned to: {lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : 'Unassigned'}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsCallTimerOpen(true)}
                className="bg-teal-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" /> Call
              </button>
              <button 
                onClick={() => setIsTemplateModalOpen(true)}
                className="bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquareText className="w-4 h-4" /> Template
              </button>
              <button 
                onClick={() => {
                  setEditData({
                    firstName: lead.firstName || '',
                    lastName: lead.lastName || '',
                    phone: lead.phone || '',
                    email: lead.email || '',
                    companyName: lead.companyName || '',
                    designation: lead.designation || ''
                  });
                  setIsEditModalOpen(true);
                }}
                className="col-span-2 bg-white text-gray-700 border border-gray-300 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" /> Edit Lead
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Content based on Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button 
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === 'activity' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                <Activity className="w-4 h-4" /> Timeline
              </button>
              <button 
                onClick={() => setActiveTab('whatsapp')}
                className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === 'whatsapp' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </button>
              <button 
                onClick={() => setActiveTab('calls')}
                className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === 'calls' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                <Phone className="w-4 h-4" /> Calls
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'activity' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      Activity Timeline
                    </h3>
                    <button className="text-sm text-teal-600 font-medium hover:underline">
                      Add Note
                    </button>
                  </div>

                  <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pb-4">
                    {lead.activities?.length === 0 ? (
                      <div className="pl-6 text-sm text-gray-500">No activity yet.</div>
                    ) : (
                      lead.activities?.map((activity: any) => (
                        <div key={activity.id} className="relative pl-6">
                          <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-teal-500"></div>
                          <div className="flex justify-between items-start mb-1">
                            <div className="text-sm font-medium text-gray-900">
                              {activity.type.replace('_', ' ')}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(activity.createdAt).toLocaleDateString()} at {new Date(activity.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">
                            {activity.description}
                          </p>
                          {activity.user && (
                            <p className="text-xs text-gray-400 mt-1">
                              By {activity.user.firstName} {activity.user.lastName}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'whatsapp' && (
                <div className="flex flex-col h-[400px]">
                  <div className="flex-1 bg-gray-50 rounded-lg p-4 mb-4 overflow-y-auto space-y-4">
                    {/* Mock Chat Messages */}
                    <div className="flex justify-end">
                      <div className="bg-green-100 text-green-900 p-3 rounded-lg rounded-tr-none max-w-[80%] text-sm shadow-sm border border-green-200">
                        Hi {lead.firstName}, are you still interested in our CRM product?
                        <div className="text-[10px] text-green-700/60 mt-1 text-right">10:42 AM</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a WhatsApp message..." 
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-green-500 outline-none text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button 
                      onClick={handleSendMessage}
                      className="bg-green-500 hover:bg-green-600 text-white p-2.5 rounded-lg transition-colors flex items-center justify-center shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'calls' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Call Logs</h3>
                    <button
                      onClick={() => setIsCallTimerOpen(true)}
                      className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                    >
                      <Phone className="w-3.5 h-3.5" /> New Call
                    </button>
                  </div>

                  {callLogsLoading ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Loading call logs...</div>
                  ) : callLogs.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
                      <Phone className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm mb-4">No calls have been made to this lead yet.</p>
                      <button
                        onClick={() => setIsCallTimerOpen(true)}
                        className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm inline-flex gap-2 items-center"
                      >
                        <Phone className="w-4 h-4" /> Start First Call
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {callLogs.map(call => {
                        const durationMins = Math.floor((call.duration || 0) / 60);
                        const durationSecs = (call.duration || 0) % 60;
                        const statusColors: Record<string, string> = {
                          COMPLETED: 'bg-green-100 text-green-800',
                          MISSED: 'bg-red-100 text-red-800',
                          FAILED: 'bg-amber-100 text-amber-800',
                          INITIATED: 'bg-blue-100 text-blue-800',
                          IN_PROGRESS: 'bg-teal-100 text-teal-800',
                        };
                        return (
                          <div key={call.id} className="flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-all">
                            <div className="mt-0.5">
                              {call.status === 'MISSED' || call.status === 'FAILED'
                                ? <PhoneMissed className="w-4 h-4 text-red-400" />
                                : <PhoneOutgoing className="w-4 h-4 text-teal-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                                  statusColors[call.status] || 'bg-gray-100 text-gray-600'
                                }`}>
                                  {call.status}
                                </span>
                                <span className="text-xs text-gray-400">{call.provider}</span>
                              </div>
                              {call.duration > 0 && (
                                <div className="flex items-center gap-1 mt-1.5 text-sm text-gray-700 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  {durationMins > 0 ? `${durationMins}m ` : ''}{durationSecs}s
                                </div>
                              )}
                              {call.notes && <p className="text-xs text-gray-500 mt-1 italic">{call.notes}</p>}
                              <p className="text-[11px] text-gray-400 mt-1">
                                by {call.user?.firstName} {call.user?.lastName} · {new Date(call.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Edit Lead</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleUpdateLead} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">First Name *</label>
                    <input required type="text" value={editData.firstName} onChange={e => setEditData({...editData, firstName: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none sm:text-sm text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
                    <input type="text" value={editData.lastName} onChange={e => setEditData({...editData, lastName: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none sm:text-sm text-gray-900" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <input required type="text" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none sm:text-sm text-gray-900" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input type="email" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none sm:text-sm text-gray-900" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Company</label>
                  <input type="text" value={editData.companyName} onChange={e => setEditData({...editData, companyName: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none sm:text-sm text-gray-900" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Designation</label>
                  <input type="text" value={editData.designation} onChange={e => setEditData({...editData, designation: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none sm:text-sm text-gray-900" />
                </div>

                <div className="pt-4 mt-6 border-t border-gray-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <TemplatePickerModal 
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        leadId={id as string}
        onSuccess={() => fetchLead()}
      />

      <CallTimerModal
        isOpen={isCallTimerOpen}
        onClose={() => setIsCallTimerOpen(false)}
        lead={lead}
        onSuccess={() => {
          fetchLead();
          fetchCallLogs();
        }}
      />
    </div>
  );
}
