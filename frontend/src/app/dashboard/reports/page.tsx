'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/reports');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    return (
      <text x={x} y={y} fill={PIE_COLORS[0]} style={{fill: '#6b7280'}} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
        {name} {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Insights into your lead pipeline</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Total Leads</p>
          <p className="text-4xl font-bold text-gray-900 mt-3">{data.kpis?.totalLeads || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Converted</p>
          <p className="text-4xl font-bold text-green-500 mt-3">{data.kpis?.convertedLeads || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <p className="text-sm text-gray-500 font-medium">Conversion Rate</p>
          <p className="text-4xl font-bold text-blue-600 mt-3">{data.kpis?.conversionRate || 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Monthly Revenue</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyRevenue || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Campaign Performance</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.campaignPerformance || []} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} width={100} />
                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={24} background={{ fill: '#e5e7eb' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Lead Status Distribution</h2>
          <div className="h-[260px] flex items-center justify-center">
            {data.leadStatusDistribution && data.leadStatusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.leadStatusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                    label={renderCustomizedLabel}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.leadStatusDistribution.map((entry: any, index: number) => {
                      // Try to match standard colors for typical statuses
                      let color = PIE_COLORS[index % PIE_COLORS.length];
                      const nameUpper = (entry.name || '').toUpperCase();
                      if (nameUpper === 'CONVERTED') color = '#3b82f6'; // blue
                      if (nameUpper === 'FOLLOW_UP') color = '#22c55e'; // green
                      if (nameUpper === 'CANCELLED' || nameUpper === 'CLOSED') color = '#f59e0b'; // orange
                      
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No status data available.</p>
            )}
          </div>
          <div className="flex justify-center gap-5 mt-4 flex-wrap">
            {data.leadStatusDistribution?.map((entry: any, index: number) => {
              let color = PIE_COLORS[index % PIE_COLORS.length];
              const nameUpper = (entry.name || '').toUpperCase();
              if (nameUpper === 'CONVERTED') color = '#3b82f6'; 
              if (nameUpper === 'FOLLOW_UP') color = '#22c55e'; 
              if (nameUpper === 'CANCELLED' || nameUpper === 'CLOSED') color = '#f59e0b';
              
              return (
                <div key={entry.name || `status-${index}`} className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                  <span className="w-3 h-3 block" style={{ backgroundColor: color }}></span>
                  {entry.name || 'Unknown'}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cancellation Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Cancellation Analysis</h2>
          <div className="space-y-6 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {data.cancellationAnalysis && data.cancellationAnalysis.length > 0 ? (
              data.cancellationAnalysis.map((item: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">{item.reason}</span>
                    <span className="text-gray-500 font-medium">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-red-600 h-1.5 rounded-full" style={{ width: `${Math.max(1, item.percentage)}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center py-10">No cancellation data available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
