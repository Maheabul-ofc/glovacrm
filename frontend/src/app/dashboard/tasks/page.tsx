'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Calendar, Clock, AlertCircle, Phone } from 'lucide-react';
import Link from 'next/link';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leads?hasFollowUp=true&assignedToId=${user?.id}`);
      setTasks(res.data.data);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async (leadId: string) => {
    try {
      // Just clear the follow-up date to mark it complete
      await api.post(`/leads/${leadId}/follow-up`, { nextFollowUpAt: null });
      toast.success('Task marked as complete!');
      fetchTasks();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  if (loading) return <div className="text-gray-500 p-8">Loading tasks...</div>;

  const now = new Date();
  
  const overdue = tasks.filter(t => new Date(t.nextFollowUpAt) < now);
  
  // Tasks for today (in the future, but today)
  const today = tasks.filter(t => {
    const d = new Date(t.nextFollowUpAt);
    return d >= now && d.toDateString() === now.toDateString();
  });
  
  const upcoming = tasks.filter(t => {
    const d = new Date(t.nextFollowUpAt);
    return d >= now && d.toDateString() !== now.toDateString();
  });

  const TaskCard = ({ lead, type }: { lead: any, type: 'overdue' | 'today' | 'upcoming' }) => {
    const d = new Date(lead.nextFollowUpAt);
    const isOverdue = type === 'overdue';

    return (
      <div className={`p-5 rounded-xl border shadow-sm transition-all hover:shadow-md ${isOverdue ? 'bg-red-50 border-red-100' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-bold text-gray-900 flex items-center gap-2">
              {lead.firstName} {lead.lastName}
            </h4>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <Phone className="w-3 h-3" /> {lead.phone}
            </p>
          </div>
          <div className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
            <Clock className="w-3 h-3" />
            {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {!isOverdue && d.toDateString() !== now.toDateString() && ` - ${d.toLocaleDateString()}`}
          </div>
        </div>
        
        {lead.notes && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-4 border border-gray-100 line-clamp-2">
            "{lead.notes}"
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <Link 
            href={`/dashboard/leads?search=${lead.phone}`}
            className="flex-1 py-1.5 px-3 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-sm font-medium text-center transition-colors"
          >
            View Lead
          </Link>
          <button 
            onClick={() => markComplete(lead.id)}
            className="flex-1 py-1.5 px-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
          >
            Mark Done
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your scheduled follow-ups and calls.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Overdue */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
            <div className="bg-red-100 p-1.5 rounded-lg text-red-600"><AlertCircle className="w-4 h-4" /></div>
            Overdue <span className="text-gray-500 font-medium text-sm ml-auto">{overdue.length}</span>
          </h3>
          {overdue.length === 0 ? (
            <p className="text-sm text-gray-500">No overdue tasks. Great job!</p>
          ) : (
            overdue.map(lead => <TaskCard key={lead.id} lead={lead} type="overdue" />)
          )}
        </div>

        {/* Today */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
            <div className="bg-teal-100 p-1.5 rounded-lg text-teal-600"><Clock className="w-4 h-4" /></div>
            Due Today <span className="text-gray-500 font-medium text-sm ml-auto">{today.length}</span>
          </h3>
          {today.length === 0 ? (
            <p className="text-sm text-gray-500">No tasks due today.</p>
          ) : (
            today.map(lead => <TaskCard key={lead.id} lead={lead} type="today" />)
          )}
        </div>

        {/* Upcoming */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><Calendar className="w-4 h-4" /></div>
            Upcoming <span className="text-gray-500 font-medium text-sm ml-auto">{upcoming.length}</span>
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming tasks scheduled.</p>
          ) : (
            upcoming.map(lead => <TaskCard key={lead.id} lead={lead} type="upcoming" />)
          )}
        </div>

      </div>
    </div>
  );
}
