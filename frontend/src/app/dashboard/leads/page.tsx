'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, Upload, MoreHorizontal, Search, Phone, Calendar, Trash2, Star, MessageSquare, History, Edit, PhoneCall } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import CallTimerModal from '@/components/CallTimerModal';
import ImportLeadsModal from '@/components/ImportLeadsModal';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  priority: string;
  createdAt: string;
  conversionChance?: number;
  inquiryDate?: string;
  serviceName?: string;
  nextFollowUpAt?: string;
  revenueAmount?: number;
  assignedTo?: { firstName: string, lastName: string };
  campaign?: { name: string };
}

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    firstName: '',
    lastName: '', // keep in state in case we need it, but we'll use firstName for Full Name
    phone: '',
    email: '',
    source: 'MANUAL',
    campaignId: '',
    priority: 'NORMAL',
    inquiryDate: new Date().toISOString().split('T')[0],
    serviceName: '',
    businessDetails: '',
    conversionChance: 0,
    nextFollowUpAt: '',
    status: 'FOLLOW_UP',
    initialNotes: ''
  });

  const [campaignsList, setCampaignsList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);

  // Filter states
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterChance, setFilterChance] = useState('');
  const [sort, setSort] = useState('newest');

  // We need to re-fetch leads whenever a filter changes, but to avoid infinite loops with useEffect,
  // we can use a dedicated useEffect for filters, OR just call fetchLeads on onChange.
  // Using useEffect is cleaner for multiple independent filters.
  useEffect(() => {
    fetchLeads();
  }, [searchParams, filterCampaign, filterService, filterStatus, filterChance, sort]);

  useEffect(() => {
    fetchDropdownData();
  }, [searchParams]);

  const fetchDropdownData = async () => {
    try {
      const [campRes, servRes] = await Promise.all([
        api.get('/campaigns').catch(() => ({ data: { data: [] } })),
        api.get('/services').catch(() => ({ data: { data: [] } }))
      ]);
      setCampaignsList(campRes.data?.data || campRes.data || []);
      setServicesList(servRes.data?.data || servRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Follow-up modal state
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [followUpData, setFollowUpData] = useState({ date: '', note: '' });

  // Update modal state
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: 'NEW',
    revenue: '',
    cancellationReason: '',
    note: '',
    nextFollowUpAt: ''
  });

  // History modal state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [leadHistory, setLeadHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Call Timer modal state
  const [isCallTimerOpen, setIsCallTimerOpen] = useState(false);
  const [callingLead, setCallingLead] = useState<any>(null);

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    
    setIsScheduling(true);
    try {
      await api.post(`/leads/${selectedLead}/follow-up`, {
        nextFollowUpAt: new Date(followUpData.date).toISOString(),
        note: followUpData.note
      });
      toast.success('Follow-up scheduled successfully!');
      setIsFollowUpOpen(false);
      setFollowUpData({ date: '', note: '' });
      fetchLeads();
    } catch (error) {
      toast.error('Failed to schedule follow-up');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      await api.patch(`/leads/${selectedLead}/status`, {
        status: updateData.status,
        revenueAmount: updateData.status === 'CONVERTED' ? Number(updateData.revenue) : undefined,
        cancelReason: updateData.status === 'CLOSED' ? updateData.cancellationReason : undefined,
        notes: updateData.note || undefined
      });
      if (updateData.nextFollowUpAt) {
        await api.post(`/leads/${selectedLead}/follow-up`, {
          nextFollowUpAt: new Date(updateData.nextFollowUpAt).toISOString(),
          note: updateData.note || 'Scheduled follow-up'
        });
      }
      toast.success('Lead updated successfully');
      setIsUpdateOpen(false);
      fetchLeads();
    } catch (err) {
      toast.error('Failed to update lead');
    }
  };

  const handleStatusChange = async (leadId: string, status: string) => {
    try {
      await api.patch(`/leads/${leadId}/status`, { status });
      toast.success('Status updated');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openHistory = async (leadId: string) => {
    setSelectedLead(leadId);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/leads/${leadId}/history`);
      setLeadHistory(res.data.data || res.data || []);
    } catch (err) {
      toast.error('Failed to fetch history');
      setLeadHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Removed useEffect from here since it was moved above

  const fetchLeads = async (priorityOverride?: string) => {
    try {
      setLoading(true);
      let query = `/leads?search=${encodeURIComponent(search)}`;
      const activePriority = priorityOverride !== undefined ? priorityOverride : priorityFilter;
      if (activePriority) query += `&priority=${activePriority}`;
      
      if (filterCampaign) query += `&campaignId=${filterCampaign}`;
      if (filterService) query += `&serviceName=${encodeURIComponent(filterService)}`;
      if (filterStatus) query += `&status=${filterStatus}`;
      if (filterChance) query += `&conversionChance=${filterChance}`;
      if (sort) query += `&sort=${sort}`;
      
      const res = await api.get(query);
      setLeads(res.data.data || res.data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (leads.length === 0) return toast.error('No leads to export');
    const headers = ['Name', 'Phone', 'Email', 'Priority', 'Status', 'Created At'];
    const csvContent = leads.map(l => 
      `"${l.firstName} ${l.lastName || ''}","${l.phone}","${l.email || ''}","${l.priority}","${l.status || 'NEW'}","${new Date(l.createdAt).toLocaleDateString()}"`
    );
    csvContent.unshift(headers.join(','));
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'leads_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Leads exported successfully');
  };

  const deleteLead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead deleted');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/leads', newLead);
      setIsModalOpen(false);
      setNewLead({ 
        firstName: '', lastName: '', phone: '', email: '', source: 'MANUAL', priority: 'NORMAL', campaignId: '',
        inquiryDate: new Date().toISOString().split('T')[0], serviceName: '', businessDetails: '', conversionChance: 0, initialNotes: '', nextFollowUpAt: '', status: 'FOLLOW_UP'
      });
      fetchLeads();
      toast.success('Lead added successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to add lead');
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-800';
      case 'FOLLOW_UP': return 'bg-orange-100 text-orange-800';
      case 'INTERESTED': return 'bg-teal-100 text-teal-800';
      case 'NOT_INTERESTED': return 'bg-gray-100 text-gray-800';
      case 'CONVERTED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const formatStatus = (status: string) => {
    if (!status) return 'New';
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">
            A list of all the leads in your account including their name, title, email and role.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          >
            <Upload className="-ml-1 mr-2 h-4 w-4 text-teal-600" />
            Import CSV
          </button>
          <button 
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          >
            <Download className="-ml-1 mr-2 h-4 w-4" />
            Export
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative flex-grow sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm"
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
          />
        </div>
        <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} className="py-2 pl-3 pr-8 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All Campaigns</option>
          {campaignsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <select value={filterService} onChange={e => setFilterService(e.target.value)} className="py-2 pl-3 pr-8 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All Services</option>
          {servicesList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="py-2 pl-3 pr-8 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="FOLLOW_UP">Follow Up</option>
          <option value="INTERESTED">Interested</option>
          <option value="NOT_INTERESTED">Not Interested</option>
          <option value="CONVERTED">Converted</option>
          <option value="CLOSED">Closed</option>
        </select>
        
        <select value={filterChance} onChange={e => setFilterChance(e.target.value)} className="py-2 pl-3 pr-8 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All Chances (Stars)</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
        
        <select value={sort} onChange={e => setSort(e.target.value)} className="py-2 pl-3 pr-8 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:ml-auto">
          <option value="newest">Sort: Newest First</option>
          <option value="oldest">Sort: Oldest First</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow-up</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No leads found. Create one to get started!
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.inquiryDate ? new Date(lead.inquiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : new Date(lead.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.firstName} {lead.lastName}
                      </div>
                      <div className="flex mt-1">
                        {[1,2,3,4,5].map(star => (
                          <Star key={star} className={`w-3 h-3 ${star <= (lead.conversionChance || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-600 flex items-center gap-1 font-medium">
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {lead.campaign?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {lead.serviceName || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                        {formatStatus(lead.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {lead.revenueAmount ? `₹${lead.revenueAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : 'System'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCallingLead(lead);
                            setIsCallTimerOpen(true);
                          }}
                          className="border border-gray-300 rounded-lg p-1.5 text-teal-600 bg-white hover:bg-teal-50 hover:border-teal-500 transition-colors flex items-center justify-center w-[30px] h-[30px] cursor-pointer"
                          title="Call Lead with Duration Tracker"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </button>
                        <a 
                          href={`https://wa.me/91${lead.phone.replace(/\D/g,'')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="border border-gray-300 rounded-lg p-1.5 text-green-600 bg-white hover:bg-green-50 transition-colors font-bold text-xs flex items-center justify-center w-[30px] h-[30px]"
                          title="WhatsApp"
                        >
                          WA
                        </a>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead.id);
                            setUpdateData({...updateData, status: lead.status || 'NEW', revenue: '', cancellationReason: '', note: '', nextFollowUpAt: ''});
                            setIsUpdateOpen(true);
                          }}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm ml-2"
                        >
                          <Calendar className="w-4 h-4 text-gray-500" />
                          Update
                        </button>
                        
                        <div className="relative group/menu ml-1">
                          <button className="border border-gray-300 rounded-lg p-1.5 text-gray-500 bg-white hover:bg-gray-50 hover:text-gray-700 transition-colors flex items-center justify-center w-[30px] h-[30px]">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 z-10 opacity-0 group-hover/menu:opacity-100 invisible group-hover/menu:visible transition-all">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/leads/${lead.id}`);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Search className="w-4 h-4" /> View Details
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                openHistory(lead.id);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <History className="w-4 h-4" /> View History
                            </button>
                            <button 
                              onClick={(e) => deleteLead(e, lead.id)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">1</span> to <span className="font-medium">{leads.length}</span> of <span className="font-medium">{leads.length}</span> results
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Lead Information
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleCreateLead} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Inquiry Date *</label>
                  <input required type="date" value={newLead.inquiryDate} onChange={e => setNewLead({...newLead, inquiryDate: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Customer Name *</label>
                  <input required placeholder="Full name" value={newLead.firstName} onChange={e => setNewLead({...newLead, firstName: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Phone Number *</label>
                <input required placeholder="10-digit mobile number" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Campaign Source *</label>
                  <select required value={newLead.campaignId} onChange={e => setNewLead({...newLead, campaignId: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                    <option value="">Select campaign</option>
                    {campaignsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    {campaignsList.length === 0 && <option value="manual">Manual Entry</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Service Required *</label>
                  <input required placeholder="e.g. Social Media Marketing" value={newLead.serviceName} onChange={e => setNewLead({...newLead, serviceName: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Business Details</label>
                <textarea rows={2} placeholder="e.g. Restaurant business wants Instagram marketing" value={newLead.businessDetails} onChange={e => setNewLead({...newLead, businessDetails: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Conversion Chance</label>
                <div className="inline-flex items-center gap-1 border border-gray-100 bg-gray-50/50 rounded-xl px-4 py-2">
                  {[1,2,3,4,5].map(star => (
                    <button type="button" key={star} onClick={() => setNewLead({...newLead, conversionChance: star})} className="focus:outline-none hover:scale-110 transition-transform">
                      <Star className={`w-8 h-8 ${star <= newLead.conversionChance ? 'text-amber-400 fill-current drop-shadow-sm' : 'text-gray-200'}`} />
                    </button>
                  ))}
                  <span className="ml-3 text-sm font-medium text-gray-500">
                    {newLead.conversionChance === 1 && 'Very Low'}
                    {newLead.conversionChance === 2 && 'Low'}
                    {newLead.conversionChance === 3 && 'Medium'}
                    {newLead.conversionChance === 4 && 'High'}
                    {newLead.conversionChance === 5 && 'Very High'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Next Follow-up Date *</label>
                <input required type="date" value={newLead.nextFollowUpAt} onChange={e => setNewLead({...newLead, nextFollowUpAt: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Conversation Details (optional)</label>
                <textarea rows={3} placeholder="Enter initial conversation details..." value={newLead.initialNotes} onChange={e => setNewLead({...newLead, initialNotes: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
                <select value={newLead.status} onChange={e => setNewLead({...newLead, status: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                  <option value="NEW">New</option>
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-3 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm">Add Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {isFollowUpOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" /> Set Follow-up
              </h3>
              <button onClick={() => setIsFollowUpOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleScheduleFollowUp} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                <input required type="datetime-local" value={followUpData.date} onChange={e => setFollowUpData({...followUpData, date: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
                <textarea rows={3} value={followUpData.note} onChange={e => setFollowUpData({...followUpData, note: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 resize-none focus:ring-2 focus:ring-teal-500 outline-none" placeholder="What to discuss..."></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsFollowUpOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium">Cancel</button>
                <button type="submit" disabled={isScheduling} className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50">
                  {isScheduling ? 'Saving...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {isUpdateOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-teal-600" /> Update Lead
              </h3>
              <button onClick={() => setIsUpdateOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleUpdateLead} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={updateData.status} onChange={e => setUpdateData({...updateData, status: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="NEW">New</option>
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              
              {updateData.status === 'CONVERTED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Revenue Amount (₹)</label>
                  <input type="number" required value={updateData.revenue} onChange={e => setUpdateData({...updateData, revenue: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
              )}

              {updateData.status === 'CLOSED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Reason</label>
                  <textarea rows={2} required value={updateData.cancellationReason} onChange={e => setUpdateData({...updateData, cancellationReason: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none resize-none"></textarea>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conversation Notes</label>
                <textarea rows={3} value={updateData.note} onChange={e => setUpdateData({...updateData, note: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none resize-none" placeholder="Add notes..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Follow-up (Optional)</label>
                <input type="datetime-local" value={updateData.nextFollowUpAt} onChange={e => setUpdateData({...updateData, nextFollowUpAt: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsUpdateOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors shadow-sm">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-teal-600" /> Activity Timeline
              </h3>
              <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="text-center py-8 text-gray-500">Loading history...</div>
              ) : leadHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No activity history found.</div>
              ) : (
                <div className="space-y-6">
                  {leadHistory.map((item, index) => (
                    <div key={item.id || index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        {index !== leadHistory.length - 1 && <div className="w-px h-full bg-gray-200 my-1"></div>}
                      </div>
                      <div className="pb-6">
                        <p className="text-sm text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{item.type?.replace(/_/g, ' ') || 'Activity'}</p>
                        {item.description && <p className="text-sm text-gray-700 mt-1">{item.description}</p>}
                        {item.note && <div className="mt-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100 text-gray-700">{item.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Call Timer Modal for Fast Calling directly from Table */}
      <CallTimerModal
        isOpen={isCallTimerOpen}
        onClose={() => setIsCallTimerOpen(false)}
        lead={callingLead}
        onSuccess={fetchLeads}
      />
      {/* Bulk CSV Importer Modal */}
      <ImportLeadsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchLeads}
      />
    </div>
  );
}
