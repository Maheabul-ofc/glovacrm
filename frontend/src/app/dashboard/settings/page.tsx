'use client';

import Link from 'next/link';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Building, Users } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function TenantSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  
  const [form, setForm] = useState({
    name: '',
    industry: '',
    country: '',
  });

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    try {
      const res = await api.get('/tenants/me');
      setTenant(res.data);
      setForm({
        name: res.data.name || '',
        industry: res.data.industry || '',
        country: res.data.country || 'IN',
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/tenants/me', form);
      toast.success('Workspace settings updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading settings...</div>;
  if (!user || user.role !== 'TENANT_ADMIN') {
    return <div className="text-red-500">Only the Business Owner can access Settings.</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspace Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your CRM organization settings.</p>
        </div>
        <Link 
          href="/dashboard/settings/billing" 
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
        >
          Manage Billing & Subscriptions
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <form onSubmit={handleSave}>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Building className="w-5 h-5 text-teal-500" /> Company Profile
            </h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input 
                  type="text" 
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <input 
                  type="text" 
                  value={form.industry}
                  onChange={(e) => setForm({...form, industry: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input 
                  type="text" 
                  value={form.country}
                  onChange={(e) => setForm({...form, country: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" 
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 flex justify-end">
            <button 
              type="submit" 
              disabled={saving}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Subscription Read-Only Info */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-teal-500" /> Subscription Plan
        </h2>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="font-bold text-gray-900 text-lg">{tenant?.plan}</p>
            {tenant?.plan === 'TRIAL' && (
              <p className="text-sm text-teal-600 mt-1">
                Trial ends on {new Date(tenant.trialEndsAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <button disabled className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed">
            Upgrade Plan (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
}
