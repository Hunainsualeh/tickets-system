'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
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
import { StatCard } from '@/app/components/StatCard';
import { SearchBar } from '@/app/components/SearchBar';
import { Pagination } from '@/app/components/Pagination';
import { getStatusColor, getPriorityColor, formatDate, formatRelativeTime } from '@/lib/utils';
import { Plus, CheckCircle, Clock, AlertCircle, MessageSquare, XCircle, Search, Filter, Calendar, Building2, Copy, User as UserIcon, Shield, Lock, Eye } from 'lucide-react';
import { Suspense } from 'react';
import { SuccessModal } from '@/app/components/SuccessModal';
import { NoteDetailModal } from '@/app/components/NoteDetailModal';
import { RequestDetail } from '@/app/components/RequestDetail';

function UserDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'create' | 'tickets' | 'profile' | 'requests' | 'create-request' | 'notes'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'calendar'>('overview');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<'me' | 'team'>('me');
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

  const totalPages = Math.ceil(tickets.length / itemsPerPage);
  const paginatedTickets = tickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [ticketForm, setTicketForm] = useState({
    branchId: '',
    incNumber: '',
    priority: 'P2',
    issue: '',
    additionalDetails: '',
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

    const userData = JSON.parse(storedUser);
    setUser(userData);

    // Fetch fresh user data to get team info
    const fetchUserData = async () => {
      try {
        const response = await apiClient.getMe();
        if (response.user) {
          setUser(response.user);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();

    // Update view from URL params
    const viewParam = searchParams.get('view');
    if (viewParam && ['dashboard', 'create', 'tickets', 'profile', 'requests', 'create-request', 'notes'].includes(viewParam)) {
      setView(viewParam as any);
    } else {
      setView('dashboard');
    }
  }, [router, searchParams]);

  // Clear ticket detail view when switching views
  useEffect(() => {
    setSelectedTicket(null);
  }, [view]);

  const fetchData = async () => {
    try {
      const [branchesRes, ticketsRes, requestsRes, notesRes] = await Promise.all([
        apiClient.getBranches(),
        apiClient.getTickets({ search: searchQuery, scope }),
        fetch(`/api/requests?scope=${scope}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }).then(res => res.json()),
        fetch(`/api/notes?scope=${scope}`, {
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
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, scope]);

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
      });
      setUploadFiles([]);
      fetchData();
    } catch (error: any) {
      alert(error.message);
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
    } catch (error: any) {
      alert(error.message);
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
      alert('Failed to add note. Please try again.');
    } finally {
      setIsAddingNote(false);
    }
  };

  if (loading) {
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
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 rounded-t-3xl">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-slate-900">Ticket Details</h1>
                      <Badge variant={getStatusColor(selectedTicket.status)}>
                        {selectedTicket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-slate-500 flex items-center gap-2">
                      <span className="font-mono">#{selectedTicket.id}</span>
                      <span>•</span>
                      <span>Created {formatDate(selectedTicket.createdAt)}</span>
                    </p>
                  </div>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                    {selectedTicket.statusHistory && selectedTicket.statusHistory.length > 0 && (
                      <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">History</h3>
                        <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
                          {selectedTicket.statusHistory.map((history) => (
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
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Priority</h3>
                      <div className="flex items-center gap-3">
                        <Badge variant={getPriorityColor(selectedTicket.priority)} size="lg">
                          {selectedTicket.priority}
                        </Badge>
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
                  </div>
                </div>
              </div>
            </div>
          ) : view === 'create' ? (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={() => setView('dashboard')} 
                className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors"
              >
                <span className="text-xl">←</span> Back to Dashboard
              </button>
              
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
                          label: `${b.name} (${b.branchNumber})`,
                        }))}
                        placeholder="Select a branch"
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
                          { value: 'P1', label: 'P1 - Urgent issue requiring immediate attention' },
                          { value: 'P2', label: 'P2 - Important but not urgent' },
                          { value: 'P3', label: 'P3 - Can be addressed later' },
                        ]}
                        placeholder="Select priority"
                      />

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
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
                <p className="text-sm text-slate-600 mt-1">View your account details</p>
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
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            label="Team"
                            value={(user as any)?.team?.name || 'No Team Assigned'}
                            readOnly
                            className="bg-slate-50"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => navigator.clipboard.writeText((user as any)?.team?.name || 'No Team')}
                          className="mb-0.5 text-slate-400 hover:text-blue-600 h-[50px] w-[50px]"
                        >
                          <Copy className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {(user as any)?.team && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <div className="flex items-start gap-3">
                        <UserIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-blue-900 mb-1">Team Access</h3>
                          <p className="text-sm text-blue-700">
                            You are part of <strong>{(user as any)?.team?.name}</strong>. You can view and manage tickets from all team members.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : view === 'notes' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">My Notes</h1>
                  <p className="text-sm text-slate-600 mt-1">View all your ticket communications</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatCard
                  title="Total Notes"
                  count={notes.length}
                  icon={MessageSquare}
                  variant="blue"
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
                                        {note.ticket.status.replace('_', ' ')}
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
                  <h1 className="text-2xl font-bold text-slate-900">My Tickets</h1>
                  <p className="text-sm text-slate-600 mt-1">View and manage all your tickets</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
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

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>ID</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Branch</TableHead>
                      {scope === 'team' && <TableHead>Created By</TableHead>}
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {paginatedTickets.map((ticket) => (
                      <TableRow key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="cursor-pointer hover:bg-slate-50">
                        <TableCell className="font-mono text-xs text-slate-500">#{ticket.id.substring(0, 8)}</TableCell>
                        <TableCell className="font-medium text-slate-900 max-w-md truncate">{ticket.issue}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">{ticket.branch?.name}</span>
                            <span className="text-xs text-slate-500">#{ticket.branch?.branchNumber}</span>
                          </div>
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
                          <Badge variant={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">{formatDate(ticket.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {tickets.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
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
              {/* Header - Fixed */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">My Requests</h1>
                  <p className="text-sm text-slate-600 mt-1">Total: {requests.length} requests</p>
                </div>
                
                <Button onClick={() => setView('create-request')}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Request
                </Button>
              </div>

              {/* Chat-like Layout */}
              <div className="flex gap-4 h-[calc(100%-5rem)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Left: Requests List */}
                <div className={`${selectedRequest ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-96 border-r border-slate-200`}>
                  {/* Search Bar */}
                  <div className="shrink-0 p-4 border-b border-slate-200">
                    <SearchBar 
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Search requests..."
                    />
                  </div>

                  {/* Requests List */}
                  <div className="flex-1 overflow-y-auto">
                    {requests.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {requests.map((request) => (
                          <button
                            key={request.id}
                            onClick={() => setSelectedRequest(request)}
                            className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                              selectedRequest?.id === request.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="font-medium text-slate-900 line-clamp-1 flex-1">
                                {request.title}
                              </h3>
                              <Badge 
                                variant={
                                  request.status === 'COMPLETED' ? 'success' :
                                  request.status === 'APPROVED' ? 'info' :
                                  request.status === 'REJECTED' ? 'danger' :
                                  request.status === 'IN_PROGRESS' ? 'warning' :
                                  'default'
                                }
                                size="sm"
                              >
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                              {request.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 font-mono">
                                  #{request.id.substring(0, 8)}
                                </span>
                                {scope === 'team' && request.user?.username && (
                                  <span className="text-xs text-blue-600 font-medium">
                                    by {request.user.username}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">
                                {formatRelativeTime(request.createdAt)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <MessageSquare className="w-16 h-16 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No requests yet</h3>
                        <p className="text-sm text-slate-500 mb-4">Create your first request to get started</p>
                        <Button onClick={() => setView('create-request')} size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          New Request
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Request Details */}
                <div className={`${selectedRequest ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0`}>
                  {selectedRequest ? (
                    <RequestDetail
                      request={selectedRequest}
                      onClose={() => setSelectedRequest(null)}
                      isAdmin={false}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <MessageSquare className="w-10 h-10 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Select a request</h3>
                      <p className="text-sm text-slate-500">Choose a request from the list to view its details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : view === 'create-request' ? (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={() => setView('requests')} 
                className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors"
              >
                <span className="text-xl">←</span> Back to Requests
              </button>

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
                  <h1 className="text-2xl font-bold text-slate-900">Arsalan's Dashboard</h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Manage your dispatch requests {user?.team?.name && <span className="font-medium text-blue-600">for {user.team.name}</span>}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {user?.teamId && (
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
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
                      <button
                        onClick={() => setScope('me')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                          scope === 'me' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <UserIcon className="w-4 h-4" />
                        My View
                      </button>
                    </div>
                  )}
                  <SearchBar 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    className="w-full lg:w-80"
                  />
                  
                  <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                    <Filter className="w-4 h-4" />
                    <span>Filter</span>
                  </button>

                  <Button onClick={() => setView('create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Ticket
                  </Button>
                </div>
              </div>

              {/* Dashboard Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
                <button
                  onClick={() => setDashboardTab('overview')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    dashboardTab === 'overview'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setDashboardTab('calendar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    dashboardTab === 'calendar'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Calendar
                </button>
              </div>

              {dashboardTab === 'overview' && (
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
                                <div>
                                  <h3 className="font-bold text-slate-900 truncate">{ticket.branch?.name}</h3>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-slate-500">#{ticket.id.substring(0, 8)}</p>
                                    {scope === 'team' && ticket.user?.username && (
                                      <span className="text-xs text-blue-600 font-medium">
                                        • by {ticket.user.username}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge variant={getPriorityColor(ticket.priority)}>
                                  {ticket.priority}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-slate-600 mb-4 line-clamp-2">{ticket.issue}</p>
                              
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">Branch #{ticket.branch?.branchNumber}</span>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">Status</span>
                                    <span className={`text-xs font-medium ${
                                      ticket.status === 'COMPLETED' ? 'text-green-600' :
                                      ticket.status === 'IN_PROGRESS' ? 'text-blue-600' :
                                      'text-amber-600'
                                    }`}>
                                      {ticket.status.replace('_', ' ')}
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
                      <StatCard
                        title={(user as any)?.team ? "Team Tickets" : "My Tickets"}
                        count={stats.total}
                        icon={MessageSquare}
                        variant="orange"
                      />
                      <StatCard
                        title="Pending"
                        count={stats.pending}
                        icon={Clock}
                        variant="lime"
                      />
                      <StatCard
                        title="Completed"
                        count={stats.completed}
                        icon={CheckCircle}
                        variant="green"
                      />
                      <StatCard
                        title="In Progress"
                        count={stats.inProgress}
                        icon={Clock}
                        variant="grey"
                      />
                    </div>

                    {/* Promo Card - REMOVED */}
                  </div>
                </div>
              )}

              {dashboardTab === 'calendar' && (
                <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <h2 className="text-xl font-bold text-slate-900">December 2025</h2>
                    <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                      <Button variant="ghost" size="sm" className="shrink-0">Today</Button>
                      <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 shrink-0">
                        <button className="p-1 hover:bg-white rounded shadow-sm transition-all">
                          <span className="sr-only">Previous month</span>
                          ←
                        </button>
                        <span className="text-sm font-medium px-2 whitespace-nowrap">December 2025</span>
                        <button className="p-1 hover:bg-white rounded shadow-sm transition-all">
                          <span className="sr-only">Next month</span>
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px] grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="bg-slate-50 p-4 text-center text-sm font-semibold text-slate-600">
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: 35 }).map((_, i) => {
                        const day = i - 2; // Offset for demo
                        const isToday = day === 9;
                        const date = new Date(2025, 11, day);
                        const dayTickets = tickets.filter(t => {
                          const tDate = new Date(t.createdAt);
                          return tDate.getDate() === day && tDate.getMonth() === 11 && tDate.getFullYear() === 2025;
                        });

                        return (
                          <div key={i} className={`bg-white min-h-[120px] p-3 hover:bg-slate-50 transition-colors ${day < 1 || day > 31 ? 'bg-slate-50/50 text-slate-400' : ''}`}>
                            {day > 0 && day <= 31 && (
                              <>
                                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-2 ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                                  {day}
                                </div>
                                <div className="space-y-1">
                                  {dayTickets.map(ticket => (
                                    <div 
                                      key={ticket.id}
                                      onClick={() => {
                                        setSelectedTicket(ticket);
                                        setView('tickets');
                                      }}
                                      className={`text-xs p-1.5 rounded truncate cursor-pointer hover:opacity-80 ${
                                        ticket.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                        ticket.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                        'bg-blue-100 text-blue-700'
                                      }`}
                                    >
                                      {ticket.issue}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
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
