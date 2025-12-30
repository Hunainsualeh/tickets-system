'use client';

import { useState } from 'react';
import { Badge } from './Badge';
import { MessageSquare, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Modal } from './Modal';
import { Button } from './Button';

interface KanbanCardProps {
  request: any;
  onClick: () => void;
  isAdmin?: boolean;
  onDragStart?: (e: React.DragEvent, request: any) => void;
}

function KanbanCard({ request, onClick, isAdmin, onDragStart }: KanbanCardProps) {
  // Determine planning status based on request status
  const getPlanningStatus = (status: string) => {
    if (['COMPLETED'].includes(status)) return 'Planned';
    if (['IN_PROGRESS'].includes(status)) return 'Planned';
    if (['APPROVED'].includes(status)) return 'Planned';
    return 'Planned';
  };

  // Determine priority variant
  const getPriorityVariant = (status: string) => {
    if (status === 'COMPLETED') return 'success';
    if (status === 'IN_PROGRESS') return 'warning';
    if (status === 'REJECTED') return 'danger';
    if (status === 'APPROVED') return 'info';
    return 'default';
  };

  // Map status to priority label
  const getPriorityLabel = (status: string) => {
    if (status === 'COMPLETED') return 'Medium';
    if (status === 'IN_PROGRESS') return 'Medium';
    if (status === 'REJECTED') return 'High';
    if (status === 'APPROVED') return 'Low';
    return 'Medium';
  };

  return (
    <div
      onClick={onClick}
      draggable={isAdmin}
      onDragStart={(e) => onDragStart && onDragStart(e, request)}
      className={`bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-all cursor-pointer group ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-slate-400">#{request.requestNumber || request.id.substring(0, 8)}</span>
        <Badge variant={getPriorityVariant(request.status)} size="sm">
          {getPriorityLabel(request.status)}
        </Badge>
      </div>

      {/* Title/Description */}
      <h4 className="text-sm font-medium text-slate-900 mb-1 line-clamp-1">{request.title || 'No Title'}</h4>
      <p className="text-xs text-slate-500 line-clamp-2 mb-4">
        {request.description || 'No description provided'}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-medium">
            {request.user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-xs text-slate-600 truncate max-w-[100px]">
            {request.user?.username || 'Unknown'}
          </span>
        </div>
        <span className="text-xs text-slate-400">{new Date(request.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  title: string;
  count: number;
  color: string;
  requests: any[];
  onCardClick: (request: any) => void;
  isAdmin?: boolean;
  onDragStart?: (e: React.DragEvent, request: any) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, status: string) => void;
  status: string;
}

function KanbanColumn({ title, count, color, requests, onCardClick, isAdmin, onDragStart, onDragOver, onDrop, status }: KanbanColumnProps) {
  const colorClasses = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    gray: 'bg-slate-500',
    orange: 'bg-orange-500',
  };

  return (
    <div 
      className="flex-1 min-w-[260px] sm:min-w-[280px] max-w-[320px]"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop && onDrop(e, status)}
    >
      {/* Column Header */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{title}</h3>
          <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${colorClasses[color as keyof typeof colorClasses] || 'bg-slate-500'} text-white text-xs font-semibold flex items-center justify-center`}>
            {count}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div className={`space-y-2 sm:space-y-3 min-h-[200px] rounded-xl p-2 sm:p-3 transition-colors ${
        requests.length === 0 
          ? 'border-2 border-dashed border-slate-200 bg-slate-50/30 flex items-center justify-center' 
          : 'bg-slate-50/50'
      }`}>
        {requests.length > 0 ? (
          requests.map((request) => (
            <KanbanCard
              key={request.id}
              request={request}
              onClick={() => onCardClick(request)}
              isAdmin={isAdmin}
              onDragStart={onDragStart}
            />
          ))
        ) : (
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
              <span className="text-2xl">+</span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm font-medium">
              Drop items here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  requests: any[];
  onRequestClick: (request: any) => void;
  isAdmin?: boolean;
  onStatusChange?: (requestId: string, newStatus: string) => void;
}

export function KanbanBoard({ requests, onRequestClick, isAdmin, onStatusChange }: KanbanBoardProps) {
  const [draggedRequest, setDraggedRequest] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [requestToUpdate, setRequestToUpdate] = useState<any>(null);

  // Filter requests by status
  const openRequests = requests.filter(r => r.status === 'PENDING');
  const approvedRequests = requests.filter(r => r.status === 'APPROVED');
  const rejectedRequests = requests.filter(r => r.status === 'REJECTED');
  const inProgressRequests = requests.filter(r => r.status === 'IN_PROGRESS');
  const completedRequests = requests.filter(r => r.status === 'COMPLETED');

  const handleDragStart = (e: React.DragEvent, request: any) => {
    if (!isAdmin) return;
    setDraggedRequest(request);
    e.dataTransfer.effectAllowed = 'move';
    // Set data to ensure drag works in some browsers
    e.dataTransfer.setData('text/plain', request.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    if (!isAdmin || !draggedRequest) return;
    e.preventDefault();
    
    if (draggedRequest.status !== status) {
      setRequestToUpdate(draggedRequest);
      setTargetStatus(status);
      setShowConfirmModal(true);
    }
    setDraggedRequest(null);
  };

  const handleConfirmMove = () => {
    if (requestToUpdate && targetStatus && onStatusChange) {
      onStatusChange(requestToUpdate.id, targetStatus);
    }
    setShowConfirmModal(false);
    setRequestToUpdate(null);
    setTargetStatus(null);
  };

  return (
    <>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none">
        <KanbanColumn
          title="Open"
          count={openRequests.length}
          color="red"
          requests={openRequests}
          onCardClick={onRequestClick}
          isAdmin={isAdmin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          status="PENDING"
        />
        <KanbanColumn
          title="Approved"
          count={approvedRequests.length}
          color="blue"
          requests={approvedRequests}
          onCardClick={onRequestClick}
          isAdmin={isAdmin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          status="APPROVED"
        />
        <KanbanColumn
          title="Rejected"
          count={rejectedRequests.length}
          color="gray"
          requests={rejectedRequests}
          onCardClick={onRequestClick}
          isAdmin={isAdmin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          status="REJECTED"
        />
        <KanbanColumn
          title="In Progress"
          count={inProgressRequests.length}
          color="purple"
          requests={inProgressRequests}
          onCardClick={onRequestClick}
          isAdmin={isAdmin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          status="IN_PROGRESS"
        />
        <KanbanColumn
          title="Completed"
          count={completedRequests.length}
          color="green"
          requests={completedRequests}
          onCardClick={onRequestClick}
          isAdmin={isAdmin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          status="COMPLETED"
        />
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Status Change"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Are you sure?</h3>
            <p className="text-slate-500">
              Do you want to move this request to <strong>{targetStatus?.replace('_', ' ')}</strong>?
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmMove}>
              Confirm Move
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
