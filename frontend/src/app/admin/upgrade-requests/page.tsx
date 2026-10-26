'use client';

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Search, Filter, Eye, UserPlus, Ban } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function UpgradeRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('Welcome@123');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, search]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/upgrade-requests', { params });
      setRequests(res.data.data);
      setCounts(res.data.counts);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch upgrade requests');
    } finally {
      setLoading(false);
    }
  };

  const openApprove = (req: any) => {
    setSelectedRequest(req);
    setAdminNotes('');
    setOwnerPassword('Welcome@123');
    setShowApproveModal(true);
  };

  const openReject = (req: any) => {
    setSelectedRequest(req);
    setAdminNotes('');
    setShowRejectModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      setIsProcessing(true);
      const res = await api.patch(`/upgrade-requests/${selectedRequest.id}/approve`, {
        adminNotes,
        ownerPassword,
      });
      toast.success(res.data.message);
      setShowApproveModal(false);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      setIsProcessing(true);
      await api.patch(`/upgrade-requests/${selectedRequest.id}/reject`, { adminNotes });
      toast.success('Request rejected.');
      setShowRejectModal(false);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <Clock className="w-3.5 h-3.5" /> Pending
        </span>
      );
      case 'APPROVED': return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
        </span>
      );
      case 'REJECTED': return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3.5 h-3.5" /> Rejected
        </span>
      );
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upgrade Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Review and manage incoming subscription upgrade requests from business owners.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-amber-700 font-medium">Pending Requests</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{counts.pending}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-emerald-700 font-medium">Approved Requests</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{counts.approved}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-red-700 font-medium">Rejected Requests</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{counts.rejected}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company, email, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              {s === 'PENDING' && counts.pending > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {counts.pending}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Company</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400 animate-pulse">Loading requests...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">No upgrade requests found.</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{req.companyName}</div>
                      {req.industry && <div className="text-xs text-gray-500">{req.industry}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{req.firstName} {req.lastName || ''}</div>
                      {req.phone && <div className="text-xs text-gray-500">{req.phone}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{req.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {req.planName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ₹{req.planPrice?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4">
                      {req.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openApprove(req)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => openReject(req)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {req.reviewedAt && new Date(req.reviewedAt).toLocaleDateString('en-IN')}
                          {req.adminNotes && ` · ${req.adminNotes}`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Approve Upgrade Request</h2>
              <p className="text-sm text-gray-500 mt-1">This will create a new company and owner account.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-900">{selectedRequest.companyName}</p>
                <p className="text-xs text-gray-500">{selectedRequest.firstName} {selectedRequest.lastName || ''} · {selectedRequest.email}{selectedRequest.phone && ` · ${selectedRequest.phone}`}</p>
                <p className="text-sm font-bold text-emerald-700 mt-2">{selectedRequest.planName} — ₹{selectedRequest.planPrice?.toLocaleString('en-IN')}/mo</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Owner Default Password</label>
                <input
                  type="text"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Welcome@123"
                />
                <p className="text-xs text-gray-400 mt-1">The owner can change this after first login.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Admin Notes (optional)</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g., Paid via UPI on 25 Aug"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button onClick={() => setShowApproveModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleApprove} disabled={isProcessing}
                className="px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center gap-2">
                {isProcessing ? 'Creating...' : <><UserPlus className="w-4 h-4" /> Approve & Create Company</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Reject Upgrade Request</h2>
              <p className="text-sm text-gray-500 mt-1">Are you sure you want to reject this request?</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-900">{selectedRequest.companyName}</p>
                <p className="text-xs text-gray-500">{selectedRequest.firstName} {selectedRequest.lastName || ''} · {selectedRequest.email}{selectedRequest.phone && ` · ${selectedRequest.phone}`}</p>
                <p className="text-sm font-bold text-red-700 mt-2">{selectedRequest.planName} — ₹{selectedRequest.planPrice?.toLocaleString('en-IN')}/mo</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reason / Notes (optional)</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g., Duplicate request, Payment not received"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleReject} disabled={isProcessing}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-70 flex items-center gap-2">
                {isProcessing ? 'Rejecting...' : <><Ban className="w-4 h-4" /> Reject Request</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
