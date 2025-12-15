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
import { Plus, CheckCircle, Clock, AlertCircle, MessageSquare, XCircle, Search, Filter, Building2, Copy, User as UserIcon, Shield, Lock, Eye, Calendar, BarChart3, MoreVertical, Phone, Video, Paperclip, Smile, Mic, FileText } from 'lucide-react';
import { Suspense } from 'react';
import { SuccessModal } from '@/app/components/SuccessModal';
import { NoteDetailModal } from '@/app/components/NoteDetailModal';
import { RequestDetail } from '@/app/components/RequestDetail';
import { AnalyticsSection } from '@/app/components/AnalyticsSection';
import { AreaChart } from '@/app/components/AreaChart';
import { KanbanBoard } from '@/app/components/KanbanBoard';
import NotificationBell from '@/app/components/NotificationBell';
import { TicketCard } from '@/app/components/TicketCard';
import { TicketDetail } from '@/app/components/TicketDetail';

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
  const [branchSearch, setBranchSearch] = useState('');
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false);

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

  const filteredTickets = tickets.filter(ticket => {
    if (filterStatus && filterStatus !== 'ALL' && ticket.status !== filterStatus) return false;
    if (filterPriority && filterPriority !== 'ALL' && ticket.priority !== filterPriority) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [ticketForm, setTicketForm] = useState({
    branchId: '',
    incNumber: '',
    priority: 'P2',
    issue: '',
    additionalDetails: '',
    teamId: '',
    localContactName: '',
    localContactEmail: '',
    localContactPhone: '',
    timezone: '',
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

  // Handle deep linking to tickets
  useEffect(() => {
    const ticketId = searchParams.get('ticketId');
    if (ticketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        setSelectedTicket(ticket);
        setView('tickets');
      }
    }
  }, [tickets, searchParams]);

  // Handle deep linking to requests
  useEffect(() => {
    const requestId = searchParams.get('requestId');
    if (requestId && requests.length > 0) {
      const request = requests.find(r => r.id === requestId);
      if (request) {
        setSelectedRequest(request);
        setView('requests');
      }
    }
  }, [requests, searchParams]);

  // Clear detail views when switching views
  useEffect(() => {
    const ticketId = searchParams.get('ticketId');
    if (!ticketId) {
      setSelectedTicket(null);
    }
    
    const requestId = searchParams.get('requestId');
    if (!requestId) {
      setSelectedRequest(null);
    }
  }, [view, searchParams]);

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
        localContactName: '',
        localContactEmail: '',
        localContactPhone: '',
        timezone: '',
      });
      setUploadFiles([]);
      fetchData();
      toast.success('Ticket created successfully!');
      window.dispatchEvent(new Event('refresh-notifications'));
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
      window.dispatchEvent(new Event('refresh-notifications'));
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
      window.dispatchEvent(new Event('refresh-notifications'));
      
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
    open: tickets.filter((t) => ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(t.status)).length,
    pending: tickets.filter((t) => t.status === 'PENDING').length,
    inProgress: tickets.filter((t) => ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(t.status)).length,
    completed: tickets.filter((t) => t.status === 'COMPLETED').length,
    closed: tickets.filter((t) => ['COMPLETED', 'CLOSED', 'INVOICE', 'PAID'].includes(t.status)).length,
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
            <TicketDetail 
              ticket={selectedTicket}
              currentUser={user}
              onBack={() => setSelectedTicket(null)}
              onAddNote={async (note) => {
                if (!selectedTicket) return;
                setIsAddingNote(true);
                try {
                  const response = await fetch(`/api/tickets/${selectedTicket.id}/notes`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: JSON.stringify({ note }),
                  });

                  if (!response.ok) throw new Error('Failed to add note');

                  const result = await response.json();
                  
                  setSelectedTicket({
                    ...selectedTicket,
                    notes: [result.note, ...(selectedTicket.notes || [])],
                  });
                  
                  setShowSuccessModal(true);
                  window.dispatchEvent(new Event('refresh-notifications'));
                  fetchData();
                } catch (error) {
                  console.error('Error adding note:', error);
                  toast.error('Failed to add note');
                } finally {
                  setIsAddingNote(false);
                }
              }}
              isAddingNote={isAddingNote}
            />
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
                  <div className="flex items-center gap-2 md:gap-4">
                    <NotificationBell />
                    <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                      <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                      <span className="font-semibold text-slate-700">{companyName}</span>
                    </div>
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
                      <div className="relative">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Branch
                        </label>
                        <input
                          type="text"
                          value={branchSearch}
                          onChange={(e) => {
                            setBranchSearch(e.target.value);
                            setShowBranchSuggestions(true);
                            if (ticketForm.branchId) {
                              setTicketForm(prev => ({ ...prev, branchId: '' }));
                            }
                          }}
                          onFocus={() => setShowBranchSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowBranchSuggestions(false), 200)}
                          placeholder="Type to search branch..."
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        {showBranchSuggestions && branchSearch && (
                          <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
                            {branches
                              .filter(b => 
                                b.name.toLowerCase().includes(branchSearch.toLowerCase()) || 
                                b.branchNumber.includes(branchSearch)
                              )
                              .map(b => (
                                <div
                                  key={b.id}
                                  className="px-4 py-2 hover:bg-slate-50 cursor-pointer"
                                  onClick={() => {
                                    setTicketForm(prev => ({ ...prev, branchId: b.id }));
                                    setBranchSearch(`${b.branchNumber} - ${b.name}`);
                                    setShowBranchSuggestions(false);
                                  }}
                                >
                                  <div className="font-medium text-slate-900">{b.branchNumber} - {b.name}</div>
                                </div>
                              ))}
                            {branches.filter(b => 
                                b.name.toLowerCase().includes(branchSearch.toLowerCase()) || 
                                b.branchNumber.includes(branchSearch)
                              ).length === 0 && (
                                <div className="px-4 py-2 text-slate-500">No branches found</div>
                              )}
                          </div>
                        )}
                      </div>

                      <Input
                        label="INC Number (Optional)"
                        value={ticketForm.incNumber}
                        onChange={(e) => setTicketForm({ ...ticketForm, incNumber: e.target.value })}
                        placeholder="Enter INC number if available"
                      />

                      <div className="lg:col-span-2">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Local Contact / Preferred Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Input
                            label="Contact Name"
                            value={ticketForm.localContactName}
                            onChange={(e) => setTicketForm({ ...ticketForm, localContactName: e.target.value })}
                            placeholder="First Name Last Name"
                          />
                          <Input
                            label="Email"
                            type="email"
                            value={ticketForm.localContactEmail}
                            onChange={(e) => setTicketForm({ ...ticketForm, localContactEmail: e.target.value })}
                            placeholder="email@example.com"
                          />
                          <Input
                            label="Phone Number"
                            value={ticketForm.localContactPhone}
                            onChange={(e) => setTicketForm({ ...ticketForm, localContactPhone: e.target.value })}
                            placeholder="(555) 555-5555"
                          />
                          <CustomSelect
                            label="Time Zone"
                            value={ticketForm.timezone}
                            onChange={(value) => setTicketForm({ ...ticketForm, timezone: value })}
                            options={[
                              { value: 'EST', label: 'Eastern Standard Time (EST)' },
                              { value: 'CST', label: 'Central Standard Time (CST)' },
                              { value: 'MST', label: 'Mountain Standard Time (MST)' },
                              { value: 'PST', label: 'Pacific Standard Time (PST)' },
                              { value: 'AST', label: 'Alaska Standard Time (AST)' },
                              { value: 'HST', label: 'Hawaii-Aleutian Standard Time (HST)' },
                            ]}
                            placeholder="Select Time Zone"
                          />
                        </div>
                      </div>

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
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
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
                requests={requests}
                currentUser={user} 
              />
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
                    <div className="flex items-center gap-2 md:gap-4">
                      <NotificationBell />
                      <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                        <span className="font-semibold text-slate-700">{companyName}</span>
                      </div>
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

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                  <CustomSelect
                    value={filterPriority || 'ALL'}
                    onChange={(value) => setFilterPriority(value === 'ALL' ? null : value)}
                    options={[
                      { value: 'ALL', label: 'All Priorities' },
                      { value: 'P1', label: 'P1 - High' },
                      { value: 'P2', label: 'P2 - Medium' },
                      { value: 'P3', label: 'P3 - Low' }
                    ]}
                    placeholder="Filter by Priority"
                    className="w-full sm:w-48"
                  />
                  <CustomSelect
                    value={filterStatus || 'ALL'}
                    onChange={(value) => setFilterStatus(value === 'ALL' ? null : value)}
                    options={[
                      { value: 'ALL', label: 'All Status' },
                      { value: 'PENDING', label: 'Pending' },
                      { value: 'IN_PROGRESS', label: 'In Progress' },
                      { value: 'COMPLETED', label: 'Completed' },
                      { value: 'CLOSED', label: 'Closed' }
                    ]}
                    placeholder="Filter by Status"
                    className="w-full sm:w-48"
                  />
              </div>

              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                      <div className="flex justify-between mb-4">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                          <div className="space-y-2">
                            <div className="w-32 h-4 bg-slate-200 rounded"></div>
                            <div className="w-24 h-3 bg-slate-200 rounded"></div>
                          </div>
                        </div>
                        <div className="w-20 h-6 bg-slate-200 rounded-full"></div>
                      </div>
                      <div className="w-full h-16 bg-slate-200 rounded-lg mb-4"></div>
                      <div className="flex justify-between">
                        <div className="w-24 h-4 bg-slate-200 rounded"></div>
                        <div className="w-24 h-4 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                  ))
                ) : paginatedTickets.length > 0 ? (
                  paginatedTickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onClick={() => setSelectedTicket(ticket)}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <p className="text-slate-500">No tickets found.</p>
                  </div>
                )}
                
                {tickets.length > 0 && (
                  <div className="p-4">
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Left Column (2/3 width) */}
              <div className="xl:col-span-2 space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Hello, {user?.username}</h1>
                    <p className="text-slate-500">Track team progress here. You almost reach a goal!</p>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Stat 1: Total Tickets */}
                  <div 
                    onClick={() => {
                      setView('tickets');
                      setFilterStatus('ALL');
                    }}
                    className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-900">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Total Tickets</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
                      </div>
                    </div>
                  </div>
                  {/* Stat 2: Pending */}
                  <div 
                    onClick={() => {
                      setView('tickets');
                      setFilterStatus('PENDING');
                    }}
                    className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-900">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Pending</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-slate-900">{stats.open}</h3>
                      </div>
                    </div>
                  </div>
                  {/* Stat 3: Completed */}
                  <div 
                    onClick={() => {
                      setView('tickets');
                      setFilterStatus('COMPLETED');
                    }}
                    className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-900">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Completed</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-slate-900">{stats.closed}</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ticket Trends Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                  <AreaChart 
                    title="Ticket Trends" 
                    subtitle="Weekly ticket activity and completion status"
                    labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                    data={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => {
                      const dayIndex = i === 6 ? 0 : i + 1;
                      return tickets.filter(t => new Date(t.createdAt).getDay() === dayIndex).length;
                    })}
                    data2={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => {
                      const dayIndex = i === 6 ? 0 : i + 1;
                      return tickets.filter(t => new Date(t.createdAt).getDay() === dayIndex && t.status === 'COMPLETED').length;
                    })}
                    legend1="Created"
                    legend2="Completed"
                  />
                </div>

                {/* Request Trends Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                  <AreaChart 
                    title="Request Trends" 
                    subtitle="Weekly request activity and completion status"
                    labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                    data={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => {
                      const dayIndex = i === 6 ? 0 : i + 1;
                      return requests.filter(r => new Date(r.createdAt).getDay() === dayIndex).length;
                    })}
                    data2={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => {
                      const dayIndex = i === 6 ? 0 : i + 1;
                      return requests.filter(r => new Date(r.createdAt).getDay() === dayIndex && r.status === 'COMPLETED').length;
                    })}
                    legend1="Created"
                    legend2="Completed"
                  />
                </div>

                {/* Recent Tickets (Current Tasks) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-900">Recent Tickets</h3>
                    <select className="text-sm border-none bg-slate-50 rounded-lg px-3 py-1 text-slate-600 focus:ring-0 outline-none">
                      <option>Week</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    {tickets.slice(0, 3).map(ticket => (
                      <div key={ticket.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900">{ticket.issue}</h4>
                            <p className="text-xs text-slate-500">{ticket.branch?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(ticket.status)}`} />
                            <span className="text-sm font-medium text-slate-700">{ticket.status.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{formatRelativeTime(ticket.createdAt)}</span>
                          </div>
                          <button className="text-slate-400 hover:text-slate-600">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {tickets.length === 0 && (
                      <div className="text-center py-8 text-slate-500">No recent tickets</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column (1/3 width) */}
              <div className="space-y-8">
                {/* Profile Card */}
