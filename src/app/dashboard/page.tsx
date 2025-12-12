'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/app/components/ToastContainer';
import { User, Branch, Ticket } from '@/types';
import { Card, CardBody, CardHeader } from '@/app/components/Card';
import { Button } from '@/app/components/Button';
import { Badge } from '@/app/components/Badge';
import { Select } from '@/app/components/Select';
import { CustomSelect } from '@/app/components/CustomSelect';
import { Textarea } from '@/app/components/Textarea';
import { Input } from '@/app/components/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/Table';
import { Sidebar } from '@/app/components/Sidebar';
import { StatRow } from '@/app/components/StatRow';
import { SearchBar } from '@/app/components/SearchBar';
import { Pagination } from '@/app/components/Pagination';
import { getStatusColor, getPriorityColor, getPriorityLabel, formatDate, formatRelativeTime } from '@/lib/utils';
import { Plus, CheckCircle, Clock, AlertCircle, MessageSquare, XCircle, Search, Filter, Building2, Copy, User as UserIcon, Shield, Lock, Eye } from 'lucide-react';
import { Suspense } from 'react';
import { SuccessModal } from '@/app/components/SuccessModal';
import { NoteDetailModal } from '@/app/components/NoteDetailModal';
import { RequestDetail } from '@/app/components/RequestDetail';
import { AnalyticsSection } from '@/app/components/AnalyticsSection';
import { KanbanBoard } from '@/app/components/KanbanBoard';

function UserDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  const [companyName, setCompanyName] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'create' | 'tickets' | 'profile' | 'requests' | 'create-request' | 'notes' | 'analytics'>('dashboard');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<'me' | 'team'>('me');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showNoteDetailModal, setShowNoteDetailModal] = useState(false);

  // Reset page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Close modals when view changes
  useEffect(() => {
    setShowSuccessModal(false);
    setShowNoteDetailModal(false);
    setSelectedTicket(null);
    setSelectedNote(null);
    setSelectedRequest(null);
    setIsAddingNote(false);
  }, [view]);

  const totalPages = Math.ceil(tickets.length / itemsPerPage);
  const paginatedTickets = tickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [ticketForm, setTicketForm] = useState({
    branchId: '',
    incNumber: '',
    priority: 'P2',
    issue: '',
    additionalDetails: '',
    teamId: '',
  });

  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    projectId: '',
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    // Fetch fresh user data to get team info
    const fetchUserData = async () => {
      try {
        const response = await apiClient.getMe();
        if (response.user) {
          setUser(response.user);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
        if (response.companyName) {
          setCompanyName(response.companyName);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, []); // Only run on mount

  // Update view from URL params
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && ['dashboard', 'create', 'tickets', 'profile', 'requests', 'create-request', 'notes', 'analytics'].includes(viewParam)) {
      setView(viewParam as any);
    } else {
      setView('dashboard');
    }
  }, [searchParams]);

  // Clear ticket detail view when switching views
  useEffect(() => {
    setSelectedTicket(null);
  }, [view]);

  const fetchData = async () => {
    try {
      const filters: any = { search: searchQuery, scope };
      
      // If team scope and a specific team is selected, add teamId filter
      if (scope === 'team' && selectedTeamId) {
        filters.teamId = selectedTeamId;
      }
      
      const [branchesRes, ticketsRes, requestsRes, notesRes] = await Promise.all([
        apiClient.getBranches(),
        apiClient.getTickets(filters),
        fetch(`/api/requests?scope=${scope}${selectedTeamId && scope === 'team' ? `&teamId=${selectedTeamId}` : ''}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }).then(res => res.json()),
        fetch(`/api/notes?scope=${scope}${selectedTeamId && scope === 'team' ? `&teamId=${selectedTeamId}` : ''}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }).then(res => res.json()),
      ]);

      setBranches(branchesRes.branches);
      setTickets(ticketsRes.tickets);
      setRequests(requestsRes.requests || []);
      setNotes(notesRes.notes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, scope, selectedTeamId]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await apiClient.createTicket(ticketForm);
      
      // Upload files if any
      if (uploadFiles.length > 0 && result.ticket) {
        for (const file of uploadFiles) {
          const formData = new FormData();
          formData.append('file', file);
          
          await fetch(`/api/tickets/${result.ticket.id}/attachments`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
          });
        }
      }
      
      setView('dashboard');
      setTicketForm({
        branchId: '',
        incNumber: '',
        priority: 'P2',
        issue: '',
        additionalDetails: '',
        teamId: '',
      });
      setUploadFiles([]);
      fetchData();
      toast.success('Ticket created successfully!');
    } catch (error: any) {
      console.error('Create ticket error:', error);
      toast.error(error.message || 'Failed to create ticket');
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(requestForm),
      });

      if (!response.ok) {
        throw new Error('Failed to create request');
      }

      const result = await response.json();
      
      // Upload files if any
      if (uploadFiles.length > 0 && result.request) {
        for (const file of uploadFiles) {
          const formData = new FormData();
          formData.append('file', file);
          
          await fetch(`/api/requests/${result.request.id}/attachments`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
          });
        }
      }
      
      setView('requests');
      setRequestForm({
        title: '',
        description: '',
        projectId: '',
      });
      setUploadFiles([]);
      fetchData();
      toast.success('Request created successfully!');
    } catch (error: any) {
      console.error('Create request error:', error);
      toast.error(error.message || 'Failed to create request');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFiles(Array.from(e.target.files));
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedTicket) return;
    
    setIsAddingNote(true);
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ note: newNote }),
      });

      if (!response.ok) {
        throw new Error('Failed to add note');
      }

      const result = await response.json();
      
      // Update the selected ticket with the new note
      setSelectedTicket({
        ...selectedTicket,
        notes: [result.note, ...(selectedTicket.notes || [])],
      });
      
      setNewNote('');
      setShowSuccessModal(true);
      
      // Refresh notes list
      fetchData();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note. Please try again.');
    } finally {
      setIsAddingNote(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-slate-600">Loading...</div>
        </div>
      </div>
    );
  }

  const stats = {
    total: tickets.length,
    pending: tickets.filter((t) => t.status === 'PENDING').length,
    inProgress: tickets.filter((t) => ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(t.status)).length,
    completed: tickets.filter((t) => t.status === 'COMPLETED').length,
  };

  const handleNavigation = () => {
    // Clear any detail views when navigating
    setSelectedTicket(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        userRole={user?.role} 
        username={user?.username} 
        onNavigate={handleNavigation}
      />
      
      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
        <div className="w-full max-w-[1600px] mx-auto">
          {selectedTicket ? (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={() => setSelectedTicket(null)} 
                className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors"
              >
                <span className="text-xl">←</span> Back to Dashboard
              </button>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
                {/* Header */}
                <div className="px-4 sm:px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start bg-slate-50/50 rounded-t-3xl gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Ticket Details</h1>
                      <Badge variant={getStatusColor(selectedTicket.status)}>
                        {['INVOICE', 'PAID'].includes(selectedTicket.status) ? 'CLOSED' : selectedTicket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-slate-500 flex flex-wrap items-center gap-2 text-sm sm:text-base">
                      <span className="font-mono">#{selectedTicket.id}</span>
                      <span>•</span>
                      <span>Created {formatDate(selectedTicket.createdAt)}</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Issue Section */}
                    <section>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Issue Description</h3>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedTicket.issue}</p>
                      </div>
                    </section>

                    {/* Additional Details */}
                    {selectedTicket.additionalDetails && (
                      <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Additional Details</h3>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedTicket.additionalDetails}</p>
                        </div>
                      </section>
                    )}

                    {/* Attachments */}
                    {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                      <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Attachments</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedTicket.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">{attachment.fileName}</p>
                                <p className="text-xs text-slate-500">{(attachment.fileSize / 1024).toFixed(2)} KB</p>
                              </div>
                              <a
                                href={attachment.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Status History */}
                    {selectedTicket.statusHistory && selectedTicket.statusHistory.filter(h => !['INVOICE', 'PAID'].includes(h.status)).length > 0 && (
                      <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">History</h3>
                        <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
                          {selectedTicket.statusHistory
                            .filter(h => !['INVOICE', 'PAID'].includes(h.status))
                            .map((history) => (
                            <div key={history.id} className="relative">
                              <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-300" />
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                                <span className="font-medium text-slate-900">Status changed to</span>
                                <Badge variant={getStatusColor(history.status)} size="sm">
                                  {history.status.replace('_', ' ')}
                                </Badge>
                                <span className="text-sm text-slate-500">{formatDate(history.createdAt)}</span>
                              </div>
                              {history.note && (
                                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mt-2">{history.note}</p>
                              )}
                              {history.adminNote && (
                                <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Admin Note</p>
                                  <p className="text-sm text-slate-700">{history.adminNote}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Notes for Admin */}
                    <section>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Notes for Admin
                      </h3>
                      
                      {/* Add Note Form */}
                      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-4">
                        <p className="text-xs text-blue-700 font-medium mb-3">Add a note to communicate with the admin team</p>
                        <Textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Type your message for the admin team..."
                          rows={3}
                          className="mb-3"
                        />
                        <Button 
                          onClick={handleAddNote}
                          disabled={!newNote.trim() || isAddingNote}
                          size="sm"
                        >
                          {isAddingNote ? 'Adding...' : 'Add Note'}
                        </Button>
                      </div>

                      {/* Display Notes */}
                      {selectedTicket.notes && selectedTicket.notes.length > 0 ? (
                        <div className="space-y-3">
                          {selectedTicket.notes.map((note: any) => (
                            <div key={note.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                    {note.user?.username?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">{note.user?.username}</p>
                                    <p className="text-xs text-slate-500">{formatRelativeTime(note.createdAt)}</p>
                                  </div>
                                </div>
                                {note.user?.role === 'ADMIN' && (
                                  <Badge variant="info" size="sm">Admin</Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.note}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">No notes yet. Be the first to add one!</p>
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Sidebar Info */}
                  <div className="space-y-6">
                    {/* Priority Card */}
                    <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 sm:mb-4">Priority</h3>
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-semibold border-2 bg-white ${
                          selectedTicket.priority === 'P1' ? 'text-red-600 border-red-600' :
                          selectedTicket.priority === 'P2' ? 'text-amber-600 border-amber-600' :
                          'text-green-600 border-green-600'
                        }`}>
                          <span className="whitespace-nowrap">{getPriorityLabel(selectedTicket.priority)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Branch Info */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Branch Details</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Name</p>
                          <p className="font-medium text-slate-900">{selectedTicket.branch?.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Number</p>
                          <p className="font-medium text-slate-900">{selectedTicket.branch?.branchNumber}</p>
                        </div>
                      </div>
                    </div>

                    {/* Team Info */}
                    {(selectedTicket.team || (selectedTicket.user?.teams && (selectedTicket.user.teams as any[]).length > 0)) && (
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-100">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Associated Team(s)</h3>
                        <div className="space-y-3">
                          {selectedTicket.team && (
                            <div className="flex items-center gap-3 bg-white/70 p-3 rounded-lg">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                {selectedTicket.team.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Assigned Team</p>
                                <p className="font-bold text-slate-900">{selectedTicket.team.name}</p>
                              </div>
                            </div>
                          )}
                          {selectedTicket.user?.teams && (selectedTicket.user.teams as any[]).length > 0 && (
                            <div className="bg-white/70 p-3 rounded-lg space-y-2">
                              <p className="text-xs text-slate-500 uppercase tracking-wider">Creator's Teams</p>
                              {(selectedTicket.user.teams as any[]).map((userTeam: any) => (
                                <div key={userTeam.id} className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                    {userTeam.team?.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-sm font-medium text-slate-900">{userTeam.team?.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : view === 'create' ? (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <button 
                  onClick={() => setView('dashboard')} 
                  className="text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors"
                >
                  <span className="text-xl">←</span> Back to Dashboard
                </button>
                {companyName && (
                  <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                    <span className="font-semibold text-slate-700">{companyName}</span>
                  </div>
                )}
              </div>
              
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 text-slate-900">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Submit Dispatch Request</h2>
                  <p className="text-slate-500">Fill in the details below to create a new ticket.</p>
                </div>

                <div className="p-8">
                  <form onSubmit={handleCreateTicket} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <CustomSelect
                        label="Branch"
                        value={ticketForm.branchId}
                        onChange={(value) => setTicketForm({ ...ticketForm, branchId: value })}
                        options={branches.map((b) => ({
                          value: b.id,
                          label: `${b.branchNumber} - ${b.name}`,
                        }))}
                        placeholder="Select a branch"
                        searchable={true}
                      />

                      <Input
                        label="INC Number (Optional)"
                        value={ticketForm.incNumber}
                        onChange={(e) => setTicketForm({ ...ticketForm, incNumber: e.target.value })}
                        placeholder="Enter INC number if available"
                      />

                      <CustomSelect
                        label="Priority"
                        value={ticketForm.priority}
                        onChange={(value) => setTicketForm({ ...ticketForm, priority: value })}
                        options={[
                          { value: 'P1', label: 'P1 - Within 4 Hours' },
                          { value: 'P2', label: 'P2 - Next Working Day' },
                          { value: 'P3', label: 'P3 - Within 48 Hours' },
                        ]}
                        placeholder="Select priority"
                      />

                      {user?.teams && (user as any).teams.length > 0 && (
                        <CustomSelect
                          label="Team (Optional)"
                          value={ticketForm.teamId}
                          onChange={(value) => setTicketForm({ ...ticketForm, teamId: value })}
                          options={(user as any).teams.map((userTeam: any) => ({
                            value: userTeam.team.id,
                            label: userTeam.team.name,
                          }))}
                          placeholder="Select a team"
                        />
                      )}

                      <div className="lg:col-span-2">
                        <Textarea
                          label="Issue Description"
                          value={ticketForm.issue}
                          onChange={(e) => setTicketForm({ ...ticketForm, issue: e.target.value })}
                          placeholder="Describe the issue you're experiencing..."
                          rows={4}
                          required
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <Textarea
                          label="Additional Details (Optional)"
                          value={ticketForm.additionalDetails}
                          onChange={(e) => setTicketForm({ ...ticketForm, additionalDetails: e.target.value })}
                          placeholder="Any additional information that might be helpful..."
                          rows={3}
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Attachments (Optional)
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                        </div>
                        {uploadFiles.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {uploadFiles.map((file, idx) => (
                              <div key={idx} className="text-sm text-slate-600 flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span>📎 {file.name}</span>
                                <span className="text-slate-400">({(file.size / 1024).toFixed(2)} KB)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setView('dashboard')}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="lg">
                        Submit Request
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : view === 'profile' ? (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
                  <p className="text-sm text-slate-600 mt-1">View your account details</p>
                </div>
                {companyName && (
                  <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                    <span className="font-semibold text-slate-700">{companyName}</span>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-slate-700">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{user?.username}</h2>
                    <Badge variant="info" className="mt-2">{user?.role}</Badge>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            label="Username"
                            value={user?.username || ''}
                            readOnly
                            className="bg-slate-50"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => navigator.clipboard.writeText(user?.username || '')}
                          className="mb-0.5 text-slate-400 hover:text-blue-600 h-[50px] w-[50px]"
                        >
                          <Copy className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            label="Role"
                            value={user?.role || ''}
                            readOnly
                            className="bg-slate-50"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => navigator.clipboard.writeText(user?.role || '')}
                          className="mb-0.5 text-slate-400 hover:text-blue-600 h-[50px] w-[50px]"
                        >
                          <Copy className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <label className="block text-sm font-bold text-slate-700 mb-2">
                            Assigned Teams
                          </label>
                          {(user as any)?.teams && (user as any).teams.length > 0 ? (
                            <div className="space-y-2">
                              {(user as any).teams.map((userTeam: any, index: number) => (
                                <div key={userTeam.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                      {userTeam.team?.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-slate-900">{userTeam.team?.name}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    onClick={() => navigator.clipboard.writeText(userTeam.team?.name || '')}
                                    className="text-slate-400 hover:text-blue-600 h-8 w-8 p-0"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                              <p className="text-slate-500 text-sm">No teams assigned</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {(user as any)?.teams && (user as any).teams.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <div className="flex items-start gap-3">
                        <UserIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-blue-900 mb-1">Multi-Team Access</h3>
                          <p className="text-sm text-blue-700 mb-2">
                            You are part of <strong>{(user as any).teams.length}</strong> team{(user as any).teams.length !== 1 ? 's' : ''}. You can view and manage tickets from all team members across:
                          </p>
                          <ul className="text-sm text-blue-700 list-disc list-inside">
                            {(user as any).teams.map((userTeam: any) => (
                              <li key={userTeam.id}><strong>{userTeam.team?.name}</strong></li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : view === 'analytics' && user ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
                {companyName && (
                  <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                    <span className="font-semibold text-slate-700">{companyName}</span>
                  </div>
                )}
              </div>
              <AnalyticsSection 
                tickets={tickets} 
                currentUser={user} 
              />
            </div>
          ) : view === 'notes' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">My Notes</h1>
                  <p className="text-sm text-slate-600 mt-1">View all your ticket communications</p>
                </div>
                {companyName && (
                  <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                    <span className="font-semibold text-slate-700">{companyName}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatRow
                  label="Total Notes"
                  count={notes.length}
                  icon={MessageSquare}
                  color="indigo"
                  variant="ticket"
                  asTicket
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {notes.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {notes.map((note: any) => (
                      <div key={note.id} className="p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold shrink-0">
                                {note.user?.username?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-slate-900">{note.user?.username}</p>
                                  {scope === 'team' && note.user?.team?.name && (
                                    <span className="text-xs text-slate-500">• {note.user.team.name}</span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">{formatRelativeTime(note.createdAt)}</p>
                              </div>
                              {note.user?.role === 'ADMIN' && (
                                <Badge variant="warning" size="sm">Admin</Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-slate-700 mb-4 line-clamp-3">{note.note}</p>
                            
                            {note.ticket && (
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Related Ticket</p>
                                    <p className="text-sm font-medium text-slate-900 truncate">{note.ticket.issue}</p>
                                    <p className="text-xs text-slate-500 font-mono mt-1">#{note.ticket.id.slice(0, 8)}</p>
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    {note.ticket.status && (
                                      <Badge variant={getStatusColor(note.ticket.status)} size="sm">
                                        {['INVOICE', 'PAID'].includes(note.ticket.status) ? 'CLOSED' : note.ticket.status.replace('_', ' ')}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedNote(note);
                              setShowNoteDetailModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No notes yet</h3>
                    <p className="text-slate-500 mb-6">You haven't added any notes to your tickets yet.</p>
                    <Button onClick={() => setView('tickets')}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      View Tickets
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : view === 'tickets' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {scope === 'team' ? 'Team Tickets' : 'My Tickets'}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">View and manage all your tickets</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {companyName && (
                    <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                      <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                      <span className="font-semibold text-slate-700">{companyName}</span>
                    </div>
                  )}
                  <SearchBar 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    className="w-full lg:w-80"
                  />
                  <Button onClick={() => setView('create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Ticket
                  </Button>
                </div>
              </div>

              {/* Team Scope Selector */}
              {user?.teams && (user as any).teams.length > 0 && (
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
                    <button
                      onClick={() => {
                        setScope('me');
                        setSelectedTeamId(null);
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        scope === 'me' 
                          ? 'bg-slate-100 text-slate-900' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <UserIcon className="w-4 h-4" />
                      My View
                    </button>
                    <button
                      onClick={() => setScope('team')}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        scope === 'team' 
                          ? 'bg-slate-100 text-slate-900' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      Team View
                    </button>
                  </div>

                  {/* Team Selector */}
                  {scope === 'team' && (
                    <div style={{ minWidth: '200px' }}>
                      <CustomSelect
                        value={selectedTeamId || ''}
                        onChange={(value) => setSelectedTeamId(value || null)}
                        options={[
                          { value: '', label: 'All Teams' },
                          ...(user as any).teams.map((userTeam: any) => ({
                            value: userTeam.team.id,
                            label: userTeam.team.name
                          }))
                        ]}
                        placeholder="Select a team"
                        searchable
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>ID</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Team</TableHead>
                      {scope === 'team' && <TableHead>Created By</TableHead>}
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      // Skeleton Loading State
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index} className="animate-pulse">
                          <TableCell>
                            <div className="h-4 bg-slate-200 rounded w-16"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-slate-200 rounded w-48"></div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="h-4 bg-slate-200 rounded w-32"></div>
                              <div className="h-3 bg-slate-200 rounded w-20"></div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-slate-200 rounded w-24"></div>
                          </TableCell>
                          {scope === 'team' && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-200"></div>
                                <div className="h-4 bg-slate-200 rounded w-20"></div>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="h-6 bg-slate-200 rounded-full w-24"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-slate-200 rounded w-24"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : paginatedTickets.length > 0 ? (
                      paginatedTickets.map((ticket) => (
                        <TableRow key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="cursor-pointer hover:bg-slate-50">
                          <TableCell className="font-mono text-xs text-slate-500">#{ticket.id.substring(0, 8)}</TableCell>
                          <TableCell className="font-medium text-slate-900 max-w-md truncate">{ticket.issue}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900">{ticket.branch?.name}</span>
                              <span className="text-xs text-slate-500">#{ticket.branch?.branchNumber}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-700">{ticket.team?.name || '-'}</span>
                          </TableCell>
                          {scope === 'team' && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                  {ticket.user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-slate-700">{ticket.user?.username}</span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <div className={`inline-flex items-center justify-center px-2 sm:px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold border-2 bg-white whitespace-nowrap ${
                              ticket.priority === 'P1' ? 'text-red-600 border-red-600' :
                              ticket.priority === 'P2' ? 'text-amber-600 border-amber-600' :
                              'text-green-600 border-green-600'
                            }`}>
                              <span className="hidden sm:inline">{getPriorityLabel(ticket.priority)}</span>
                              <span className="sm:hidden">{ticket.priority}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(ticket.status)}>{['INVOICE', 'PAID'].includes(ticket.status) ? 'CLOSED' : ticket.status.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm">{formatDate(ticket.createdAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No tickets found.
                        </td>
                      </tr>
                    )}
                  </TableBody>
                </Table>
                
                {tickets.length > 0 && (
                  <div className="p-4 border-t border-slate-100">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : view === 'requests' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-8rem)]">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {scope === 'team' ? 'Team Requests' : 'My Requests'}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">Manage and track request progress</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {companyName && (
                    <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                      <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                      <span className="font-semibold text-slate-700">{companyName}</span>
                    </div>
                  )}
                  {(user?.teams && (user as any).teams.length > 0) && (
                    <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                      <button
                        onClick={() => setScope('me')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          scope === 'me' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        My Requests
                      </button>
                      <button
                        onClick={() => setScope('team')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          scope === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Team Requests
                      </button>
                    </div>
                  )}
                  <Button onClick={() => setView('create-request')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Request
                  </Button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search requests by title, description, or user..."
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CustomSelect
                    value={filterPriority || 'ALL'}
                    onChange={(value) => setFilterPriority(value === 'ALL' ? null : value)}
                    options={[
                      { value: 'ALL', label: 'All Priorities' },
                      { value: 'HIGH', label: 'High Priority' },
                      { value: 'MEDIUM', label: 'Medium Priority' },
                      { value: 'LOW', label: 'Low Priority' }
                    ]}
                    className="w-full sm:w-40"
                  />
                  <CustomSelect
                    value={filterStatus || 'ALL'}
                    onChange={(value) => setFilterStatus(value === 'ALL' ? null : value)}
                    options={[
                      { value: 'ALL', label: 'All Status' },
                      { value: 'PENDING', label: 'Open' },
                      { value: 'APPROVED', label: 'Approved' },
                      { value: 'REJECTED', label: 'Rejected' },
                      { value: 'IN_PROGRESS', label: 'In Progress' },
                      { value: 'COMPLETED', label: 'Completed' }
                    ]}
                    className="w-full sm:w-40"
                  />
                </div>
              </div>

              {/* Kanban Board */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-6 overflow-x-auto">
                <KanbanBoard
                  requests={requests.filter(r => 
                    (!searchQuery || 
                    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())) &&
                    (!filterPriority || r.priority === filterPriority) &&
                    (!filterStatus || r.status === filterStatus)
                  )}
                  onRequestClick={setSelectedRequest}
                  isAdmin={false}
                />
              </div>

              {/* Request Detail Modal */}
              {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRequest(null)}>
                  <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <RequestDetail
                      request={selectedRequest}
                      onClose={() => setSelectedRequest(null)}
                      isAdmin={false}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : view === 'create-request' ? (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <button 
                  onClick={() => setView('requests')} 
                  className="text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors"
                >
                  <span className="text-xl">←</span> Back to Requests
                </button>
                {companyName && (
                  <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                    <span className="font-semibold text-slate-700">{companyName}</span>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">Create New Request</h1>
                  <p className="text-slate-500">Submit a request to the admin team</p>
                </div>

                <div className="p-8">
                  <form onSubmit={handleCreateRequest} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="lg:col-span-2">
                        <Input
                          label="Title"
                          value={requestForm.title}
                          onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                          required
                          placeholder="Brief description of your request"
                        />
                      </div>
                      
                      <div className="lg:col-span-2">
                        <Textarea
                          label="Description"
                          value={requestForm.description}
                          onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                          required
                          rows={5}
                          placeholder="Provide detailed information about your request..."
                        />
                      </div>

                      <Input
                        label="Project ID (Optional)"
                        value={requestForm.projectId}
                        onChange={(e) => setRequestForm({ ...requestForm, projectId: e.target.value })}
                        placeholder="Enter project identifier if applicable"
                      />

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Attachments (Optional)
                        </label>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {uploadFiles.length > 0 && (
                          <p className="text-xs text-slate-500 mt-2">
                            {uploadFiles.length} file(s) selected
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => {
                          setView('requests');
                          setRequestForm({ title: '', description: '', projectId: '' });
                          setUploadFiles([]);
                        }}
                        className="text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                        Submit Request
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 mt-12 lg:mt-0">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {user?.username ? `${user.username.charAt(0).toUpperCase() + user.username.slice(1)}'s Dashboard` : 'Dashboard'}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Manage your dispatch requests {user?.team?.name && <span className="font-medium text-blue-600">for {user.team.name}</span>}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {user?.teams && (user as any).teams.length > 0 && (
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => {
                          setScope('me');
                          setSelectedTeamId(null);
                        }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                          scope === 'me' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <UserIcon className="w-4 h-4" />
                        My View
                      </button>
                      <button
                        onClick={() => setScope('team')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                          scope === 'team' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        Team View
                      </button>
                    </div>
                  )}
                  {scope === 'team' && user?.teams && (user as any).teams.length > 0 && (
                    <div style={{ minWidth: '200px' }}>
                      <CustomSelect
                        value={selectedTeamId || ''}
                        onChange={(value) => setSelectedTeamId(value || null)}
                        options={[
                          { value: '', label: companyName || 'All Teams' },
                          ...(user as any).teams.map((userTeam: any) => ({
                            value: userTeam.team.id,
                            label: userTeam.team.name
                          }))
                        ]}
                        placeholder="Select a team"
                        searchable
                      />
                    </div>
                  )}
                  {companyName && (
                    <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                      <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                      <span className="font-semibold text-slate-700">{companyName}</span>
                    </div>
                  )}

                  <Button onClick={() => setView('create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Ticket
                  </Button>
                </div>
              </div>

              {/* Dashboard Tabs - Removed calendar tab */}

              {
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Left Column: Ticket List */}
                  <div className="xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-slate-900">Recent Tickets</h3>
                      <Button variant="ghost" onClick={() => setView('tickets')} className="text-blue-600 hover:text-blue-700 text-sm">
                        View All
                      </Button>
                    </div>
                    {tickets.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                        <p className="text-slate-600">No tickets yet. Submit a dispatch request to get started.</p>
                        <Button onClick={() => setView('create')} className="mt-4">
                          Create First Ticket
                        </Button>
                      </div>
                    ) : (
                      tickets.slice(0, 5).map((ticket) => (
                        <div 
                          key={ticket.id}
                          onClick={() => setSelectedTicket(ticket)}
                          className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex flex-col sm:flex-row items-start gap-4">
                            {/* Branch Icon/Avatar */}
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                              <Building2 className="w-6 h-6" />
                            </div>
                            
                            <div className="flex-1 min-w-0 w-full">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-bold text-slate-900 truncate max-w-full">{ticket.branch?.name}</h3>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-slate-500">#{ticket.id.substring(0, 8)}</p>
                                    {scope === 'team' && ticket.user?.username && (
                                      <span className="text-xs text-blue-600 font-medium">
                                        • by {ticket.user.username}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold border-2 bg-white shrink-0 ${
                                  ticket.priority === 'P1' ? 'text-red-600 border-red-600' :
                                  ticket.priority === 'P2' ? 'text-amber-600 border-amber-600' :
                                  'text-green-600 border-green-600'
                                }`}>
                                  <span className="hidden sm:inline whitespace-nowrap">{getPriorityLabel(ticket.priority)}</span>
                                  <span className="sm:hidden">{ticket.priority}</span>
                                </div>
                              </div>
                              
                              <p className="text-sm text-slate-600 mb-4 line-clamp-2">{ticket.issue}</p>
                              
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-4">
                                  <span className="text-xs text-slate-500">Branch #{ticket.branch?.branchNumber}</span>
                                  {ticket.team && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                                      <Building2 className="w-3 h-3 text-blue-600" />
                                      <span className="text-xs font-medium text-blue-700">{ticket.team.name}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">Status</span>
                                    <span className={`text-xs font-medium ${
                                      ticket.status === 'COMPLETED' ? 'text-green-600' :
                                      ticket.status === 'IN_PROGRESS' ? 'text-blue-600' :
                                      ['CLOSED', 'INVOICE', 'PAID'].includes(ticket.status) ? 'text-slate-600' :
                                      'text-amber-600'
                                    }`}>
                                      {['INVOICE', 'PAID'].includes(ticket.status) ? 'CLOSED' : ticket.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">Created</span>
                                    <span className="text-xs font-medium text-slate-600">
                                      {formatRelativeTime(ticket.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Right Column: Stats & Widgets */}
                  <div className="space-y-8">
                    {/* Team Info Card */}
                    {(user as any)?.team && (
                      <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-blue-900">Your Team</h3>
                            <p className="text-sm text-blue-700">{(user as any)?.team?.name}</p>
                          </div>
                        </div>
                        <p className="text-xs text-blue-600">
                          Viewing tickets from all team members
                        </p>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <StatRow
                        label={(user as any)?.team ? "Team Tickets" : "My Tickets"}
                        count={stats.total}
                        icon={MessageSquare}
                        color="navy"
                        variant="ticket"
                        asTicket
                      />
                      <StatRow
                        label="Pending"
                        count={stats.pending}
                        icon={Clock}
                        color="orange"
                        variant="ticket"
                        asTicket
                      />
                      <StatRow
                        label="Completed"
                        count={stats.completed}
                        icon={CheckCircle}
                        color="teal"
                        variant="ticket"
                        asTicket
                      />
                      <StatRow
                        label="In Progress"
                        count={stats.inProgress}
                        icon={Clock}
                        color="slate"
                        variant="ticket"
                        asTicket
                      />
                    </div>

                    {/* Promo Card - REMOVED */}
                  </div>
                </div>
              }
            </>
          )}
        </div>
      </main>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Note Added Successfully!"
        message="Your note has been added to the ticket. The admin team will be notified and can respond to your message."
        type="success"
      />

      {/* Note Detail Modal */}
      <NoteDetailModal
        isOpen={showNoteDetailModal}
        onClose={() => {
          setShowNoteDetailModal(false);
          setSelectedNote(null);
        }}
        note={selectedNote}
        isAdmin={false}
      />
    </div>
  );
}

export default function UserDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-slate-600">Loading...</div></div>}>
      <UserDashboardContent />
    </Suspense>
  );
}
