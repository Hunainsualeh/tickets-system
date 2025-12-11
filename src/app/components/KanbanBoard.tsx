'use client';

import { useState } from 'react';
import { Badge } from './Badge';
import { MessageSquare, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface KanbanCardProps {
  request: any;
  onClick: () => void;
  isAdmin?: boolean;
}

function KanbanCard({ request, onClick, isAdmin }: KanbanCardProps) {
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
      className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-4 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Header with badges */}
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        <Badge variant="info" size="sm">
          {getPlanningStatus(request.status)}
        </Badge>
        <Badge variant={getPriorityVariant(request.status)} size="sm">
          <span className="hidden sm:inline">Priority: </span>{getPriorityLabel(request.status)}
        </Badge>
      </div>

      {/* Request ID and Date */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1 sm:mb-2">
        <span className="font-mono">Request ID</span>
        <span className="hidden sm:inline">Created on</span>
      </div>
      <div className="flex items-center justify-between text-xs sm:text-sm mb-2 sm:mb-3">
        <span className="font-semibold text-slate-900">#{request.id.substring(0, 8)}</span>
        <span className="text-slate-600 text-xs">{formatDate(request.createdAt)}</span>
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mb-3 sm:mb-4">
        {request.description || 'No description provided'}
      </p>

      {/* Footer with user info */}
      <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {request.user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-700 truncate">
            {request.user?.username || 'Unknown User'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 shrink-0 ml-2">
          <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="text-xs">1</span>
        </div>
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
}

function KanbanColumn({ title, count, color, requests, onCardClick, isAdmin }: KanbanColumnProps) {
  const colorClasses = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
  };

  return (
    <div className="flex-1 min-w-[260px] sm:min-w-[280px] max-w-[320px]">
      {/* Column Header */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{title}</h3>
          <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${colorClasses[color as keyof typeof colorClasses]} text-white text-xs font-semibold flex items-center justify-center`}>
            {count}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div className="space-y-2 sm:space-y-3 min-h-[200px] bg-slate-50/50 rounded-xl p-2 sm:p-3">
        {requests.length > 0 ? (
          requests.map((request) => (
            <KanbanCard
              key={request.id}
              request={request}
              onClick={() => onCardClick(request)}
              isAdmin={isAdmin}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-32 text-slate-400 text-xs sm:text-sm">
            No requests
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
}

export function KanbanBoard({ requests, onRequestClick, isAdmin }: KanbanBoardProps) {
  // Filter requests by status
  const openRequests = requests.filter(r => r.status === 'PENDING');
  const onHoldRequests = requests.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED');
  const inProgressRequests = requests.filter(r => r.status === 'IN_PROGRESS');
  const completedRequests = requests.filter(r => r.status === 'COMPLETED');

  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none">
      <KanbanColumn
        title="Open"
        count={openRequests.length}
        color="red"
        requests={openRequests}
        onCardClick={onRequestClick}
        isAdmin={isAdmin}
      />
      <KanbanColumn
        title="On Hold"
        count={onHoldRequests.length}
        color="blue"
        requests={onHoldRequests}
        onCardClick={onRequestClick}
        isAdmin={isAdmin}
      />
      <KanbanColumn
        title="In Progress"
        count={inProgressRequests.length}
        color="purple"
        requests={inProgressRequests}
        onCardClick={onRequestClick}
        isAdmin={isAdmin}
      />
      <KanbanColumn
        title="Completed"
        count={completedRequests.length}
        color="green"
        requests={completedRequests}
        onCardClick={onRequestClick}
        isAdmin={isAdmin}
      />
    </div>
  );
}
