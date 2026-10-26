'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, User, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompany();
  }, [id]);

  const fetchCompany = async () => {
    try {
      const res = await api.get(`/admin/companies/${id}`);
      setCompany(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await api.patch(`/admin/companies/${id}`, { status: newStatus });
      toast.success(`Company marked as ${newStatus}`);
      fetchCompany();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you ABSOLUTELY sure you want to delete this company? This action cannot be undone and ALL associated data (users, leads, calls) will be lost.')) {
      try {
        await api.delete(`/admin/companies/${id}`);
        toast.success('Company permanently deleted');
        router.push('/admin/companies');
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete company');
      }
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!company) return <div className="text-red-500">Company not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/companies" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {company.name}
              <span className={`text-xs px-2 py-1 rounded-full ${
                company.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {company.status}
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">ID: {company.id}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {company.status === 'ACTIVE' ? (
            <button onClick={() => handleUpdateStatus('SUSPENDED')} className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-sm font-medium rounded-lg transition-colors">
              Suspend Company
            </button>
          ) : (
            <button onClick={() => handleUpdateStatus('ACTIVE')} className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 text-sm font-medium rounded-lg transition-colors">
              Reactivate Company
            </button>
          )}
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
            Delete Company
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-teal-600" /> Details
          </h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-gray-500">Industry</dt>
              <dd className="text-gray-900 font-medium mt-1">{company.industry || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Country</dt>
              <dd className="text-gray-900 font-medium mt-1">{company.country}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Plan</dt>
              <dd className="text-gray-900 font-medium mt-1 inline-flex items-center gap-2">
                {company.plan}
                {company.plan === 'TRIAL' && (
                  <span className="text-xs text-teal-600">(Ends {new Date(company.trialEndsAt).toLocaleDateString()})</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Created At</dt>
              <dd className="text-gray-900 font-medium mt-1">{new Date(company.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {/* Usage Stats */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-teal-600" /> Usage Stats
          </h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <dt className="text-gray-500">Users</dt>
              <dd className="text-2xl text-gray-900 font-bold mt-1">{company.users?.length || 0}</dd>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <dt className="text-gray-500">Leads</dt>
              <dd className="text-2xl text-gray-900 font-bold mt-1">{company._count?.leads || 0}</dd>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <dt className="text-gray-500">Calls</dt>
              <dd className="text-2xl text-gray-900 font-bold mt-1">{company._count?.calls || 0}</dd>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <dt className="text-gray-500">WA Msgs</dt>
              <dd className="text-2xl text-gray-900 font-bold mt-1">{company._count?.whatsappMessages || 0}</dd>
            </div>
          </dl>
        </div>

        {/* Users List */}
        <div className="md:col-span-3 bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-teal-600" /> Users ({company.users?.length || 0})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="pb-3 font-medium uppercase text-xs tracking-wider">Name</th>
                  <th className="pb-3 font-medium uppercase text-xs tracking-wider">Email</th>
                  <th className="pb-3 font-medium uppercase text-xs tracking-wider">Role</th>
                  <th className="pb-3 font-medium uppercase text-xs tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {company.users?.map((u: any) => (
                  <tr key={u.id} className="text-gray-700">
                    <td className="py-3 flex items-center gap-2">
                      {u.firstName} {u.lastName}
                      {u.isOwner && <span title="Business Owner"><ShieldCheck className="w-4 h-4 text-teal-600" /></span>}
                    </td>
                    <td className="py-3">{u.email}</td>
                    <td className="py-3">
                      <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-lg border border-gray-200">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
