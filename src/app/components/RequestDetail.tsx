import React from 'react';
import { X, Calendar, User, Briefcase, FileText, Paperclip, Tag } from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface RequestDetailProps {
  request: any;
  onClose: () => void;
  isAdmin?: boolean;
  onStatusChange?: (requestId: string, status: string) => void;
  onDelete?: (requestId: string) => void;
}

export const RequestDetail: React.FC<RequestDetailProps> = ({
  request,
  onClose,
  isAdmin = false,
  onStatusChange,
  onDelete,
}) => {
  if (!request) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'APPROVED': return 'info';
      case 'REJECTED': return 'danger';
      case 'IN_PROGRESS': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={onClose}
                className="lg:hidden p-2 hover:bg-slate-200 rounded-lg transition-colors -ml-2"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 truncate">{request.title}</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-bold text-slate-700">#{request.requestNumber || request.id.slice(0, 8).toUpperCase()}</span>
              <span>•</span>
              <span>{formatRelativeTime(request.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-8">
          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
              Description
            </label>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {request.description}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* User Info */}
            {request.user && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-3 h-3" />
                  Submitted By
                </label>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                      {request.user.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{request.user.username}</p>
                      {request.user.team && (
                        <p className="text-xs text-slate-500">{request.user.team.name}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Created Date
              </label>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-900">{formatDate(request.createdAt)}</p>
                <p className="text-xs text-slate-500 mt-1">{formatRelativeTime(request.createdAt)}</p>
              </div>
            </div>

            {/* Project ID */}
            {request.projectId && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Briefcase className="w-3 h-3" />
                  Project ID
                </label>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-sm font-medium text-slate-900 font-mono">{request.projectId}</p>
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Tag className="w-3 h-3" />
                Status
              </label>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <Badge variant={getStatusColor(request.status)}>
                  {request.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {request.attachments && request.attachments.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Paperclip className="w-3 h-3" />
                Attachments ({request.attachments.length})
              </label>
              <div className="space-y-2">
                {request.attachments.map((attachment: any) => (
                  <a
                    key={attachment.id}
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all group bg-white shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{attachment.fileName}</p>
                      <p className="text-xs text-slate-500">{(attachment.fileSize / 1024).toFixed(2)} KB</p>
                    </div>
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {request.history && request.history.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block">
                Timeline
              </label>
              <div className="relative pl-4 border-l-2 border-slate-200 space-y-8 ml-2">
                {request.history.map((item: any) => (
                  <div key={item.id} className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-300 ring-2 ring-slate-50"></div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-slate-900">
                        {item.note || `Status changed to ${item.status}`}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions (Admin Only) */}
      {isAdmin && (
        <div className="shrink-0 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Update Status
              </label>
              <CustomSelect
                value={request.status}
                onChange={(value) => onStatusChange?.(request.id, value)}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'COMPLETED', label: 'Completed' },
                ]}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="danger"
                onClick={() => onDelete?.(request.id)}
                className="w-full sm:w-auto"
              >
                <X className="w-4 h-4 mr-2" />
                Delete Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
