'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MessageSquareText, Plus, Search, Filter, Edit3, Trash2, Eye, 
  ToggleLeft, ToggleRight, History, X, ChevronDown, Copy, Tag 
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  content: string;
  status: 'ACTIVE' | 'INACTIVE';
  categoryId: string;
  category: Category;
  waStatus?: string;
  waTemplateName?: string;
  createdBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface TemplateVersion {
  id: string;
  version: number;
  content: string;
  createdAt: string;
  changedBy: { firstName: string; lastName: string };
}

const VARIABLES = [
  '{{customer_name}}',
  '{{business_name}}',
  '{{followup_date}}',
  '{{telecaller_name}}',
  '{{manager_name}}',
  '{{lead_status}}'
];

export default function TemplatesPage() {
  const { user } = useAuth();
  
  // State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters and Pagination
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  
  // Forms
  const [formData, setFormData] = useState({ name: '', content: '', categoryId: '', status: 'ACTIVE' });
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#14b8a6' });
  const [previewData, setPreviewData] = useState<{ original: string, resolved: string, variables: string[] } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/wa-templates?page=${page}&limit=12&search=${search}&categoryId=${filterCategory}&status=${filterStatus}`);
      setTemplates(res.data.data);
      setTotalPages(res.data.meta.totalPages);
      setTotal(res.data.meta.total);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCategory, filterStatus]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/wa-templates/categories');
      setCategories(res.data.data);
    } catch (error) {
      toast.error('Failed to load categories');
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Actions
  const handleCreate = async () => {
    if (!formData.name || !formData.content || !formData.categoryId) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await api.post('/wa-templates', formData);
      toast.success('Template created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', content: '', categoryId: '', status: 'ACTIVE' });
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create template');
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate) return;
    try {
      await api.patch(`/wa-templates/${selectedTemplate.id}`, formData);
      toast.success('Template updated successfully');
      setShowEditModal(false);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`/wa-templates/${id}`);
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/wa-templates/${id}/toggle`);
      toast.success('Template status updated');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const syncMetaTemplate = async (id: string) => {
    try {
      await api.post(`/wa-templates/${id}/sync-meta`);
      toast.success('Template synced with Meta successfully');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to sync with Meta');
    }
  };

  const openPreview = async (template: Template) => {
    setSelectedTemplate(template);
    try {
      const res = await api.post(`/wa-templates/${template.id}/preview`, {});
      setPreviewData(res.data.data);
      setShowPreviewModal(true);
    } catch (error) {
      toast.error('Failed to load preview');
    }
  };

  const openVersions = async (template: Template) => {
    setSelectedTemplate(template);
    try {
      const res = await api.get(`/wa-templates/${template.id}/versions`);
      setVersions(res.data.data);
      setShowVersionsModal(true);
    } catch (error) {
      toast.error('Failed to load versions');
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name) return;
    try {
      await api.post('/wa-templates/categories', categoryForm);
      toast.success('Category created');
      setCategoryForm({ name: '', color: '#14b8a6' });
      fetchCategories();
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete category?')) return;
    try {
      await api.delete(`/wa-templates/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;

    const newText = text.substring(0, start) + variable + text.substring(end);
    setFormData({ ...formData, content: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const renderContentPreview = (content: string) => {
    const parts = content.split(/(\{\{[^}]+\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        return <span key={i} className="text-teal-600 font-medium bg-teal-50 px-1 rounded">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Derived stats
  const activeCount = templates.filter(t => t.status === 'ACTIVE').length;
  const inactiveCount = templates.filter(t => t.status === 'INACTIVE').length;

  const canCreateEdit = user?.role === 'TENANT_ADMIN' || user?.role === 'TEAM_MANAGER';
  const isTenantAdmin = user?.role === 'TENANT_ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
            <MessageSquareText className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Templates</h1>
        </div>
        <div className="flex items-center gap-3">
          {isTenantAdmin && (
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Manage Categories
            </button>
          )}
          {canCreateEdit && (
            <button
              onClick={() => {
                setFormData({ name: '', content: '', categoryId: '', status: 'ACTIVE' });
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg px-4 py-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Template
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <p className="text-sm font-medium text-gray-500">Total Templates</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{total}</p>
        </div>
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <p className="text-sm font-medium text-gray-500">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{activeCount}</p>
        </div>
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <p className="text-sm font-medium text-gray-500">Inactive</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{inactiveCount}</p>
        </div>
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          <p className="text-sm font-medium text-gray-500">Categories</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">{categories.length}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-teal-500 min-w-[150px]"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-teal-500 min-w-[150px]"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-500">
          No templates found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {templates.map(template => {
            const matches = template.content.match(/\{\{([^}]+)\}\}/g) || [];
            const uniqueVariables = Array.from(new Set(matches));

            return (
              <div key={template.id} className="bg-white shadow-sm border border-gray-200 rounded-xl p-6 flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${template.category?.color || '#cbd5e1'}20`, color: template.category?.color || '#475569' }}
                  >
                    {template.category?.name || 'Uncategorized'}
                  </span>
                  <div className="flex items-center gap-2">
                    {template.waStatus && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${template.waStatus === 'APPROVED' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                        Meta: {template.waStatus}
                      </span>
                    )}
                    <span className={`w-2.5 h-2.5 rounded-full ${template.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`} title={template.status}></span>
                  </div>
                </div>
                
                <h3 className="font-bold text-gray-900 text-lg mb-2 truncate">{template.name}</h3>
                
                <p className="text-gray-500 text-sm mb-4 line-clamp-3 flex-1">
                  {template.content.length > 120 ? template.content.substring(0, 120) + '...' : template.content}
                </p>
                
                {uniqueVariables.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {uniqueVariables.slice(0, 3).map((v, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                        {v}
                      </span>
                    ))}
                    {uniqueVariables.length > 3 && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        +{uniqueVariables.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                  <div className="text-xs text-gray-500">
                    <p>By: {template.createdBy?.firstName}</p>
                    <p>{new Date(template.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openPreview(template)} className="p-1.5 text-gray-400 hover:text-teal-600 rounded transition-colors" title="Preview">
                      <Eye className="w-4 h-4" />
                    </button>
                    {canCreateEdit && (
                      <button 
                        onClick={() => {
                          setSelectedTemplate(template);
                          setFormData({ name: template.name, content: template.content, categoryId: template.categoryId, status: template.status });
                          setShowEditModal(true);
                        }} 
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {canCreateEdit && (
                      <button onClick={() => syncMetaTemplate(template.id)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors" title="Sync with Meta">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
                      </button>
                    )}
                    {isTenantAdmin && (
                      <>
                        <button onClick={() => handleToggle(template.id)} className="p-1.5 text-gray-400 hover:text-gray-800 rounded transition-colors" title="Toggle Status">
                          {template.status === 'ACTIVE' ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(template.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {isTenantAdmin && (
                      <button onClick={() => openVersions(template)} className="p-1.5 text-gray-400 hover:text-purple-600 rounded transition-colors" title="Version History">
                        <History className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination (Simple for brevity, replace with actual logic if needed) */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded bg-white border border-gray-200 disabled:opacity-50">Prev</button>
          <span className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded">
            {page} / {totalPages}
          </span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded bg-white border border-gray-200 disabled:opacity-50">Next</button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">
                {showCreateModal ? 'Create New Template' : 'Edit Template'}
              </h2>
              <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    placeholder="e.g. Welcome Message"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select 
                    value={formData.categoryId} 
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-medium text-gray-700">Template Content *</label>
                </div>
                
                <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex flex-wrap gap-1">
                    {VARIABLES.map(v => (
                      <button 
                        key={v}
                        onClick={() => insertVariable(v)}
                        className="text-xs bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-teal-700 px-2 py-1 rounded shadow-sm font-mono transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <textarea 
                    ref={textareaRef}
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full p-4 border-none focus:ring-0 resize-y outline-none font-sans text-gray-800"
                    rows={8}
                    placeholder="Hello {{customer_name}}, thank you for..."
                  ></textarea>
                </div>
              </div>

              {formData.content && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Live Preview</label>
                  <div className="bg-green-50 p-4 rounded-lg text-gray-800 whitespace-pre-wrap text-sm border border-green-100 relative">
                    {renderContentPreview(formData.content)}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={showCreateModal ? handleCreate : handleUpdate}
                className="px-4 py-2 bg-teal-600 text-white font-medium hover:bg-teal-700 rounded-lg transition-colors"
              >
                {showCreateModal ? 'Create Template' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && previewData && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Preview: {selectedTemplate.name}</h2>
              <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Original Template</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap border border-gray-200">
                  {renderContentPreview(previewData.original)}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resolved Example</h4>
                <div className="bg-green-50 p-4 rounded-lg text-sm whitespace-pre-wrap border border-green-200 text-gray-800">
                  {previewData.resolved}
                </div>
              </div>
              {previewData.variables.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Variables Used</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewData.variables.map(v => (
                      <span key={v} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Versions Modal */}
      {showVersionsModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Version History: {selectedTemplate.name}</h2>
              <button onClick={() => setShowVersionsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
              {versions.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No previous versions found.</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {versions.map(v => (
                    <li key={v.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">v{v.version}</span>
                        <div className="text-xs text-gray-500 text-right">
                          <p>{new Date(v.createdAt).toLocaleString()}</p>
                          <p>By {v.changedBy.firstName} {v.changedBy.lastName}</p>
                        </div>
                      </div>
                      <div className="text-sm bg-white border border-gray-200 p-3 rounded mt-2 whitespace-pre-wrap text-gray-700">
                        {renderContentPreview(v.content)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Manage Categories</h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-2">
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center">No categories yet.</p>
                ) : (
                  categories.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }}></div>
                        <span className="font-medium text-gray-700">{c.name}</span>
                      </div>
                      <button onClick={() => handleDeleteCategory(c.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Add New Category</h4>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                    title="Choose color"
                  />
                  <input
                    type="text"
                    placeholder="Category name"
                    value={categoryForm.name}
                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                  />
                  <button 
                    onClick={handleCreateCategory}
                    disabled={!categoryForm.name}
                    className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
