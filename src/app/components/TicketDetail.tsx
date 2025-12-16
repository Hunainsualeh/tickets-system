import React, { useState } from 'react';
import { Ticket, User } from '@/types'; // Adjust imports as needed
import { Button } from './Button';
import { Textarea } from './Textarea';
import { StatusSelect } from './StatusSelect';
import { Badge } from './Badge';
import { 
  ArrowLeft, 
  History, 
  FileText,
  Download,
  CheckCircle2,
  Circle,
  MessageSquare,
  Paperclip,
  Clock,
  Briefcase,
  User as UserIcon,
  Shield,
  LayoutGrid,
  Check
} from 'lucide-react';
import { formatRelativeTime, getPriorityColor } from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'attachments'>('details');

  const isAdmin = currentUser?.role === 'ADMIN';

  // --- Configuration ---
  const allStatusStages = [
    { key: 'PENDING', label: 'Opened' },
    { key: 'ACKNOWLEDGED', label: 'Ack.' },
    { key: 'IN_PROGRESS', label: 'Working' },
    { key: 'COMPLETED', label: 'Resolved' },
    { key: 'ESCALATED', label: 'Escalated' },
    { key: 'CLOSED', label: 'Closed' },
    { key: 'INVOICE', label: 'Invoice' },
    { key: 'PAID', label: 'Paid' },
  ];

  const statusStages = isAdmin 
    ? allStatusStages
    : [
        { key: 'PENDING', label: 'Opened' },
        { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
        { key: 'IN_PROGRESS', label: 'In Progress' },
        { key: 'COMPLETED', label: 'Resolved' },
        { key: 'CLOSED', label: 'Closed' },
      ];

  let currentStageIndex = statusStages.findIndex(s => s.key === ticket.status);
  
  // Handle hidden statuses for users by mapping them to visible stages
  if (currentStageIndex === -1) {
      if (['INVOICE', 'PAID'].includes(ticket.status)) {
          // Map Invoice/Paid to Closed for users
          const closedIndex = statusStages.findIndex(s => s.key === 'CLOSED');
          currentStageIndex = closedIndex !== -1 ? closedIndex : statusStages.length - 1;
      } else if (ticket.status === 'ESCALATED' && !isAdmin) {
          // Map Escalated to In Progress for users
          const inProgressIndex = statusStages.findIndex(s => s.key === 'IN_PROGRESS');
          currentStageIndex = inProgressIndex !== -1 ? inProgressIndex : 1;
      }
  }
  
  // Calculate progress percentage for the bar
  const progressPercentage = Math.max(0, Math.min(100, (currentStageIndex / (statusStages.length - 1)) * 100));

  const handleSubmitNote = async () => {
    if (!newNote.trim()) return;
    await onAddNote(newNote);
    setNewNote('');
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 animate-in fade-in duration-500 font-sans">
      
      {/* --- Top Bar --- */}
      <div className="flex items-center justify-between py-6 px-4 sm:px-0">
        <button 
          onClick={onBack} 
          className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium text-sm"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300 shadow-sm transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline">Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
            {onViewHistory && (
                <Button variant="ghost" size="sm" onClick={onViewHistory} className="text-slate-500 hover:bg-white">
                    <History className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">History</span>
                </Button>
            )}
            <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
            {onDelete && (
                <Button variant="danger" size="sm" onClick={onDelete}>Delete</Button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        
        {/* --- Header Section --- */}
        <div className="p-6 sm:p-10 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-12">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge variant={getPriorityColor(ticket.priority)} size="sm" className="shadow-sm ring-1 ring-inset ring-black/5">
                            {ticket.priority}
                        </Badge>
                        <span className="text-slate-400 text-sm flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {formatRelativeTime(ticket.createdAt)}
                        </span>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="text-slate-500 text-sm font-medium">{ticket.branch?.name || 'General Support'}</span>
                    </div>
                    
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
                        {ticket.additionalDetails ? ticket.additionalDetails.substring(0, 60) + (ticket.additionalDetails.length > 60 ? '...' : '') : 'Support Request'}
                    </h1>
                </div>

                {/* Mobile/Quick Status Badge */}
                <div className="lg:hidden self-start">
                    <Badge className="text-sm py-1.5 px-4 bg-slate-900 text-white">
                        {ticket.status.replace(/_/g, ' ')}
                    </Badge>
                </div>
            </div>

            {/* --- THE REDESIGNED PROGRESS TRACK --- */}
            <div className="hidden lg:block relative px-4 mx-4">
                {/* 1. Gray Background Track */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 rounded-full -translate-y-1/2 z-0"></div>
                
                {/* 2. Blue Active Progress Bar */}
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-blue-600 rounded-full -translate-y-1/2 z-0 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                    style={{ width: `${progressPercentage}%` }}
                ></div>

                {/* 3. The Nodes */}
                <div className="relative z-10 flex justify-between w-full">
                    {statusStages.map((stage, index) => {
                        const isCompleted = index < currentStageIndex;
                        const isActive = index === currentStageIndex;

                        return (
                            <div key={stage.key} className="flex flex-col items-center group cursor-default relative">
                                {/* The Dot */}
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 z-10
                                    ${isCompleted 
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' 
                                        : isActive 
                                            ? 'bg-white border-blue-600 text-blue-600 scale-125 ring-4 ring-blue-50 shadow-lg' 
                                            : 'bg-white border-slate-200 text-slate-300'
                                    }
                                `}>
                                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : 
                                     isActive ? <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" /> :
                                     <Circle className="w-2.5 h-2.5 fill-slate-100 text-transparent" />
                                    }
                                </div>
                                
                                {/* The Label */}
                                <span className={`
                                    absolute top-12 text-[11px] font-bold uppercase tracking-wider text-center w-32 transition-colors
                                    ${isActive ? 'text-blue-700 translate-y-1' : isCompleted ? 'text-slate-600' : 'text-slate-300'}
                                `}>
                                    {stage.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Spacer for labels */}
            <div className="hidden lg:block h-10"></div>
        </div>

        {/* --- Content Area --- */}
        <div className="flex flex-col">
            
            {/* --- Modern Tab Navigation --- */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 sm:px-10">
                <div className="flex items-center gap-8 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`
                            group flex items-center gap-2 py-5 border-b-2 text-sm font-bold transition-all whitespace-nowrap
                            ${activeTab === 'details' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                            }
                        `}
                    >
                        <LayoutGrid className={`w-4 h-4 ${activeTab === 'details' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        TICKET DETAILS
                    </button>

                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`
                            group flex items-center gap-2 py-5 border-b-2 text-sm font-bold transition-all whitespace-nowrap
                            ${activeTab === 'notes' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                            }
                        `}
                    >
                        <MessageSquare className={`w-4 h-4 ${activeTab === 'notes' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        WORK NOTES
                        {ticket.notes && ticket.notes.length > 0 && (
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'notes' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                {ticket.notes.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('attachments')}
                        className={`
                            group flex items-center gap-2 py-5 border-b-2 text-sm font-bold transition-all whitespace-nowrap
                            ${activeTab === 'attachments' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                            }
                        `}
                    >
                        <Paperclip className={`w-4 h-4 ${activeTab === 'attachments' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        ATTACHMENTS
                        {ticket.attachments && ticket.attachments.length > 0 && (
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'attachments' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                {ticket.attachments.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* --- Tab Content Body --- */}
            <div className="p-6 sm:p-10 bg-slate-50 min-h-[500px]">
                
                {/* 1. Details Tab */}
                {activeTab === 'details' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Main Description */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FileText className="w-3 h-3" /> Description
                                </h3>
                                <div className="text-slate-700 text-sm leading-7 whitespace-pre-wrap">
                                    {ticket.additionalDetails || ticket.issue}
                                </div>
                            </div>

                            {/* Mobile View of Timeline (Vertical List) */}
                            <div className="lg:hidden bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Status Progress</h3>
                                <div className="space-y-4">
                                    {statusStages.map((stage, idx) => {
                                         const isDone = idx < currentStageIndex;
                                         const isCurrent = idx === currentStageIndex;
                                         return (
                                             <div key={stage.key} className="flex items-center gap-3">
                                                 <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isDone ? 'bg-blue-600 border-blue-600 text-white' : isCurrent ? 'bg-white border-blue-600 text-blue-600' : 'bg-slate-50 border-slate-200'}`}>
                                                     {isDone && <CheckCircle2 className="w-3 h-3" />}
                                                     {isCurrent && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                                                 </div>
                                                 <span className={`text-sm font-medium ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>{stage.label}</span>
                                             </div>
                                         )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Info */}
                        <div className="space-y-4">
                            <InfoCard label="Branch" value={ticket.branch?.name} icon={<Briefcase className="w-4 h-4" />} />
                            <InfoCard label="Team" value={ticket.team?.name} icon={<Shield className="w-4 h-4" />} />
                            <InfoCard label="Contact" value={ticket.user?.username} icon={<UserIcon className="w-4 h-4" />} />
                            
                            {/* Admin Actions */}
                            {onUpdateStatus && (
                                <div className="bg-slate-800 rounded-xl p-5 shadow-sm text-white mt-6">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Admin Actions</h3>
                                    <div className="space-y-3">
                                        <label className="text-xs text-slate-400 block">Change Status</label>
                                        <StatusSelect 
                                            value={ticket.status} 
                                            onChange={onUpdateStatus} 
                                            options={allStatusStages.map(s => ({ value: s.key, label: s.label }))}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. Notes Tab */}
                {activeTab === 'notes' && (
                    <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-2 duration-300 flex flex-col h-full">
                        <div className="flex-1 space-y-6 mb-8">
                            {/* Input Top */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-8">
                                <Textarea 
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Type a response..."
                                    className="w-full border-0 focus:ring-0 bg-transparent resize-none min-h-[80px] text-sm text-slate-700 placeholder:text-slate-400"
                                />
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                                    <button className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-colors">
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    <Button 
                                        size="sm" 
                                        onClick={handleSubmitNote}
                                        disabled={!newNote.trim() || isAddingNote}
                                        className="rounded-lg px-4 font-bold bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isAddingNote ? 'Sending...' : 'Reply'}
                                    </Button>
                                </div>
                            </div>

                            {/* Chat History */}
                            {ticket.notes?.map((note) => (
                                <div key={note.id} className="flex gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                                            {note.user?.username?.[0] || 'U'}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm text-slate-900">{note.user?.username}</span>
                                            <span className="text-xs text-slate-400">{formatRelativeTime(note.createdAt)}</span>
                                            {note.user?.role === 'ADMIN' && (
                                                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">ADMIN</span>
                                            )}
                                        </div>
                                        <div className="bg-white p-3.5 rounded-2xl rounded-tl-none border border-slate-200 text-sm text-slate-700 shadow-sm">
                                            {note.note}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {(!ticket.notes || ticket.notes.length === 0) && (
                                <div className="text-center py-10">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                        <MessageSquare className="w-6 h-6" />
                                    </div>
                                    <p className="text-slate-400 text-sm">No discussion yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Attachments Tab */}
                {activeTab === 'attachments' && (
                    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-2 duration-300">
                         {ticket.attachments && ticket.attachments.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {ticket.attachments.map((file) => (
                                    <a 
                                        key={file.id}
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate group-hover:text-blue-700 transition-colors">{file.fileName}</p>
                                            <p className="text-xs text-slate-500 uppercase tracking-wide mt-0.5">
                                                {(file.fileSize / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400">
                                            <Download className="w-4 h-4" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                         ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <Paperclip className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm font-medium">No attachments uploaded</p>
                            </div>
                         )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function InfoCard({ label, value, icon }: { label: string, value?: string, icon?: React.ReactNode }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-blue-300 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                {icon}
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-semibold text-slate-900">{value || 'N/A'}</p>
            </div>
        </div>
    );
}