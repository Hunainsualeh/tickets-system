import React, { useState } from 'react';
import { Ticket, User } from '@/types'; // Adjust imports as needed
import { Button } from './Button';
import { Textarea } from './Textarea';
import { StatusSelect } from './StatusSelect';
import { CustomSelect } from './CustomSelect';
import { Badge } from './Badge';
import { Modal } from './Modal';
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
  Check,
  Mail,
  Phone,
  Hash,
  Building2,
  Activity
} from 'lucide-react';
import { 
  formatRelativeTime, 
  getPriorityColor, 
  formatDateInTimezone, 
  getDisplayStatus,
  getStatusColor // Added back
} from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';
import { TimeTracker } from './TimeTracker';

interface TicketDetailProps {
  ticket: Ticket;
  currentUser: User | null;
  onBack: () => void;
  onAddNote: (note: string) => Promise<void>;
  isAddingNote?: boolean;
  onUpdateStatus?: (status: string) => void;
  onDelete?: () => void;
  onViewHistory?: () => void;
  availableUsers?: User[];
  onAssignUser?: (userId: string | null) => void;
}

export function TicketDetail({ 
  ticket, 
  currentUser, 
  onBack, 
  onAddNote,
  isAddingNote = false,
  onUpdateStatus,
  onDelete,
  onViewHistory,
  availableUsers = [],
  onAssignUser
}: TicketDetailProps) {
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'attachments' | 'history'>('details');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [pendingAssignmentUserId, setPendingAssignmentUserId] = useState<string | null>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Status Confirmation Modal State
  const [confirmStatusModal, setConfirmStatusModal] = useState<{isOpen: boolean, status: string | null}>({isOpen: false, status: null});
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false); // Add isAssigning state

  const isAdmin = currentUser?.role === 'ADMIN';
  const isInternal = isAdmin || currentUser?.role === 'DEVELOPER' || currentUser?.role === 'TECHNICAL';

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

  // Status color mapping matching the dropdown colors
  const statusColors: Record<string, { bg: string; border: string; text: string; ring: string; gradient: string }> = {
    PENDING: { 
      bg: 'bg-amber-500', 
      border: 'border-amber-500', 
      text: 'text-amber-600',
      ring: 'ring-amber-100',
      gradient: '#f59e0b'
    },
    ACKNOWLEDGED: { 
      bg: 'bg-slate-400', 
      border: 'border-slate-400', 
      text: 'text-slate-500',
      ring: 'ring-slate-100',
      gradient: '#94a3b8'
    },
    IN_PROGRESS: { 
      bg: 'bg-yellow-500', 
      border: 'border-yellow-500', 
      text: 'text-yellow-600',
      ring: 'ring-yellow-100',
      gradient: '#eab308'
    },
    COMPLETED: { 
      bg: 'bg-emerald-500', 
      border: 'border-emerald-500', 
      text: 'text-emerald-600',
      ring: 'ring-emerald-100',
      gradient: '#10b981'
    },
    ESCALATED: { 
      bg: 'bg-red-500', 
      border: 'border-red-500', 
      text: 'text-red-600',
      ring: 'ring-red-100',
      gradient: '#ef4444'
    },
    CLOSED: { 
      bg: 'bg-slate-500', 
      border: 'border-slate-500', 
      text: 'text-slate-600',
      ring: 'ring-slate-100',
      gradient: '#64748b'
    },
    INVOICE: { 
      bg: 'bg-orange-500', 
      border: 'border-orange-500', 
      text: 'text-orange-600',
      ring: 'ring-orange-100',
      gradient: '#f97316'
    },
    PAID: { 
      bg: 'bg-teal-500', 
      border: 'border-teal-500', 
      text: 'text-teal-600',
      ring: 'ring-teal-100',
      gradient: '#14b8a6'
    },
  };

  // Get color for a specific status stage
  const getStageColor = (stageKey: string) => {
    return statusColors[stageKey] || statusColors.PENDING;
  };

  // --- DERIVE DISPLAY STATUS ---
  let displayStatus = getDisplayStatus(ticket.status, currentUser?.role);

  // For internal roles (Dev/Tech), prefer the latest status from history if available
  // This ensures they see their internal updates that don't affect the main ticket status
  if (isInternal && ticket.statusHistory && ticket.statusHistory.length > 0) {
      displayStatus = ticket.statusHistory[0].status;
  }

  // Get the current status color
  const currentStatusColor = getStageColor(displayStatus);

  // Filter statuses based on role
  // Admin: All statuses
  // Internal (Dev/Tech): All except financial (Invoice/Paid)
  // User: Simplified view
  const statusStages = isAdmin 
    ? allStatusStages
    : isInternal 
      ? allStatusStages.filter(s => s.key !== 'INVOICE' && s.key !== 'PAID')
      : [
          { key: 'PENDING', label: 'Opened' },
          { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
          { key: 'IN_PROGRESS', label: 'In Progress' },
          { key: 'COMPLETED', label: 'Resolved' },
          { key: 'CLOSED', label: 'Closed' },
        ];

  let currentStageIndex = statusStages.findIndex(s => s.key === displayStatus);
  
  // Safe fallback
  if (currentStageIndex === -1) {
     currentStageIndex = statusStages.length - 1; 
  }
  
  // Calculate progress percentage for the bar
  const progressPercentage = Math.max(0, Math.min(100, (currentStageIndex / (statusStages.length - 1)) * 100));

  const fetchHistory = async () => {
    if (!isInternal || statusHistory.length > 0) return;
    setLoadingHistory(true);
    try {
        // Use apiClient or fetch directly. Assuming there's no direct API for specific history yet, 
        // we might fallback to ticket.statusHistory if loaded, or fetch it.
        // For now, let's assume valid data might come from `onViewHistory` or we add a fetch.
        // We'll simulate or simple fetching if available.
        // Actually, let's verify if `ticket` object already has history or if we need to fetch.
        // If the backend `getTicket` included statusHistory, we can use it.
        // If not, we might need to add it to the backend or use a separate endpoint.
        // Let's assume we can fetch it via `/api/tickets/:id` or if passed in props.
        if ((ticket as any).statusHistory) {
            setStatusHistory((ticket as any).statusHistory);
        } else {
             // Fallback fetch if not in initial props
             const res = await fetch(`/api/tickets/${ticket.id}`);
             const data = await res.json();
             if (data.ticket && data.ticket.statusHistory) {
                 setStatusHistory(data.ticket.statusHistory);
             }
        }
    } catch (e) {
        console.error("Failed to load history", e);
    } finally {
        setLoadingHistory(false);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
      setActiveTab(tab);
      if (tab === 'history') {
          fetchHistory();
      }
  };

  const handleSubmitNote = async () => {
    if (!newNote.trim()) return;
    await onAddNote(newNote);
    setNewNote('');
  };

  const handleAssignmentChange = (userId: string) => {
    setPendingAssignmentUserId(userId || null);
    setShowAssignModal(true);
  };

  const confirmAssignment = async () => {
    if (onAssignUser) {
        setIsAssigning(true);
        try {
            await onAssignUser(pendingAssignmentUserId);
            // Optionally we can wait for prop update or just close modal assuming success if no error thrown
            setShowAssignModal(false);
            setPendingAssignmentUserId(null);
        } catch (error) {
            console.error("Assignment failed", error);
        } finally {
            setIsAssigning(false);
        }
    }
  };

  const cancelAssignment = () => {
    if (isAssigning) return;
    setShowAssignModal(false);
    setPendingAssignmentUserId(null);
  };

  const getPendingAssignedUser = () => {
    if (!pendingAssignmentUserId) return null;
    return availableUsers.find(u => u.id === pendingAssignmentUserId);
  };

  return (
    <div className="w-full pb-24 animate-in fade-in duration-500 font-sans px-4 sm:px-6 lg:px-8">
      
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
        <div className="p-6 sm:p-10 border-b border-slate-100 bg-linear-to-b from-slate-50/50 to-white">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-12">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge variant={getPriorityColor(ticket.priority)} size="sm" className="shadow-sm ring-1 ring-inset ring-black/5">
                            {ticket.priority}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            #{ticket.incNumber || ticket.id.slice(0, 8)}
                        </span>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <span className="text-slate-400 text-sm flex items-center gap-1.5 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {formatRelativeTime(ticket.createdAt)}
                            </span>
                            {ticket.timezone && (
                                <span className="text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                    User Time: {formatDateInTimezone(ticket.createdAt, ticket.timezone)}
                                </span>
                            )}
                        </div>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="text-slate-500 text-sm font-medium">
                            {ticket.branch 
                                ? `${ticket.branch.name} ${ticket.branch.branchNumber ? `(#${ticket.branch.branchNumber})` : ''}` 
                                : ticket.manualBranchName || 'General Support'
                            }
                        </span>
                    </div>
                    
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
                        {ticket.additionalDetails ? ticket.additionalDetails.substring(0, 60) + (ticket.additionalDetails.length > 60 ? '...' : '') : 'Support Request'}
                    </h1>
                </div>

                {/* Mobile/Quick Status Badge */}
                <div className="lg:hidden self-start">
                    <Badge className="text-sm py-1.5 px-4 bg-slate-900 text-white">
                        {displayStatus.replace(/_/g, ' ')}
                    </Badge>
                </div>
            </div>

            {/* --- THE REDESIGNED PROGRESS TRACK --- */}
            <div className="hidden lg:block relative px-4 mx-4">
                {/* 1. Gray Background Track */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 rounded-full -translate-y-1/2 z-0"></div>
                
                {/* 2. Gradient Active Progress Bar - color transitions from first to current status */}
                <div 
                    className="absolute top-1/2 left-0 h-1.5 rounded-full -translate-y-1/2 z-0 transition-all duration-700 ease-out"
                    style={{ 
                        width: `${progressPercentage}%`,
                        background: currentStageIndex > 0 
                            ? `linear-gradient(to right, ${getStageColor(statusStages[0].key).gradient}, ${currentStatusColor.gradient})`
                            : currentStatusColor.gradient,
                        boxShadow: `0 0 12px ${currentStatusColor.gradient}40`
                    }}
                ></div>

                {/* 3. The Nodes */}
                <div className="relative z-10 flex justify-between w-full">
                    {statusStages.map((stage, index) => {
                        const isCompleted = index < currentStageIndex;
                        const isActive = index === currentStageIndex;
                        const stageColor = getStageColor(stage.key);

                        return (
                            <div key={stage.key} className="flex flex-col items-center group cursor-default relative">
                                {/* The Dot */}
                                <div 
                                    className={`
                                        w-8 h-8 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 z-10
                                        ${isCompleted 
                                            ? `${stageColor.bg} ${stageColor.border} text-white shadow-md` 
                                            : isActive 
                                                ? `bg-white ${stageColor.border} ${stageColor.text} scale-125 ring-4 ${stageColor.ring} shadow-lg` 
                                                : 'bg-white border-slate-200 text-slate-300'
                                        }
                                    `}
                                    style={isCompleted ? { boxShadow: `0 4px 12px ${stageColor.gradient}40` } : {}}
                                >
                                    {isCompleted ? <Check className="w-4 h-4 stroke-3" /> : 
                                     isActive ? <div className={`w-2.5 h-2.5 ${stageColor.bg} rounded-full animate-pulse`} /> :
                                     <Circle className="w-2.5 h-2.5 fill-slate-100 text-transparent" />
                                    }
                                </div>
                                
                                {/* The Label */}
                                <span className={`
                                    absolute top-12 text-[11px] font-bold uppercase tracking-wider text-center w-32 transition-colors
                                    ${isActive ? `${stageColor.text} translate-y-1` : isCompleted ? 'text-slate-600' : 'text-slate-300'}
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
            
            {/* Time Tracker for Internal Roles - Placed prominently but not intrusive */}
            {isInternal && (
                <div className="px-6 sm:px-10 pt-6">
                    <TimeTracker ticketId={ticket.id} currentUser={currentUser} />
                </div>
            )}

            {/* --- Modern Tab Navigation --- */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 sm:px-10">
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-4">
                    <button
                        onClick={() => handleTabChange('details')}
                        className={`
                            group flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap
                            ${activeTab === 'details' 
                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }
                        `}
                    >
                        <LayoutGrid className={`w-4 h-4 ${activeTab === 'details' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        Details
                    </button>

                    <button
                        onClick={() => handleTabChange('notes')}
                        className={`
                            group flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap
                            ${activeTab === 'notes' 
                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }
                        `}
                    >
                        <MessageSquare className={`w-4 h-4 ${activeTab === 'notes' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        Comments
                        {ticket.notes && ticket.notes.length > 0 && (
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'notes' ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                                {ticket.notes.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => handleTabChange('attachments')}
                        className={`
                            group flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap
                            ${activeTab === 'attachments' 
                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }
                        `}
                    >
                        <Paperclip className={`w-4 h-4 ${activeTab === 'attachments' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        Attachments
                        {ticket.attachments && ticket.attachments.length > 0 && (
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'attachments' ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                                {ticket.attachments.length}
                            </span>
                        )}
                    </button>

                    {isInternal && (
                        <button
                            onClick={() => handleTabChange('history')}
                            className={`
                                group flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap
                                ${activeTab === 'history' 
                                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' 
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }
                            `}
                        >
                            <Activity className={`w-4 h-4 ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                            Internal Logs
                        </button>
                    )}
                </div>
            </div>

            {/* --- Tab Content Body --- */}
            <div className="p-6 sm:p-10 bg-slate-50 min-h-[500px]">
                
                {/* 1. Details Tab */}
                {activeTab === 'details' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Main Description */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Description
                                </h3>
                                <div className="text-slate-700 text-base leading-8 whitespace-pre-wrap font-normal">
                                    {ticket.additionalDetails || ticket.issue}
                                </div>
                            </div>
                            
                            {/* Management Actions - Moved to main column to fill space and be more accessible */}
                            {(onUpdateStatus || onAssignUser) && (
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Management
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {onAssignUser && availableUsers.length > 0 && (
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 block mb-2">Assign To</label>
                                                <CustomSelect
                                                    value={ticket.assignedToUserId || ''}
                                                    onChange={handleAssignmentChange}
                                                    options={[
                                                        { value: '', label: 'Unassigned' },
                                                        ...availableUsers
                                                            .filter(u => ['ADMIN', 'DEVELOPER', 'TECHNICAL'].includes(u.role))
                                                            .map(user => ({
                                                                value: user.id,
                                                                label: `${user.username} (${user.role === 'TECHNICAL' ? 'Field Support Specialist' : user.role})`
                                                            }))
                                                    ]}
                                                    placeholder="Select user to assign"
                                                    searchable={true}
                                                />
                                            </div>
                                        )}
                                        {onUpdateStatus && isInternal && (
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 block mb-2">Change Status</label>
                                                <StatusSelect 
                                                    value={displayStatus} 
                                                    onChange={(newStatus) => setConfirmStatusModal({ isOpen: true, status: newStatus })} 
                                                    options={statusStages.map(s => ({ value: s.key, label: s.label }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

        {/* Status Confirmation Modal */}
        <Modal
            isOpen={confirmStatusModal.isOpen}
            onClose={() => !isUpdatingStatus && setConfirmStatusModal({ isOpen: false, status: null })}
            title="Confirm Status Change"
        >
            <div className="space-y-4">
                <p className="text-slate-600">
                    Are you sure you want to change the status to <span className="font-bold text-slate-900">{confirmStatusModal.status?.replace(/_/g, ' ')}</span>?
                    {isAdmin ? (
                        <span className="block mt-4 text-sm text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                            <span className="text-lg leading-none">ℹ️</span>
                            <span className="leading-tight pt-0.5">This will update the ticket status for the User and trigger email notifications.</span>
                        </span>
                    ) : (
                        <span className="block mt-4 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-start gap-2">
                             <span className="text-lg leading-none">🔒</span>
                             <span className="leading-tight pt-0.5">This change will be logged internally but will not be visible on the User's ticket view.</span>
                        </span>
                    )}
                </p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button 
                        variant="ghost" 
                        onClick={() => setConfirmStatusModal({ isOpen: false, status: null })}
                        disabled={isUpdatingStatus}
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="primary" 
                        disabled={isUpdatingStatus}
                        onClick={async () => {
                            if (confirmStatusModal.status && onUpdateStatus) {
                                setIsUpdatingStatus(true);
                                try {
                                    await onUpdateStatus(confirmStatusModal.status);
                                    setConfirmStatusModal({ isOpen: false, status: null });
                                } catch (error) {
                                    console.error(error);
                                } finally {
                                    setIsUpdatingStatus(false);
                                }
                            }
                        }}
                    >
                        {isUpdatingStatus ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {isAdmin ? 'Updating User...' : 'Updating Internal...'}
                            </>
                        ) : 'Confirm Update'}
                    </Button>
                </div>
            </div>
        </Modal>

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
                        <div className="space-y-6">
                            {/* Ticket Information Card - Primary Metadata */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" /> Ticket Details
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-6 gap-y-2">
                                        <InfoCard 
                                            label="INC Number" 
                                            value={ticket.incNumber || '-'} 
                                            icon={<Hash className="w-4 h-4" />} 
                                        />
                                        <InfoCard 
                                            label="Branch" 
                                            value={ticket.branch 
                                                ? `${ticket.branch.name} ${ticket.branch.branchNumber ? `(#${ticket.branch.branchNumber})` : ''}` 
                                                : ticket.manualBranchName || undefined
                                            } 
                                            icon={<Building2 className="w-4 h-4" />} 
                                        />
                                        <InfoCard label="Team" value={ticket.team?.name} icon={<Shield className="w-4 h-4" />} />
                                        <InfoCard label="Creator" value={ticket.user?.username} icon={<UserIcon className="w-4 h-4" />} />
                                        {(ticket.assignedToUser || ticket.assignedTo) && (
                                            <InfoCard 
                                                label="Assigned To" 
                                                value={`${(ticket.assignedToUser || ticket.assignedTo)?.username} (${(ticket.assignedToUser || ticket.assignedTo)?.role === 'TECHNICAL' ? 'Field Support Specialist' : (ticket.assignedToUser || ticket.assignedTo)?.role})`} 
                                                icon={<UserIcon className="w-4 h-4" />} 
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Divider if Local Contact exists */}
                                {(ticket.localContactName || ticket.localContactEmail || ticket.localContactPhone) && (
                                    <>
                                        <div className="border-t border-slate-100 pt-6">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Phone className="w-4 h-4" /> Local Contact
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-6 gap-y-2">
                                                {ticket.localContactName && <InfoCard label="Name" value={ticket.localContactName} icon={<UserIcon className="w-4 h-4" />} />}
                                                {ticket.localContactEmail && <InfoCard label="Email" value={ticket.localContactEmail} icon={<Mail className="w-4 h-4" />} />}
                                                {ticket.localContactPhone && <InfoCard label="Phone" value={ticket.localContactPhone} icon={<Phone className="w-4 h-4" />} />}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                        </div>
                    </div>
                )}

                {/* 2. Notes Tab */}
                {activeTab === 'notes' && (
                    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-6">
                            {/* Comments List */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100">
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Comments {ticket.notes && ticket.notes.length > 0 && (
                                            <span className="text-slate-500 font-normal text-base ml-2">({ticket.notes.length})</span>
                                        )}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Activity and updates on this ticket</p>
                                </div>
                                
                                <div className="divide-y divide-slate-100">
                                    {ticket.notes && ticket.notes.length > 0 ? (
                                        ticket.notes.map((note) => (
                                            <div key={note.id} className="px-6 py-5 hover:bg-slate-50/50 transition-colors">
                                                <div className="flex gap-4">
                                                    {/* Avatar */}
                                                    <div className="shrink-0">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-offset-2
                                                            ${note.user?.role === 'ADMIN' ? 'bg-blue-600 text-white ring-blue-100' : 
                                                              note.user?.role === 'DEVELOPER' ? 'bg-amber-600 text-white ring-amber-100' :
                                                              note.user?.role === 'TECHNICAL' ? 'bg-cyan-600 text-white ring-cyan-100' :
                                                              'bg-slate-600 text-white ring-slate-100'}
                                                        `}>
                                                            {note.user?.username?.[0]?.toUpperCase() || 'U'}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Comment Content */}
                                                    <div className="flex-1 min-w-0">
                                                        {/* Header */}
                                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                            <span className="font-bold text-slate-900">{note.user?.username}</span>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold
                                                                ${note.user?.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                                                                  note.user?.role === 'DEVELOPER' ? 'bg-amber-100 text-amber-700' :
                                                                  note.user?.role === 'TECHNICAL' ? 'bg-cyan-100 text-cyan-700' :
                                                                  'bg-slate-100 text-slate-700'}
                                                            `}>
                                                                {note.user?.role === 'TECHNICAL' ? 'FIELD SUPPORT SPECIALIST' : (note.user?.role || 'USER')}
                                                            </span>
                                                            <span className="text-xs text-slate-400">• {formatRelativeTime(note.createdAt)}</span>
                                                        </div>
                                                        
                                                        {/* Comment Body */}
                                                        <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-700 leading-relaxed border border-slate-100">
                                                            {note.note}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-6 py-16 text-center">
                                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <MessageSquare className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <h3 className="text-slate-900 font-semibold mb-1">No comments yet</h3>
                                            <p className="text-slate-500 text-sm">Be the first to comment on this ticket</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Add Comment Form */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-900">Add a Comment</h3>
                                </div>
                                <div className="p-6">
                                    <div className="flex gap-3 items-start">
                                        <Textarea 
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            placeholder="Share updates, ask questions, or provide additional information..."
                                            className="flex-1 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg resize-none min-h-20 text-sm text-slate-700 placeholder:text-slate-400 p-3"
                                        />
                                        <Button 
                                            size="sm" 
                                            onClick={handleSubmitNote}
                                            disabled={!newNote.trim() || isAddingNote}
                                            className="px-5 py-2.5 font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm shrink-0 h-fit"
                                        >
                                            {isAddingNote ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                    Posting...
                                                </span>
                                            ) : (
                                                'Add Comment'
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-3">
                                        <span className="font-medium">Tip:</span> Use comments to keep everyone updated
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Attachments Tab */}
                {activeTab === 'attachments' && (
                    <div className="max-w-5xl mx-auto animate-in slide-in-from-bottom-2 duration-300">
                         {ticket.attachments && ticket.attachments.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ticket.attachments.map((file) => (
                                    <a 
                                        key={file.id}
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 flex flex-col gap-4 relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <Download className="w-4 h-4" />
                                            </div>
                                        </div>
                                        
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm truncate pr-8 group-hover:text-blue-700 transition-colors">{file.fileName}</p>
                                            <p className="text-xs text-slate-500 font-medium mt-1">
                                                {(file.fileSize / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                         ) : (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/30">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <Paperclip className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-slate-900 font-medium mb-1">No attachments</h3>
                                <p className="text-sm text-slate-500">No files have been uploaded to this ticket yet.</p>
                            </div>
                         )}
                    </div>
                )}
                {/* 4. History Tab (Internal Only) */}
                {activeTab === 'history' && isInternal && (
                    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Internal Logs</h3>
                                    <p className="text-sm text-slate-500 mt-1">Status changes and administrative actions</p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={fetchHistory} disabled={loadingHistory}>
                                    <History className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                            
                            <div className="divide-y divide-slate-100">
                                {loadingHistory ? (
                                    <div className="p-8 text-center text-slate-500">Loading history...</div>
                                ) : statusHistory.length > 0 ? (
                                    statusHistory.map((item: any) => (
                                        <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors">
                                            <div className="flex gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                    <Activity className="w-5 h-5 text-slate-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        Status changed to <Badge variant={getStatusColor(item.status)} size="sm">{item.status.replace(/_/g, ' ')}</Badge>
                                                    </p>
                                                    {item.note && (
                                                        <p className="text-sm text-slate-600 mt-1">{item.note}</p>
                                                    )}
                                                     {item.adminNote && (
                                                        <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 mt-2 inline-block">
                                                            Admin Note: {item.adminNote}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-slate-400 mt-2">
                                                        {formatRelativeTime(item.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center text-slate-500">
                                        No internal history available.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Assignment Confirmation Modal - Redesigned */}
      <Modal
        isOpen={showAssignModal}
        onClose={cancelAssignment}
        title="Confirm Assignment"
      >
        {/* Background decoration inside Modal content to mimic signup style */}
        <div className="relative overflow-hidden p-1 -m-1"> 
        {/* Using a wrapper to contain the absolute positioned blobs if needed, or just let them sit behind content */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-30">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-3xl"></div>
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-3xl"></div>
            </div>

            <div className="relative z-10 space-y-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                         <UserIcon className="w-8 h-8 text-blue-600" />
                    </div>
                
                    <p className="text-slate-600 text-lg">
                        {pendingAssignmentUserId ? (
                        <>
                            Assign ticket to <br/>
                            <span className="font-bold text-slate-900 text-xl">{getPendingAssignedUser()?.username}</span>?
                        </>
                        ) : (
                        <>
                            Are you sure you want to <span className="font-bold text-slate-900">unassign</span> this ticket?
                        </>
                        )}
                    </p>
                </div>
                
                {pendingAssignmentUserId && getPendingAssignedUser() && (
                    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {getPendingAssignedUser()?.username[0].toUpperCase()}
                        </div>
                        <div>
                        <p className="font-bold text-slate-900 text-lg">{getPendingAssignedUser()?.username}</p>
                        <p className="text-sm text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            {getPendingAssignedUser()?.role === 'TECHNICAL' ? 'Field Support Specialist' : getPendingAssignedUser()?.role}
                        </p>
                        </div>
                    </div>
                    </div>
                )}
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100/50">
                    <Button variant="ghost" onClick={cancelAssignment} disabled={isAssigning}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={confirmAssignment} 
                        disabled={isAssigning}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] shadow-lg shadow-blue-600/20"
                    >
                        {isAssigning ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Assigning...</span>
                            </span>
                        ) : 'Confirm'}
                    </Button>
                </div>
            </div>
        </div>
      </Modal>
    </div>
  );
}

// --- Helper Components ---

function InfoCard({ label, value, icon }: { label: string, value?: string | null, icon?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 group p-2 rounded-xl hover:bg-slate-50 transition-colors -mx-2">
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-slate-900">{value || 'N/A'}</p>
            </div>
        </div>
    );
}