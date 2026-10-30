'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Link as LinkIcon, Webhook, Phone, MessageSquare, Briefcase, RefreshCw, Copy, CheckCircle2, CreditCard } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const AVAILABLE_INTEGRATIONS = [
  { id: 'META_LEAD_ADS', name: 'Facebook Lead Ads', description: 'Automatically sync leads from Facebook campaigns.', icon: Webhook, color: 'text-blue-600', type: 'WEBHOOK' },
  { id: 'INSTAGRAM', name: 'Instagram Ads', description: 'Sync leads from Instagram campaigns.', icon: Webhook, color: 'text-fuchsia-600', type: 'WEBHOOK' },
  { id: 'GOOGLE_ADS', name: 'Google Ads', description: 'Sync leads from Google Lead Form extensions.', icon: Briefcase, color: 'text-red-500', type: 'WEBHOOK' },
  { id: 'INDIAMART', name: 'IndiaMART', description: 'Receive leads from your IndiaMART catalog.', icon: Briefcase, color: 'text-orange-500', type: 'WEBHOOK' },
  { id: 'JUSTDIAL', name: 'JustDial', description: 'Receive leads from your JustDial listing.', icon: Briefcase, color: 'text-orange-600', type: 'WEBHOOK' },
  { id: 'WHATSAPP', name: 'WhatsApp API', description: 'Send automated WhatsApp messages & templates.', icon: MessageSquare, color: 'text-emerald-500', type: 'API' },
  { id: 'TELEGRAM', name: 'Telegram Bot', description: 'Receive notifications and leads via Telegram.', icon: MessageSquare, color: 'text-sky-500', type: 'API' },
  { id: 'EXOTEL', name: 'Exotel Telephony', description: 'Cloud telephony for click-to-call & call recording.', icon: Phone, color: 'text-teal-500', type: 'API' },
  { id: 'TWILIO', name: 'Twilio Telephony', description: 'Global voice API for outbound calling.', icon: Phone, color: 'text-red-600', type: 'API' },
  { id: 'INSTAMOJO', name: 'Instamojo Payments', description: 'Indian payment gateway for subscriptions & plans.', icon: CreditCard, color: 'text-indigo-600', type: 'API' },
  { id: 'RAZORPAY', name: 'Razorpay Payments', description: 'Accept UPI, Cards, and NetBanking online.', icon: CreditCard, color: 'text-blue-600', type: 'API' },
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  
  // Modal state
  const [configForm, setConfigForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await api.get('/integrations');
      setIntegrations(res.data);
    } catch (error) {
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const isConnected = (providerId: string) => {
    return integrations.some(i => i.provider === providerId && i.isActive);
  };

  const getWebhookUrl = (providerId: string) => {
    if (!user?.tenantId) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000';
    let path = '';
    
    switch(providerId) {
      case 'META_LEAD_ADS': path = '/api/webhooks/meta'; break;
      case 'INSTAGRAM': path = '/api/webhooks/instagram'; break;
      case 'GOOGLE_ADS': path = '/api/webhooks/google-ads'; break;
      case 'INDIAMART': path = '/api/webhooks/indiamart'; break;
      case 'JUSTDIAL': path = '/api/webhooks/justdial'; break;
      default: return '';
    }
    
    return `${baseUrl}${path}?tenantId=${user.tenantId}`;
  };

  const copyWebhook = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Webhook URL copied!');
  };

  const openConfigModal = (provider: any) => {
    const existing = integrations.find(i => i.provider === provider.id);
    setSelectedProvider(provider);
    setConfigForm(existing?.config || {});
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/integrations', {
        provider: selectedProvider.id,
        config: configForm,
        isActive: true
      });
      toast.success(`${selectedProvider.name} integration saved!`);
      setSelectedProvider(null);
      fetchIntegrations();
    } catch (error) {
      toast.error('Failed to save integration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading integrations...</div>;
  if (!user || user.role !== 'TENANT_ADMIN') {
    return <div className="text-red-500">Only the Business Owner can manage integrations.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">App Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">Connect your favorite tools to automate lead flow and communication.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AVAILABLE_INTEGRATIONS.map((provider) => {
          const connected = isConnected(provider.id);
          const Icon = provider.icon;
          
          return (
            <div key={provider.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${connected ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                  <Icon className={`w-6 h-6 ${connected ? 'text-emerald-500' : provider.color}`} />
                </div>
                {connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    Not Connected
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-gray-900">{provider.name}</h3>
              <p className="text-sm text-gray-500 mt-1 flex-1">{provider.description}</p>
              
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => openConfigModal(provider)}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                    connected 
                      ? 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200' 
                      : 'bg-teal-50 hover:bg-teal-100 text-teal-700'
                  }`}
                >
                  {connected ? <Settings className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                  {connected ? 'Manage Settings' : 'Configure Integration'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <selectedProvider.icon className={`w-6 h-6 ${selectedProvider.color}`} />
                <h3 className="text-lg font-bold text-gray-900">Configure {selectedProvider.name}</h3>
              </div>
              <button onClick={() => setSelectedProvider(null)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            
            <form onSubmit={handleSaveConfig} className="p-6 space-y-6">
              
              {selectedProvider.type === 'WEBHOOK' ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-800">
                      To connect {selectedProvider.name}, copy the Webhook URL below and paste it into your {selectedProvider.name} developer dashboard.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Your Unique Webhook URL</label>
                    <div className="flex items-center gap-2">
                      <input 
                        readOnly 
                        value={getWebhookUrl(selectedProvider.id)} 
                        className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 font-mono" 
                      />
                      <button 
                        type="button" 
                        onClick={() => copyWebhook(getWebhookUrl(selectedProvider.id))}
                        className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      >
                        {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-gray-600" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">Enter your API credentials provided by {selectedProvider.name}.</p>
                  
                  {selectedProvider.id === 'WHATSAPP' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
                        <input required value={configForm.phoneNumberId || ''} onChange={e => setConfigForm({...configForm, phoneNumberId: e.target.value})} placeholder="e.g. 104598239023..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Business Account ID (WABA)</label>
                        <input value={configForm.wabaId || ''} onChange={e => setConfigForm({...configForm, wabaId: e.target.value})} placeholder="e.g. 10928374920..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Access Token</label>
                        <input required type="password" value={configForm.accessToken || ''} onChange={e => setConfigForm({...configForm, accessToken: e.target.value})} placeholder="EAAG..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </>
                  )}

                  {selectedProvider.id === 'EXOTEL' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account SID</label>
                        <input required value={configForm.sid || ''} onChange={e => setConfigForm({...configForm, sid: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Token</label>
                        <input required type="password" value={configForm.token || ''} onChange={e => setConfigForm({...configForm, token: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </>
                  )}

                  {selectedProvider.id === 'TWILIO' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account SID</label>
                        <input required value={configForm.accountSid || ''} onChange={e => setConfigForm({...configForm, accountSid: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Auth Token</label>
                        <input required type="password" value={configForm.authToken || ''} onChange={e => setConfigForm({...configForm, authToken: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </>
                  )}

                  {selectedProvider.id === 'TELEGRAM' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
                        <input required value={configForm.botToken || ''} onChange={e => setConfigForm({...configForm, botToken: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chat ID (Optional)</label>
                        <input value={configForm.chatId || ''} onChange={e => setConfigForm({...configForm, chatId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </>
                  )}

                  {selectedProvider.id === 'INSTAMOJO' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Private API Key</label>
                        <input required value={configForm.apiKey || ''} onChange={e => setConfigForm({...configForm, apiKey: e.target.value})} placeholder="test_... or live_..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Private Auth Token</label>
                        <input required type="password" value={configForm.authToken || ''} onChange={e => setConfigForm({...configForm, authToken: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Private Salt (Optional for Webhooks)</label>
                        <input type="password" value={configForm.salt || ''} onChange={e => setConfigForm({...configForm, salt: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </>
                  )}

                  {selectedProvider.id === 'RAZORPAY' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Key ID</label>
                        <input required value={configForm.keyId || ''} onChange={e => setConfigForm({...configForm, keyId: e.target.value})} placeholder="rzp_test_... or rzp_live_..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Key Secret</label>
                        <input required type="password" value={configForm.keySecret || ''} onChange={e => setConfigForm({...configForm, keySecret: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200">
                <button type="button" onClick={() => setSelectedProvider(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
