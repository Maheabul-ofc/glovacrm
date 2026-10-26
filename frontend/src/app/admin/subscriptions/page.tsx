'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, AlertTriangle, TrendingUp, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api from '@/lib/api';

export default function SubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [statsRes, txRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/payments/transactions')
      ]);
      setStats(statsRes.data);
      setTransactions(txRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions & Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage platform revenue, trials, and active plans.</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-white border border-gray-200 rounded-xl" />
          <div className="h-64 bg-white border border-gray-200 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-emerald-700 font-medium">Monthly Recurring Revenue</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">₹{stats?.metrics?.mrr?.toLocaleString('en-IN') || 0}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Active Free Trials</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">{stats?.metrics?.activeTrials || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Paid Customers</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">{stats?.metrics?.paidCompanies || 0}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Tenant</th>
                    <th className="px-6 py-3 font-medium">Plan</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Payment ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{tx.tenant?.name || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {tx.subscription?.plan?.name || 'Unknown Plan'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ₹{tx.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4">
                          {tx.status === 'SUCCESS' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Success
                            </span>
                          ) : tx.status === 'FAILED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <XCircle className="w-3.5 h-3.5" /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <Clock className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                          {tx.providerPaymentId || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
