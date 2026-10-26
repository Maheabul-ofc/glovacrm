'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Megaphone, Play, Pause, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    type: 'WHATSAPP',
    templateName: ''
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/campaigns');
      setCampaigns(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/campaigns', newCampaign);
      setIsModalOpen(false);
      setNewCampaign({ name: '', description: '', type: 'WHATSAPP', templateName: '' });
      toast.success('Campaign created successfully');
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create campaign');
    }
  };

  const triggerCampaign = async (id: string) => {
    try {
      await api.post(`/campaigns/${id}/trigger`);
      toast.success('Campaign triggered successfully!');
      fetchCampaigns();
    } catch (error) {
      console.error('Failed to trigger campaign', error);
      toast.error('Failed to trigger campaign. Ensure it is not already running.');
    }
  };

  const statusColor = (status: string) => {
    switch(status) {
      case 'RUNNING': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage bulk WhatsApp, SMS, and Email broadcasts.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            New Campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-gray-500">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-gray-200 border-dashed">
            <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No campaigns yet</h3>
            <p className="text-gray-500 mt-1">Create your first broadcast to reach out to leads in bulk.</p>
          </div>
        ) : (
          campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{campaign.description || 'No description'}</p>
                  </div>
                  <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </div>
                
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Type</span>
                    <span className="font-medium text-gray-900">{campaign.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Template</span>
                    <span className="font-medium text-gray-900">{campaign.templateName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Leads</span>
                    <span className="font-medium text-gray-900">
                      {campaign.metrics?.total || 0}
                    </span>
                  </div>
                </div>

                {campaign.status === 'COMPLETED' && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Delivery Rate</span>
                      <span className="font-bold text-green-600">
                        {campaign.metrics?.total > 0 ? Math.round((campaign.metrics?.sent / campaign.metrics?.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${campaign.metrics?.total > 0 ? (campaign.metrics?.sent / campaign.metrics?.total) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 p-4 border-t border-gray-200">
                {campaign.status === 'DRAFT' ? (
                  <button 
                    onClick={() => triggerCampaign(campaign.id)}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Play className="w-4 h-4" /> Start Broadcast
                  </button>
                ) : campaign.status === 'RUNNING' ? (
                  <button className="w-full bg-gray-200 text-gray-500 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
                    <AlertCircle className="w-4 h-4" /> Broadcasting...
                  </button>
                ) : (
                  <button className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-colors">
                    View Report
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Create New Campaign</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                <input required name="name" value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500" placeholder="e.g., Diwali Offer 2026" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <input name="description" value={newCampaign.description} onChange={e => setNewCampaign({...newCampaign, description: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select name="type" value={newCampaign.type} onChange={e => setNewCampaign({...newCampaign, type: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500">
                  <option value="WHATSAPP">WhatsApp Broadcast</option>
                  <option value="SMS">SMS Broadcast</option>
                  <option value="EMAIL">Email Broadcast</option>
                  <option value="VOICE">Voice Broadcast (Auto-dialer)</option>
                </select>
              </div>

              {newCampaign.type === 'WHATSAPP' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input required name="templateName" value={newCampaign.templateName} onChange={e => setNewCampaign({...newCampaign, templateName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500" placeholder="e.g., promotional_alert_1" />
                  <p className="text-xs text-gray-500 mt-1">Must be an approved template from Meta.</p>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors shadow-sm">Save as Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
