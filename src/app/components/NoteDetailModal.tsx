import React from 'react';
import { X, MessageSquare, User, Calendar, Ticket as TicketIcon } from 'lucide-react';
import { Badge } from './Badge';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface NoteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: any;
  isAdmin?: boolean;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  isOpen,
  onClose,
  note,
  isAdmin = false,
}) => {
  if (!isOpen || !note) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 transform transition-all duration-300 scale-100 animate-in zoom-in-95 slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Note Details</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">
            {/* Note Content */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Note Content
              </label>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{note.note}</p>
              </div>
            </div>

            {/* User Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-3 h-3" />
                  Author
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                    {note.user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{note.user?.username}</p>
                    {note.user?.role && (
                      <Badge variant={note.user.role === 'ADMIN' ? 'warning' : 'default'} size="sm">
                        {note.user.role}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  Created
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-slate-700 font-medium">{formatDate(note.createdAt)}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatRelativeTime(note.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Ticket Info */}
            {isAdmin && note.ticket && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <TicketIcon className="w-3 h-3" />
                  Related Ticket
                </label>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 mb-1">{note.ticket.issue}</p>
                      <p className="text-xs text-slate-500 font-mono">#{note.ticket.id.slice(0, 8)}</p>
                    </div>
                    <div className="flex gap-2">
                      {note.ticket.status && (
                        <Badge variant="default" size="sm">
                          {note.ticket.status.replace('_', ' ')}
                        </Badge>
                      )}
                      {note.ticket.priority && (
                        <Badge variant="default" size="sm">
                          {note.ticket.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {note.ticket.user && (
                    <p className="text-xs text-slate-600">
                      Created by: <span className="font-medium">{note.ticket.user.username}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Team Info */}
            {note.user?.team && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Team
                </label>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <p className="font-medium text-purple-900">{note.user.team.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="w-full px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
