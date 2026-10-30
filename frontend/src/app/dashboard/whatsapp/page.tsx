'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Search, Phone, ExternalLink, 
  Check, CheckCheck, Clock, User, Sparkles, RefreshCw, X 
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import CallTimerModal from '@/components/CallTimerModal';

interface ConversationItem {
  lead: {
    id: string;
    firstName: string;
    lastName?: string;
    phone: string;
    status: string;
    companyName?: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    direction: 'INBOUND' | 'OUTBOUND';
    createdAt: string;
    status: string;
  } | null;
}

interface Message {
  id: string;
  leadId: string;
  content: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: string;
  messageType: string;
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
  waStatus?: string;
}

export default function WhatsAppInboxPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedLead, setSelectedLead] = useState<ConversationItem['lead'] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState('');
  const [textInput, setTextInput] = useState('');
  const [sending, setSending] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // Calling
  const [callingLead, setCallingLead] = useState<any | null>(null);
  const [isCallTimerOpen, setIsCallTimerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Conversations on Mount
  useEffect(() => {
    fetchConversations();
    fetchTemplates();
  }, []);

  // 2. Fetch Messages when selected lead changes
  useEffect(() => {
    if (selectedLead?.id) {
      fetchMessages(selectedLead.id);
    }
  }, [selectedLead?.id]);

  // 3. Polling for live updates every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedLead?.id) {
        fetchMessages(selectedLead.id, true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedLead?.id]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoadingConv(true);
      const res = await api.get('/whatsapp/conversations');
      const convList = res.data.data || [];
      setConversations(convList);
      if (convList.length > 0 && !selectedLead) {
        setSelectedLead(convList[0].lead);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConv(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/wa-templates?limit=50');
      setTemplates(res.data.data || []);
    } catch (e) {
      // ignore
    }
  };

  const fetchMessages = async (leadId: string, silent = false) => {
    try {
      if (!silent) setLoadingMsgs(true);
      const res = await api.get(`/whatsapp/messages?leadId=${leadId}`);
      setMessages(res.data.data || []);
    } catch (err) {
      if (!silent) console.error('Failed to fetch messages', err);
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() || !selectedLead) return;

    const messageText = textInput.trim();
    setTextInput('');
    setSending(true);

    // Optimistically add message
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      leadId: selectedLead.id,
      content: messageText,
      direction: 'OUTBOUND',
      status: 'SENT',
      messageType: 'TEXT',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await api.post('/whatsapp/send', {
        leadId: selectedLead.id,
        toPhone: selectedLead.phone,
        content: messageText,
      });

      // Refetch confirmed
      fetchMessages(selectedLead.id, true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send WhatsApp message');
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleApplyTemplate = (tpl: Template) => {
    let populated = tpl.content;
    if (selectedLead) {
      populated = populated
        .replace(/{{customer_name}}/gi, selectedLead.firstName)
        .replace(/{{business_name}}/gi, 'GlovaCRM')
        .replace(/{{lead_status}}/gi, selectedLead.status || 'Active');
    }
    setTextInput(populated);
    setShowTemplateMenu(false);
  };

  const filteredConversations = conversations.filter((c) => {
    const query = search.toLowerCase();
    const fullName = `${c.lead.firstName} ${c.lead.lastName || ''}`.toLowerCase();
    return fullName.includes(query) || c.lead.phone.includes(query);
  });

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
      
      {/* ── Left Sidebar: Conversations List ──────────────────────────────── */}
      <div className="w-80 sm:w-96 border-r border-gray-200 flex flex-col bg-slate-50/50">
        
        {/* Top Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">WhatsApp Chats</h2>
              <p className="text-xs text-gray-500">Live two-way conversations</p>
            </div>
          </div>
          <button 
            onClick={fetchConversations} 
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh conversations"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loadingConv ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading chats...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No conversations found</div>
          ) : (
            filteredConversations.map((item) => {
              const isSelected = selectedLead?.id === item.lead.id;
              const lastMsg = item.lastMessage;

              return (
                <div
                  key={item.lead.id}
                  onClick={() => setSelectedLead(item.lead)}
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-gray-50 bg-white'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                    {item.lead.firstName[0]?.toUpperCase() || 'L'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {item.lead.firstName} {item.lead.lastName || ''}
                      </p>
                      {lastMsg?.createdAt && (
                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-1">
                          {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {lastMsg ? (
                        <span>
                          {lastMsg.direction === 'OUTBOUND' && 'You: '}
                          {lastMsg.content}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">{item.lead.phone}</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Panel: Chat Thread & Composer ───────────────────────────── */}
      {selectedLead ? (
        <div className="flex-1 flex flex-col bg-slate-100/60">
          
          {/* Active Contact Header */}
          <div className="p-3.5 px-6 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                {selectedLead.firstName[0]?.toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">
                    {selectedLead.firstName} {selectedLead.lastName || ''}
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
                    {selectedLead.status || 'LEAD'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span>{selectedLead.phone}</span>
                  {selectedLead.companyName && <span>• {selectedLead.companyName}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCallingLead(selectedLead);
                  setIsCallTimerOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Call Lead
              </button>
              <Link
                href={`/dashboard/leads/${selectedLead.id}`}
                className="px-3 py-1.5 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Profile
              </Link>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
            {loadingMsgs ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No messages yet with {selectedLead.firstName}</p>
                <p className="text-xs text-gray-500 mt-1">Send a message below or pick a pre-approved template to start the chat.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOutbound = msg.direction === 'OUTBOUND';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        isOutbound
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <div
                        className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                          isOutbound ? 'text-emerald-100' : 'text-gray-400'
                        }`}
                      >
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOutbound && (
                          msg.status === 'READ' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
                          ) : msg.status === 'DELIVERED' ? (
                            <CheckCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Template Quick Selector Drawer */}
          {showTemplateMenu && (
            <div className="mx-6 mb-2 bg-white border border-gray-200 rounded-xl p-3 shadow-lg animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" /> WhatsApp Templates
                </span>
                <button onClick={() => setShowTemplateMenu(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {templates.length === 0 ? (
                  <p className="text-xs text-gray-400 p-2">No templates configured. Go to Templates to add one.</p>
                ) : (
                  templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleApplyTemplate(tpl)}
                      className="w-full text-left p-2 rounded-lg hover:bg-emerald-50 text-xs text-gray-800 transition-colors flex justify-between items-center group"
                    >
                      <span className="font-medium group-hover:text-emerald-700">{tpl.name}</span>
                      <span className="text-[10px] text-gray-400">Insert →</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Bottom Composer */}
          <div className="p-3.5 px-6 bg-white border-t border-gray-200 flex items-center gap-3">
            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-gray-200 flex-shrink-0"
              title="Insert WhatsApp Template"
            >
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </button>

            <input
              type="text"
              placeholder={`Message ${selectedLead.firstName}...`}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className="flex-1 py-2.5 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!textInput.trim() || sending}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-colors shadow-sm flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
          <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
          <p className="font-semibold text-gray-700">Select a conversation to start chatting</p>
        </div>
      )}

      {/* Call Timer Modal for Fast Calling directly from WhatsApp Inbox */}
      <CallTimerModal
        isOpen={isCallTimerOpen}
        onClose={() => setIsCallTimerOpen(false)}
        lead={callingLead}
        onSuccess={() => {}}
      />
    </div>
  );
}
