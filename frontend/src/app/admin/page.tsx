'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const metrics = stats ? [
    { name: 'Total Companies', value: stats.metrics.totalCompanies, icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50' },
    { name: 'Active Trials', value: stats.metrics.activeTrials, icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Paid Customers', value: stats.metrics.paidCompanies, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Total Users', value: stats.metrics.totalUsers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your SaaS platform from here.</p>
      </div>

      {/* Metrics */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="bg-white border border-gray-200 rounded-xl h-32" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m) => (
            <div key={m.name} className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`${m.bg} rounded-lg p-3`}>
                  <m.icon className={`w-6 h-6 ${m.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{m.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{m.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MRR Card */}
      {stats && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
          <p className="text-sm text-teal-700 font-medium">Monthly Recurring Revenue</p>
          <p className="text-4xl font-extrabold text-teal-700 mt-1">₹{stats.metrics.mrr?.toLocaleString('en-IN')}</p>
          <p className="text-xs text-teal-600 mt-2">Based on {stats.metrics.paidCompanies} paid customers</p>
        </div>
      )}

      {/* Recent Signups */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Recent Signups</h2>
          <Link href="/admin/companies" className="text-sm text-teal-600 hover:underline">View all →</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {stats?.recentSignups?.map((company: any) => (
            <Link key={company.id} href={`/admin/companies/${company.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">
                  {company.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{company.name}</p>
                  <p className="text-xs text-gray-500">{company.billingEmail}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  company.plan === 'TRIAL' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {company.plan}
                </span>
                <p className="text-xs text-gray-500 mt-1">{new Date(company.createdAt).toLocaleDateString()}</p>
              </div>
            </Link>
          ))}
          {!stats?.recentSignups?.length && !loading && (
            <div className="p-8 text-center text-gray-500 text-sm">No companies registered yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
