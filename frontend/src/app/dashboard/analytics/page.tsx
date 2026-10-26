'use client';

import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Users, AlertTriangle, Download, ArrowUpRight } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics/full');
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return toast.error('No data to export');
    
    let csv = 'Metrics,Value\n';
    csv += `Total Leads,${data.overview?.totalLeads || 0}\n`;
    csv += `Converted Leads,${data.overview?.convertedLeads || 0}\n`;
    csv += `Conversion Rate,${data.overview?.conversionRate || '0%'}\n`;
    csv += `Lost Leads,${data.overview?.lostLeads || 0}\n\n`;

    csv += 'Source Distribution\n';
    csv += 'Source,Leads\n';
    if (data.sourceDistribution) {
      data.sourceDistribution.forEach((s: any) => {
        csv += `"${s.name}",${s.value}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'analytics_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Analytics exported successfully');
  };

  if (loading) return <div className="text-gray-500">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Detailed breakdown of your CRM performance.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Leads</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{data?.overview?.totalLeads || 0}</h3>
            </div>
            <div className="bg-teal-50 p-2 rounded-lg">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Converted Leads</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{data?.overview?.convertedLeads || 0}</h3>
            </div>
            <div className="bg-emerald-50 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{data?.overview?.conversionRate}</h3>
            </div>
            <div className="bg-teal-50 p-2 rounded-lg">
              <Target className="w-5 h-5 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Lost Leads</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{data?.overview?.lostLeads || 0}</h3>
            </div>
            <div className="bg-red-50 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Lead Sources</h2>
          {data?.sourceDistribution?.length > 0 ? (
            <div className="space-y-4">
              {data.sourceDistribution.map((source: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{source.name}</span>
                    <span className="text-gray-500">{source.value} leads</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-teal-500 h-2 rounded-full" 
                      style={{ width: `${Math.max(5, (source.value / data.overview.totalLeads) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">No source data available.</div>
          )}
        </div>

        {/* Campaign Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Campaign Performance</h2>
          {data?.campaigns?.length > 0 ? (
            <div className="space-y-4">
              {data.campaigns.map((camp: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">{camp.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <span className={`w-2 h-2 rounded-full ${camp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                      {camp.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{camp.leads}</p>
                    <p className="text-xs text-gray-500">Leads generated</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">No campaigns active.</div>
          )}
        </div>
      </div>
    </div>
  );
}
