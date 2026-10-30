'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, X, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportLeadsModal({ isOpen, onClose, onSuccess }: ImportLeadsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Download Sample CSV
  const handleDownloadSample = () => {
    const csvHeader = 'First Name,Last Name,Phone,Email,Company,Service,Priority,Status,Notes\n';
    const sampleData = [
      'Vikram,Sharma,+919876543210,vikram@example.com,Apex Traders,CRM Software,HIGH,NEW,Looking for 10 user licenses',
      'Ananya,Deshmukh,+919812345678,ananya@sample.in,Deshmukh Retail,WhatsApp API,NORMAL,FOLLOW_UP,Requested pricing brochure',
      'Rohan,Mehta,+919988776655,rohan@mehtatech.com,Mehta Tech,Telephony Sync,URGENT,INTERESTED,Needs demo call this week'
    ].join('\n');

    const blob = new Blob([csvHeader + sampleData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'glovacrm_leads_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV text
  const parseCSV = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      toast.error('The selected CSV file appears to be empty or missing header rows.');
      return;
    }

    // Parse header
    const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    setHeaders(rawHeaders);

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      // Handle quoted commas safely
      const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
      const matches = lines[i].match(/(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g) || [];
      const values = matches.map(val => val.replace(/^,/, '').trim().replace(/^["']|["']$/g, ''));

      if (values.length === 0 || values.every(v => v === '')) continue;

      const rowObj: any = {};
      rawHeaders.forEach((header, index) => {
        rowObj[header] = values[index] || '';
      });
      rows.push(rowObj);
    }

    setParsedRows(rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.endsWith('.csv')) {
      toast.error('Please upload a valid .csv file');
      return;
    }
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCSV(content);
    };
    reader.readAsText(selected);
  };

  // Map parsed rows into GlovaCRM lead schema
  const normalizeLeads = () => {
    return parsedRows.map((row) => {
      // Find matching keys
      const firstNameKey = Object.keys(row).find(k => /first.*name|name|full.*name/i.test(k));
      const lastNameKey = Object.keys(row).find(k => /last.*name/i.test(k));
      const phoneKey = Object.keys(row).find(k => /phone|mobile|contact|tel/i.test(k));
      const emailKey = Object.keys(row).find(k => /email|mail/i.test(k));
      const companyKey = Object.keys(row).find(k => /company|business|org/i.test(k));
      const serviceKey = Object.keys(row).find(k => /service|product|interest/i.test(k));
      const priorityKey = Object.keys(row).find(k => /priority/i.test(k));
      const statusKey = Object.keys(row).find(k => /status/i.test(k));
      const notesKey = Object.keys(row).find(k => /note|remark|comment/i.test(k));

      let fName = firstNameKey ? row[firstNameKey] : 'Unknown';
      let lName = lastNameKey ? row[lastNameKey] : '';

      // If full name in single column
      if (!lName && fName.includes(' ')) {
        const parts = fName.split(' ');
        fName = parts[0];
        lName = parts.slice(1).join(' ');
      }

      return {
        firstName: fName || 'Lead',
        lastName: lName || '',
        phone: phoneKey ? row[phoneKey] : '',
        email: emailKey ? row[emailKey] : '',
        companyName: companyKey ? row[companyKey] : '',
        serviceName: serviceKey ? row[serviceKey] : '',
        priority: priorityKey && ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(row[priorityKey].toUpperCase()) 
          ? row[priorityKey].toUpperCase() 
          : 'NORMAL',
        status: statusKey && ['NEW', 'CONTACTED', 'FOLLOW_UP', 'INTERESTED', 'CONVERTED', 'CLOSED'].includes(row[statusKey].toUpperCase()) 
          ? row[statusKey].toUpperCase() 
          : 'NEW',
        notes: notesKey ? row[notesKey] : '',
        source: 'CSV_IMPORT'
      };
    }).filter(l => l.phone && l.phone.trim().length >= 6); // Require valid phone
  };

  const handleImport = async () => {
    const validLeads = normalizeLeads();
    if (validLeads.length === 0) {
      toast.error('No valid leads with phone numbers found in the file.');
      return;
    }

    setLoading(true);
    setUploadProgress(`Importing ${validLeads.length} leads in batches...`);

    try {
      // Chunk into batches of 100 for reliable processing
      const chunkSize = 100;
      let totalImported = 0;

      for (let i = 0; i < validLeads.length; i += chunkSize) {
        const chunk = validLeads.slice(i, i + chunkSize);
        const res = await api.post('/leads/bulk', { leads: chunk });
        totalImported += res.data.count || chunk.length;
        setUploadProgress(`Imported ${Math.min(totalImported, validLeads.length)} of ${validLeads.length}...`);
      }

      toast.success(`Successfully imported ${validLeads.length} leads!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to import leads. Please verify CSV format.');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Bulk Import Leads</h3>
              <p className="text-xs text-gray-500">Upload a CSV file to add multiple leads in seconds</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Download Sample Button */}
          <div className="flex items-center justify-between p-4 bg-teal-50/60 rounded-xl border border-teal-100">
            <div>
              <p className="text-sm font-semibold text-teal-900">Need a template to format your leads?</p>
              <p className="text-xs text-teal-700 mt-0.5">Download our pre-formatted sample CSV with all supported fields.</p>
            </div>
            <button
              onClick={handleDownloadSample}
              className="px-3.5 py-2 bg-white text-teal-700 border border-teal-200 rounded-lg text-xs font-semibold hover:bg-teal-50 flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download Sample CSV
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 hover:border-teal-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-teal-50/20 transition-all text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-900">
              {file ? file.name : 'Click to upload or drag & drop CSV here'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports .csv files (Comma-separated values) with phone numbers
            </p>
          </div>

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Preview (Found {parsedRows.length} rows):
                </p>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> CSV parsed successfully
                </span>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-48">
                <table className="min-w-full text-left text-xs divide-y divide-gray-200">
                  <thead className="bg-gray-50 text-gray-600 font-semibold">
                    <tr>
                      {headers.slice(0, 5).map((h, idx) => (
                        <th key={idx} className="px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-gray-800">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {headers.slice(0, 5).map((h, hIdx) => (
                          <td key={hIdx} className="px-3 py-2 truncate max-w-[150px]">{row[h] || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 5 && (
                <p className="text-xs text-gray-400 italic">Showing first 5 of {parsedRows.length} rows</p>
              )}
            </div>
          )}

          {uploadProgress && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              {uploadProgress}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={parsedRows.length === 0 || loading}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            {loading ? 'Importing...' : `Import ${parsedRows.length > 0 ? parsedRows.length : ''} Leads`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
