'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Phone, MessageSquare } from 'lucide-react';
import api from '@/lib/api';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Aggregated usage metrics across all tenants.</p>
      </div>

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white border border-gray-200 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.metrics?.totalUsers || 0}</p>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Total Leads Processed</h3>
              <BarChart3 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.metrics?.totalLeads || 0}</p>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Calls Made</h3>
              <Phone className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">---</p>
            <p className="text-xs text-gray-500 mt-1">Coming soon</p>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">WA Messages</h3>
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">---</p>
            <p className="text-xs text-gray-500 mt-1">Coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}
