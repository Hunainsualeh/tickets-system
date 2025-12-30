import React from 'react';
import { Badge } from './Badge';
import { Calendar, User, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface RequestListCardProps {
  request: any;
  onClick: () => void;
}

export function RequestListCard({ request, onClick }: RequestListCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'APPROVED': return 'info';
      case 'REJECTED': return 'danger';
      case 'IN_PROGRESS': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-700 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'LOW': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-blue-500 transition-colors" />
      
      <div className="flex items-start justify-between gap-4 pl-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              #{request.requestNumber || request.id.slice(0, 8)}
            </span>
            <h3 className="font-semibold text-slate-900 truncate text-lg">{request.title}</h3>
            <Badge variant={getStatusColor(request.status)} size="sm">
              {request.status.replace('_', ' ')}
            </Badge>
            {request.priority && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getPriorityColor(request.priority)}`}>
                {request.priority}
              </span>
            )}
          </div>
          
          <p className="text-slate-600 line-clamp-2 mb-4 text-sm leading-relaxed">{request.description}</p>
          
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span className="font-medium">{request.user?.username}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(request.createdAt)}</span>
            </div>
            {request.updatedAt !== request.createdAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Updated {formatDate(request.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
