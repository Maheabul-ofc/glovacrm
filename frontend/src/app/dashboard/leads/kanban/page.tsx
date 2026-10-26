'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '@/lib/api';
import Link from 'next/link';
import { LayoutList } from 'lucide-react';

import { toast } from 'sonner';

export default function KanbanBoard() {
  const [stages, setStages] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stagesRes, leadsRes] = await Promise.all([
        api.get('/stages'),
        api.get('/leads?limit=1000') // Get all active leads for board
      ]);
      setStages(stagesRes.data);
      setLeads(leadsRes.data.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load board data');
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Optimistically update UI
    const updatedLeads = [...leads];
    const leadIndex = updatedLeads.findIndex(l => l.id === draggableId);
    
    if (leadIndex === -1) return;
    
    const previousStageId = updatedLeads[leadIndex].stageId;
    const newStageId = destination.droppableId;
    const stageName = stages.find(s => s.id === newStageId)?.name || 'New Stage';
    
    updatedLeads[leadIndex] = {
      ...updatedLeads[leadIndex],
      stageId: newStageId
    };
    
    setLeads(updatedLeads);

    // Call API
    if (previousStageId !== newStageId) {
      try {
        await api.patch(`/leads/${draggableId}`, { stageId: newStageId });
        toast.success(`Lead moved to ${stageName}`);
      } catch (error) {
        console.error('Failed to update lead status', error);
        toast.error('Failed to move lead. Reverting...');
        fetchData(); 
      }
    }
  };

  const leadsByStage = (stageId: string) => leads.filter(l => l.stageId === stageId);

  return (
    <div className="flex flex-col h-full space-y-6 overflow-hidden">
      <div className="sm:flex sm:items-center sm:justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Lead Kanban Board</h1>
          <p className="mt-1 text-sm text-gray-500">
            Drag and drop leads to update their current stage in the pipeline.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Link href="/dashboard/leads" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors">
            <LayoutList className="-ml-1 mr-2 h-4 w-4" />
            List View
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="inline-flex h-full items-start space-x-4 p-1">
              {stages.map((stage) => (
                <div key={stage.id} className="flex flex-col w-80 max-h-full bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                  <div className="p-3 border-b border-gray-200 bg-white/50">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color || '#6366f1' }}></span>
                        {stage.name}
                      </h3>
                      <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-1 rounded-full">
                        {leadsByStage(stage.id).length}
                      </span>
                    </div>
                  </div>
                  
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 p-3 overflow-y-auto min-h-[200px] transition-colors ${
                          snapshot.isDraggingOver ? 'bg-gray-200/50' : ''
                        }`}
                      >
                        <div className="space-y-3">
                          {leadsByStage(stage.id).map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white p-3 rounded-lg shadow-sm border ${
                                    snapshot.isDragging 
                                      ? 'border-teal-500 shadow-md ring-1 ring-teal-500' 
                                      : 'border-gray-200'
                                  }`}
                                  style={{ ...provided.draggableProps.style }}
                                >
                                  <div className="font-medium text-gray-900 text-sm">
                                    {lead.firstName} {lead.lastName}
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-xs">
                                    <span className="text-gray-500 truncate max-w-[150px]">
                                      {lead.companyName || lead.phone}
                                    </span>
                                    {lead.priority === 'HIGH' || lead.priority === 'URGENT' ? (
                                      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                        {lead.priority}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
              
              {/* Optional: Column for Unassigned/No Stage Leads */}
              <div className="flex flex-col w-80 max-h-full bg-gray-100 rounded-xl overflow-hidden border border-dashed border-gray-300 flex-shrink-0 opacity-75">
                <div className="p-3 border-b border-gray-200 bg-white/50">
                  <h3 className="text-sm font-medium text-gray-500">Uncategorized</h3>
                </div>
                <Droppable droppableId="unassigned">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex-1 p-3 overflow-y-auto min-h-[200px]"
                    >
                      {/* Similar rendering for leads with no stageId */}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          </DragDropContext>
        </div>
      )}
    </div>
  );
}
