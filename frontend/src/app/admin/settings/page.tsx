'use client';

import React, { useState } from 'react';
import { Settings2, Save, Globe, Lock, Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate save
    setTimeout(() => {
      toast.success('Platform settings saved successfully');
      setLoading(false);
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure global settings for the GlovaCRM SaaS platform.</p>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <form onSubmit={handleSave}>
          {/* General Settings */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-teal-600" /> General Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
                <input 
                  type="text" 
                  defaultValue="GlovaCRM" 
                  className="w-full max-w-md bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                <input 
                  type="email" 
                  defaultValue="support@glovacrm.com" 
                  className="w-full max-w-md bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" 
                />
              </div>
            </div>
          </div>

          {/* Security & Access */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-teal-600" /> Security
            </h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 bg-white text-teal-600 focus:ring-teal-500" />
                <span className="text-sm text-gray-700">Allow self-service registration (Free Trials)</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 bg-white text-teal-600 focus:ring-teal-500" />
                <span className="text-sm text-gray-700">Require email verification for new tenants</span>
              </label>
            </div>
          </div>

          {/* Default Trial Settings */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-teal-600" /> Trial Defaults
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Trial Duration (Days)</label>
              <input 
                type="number" 
                defaultValue={7} 
                className="w-full max-w-[120px] bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" 
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="p-6 bg-gray-50 flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
