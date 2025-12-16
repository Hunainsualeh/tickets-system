import React from 'react';
import { Badge } from './Badge';
import { MessageSquare, AlertTriangle, MoreVertical, MapPin, Building2, User } from 'lucide-react';
import { formatDate, getPriorityLabel, getStatusColor } from '@/lib/utils';
import { Button } from './Button';

interface TicketCardProps {
  ticket: any;
  onClick: () => void;
  onStatusChange?: (status: string) => void;
  onDelete?: () => void;
  isAdmin?: boolean;
}

export function TicketCard({ ticket, onClick, onStatusChange, onDelete, isAdmin = false }: TicketCardProps) {
  let displayStatus = ticket.status;
  if (!isAdmin) {
     if (['INVOICE', 'PAID'].includes(ticket.status)) {
         displayStatus = 'CLOSED';
     }
  }

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all cursor-pointer group relative"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
            {ticket.user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 truncate">{ticket.user?.username}</span>
              <span className="text-xs text-slate-400 font-mono shrink-0">
                {new Date(ticket.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="text-sm font-medium text-slate-900 line-clamp-1">{ticket.issue}</div>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap shrink-0 ${
          ticket.priority === 'P1' ? 'text-red-700 border-red-200 bg-red-50' :
          ticket.priority === 'P2' ? 'text-amber-700 border-amber-200 bg-amber-50' :
          'text-green-700 border-green-200 bg-green-50'
        }`}>
          <span className="hidden sm:inline">{getPriorityLabel(ticket.priority)}</span>
          <span className="sm:hidden">{ticket.priority}</span>
        </div>
      </div>

      {/* Content */}
      <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-2">
        <div className="flex items-start gap-2 text-sm text-slate-600">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
          <span className="line-clamp-2">{ticket.branch?.name}</span>
        </div>
        {ticket.team && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building2 className="w-4 h-4 shrink-0 text-slate-400" />
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {ticket.team.name}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between pt-2 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-500 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-400">Status:</span>
            <Badge variant={getStatusColor(displayStatus)} size="sm">
              {displayStatus.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-400 hidden sm:inline">Date:</span>
            <span className="truncate">{formatDate(ticket.createdAt)}</span>
          </div>
        </div>
        
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-red-600 hover:bg-red-50 -mr-2 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <span className="sr-only">Delete</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </Button>
        )}
      </div>
    </div>
  );
}