<div className="relative bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-center">
  
  {/* Avatar */}
  <div className="relative w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-2xl font-semibold text-white shadow-inner">
    {user?.username?.charAt(0).toUpperCase()}
  </div>

  {/* User Info */}
  <h3 className="font-semibold text-slate-900 text-lg leading-tight">
    {user?.username}
  </h3>

  <p className="text-slate-500 text-sm mb-5">
    @{user?.username?.toLowerCase().replace(/\s+/g, "")}
  </p>

  {/* Divider */}
  <div className="h-px bg-slate-200/70 mb-5" />

  {/* Meta / Actions */}
  <div className="flex justify-center gap-3">
    <span className="px-3 py-1 text-xs rounded-full bg-slate-100 text-slate-600">
      Active User
    </span>
  </div>
</div>


                {/* Requests (Activity) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-slate-900 mb-6">Requests</h3>
                  <div className="space-y-6">
                    {requests.slice(0, 5).map(request => (
                      <div key={request.id} className="flex gap-4 cursor-pointer" onClick={() => setSelectedRequest(request)}>
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                          {request.user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-slate-900 text-sm">{request.user?.username}</h4>
                            <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{formatRelativeTime(request.createdAt)}</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">Submitted a new request</p>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="overflow-hidden">
                                <h5 className="font-semibold text-slate-900 text-sm truncate">{request.title}</h5>
                                <p className="text-xs text-slate-500 truncate">{request.description}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {requests.length === 0 && (
                      <div className="text-center py-8 text-slate-500">No recent requests</div>
                    )}
                  </div>
                  
                  {/* Message Input
                  <div className="mt-6 relative">
                    <input 
                      type="text" 
                      placeholder="Write a message..." 
                      className="w-full bg-slate-50 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-0 outline-none"
                    />
                    <Paperclip className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                      <Smile className="w-4 h-4 text-slate-400" />
                      <Mic className="w-4 h-4 text-slate-400" />
                    </div>
                  </div> */}
                </div>
              </div>
            </div>
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
