'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, User, CreditCard } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function NewCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    industry: '',
    country: 'IN',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: '',
    plan: 'STARTER',
    trialDays: 14,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.post('/admin/companies', form);
      toast.success('Company created successfully');
      router.push('/admin/companies');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/companies" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Company</h1>
          <p className="text-sm text-gray-500 mt-1">Provision a new tenant workspace manually.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Details */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-teal-600" /> Company Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">Company Name *</label>
              <input name="companyName" required value={form.companyName} onChange={handleChange} className="mt-1 w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Industry</label>
              <input name="industry" value={form.industry} onChange={handleChange} className="mt-1 w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Country Code</label>
              <input name="country" value={form.country} onChange={handleChange} className="mt-1 w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Business Owner */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-teal-600" /> Business Owner Account
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">First Name *</label>
              <input name="ownerFirstName" required value={form.ownerFirstName} onChange={handleChange} className="mt-1 w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              <input name="ownerLastName" value={form.ownerLastName} onChange={handleChange} className="mt-1 w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email Address *</label>
              <input name="ownerEmail" type="email" required value={form.ownerEmail} onChange={handleChange} className="mt-1 w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Temporary Password *</label>
              <input name="ownerPassword" type="text" required value={form.ownerPassword} onChange={handleChange} className="mt-1 w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-teal-600" /> Subscription Plan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Plan Tier</label>
              <select name="plan" value={form.plan} onChange={handleChange} className="mt-1 w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none">
                <option value="TRIAL">Trial</option>
                <option value="STARTER">Starter (₹999/mo)</option>
                <option value="PROFESSIONAL">Professional (₹2,499/mo)</option>
                <option value="ENTERPRISE">Enterprise (₹4,999/mo)</option>
              </select>
            </div>
            {form.plan === 'TRIAL' && (
              <div>
                <label className="text-sm font-medium text-gray-700">Trial Duration (Days)</label>
                <input name="trialDays" type="number" min="1" value={form.trialDays} onChange={handleChange} className="mt-1 w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/admin/companies" className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors bg-white border border-gray-300 rounded-lg">Cancel</Link>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Provisioning...' : 'Create Workspace'}
          </button>
        </div>
      </form>
    </div>
  );
}
