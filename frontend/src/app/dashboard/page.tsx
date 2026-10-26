'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Trophy, Calendar, AlertTriangle, IndianRupee } from 'lucide-react';
import api from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchFollowUps();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/analytics/dashboard');
      setStats(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowUps = async () => {
    try {
      const res = await api.get('/leads?hasFollowUp=true&followUpDate=today');
      const data = res.data?.data || res.data;
      setFollowUps(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFollowUps(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back! Here is a summary of your pipeline.</p>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white h-32 rounded-xl border border-gray-200 shadow-sm"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 transform hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-start">
              <p className="text-sm text-gray-500 font-medium">Today's Follow-ups</p>
              <div className="flex-shrink-0 bg-orange-50 rounded-md p-2">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-gray-900">{stats?.metrics?.todaysFollowUps || 0}</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 transform hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-start">
              <p className="text-sm text-gray-500 font-medium">Missed Follow-ups</p>
              <div className="flex-shrink-0 bg-red-50 rounded-md p-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-gray-900">{stats?.metrics?.missedFollowUps || 0}</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 transform hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-start">
              <p className="text-sm text-gray-500 font-medium">Conversions (Month)</p>
              <div className="flex-shrink-0 bg-emerald-50 rounded-md p-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-gray-900">{stats?.metrics?.monthlyConversions || 0}</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 transform hover:scale-[1.02] transition-transform flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm text-gray-500 font-medium">Campaign Revenue (Month)</p>
              <div className="flex-shrink-0 bg-teal-50 rounded-md p-2">
                <IndianRupee className="h-5 w-5 text-teal-600" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 mb-2">
              {stats?.metrics?.campaignRevenue?.map((rev: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 truncate mr-2">{rev.source}</span>
                  <span className="font-semibold text-gray-900">₹{rev.amount?.toLocaleString('en-IN') || 0}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-gray-100 flex justify-between items-center mt-auto">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</span>
              <span className="text-lg font-bold text-gray-900">
                ₹{stats?.metrics?.campaignRevenue?.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0)?.toLocaleString('en-IN') || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Today's Follow-ups Section */}
      <div className="mt-8 bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold text-gray-900">Today's Follow-ups</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="p-4">Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Campaign</th>
                <th className="p-4">Service</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingFollowUps ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-sm text-gray-500">Loading...</td>
                </tr>
              ) : followUps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-sm text-gray-500">No follow-ups today.</td>
                </tr>
              ) : (
                followUps.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-900">{lead.firstName} {lead.lastName}</td>
                    <td className="p-4 text-sm text-gray-600">{lead.phone}</td>
                    <td className="p-4 text-sm text-gray-600">{lead.campaign || '-'}</td>
                    <td className="p-4 text-sm text-gray-600">{lead.service || '-'}</td>
                    <td className="p-4">
                      <span className="bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 text-xs font-medium border border-blue-100">
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <a href={`tel:${lead.phone}`} className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50">
                          Call
                        </a>
                        <a href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50">
                          WA
                        </a>
                        <Link href={`/dashboard/leads/${lead.id}`} className="border border-gray-300 rounded-lg px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50">
                          View Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">Telecaller Leaderboard</h2>
          </div>
          
          <div className="space-y-3">
            {loading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : stats?.leaderboard?.length === 0 ? (
              <p className="text-gray-500 text-sm">No calls made today yet.</p>
            ) : (
              stats?.leaderboard?.map((entry: any, idx: number) => (
                <div key={entry.user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-900 text-sm shadow-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {entry.user.firstName} {entry.user.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{entry.callsMade}</p>
                    <p className="text-xs text-gray-500 font-medium">Calls Today</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
