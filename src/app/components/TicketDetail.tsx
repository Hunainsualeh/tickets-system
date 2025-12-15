import React, { useState } from 'react';
import { Ticket, User, TicketNote, Attachment, StatusHistory } from '@/types';
import { Badge } from './Badge';
import { Button } from './Button';
import { Textarea } from './Textarea';
import { StatusSelect } from './StatusSelect';
import { 
  ArrowLeft, 
  Clock, 
  Paperclip, 
  MessageSquare, 
  User as UserIcon, 
  Building2, 
  AlertCircle, 
  CheckCircle, 
  FileText,
  Download,
  Shield,
  History,
  Trash2
} from 'lucide-react';
import { formatDate, formatRelativeTime, getStatusColor, getPriorityColor } from '@/lib/utils';

interface TicketDetailProps {
  ticket: Ticket;
  currentUser: User | null;
  onBack: () => void;
  onAddNote: (note: string) => Promise<void>;
  isAddingNote?: boolean;
  onUpdateStatus?: (status: string) => void;
  onDelete?: () => void;
  onViewHistory?: () => void;
}

export function TicketDetail({ 
  ticket, 
  currentUser, 
  onBack, 
  onAddNote,
  isAddingNote = false,
  onUpdateStatus,
  onDelete,
  onViewHistory
}: TicketDetailProps) {
  const [newNote, setNewNote] = useState('');

  const handleSubmitNote = async () => {
    if (!newNote.trim()) return;
    await onAddNote(newNote);
    setNewNote('');
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section - Clean & Open */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={onBack} 
            className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Tickets</span>
          </button>

          {/* Admin Actions */}
          <div className="flex items-center gap-3">
            {onViewHistory && (
              <Button variant="secondary" size="sm" onClick={onViewHistory}>
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
            )}
            {onDelete && (
              <Button variant="danger" size="sm" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(ticket.createdAt)}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{ticket.issue}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={getStatusColor(ticket.status)} size="lg" className="px-4 py-1.5 text-sm">
              {ticket.status.replace('_', ' ')}
            </Badge>
            <Badge variant={getPriorityColor(ticket.priority)} size="lg" className="px-4 py-1.5 text-sm">
              {ticket.priority} Priority
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Description Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Description
            </h3>
            <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
              {ticket.additionalDetails || ticket.issue}
            </div>
          </section>

          {/* Attachments Section */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-slate-400" />
                Attachments
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ticket.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <FileText className="w-5 h-5 text-slate-500 group-hover:text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-700">
                        {attachment.fileName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(attachment.fileSize / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Activity / Notes Section */}
          <section className="pt-6 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              Activity & Notes
            </h3>

            {/* Add Note Input */}
            <div className="mb-10 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-medium shrink-0">
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 space-y-3">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note or reply..."
                  className="min-h-[100px] resize-none bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSubmitNote}
                    disabled={!newNote.trim() || isAddingNote}
                    className="px-6"
                  >
                    {isAddingNote ? 'Posting...' : 'Post Note'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-8 relative before:absolute before:left-[19px] before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100">
              {ticket.notes && ticket.notes.map((note) => (
                <div key={note.id} className="relative pl-12 group">
                  <div className={`absolute left-0 top-0 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shrink-0 z-10 
                    ${note.user?.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {note.user?.role === 'ADMIN' ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                  </div>
                  
                  <div className="bg-white rounded-xl p-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-slate-900">{note.user?.username}</span>
                      {note.user?.role === 'ADMIN' && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wide">
                          Support Team
                        </span>
                      )}
                      <span className="text-xs text-slate-400">• {formatRelativeTime(note.createdAt)}</span>
                    </div>
                    <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {note.note}
                    </div>
                  </div>
                </div>
              ))}

              {(!ticket.notes || ticket.notes.length === 0) && (
                <div className="pl-12 py-4 text-slate-400 italic">
                  No notes yet. Start the conversation above.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Admin Status Control */}
          {onUpdateStatus && (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Update Status</h3>
              <StatusSelect 
                value={ticket.status} 
                onChange={onUpdateStatus} 
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'ESCALATED', label: 'Escalated' },
                  { value: 'CLOSED', label: 'Closed' },
                  { value: 'INVOICE', label: 'Invoice' },
                  { value: 'PAID', label: 'Paid' },
                ]}
              />
            </div>
          )}

          {/* Ticket Details Card - Minimal */}
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Ticket Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Branch</label>
                <div className="flex items-center gap-2 mt-1 text-slate-900">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{ticket.branch?.name || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Team</label>
                <div className="flex items-center gap-2 mt-1 text-slate-900">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{ticket.team?.name || 'Unassigned'}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contact</label>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2 text-slate-900">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{ticket.user?.username || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status History - Minimal List */}
          {ticket.statusHistory && ticket.statusHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                History
              </h3>
              <div className="space-y-4">
                {ticket.statusHistory.slice(0, 5).map((history) => (
                  <div key={history.id} className="flex gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-900">
                        Changed to <span className="font-medium">{history.status.replace('_', ' ')}</span>
                      </p>
                      <p className="text-xs text-slate-500">{formatRelativeTime(history.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
