'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Check, Shield, X, Send, Clock, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const industries = [
  'Real Estate', 'Education', 'Healthcare', 'E-commerce', 'Financial Services',
  'Manufacturing', 'IT Services', 'Travel & Hospitality', 'Retail', 'Automotive', 'Other',
];

const countries = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'AE', name: 'UAE' },
  { code: 'SG', name: 'Singapore' },
  { code: 'GB', name: 'United Kingdom' },
];

export default function BillingPage() {
  const [plans] = useState([
    { name: 'Starter', price: 999, description: 'Perfect for small teams getting started.', features: ['Up to 5 users', '1,000 leads', 'Basic dialer', 'WhatsApp messaging', 'Email support'] },
    { name: 'Professional', price: 2499, description: 'For growing sales teams that need more power.', features: ['Up to 25 users', '10,000 leads', 'Power dialer', 'WhatsApp + SMS campaigns', 'API access', 'Priority support'] },
    { name: 'Enterprise', price: 4999, description: 'For large organizations with custom needs.', features: ['Unlimited users', 'Unlimited leads', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee', 'On-premise option'] },
  ]);
  const [currentTenant, setCurrentTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [form, setForm] = useState({
    companyName: '',
    industry: '',
    country: 'IN',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const tenantRes = await api.get('/tenants/me');
      setCurrentTenant(tenantRes.data);
      // Pre-fill the form with known tenant details
      setForm(prev => ({
        ...prev,
        companyName: tenantRes.data.name || '',
        email: tenantRes.data.billingEmail || '',
        phone: tenantRes.data.phone || '',
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openModal = (plan: any) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      setIsProcessing(true);
      await api.post('/upgrade-requests', {
        companyName: form.companyName,
        industry: form.industry || undefined,
        country: form.country,
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        email: form.email,
        phone: form.phone,
        planName: selectedPlan.name,
      });
      toast.success('Your upgrade request has been submitted! Our team will reach out shortly. 🎉');
      setShowModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit request');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading billing details...</div>;

  const currentPlan = currentTenant?.plan || 'TRIAL';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your plan and payment methods.</p>
      </div>

      {/* Current Plan Banner */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Current Plan: <span className="text-teal-600">{currentPlan}</span></h2>
            <p className="text-sm text-gray-500">Your workspace is currently on the {currentPlan} tier.</p>
          </div>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlan.toUpperCase() === plan.name.toUpperCase();
            
            return (
              <div 
                key={plan.name} 
                className={`relative bg-white border rounded-2xl p-6 flex flex-col ${isCurrent ? 'border-teal-500 shadow-md ring-1 ring-teal-500' : 'border-gray-200 shadow-sm'}`}
              >
                {isCurrent && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-teal-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    Current Plan
                  </div>
                )}
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-500 h-10">{plan.description}</p>
                
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</span>
                  <span className="text-gray-500">/mo</span>
                </div>
                
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start text-sm text-gray-700">
                      <Check className="w-5 h-5 text-teal-500 mr-2 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => openModal(plan)}
                  disabled={isCurrent}
                  className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center transition-all ${
                    isCurrent 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  {isCurrent ? 'Active' : 'Request Upgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Info Note */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-8">
        <CreditCard className="w-4 h-4" />
        <span>Submit an upgrade request and our team will contact you for payment setup.</span>
      </div>

      {/* Upgrade Request Modal */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Request Plan Upgrade</h2>
                <p className="text-sm text-gray-500 mt-0.5">Fill in your details to upgrade to <span className="font-semibold text-teal-600">{selectedPlan.name}</span></p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Plan Summary */}
            <div className="mx-6 mt-4 p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-800">{selectedPlan.name} Plan</p>
                <p className="text-xs text-teal-600 mt-0.5">Monthly subscription</p>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">₹{selectedPlan.price.toLocaleString('en-IN')}<span className="text-sm font-normal text-gray-500">/mo</span></p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name <span className="text-red-500">*</span></label>
                <input name="companyName" type="text" required value={form.companyName} onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Your Company Pvt. Ltd." />
              </div>

              {/* Industry & Country */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Industry</label>
                  <select name="industry" value={form.industry} onChange={handleChange}
                    className="mt-1 block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm">
                    <option value="">Select...</option>
                    {industries.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <select name="country" value={form.country} onChange={handleChange}
                    className="mt-1 block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm">
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                  <input name="firstName" type="text" required value={form.firstName} onChange={handleChange}
                    className="mt-1 block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="John" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input name="lastName" type="text" value={form.lastName} onChange={handleChange}
                    className="mt-1 block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="Doe" />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></label>
                  <input name="email" type="email" required value={form.email} onChange={handleChange}
                    className="mt-1 block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="you@company.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number <span className="text-red-500">*</span></label>
                  <input name="phone" type="tel" required value={form.phone} onChange={handleChange}
                    className="mt-1 block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="+91 98765 43210" />
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={isProcessing}
                className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
                {isProcessing ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Upgrade Request
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 mt-2">
                Our team will review your request and contact you for payment setup.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
