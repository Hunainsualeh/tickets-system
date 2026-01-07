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
import { getStatusColor, getPriorityColor, getPriorityLabel, formatDate, formatRelativeTime, getDisplayStatus } from '@/lib/utils';
import { Plus, CheckCircle, Clock, AlertCircle, MessageSquare, XCircle, Search, Filter, Building2, Copy, User as UserIcon, Shield, Lock, Eye, Calendar, BarChart3, MoreVertical, Phone, Video, Paperclip, Smile, Mic, FileText, Activity, List, Zap, TrendingUp, CheckSquare, AlertTriangle } from 'lucide-react';
import { Suspense } from 'react';
import { SuccessModal } from '@/app/components/SuccessModal';
import { NoteDetailModal } from '@/app/components/NoteDetailModal';
import { RequestDetail } from '@/app/components/RequestDetail';
import { AnalyticsSection } from '@/app/components/AnalyticsSection';
import { ReportsSection } from '@/app/components/ReportsSection';
import { AreaChart } from '@/app/components/AreaChart';
import { PieChart } from '@/app/components/PieChart';
import { KanbanBoard } from '@/app/components/KanbanBoard';
import { RequestListCard } from '@/app/components/RequestListCard';
import NotificationBell from '@/app/components/NotificationBell';
import { TicketCard } from '@/app/components/TicketCard';
import { TicketDetail } from '@/app/components/TicketDetail';
import { TimeStats } from '@/app/components/TimeStats';
import { TimeClock } from '@/app/components/TimeClock';

function UserDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'create' | 'tickets' | 'profile' | 'requests' | 'create-request' | 'notes' | 'analytics' | 'reports' | 'time-tracking'>('dashboard');
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
  const [overviewTab, setOverviewTab] = useState<'tickets' | 'requests'>('tickets');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

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
    if (filterStatus && filterStatus !== 'ALL') {
      const displayStatus = getDisplayStatus(ticket.status, user?.role);
      if (displayStatus !== filterStatus) return false;
    }
    if (filterPriority && filterPriority !== 'ALL' && ticket.priority !== filterPriority) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [ticketForm, setTicketForm] = useState({
    branchId: '',
    newBranchName: '',
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

          // If user is in teams, default to team view so they see tickets immediately
          if ((response.user.teams && response.user.teams.length > 0) || response.user.teamId) {
            setScope('team');
          }
        }
        if (response.companyName) {
          setCompanyName(response.companyName);
        }
      } catch (error: any) {
        console.error('Error fetching user data:', error);
        // If authentication fails (401), clear local storage and redirect to login
        if (error?.response?.status === 401 || error?.message?.includes('Unauthorized')) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
      }
    };
    fetchUserData();
  }, []); // Only run on mount

  // Update view from URL params
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && ['dashboard', 'create', 'tickets', 'profile', 'requests', 'create-request', 'notes', 'analytics', 'time-tracking'].includes(viewParam)) {
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
      
      // For DEVELOPER/TECHNICAL users, fetch assigned tickets
      if (user?.role === 'DEVELOPER' || user?.role === 'TECHNICAL') {
        filters.assignedToUserId = user.id;
      }
      
      // If team scope and a specific team is selected, add teamId filter
      if (scope === 'team' && selectedTeamId) {
        filters.teamId = selectedTeamId;
      }
      
      const [branchesRes, ticketsRes, requestsRes, notesRes] = await Promise.all([
        apiClient.getBranches(),
        apiClient.getTickets(filters),
        apiClient.getRequests({ scope, teamId: selectedTeamId && scope === 'team' ? selectedTeamId : undefined }),
        apiClient.getNotes({ scope, teamId: selectedTeamId && scope === 'team' ? selectedTeamId : undefined }),
      ]);

      setBranches(branchesRes.branches);
      setTickets(ticketsRes.tickets);
      setRequests(requestsRes.requests || []);
      setNotes(notesRes.notes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (localStorage.getItem('token')) {
        setLoading(false);
      }
    }
  };

  // Debounce search
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, scope, selectedTeamId, user]);

  const handleRequestClick = async (request: any) => {
    try {
      // Set partial request first to show modal immediately
      setSelectedRequest(request);
      
      // Fetch full details including history
      const response = await apiClient.getRequest(request.id);
      if (response?.request) {
        setSelectedRequest(response.request);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error('Failed to load request details');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTicket(true);
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
        newBranchName: '',
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
      setBranchSearch('');
      setUploadFiles([]);
      fetchData();
      toast.success('Ticket created successfully!');
      window.dispatchEvent(new Event('refresh-notifications'));
    } catch (error: any) {
      console.error('Create ticket error:', error);
      toast.error(error.message || 'Failed to create ticket');
    } finally {
      setIsCreatingTicket(false);
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
    open: tickets.filter((t) => ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(getDisplayStatus(t.status, user?.role))).length,
    pending: tickets.filter((t) => getDisplayStatus(t.status, user?.role) === 'PENDING').length,
    inProgress: tickets.filter((t) => ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(getDisplayStatus(t.status, user?.role))).length,
    completed: tickets.filter((t) => getDisplayStatus(t.status, user?.role) === 'COMPLETED').length,
    closed: tickets.filter((t) => ['COMPLETED', 'CLOSED'].includes(getDisplayStatus(t.status, user?.role))).length,
    // Request Stats
    totalRequests: requests.length,
    pendingRequests: requests.filter((r) => r.status === 'PENDING').length,
    approvedRequests: requests.filter((r) => r.status === 'APPROVED').length,
    rejectedRequests: requests.filter((r) => r.status === 'REJECTED').length,
    completedRequests: requests.filter((r) => r.status === 'COMPLETED').length,
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
              onUpdateStatus={async (status) => {
                try {
                  const response = await fetch(`/api/tickets/${selectedTicket.id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: JSON.stringify({ status }),
                  });
                  
                  if (!response.ok) throw new Error('Failed to update status');

                  const data = await response.json();
                  
                  // Update with fresh data from server (includes new history)
                  if (data.ticket) {
                     setSelectedTicket(data.ticket);
                  } else if (selectedTicket) {
                    // Fallback optimistic update
                    setSelectedTicket({
                        ...selectedTicket,
                        status: status as any,
                    });
                  }
                  
                  toast.success('Status updated successfully');
                  fetchData();
                } catch (error) {
                  console.error('Error updating status:', error);
                  toast.error('Failed to update status');
                }
              }}
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
            (user?.role === 'DEVELOPER' || user?.role === 'TECHNICAL') ? (
              // Redirect DEVELOPER/TECHNICAL users to dashboard
              <>{setView('dashboard')}</>
            ) : (
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
                        {showBranchSuggestions && (
                          <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
                            {branches
                              .filter(b => 
                                !branchSearch ||
                                b.name.toLowerCase().includes(branchSearch.toLowerCase()) || 
                                b.branchNumber.toLowerCase().includes(branchSearch.toLowerCase())
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
                                !branchSearch ||
                                b.name.toLowerCase().includes(branchSearch.toLowerCase()) || 
                                b.branchNumber.toLowerCase().includes(branchSearch.toLowerCase())
                              ).length === 0 && (
                                <div className="px-4 py-2 text-slate-500">No branches found</div>
                              )}
                            <div
                              className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-blue-600 font-medium border-t border-slate-100"
                              onClick={() => {
                                setTicketForm(prev => ({ ...prev, branchId: 'OTHER' }));
                                setBranchSearch('Other');
                                setShowBranchSuggestions(false);
                              }}
                            >
                              + Other (Add Manual Branch)
                            </div>
                          </div>
                        )}
                      </div>

                      {ticketForm.branchId === 'OTHER' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                          <Input
                            label="New Branch Name"
                            value={ticketForm.newBranchName}
                            onChange={(e) => setTicketForm(prev => ({ ...prev, newBranchName: e.target.value }))}
                            placeholder="Enter branch name"
                            required
                          />
                        </div>
                      )}

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
                            searchable
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
                      <Button type="submit" size="lg" disabled={isCreatingTicket}>
                        {isCreatingTicket ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Ticket...
                          </span>
                        ) : (
                          'Submit Request'
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            )
          ) : view === 'profile' ? (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Account Overview</h1>
                <p className="text-sm text-slate-600 mt-1">Manage your personal information and team access</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - User Info */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Identity Card */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="font-semibold text-slate-900">Personal Information</h3>
                      <Badge variant="info">{user?.role === 'TECHNICAL' ? 'Field Support Specialist' : user?.role}</Badge>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-6 mb-8">
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-600 border border-slate-200">
                          {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">{user?.username}</h2>
                          <p className="text-slate-500 text-sm">User ID: {user?.id}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Username</label>
                          <div className="text-slate-900 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            {user?.username}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Role</label>
                          <div className="text-slate-900 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            {user?.role === 'TECHNICAL' ? 'Field Support Specialist' : user?.role}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Teams Card */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="font-semibold text-slate-900">Team Access</h3>
                    </div>
                    <div className="p-6">
                      {(user as any)?.teams && (user as any).teams.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {(user as any).teams.map((userTeam: any) => (
                            <div key={userTeam.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                {userTeam.team?.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{userTeam.team?.name}</div>
                                <div className="text-xs text-slate-500">Member</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          No teams assigned
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Stats or Quick Actions */}
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="font-semibold text-slate-900">Account Statistics</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-600 text-sm">Total Tickets</span>
                        <span className="font-bold text-slate-900">{stats.total}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-600 text-sm">Open Requests</span>
                        <span className="font-bold text-slate-900">{requests.filter(r => r.status !== 'COMPLETED' && r.status !== 'REJECTED').length}</span>
                      </div>
                    </div>
                  </div>
                  
                  {companyName && (
                    <div className="bg-blue-900 rounded-xl shadow-sm overflow-hidden text-white p-6 relative">
                      <div className="relative z-10">
                        <h3 className="font-bold text-lg mb-1">{companyName}</h3>
                        <p className="text-blue-200 text-sm mb-4">Organization</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-800 rounded-full text-xs font-medium">
                          <Shield className="w-3 h-3" />
                          Verified Account
                        </div>
                      </div>
                      <Building2 className="absolute -right-5 -bottom-5 w-32 h-32 text-blue-800/50" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : view === 'analytics' && user ? (
            (user?.role === 'DEVELOPER' || user?.role === 'TECHNICAL') ? (
              // Redirect DEVELOPER/TECHNICAL users to dashboard
              <>{setView('dashboard')}</>
            ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AnalyticsSection 
                tickets={tickets} 
                requests={requests}
                branches={branches}
                currentUser={user}
                companyName={companyName}
              />
            </div>
            )
          ) : view === 'reports' && user ? (
            (user?.role === 'DEVELOPER' || user?.role === 'TECHNICAL') ? (
              // Redirect DEVELOPER/TECHNICAL users to dashboard
              <>{setView('dashboard')}</>
            ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ReportsSection
                tickets={tickets}
                requests={requests}
                branches={branches}
                currentUser={user}
              />
            </div>
            )
          ) : view === 'tickets' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {user?.role === 'DEVELOPER' || user?.role === 'TECHNICAL' 
                      ? 'Assigned Tickets'
                      : scope === 'team' ? 'Team Tickets' : 'My Tickets'}
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
                  {user?.role !== 'DEVELOPER' && user?.role !== 'TECHNICAL' && (
                    <Button onClick={() => setView('create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Ticket
                    </Button>
                  )}
                </div>
              </div>

              {/* Filters Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                  {/* Left Side: View Toggle & Team Selector */}
                  <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    {((user?.teams && (user as any).teams.length > 0) || (user as any)?.teamId) && (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                          <button
                            onClick={() => {
                              setScope('me');
                              setSelectedTeamId(null);
                            }}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                              scope === 'me' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                          >
                            <UserIcon className="w-4 h-4" />
                            My View
                          </button>
                          <button
                            onClick={() => setScope('team')}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                              scope === 'team' 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                          >
                            <Building2 className="w-4 h-4" />
                            Team View
                          </button>
                        </div>

                        {/* Team Selector */}
                        {scope === 'team' && (
                          <div className="w-full sm:w-48">
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
                  </div>

                  {/* Right Side: Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="w-full sm:w-40">
                      <CustomSelect
                        value={filterPriority || 'ALL'}
                        onChange={(value) => setFilterPriority(value === 'ALL' ? null : value)}
                        options={[
                          { value: 'ALL', label: 'All Priorities' },
                          { value: 'P1', label: 'P1 - High' },
                          { value: 'P2', label: 'P2 - Medium' },
                          { value: 'P3', label: 'P3 - Low' }
                        ]}
                        placeholder="Priority"
                      />
                    </div>
                    <div className="w-full sm:w-40">
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
                        placeholder="Status"
                      />
                    </div>
                  </div>
                </div>
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
                      currentUser={user}
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
            (user?.role === 'DEVELOPER' || user?.role === 'TECHNICAL') ? (
              // Redirect DEVELOPER/TECHNICAL users to dashboard
              <>{setView('dashboard')}</>
            ) : (
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
                  {((user?.teams && (user as any).teams.length > 0) || (user as any)?.teamId) && (
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

              {/* Request List */}
              <div className="space-y-4">
                {requests.filter(r => 
                    (!searchQuery || 
                    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())) &&
                    (!filterPriority || r.priority === filterPriority) &&
                    (!filterStatus || r.status === filterStatus)
                  ).length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {requests.filter(r => 
                        (!searchQuery || 
                        r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())) &&
                        (!filterPriority || r.priority === filterPriority) &&
                        (!filterStatus || r.status === filterStatus)
                      ).map((request) => (
                        <RequestListCard
                          key={request.id}
                          request={request}
                          onClick={() => handleRequestClick(request)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">No requests found</h3>
                      <p className="text-slate-500 mt-1">Try adjusting your search or filters</p>
                    </div>
                  )}
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
            )
          ) : view === 'create-request' ? (
            (user?.role === 'DEVELOPER' || user?.role === 'TECHNICAL') ? (
              // Redirect DEVELOPER/TECHNICAL users to dashboard
              <>{setView('dashboard')}</>
            ) : (
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
            )
          ) : view === 'time-tracking' && user ? (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <TimeStats currentUser={user} />
             </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Hello, {user?.username}</h1>
                  <p className="text-slate-500 mt-1">
                    {user?.role === 'DEVELOPER' || user?.role === 'TECHNICAL'
                      ? 'Manage and resolve assigned tickets'
                      : 'Track team progress and manage your workflow'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <NotificationBell />
                  <div className="flex items-center gap-2 text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold">
                    <Building2 className="w-4 h-4" />
                    <span>Valley National Bank</span>
                  </div>
                </div>
              </div>

              {user?.role === 'DEVELOPER' || user?.role === 'TECHNICAL' ? (
                // Enhanced Dashboard for DEVELOPER/TECHNICAL
                <div className="space-y-6">
                  {/* Stats Cards Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Time Clock Card */}
                    <TimeClock userId={user.id} />
                    
                    {/* Total Assigned */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <List className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-full">
                          Total
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">Assigned Tickets</p>
                    </div>

                    {/* Pending Action */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                          Needs Action
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">{stats.pending}</h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">Pending Review</p>
                    </div>

                    {/* In Progress */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                          <Activity className="w-5 h-5 text-emerald-600" />
                        </div>
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                          Active
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">{stats.inProgress}</h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">In Progress</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Ticket List */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Priority Breakdown (Mini) */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold text-slate-900">Priority Breakdown</h3>
                          <div className="flex gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span> High
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Medium
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Low
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-4 h-4 rounded-full overflow-hidden bg-slate-100">
                          {(() => {
                            const p1Count = tickets.filter(t => t.priority === 'P1').length;
                            const p2Count = tickets.filter(t => t.priority === 'P2').length;
                            const p3Count = tickets.filter(t => t.priority === 'P3').length;
                            const total = tickets.length || 1;
                            
                            return (
                              <>
                                <div style={{ width: `${(p1Count / total) * 100}%` }} className="bg-rose-500 h-full transition-all duration-500" />
                                <div style={{ width: `${(p2Count / total) * 100}%` }} className="bg-amber-500 h-full transition-all duration-500" />
                                <div style={{ width: `${(p3Count / total) * 100}%` }} className="bg-blue-500 h-full transition-all duration-500" />
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Assigned Tickets List */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">Assigned Tickets</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Manage your active workload</p>
                          </div>
                          <Button variant="ghost" onClick={() => setView('tickets')} className="text-blue-600 hover:bg-blue-50">
                            View All Tickets
                          </Button>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {tickets.slice(0, 5).length > 0 ? (
                            tickets.slice(0, 5).map((ticket) => (
                              <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className="p-5 hover:bg-slate-50 cursor-pointer transition-all group"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors text-sm">{ticket.issue}</h3>
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                        ticket.priority === 'P1' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                        ticket.priority === 'P2' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                        'bg-blue-50 text-blue-700 border-blue-100'
                                      }`}>
                                        {ticket.priority}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 line-clamp-1 mb-3">{ticket.additionalDetails}</p>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                      <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                                        <UserIcon className="w-3 h-3" />
                                        {ticket.user?.username}
                                      </span>
                                      <span className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        {formatRelativeTime(ticket.createdAt)}
                                      </span>
                                      {ticket.branch && (
                                        <span className="flex items-center gap-1.5">
                                          <Building2 className="w-3 h-3" />
                                          {ticket.branch.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <Badge variant={getStatusColor(ticket.status)} className="shrink-0 text-xs font-medium px-2.5 py-1">
                                      {ticket.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-12 text-center">
                              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckSquare className="w-8 h-8 text-slate-300" />
                              </div>
                              <h3 className="text-slate-900 font-medium mb-1">All caught up!</h3>
                              <p className="text-sm text-slate-500">No tickets currently assigned to you.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Quick Actions & Recent Activity */}
                    <div className="space-y-6">
                      {/* Quick Actions */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                          <button 
                            onClick={() => { setFilterStatus('PENDING'); setView('tickets'); }} 
                            className="w-full bg-amber-50 hover:bg-amber-100 text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group border border-amber-100"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                              <span className="block font-semibold text-sm text-slate-900">Pending Review</span>
                              <span className="text-xs text-slate-500">Tickets waiting for action</span>
                            </div>
                          </button>
                          
                          <button 
                            onClick={() => { setFilterPriority('P1'); setView('tickets'); }} 
                            className="w-full bg-rose-50 hover:bg-rose-100 text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group border border-rose-100"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                            </div>
                            <div>
                              <span className="block font-semibold text-sm text-slate-900">High Priority</span>
                              <span className="text-xs text-slate-500">Urgent issues needing attention</span>
                            </div>
                          </button>

                          <button 
                            onClick={() => { setFilterStatus('IN_PROGRESS'); setView('tickets'); }} 
                            className="w-full bg-indigo-50 hover:bg-indigo-100 text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group border border-indigo-100"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <Zap className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <span className="block font-semibold text-sm text-slate-900">In Progress</span>
                              <span className="text-xs text-slate-500">Continue working on active tickets</span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Recent Activity */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-slate-900">Recent Updates</h3>
                          <TrendingUp className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="space-y-6">
                          {tickets.slice(0, 5).map((t, i) => {
                            const displayStatus = getDisplayStatus(t.status, user?.role);
                            return (
                            <div key={t.id} className="flex gap-3 relative group cursor-pointer" onClick={() => setSelectedTicket(t)}>
                              {i !== tickets.slice(0, 5).length - 1 && (
                                <div className="absolute left-[5px] top-6 -bottom-6 w-px bg-slate-100 group-hover:bg-slate-200 transition-colors"></div>
                              )}
                              <div className={`w-2.5 h-2.5 mt-1.5 rounded-full shrink-0 ring-4 ring-white ${
                                displayStatus === 'COMPLETED' ? 'bg-emerald-500' :
                                displayStatus === 'IN_PROGRESS' ? 'bg-blue-500' :
                                displayStatus === 'PENDING' ? 'bg-amber-500' : 'bg-slate-300'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-medium text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{t.issue}</p>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    t.priority === 'P1' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                    t.priority === 'P2' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                    'bg-blue-50 text-blue-700 border-blue-100'
                                  }`}>
                                    {t.priority}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Status is <span className="font-medium text-slate-700">{displayStatus.replace('_', ' ')}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">{formatRelativeTime(t.updatedAt)}</p>
                              </div>
                            </div>
                          )})}
                          {tickets.length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Dashboard Tabs */}
                  <div className="flex items-center gap-4 border-b border-slate-200 mb-6">
                    <button
                      onClick={() => setOverviewTab('tickets')}
                      className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                        overviewTab === 'tickets' 
                          ? 'text-blue-600' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Tickets Overview
                      {overviewTab === 'tickets' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setOverviewTab('requests')}
                      className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                        overviewTab === 'requests' 
                          ? 'text-blue-600' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Requests Overview
                      {overviewTab === 'requests' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                      )}
                    </button>
                  </div>

                  {overviewTab === 'tickets' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Stats Row - 4 Cards in 2x2 Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Stat 1: Total Tickets */}
                    <div 
                      onClick={() => {
                        setView('tickets');
                        setFilterStatus('ALL');
                      }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col items-start gap-3 cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Tickets</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</h3>
                      </div>
                    </div>

                    {/* Stat 2: Pending */}
                    <div 
                      onClick={() => {
                        setView('tickets');
                        setFilterStatus('PENDING');
                      }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col items-start gap-3 cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.pending}</h3>
                      </div>
                    </div>

                    {/* Stat 3: In Progress */}
                    <div 
                      onClick={() => {
                        setView('tickets');
                        setFilterStatus('IN_PROGRESS');
                      }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col items-start gap-3 cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">In Progress</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.inProgress}</h3>
                      </div>
                    </div>

                    {/* Stat 4: Completed */}
                    <div 
                      onClick={() => {
                        setView('tickets');
                        setFilterStatus('COMPLETED');
                      }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col items-start gap-3 cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Completed</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.completed}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Charts Row - Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          return tickets.filter(t => new Date(t.createdAt).getDay() === dayIndex && getDisplayStatus(t.status, user?.role) === 'COMPLETED').length;
                        })}
                        legend1="Created"
                        legend2="Completed"
                      />
                    </div>

                    {/* Ticket Status Distribution */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200">
                      <PieChart 
                        title="Ticket Status" 
                        subtitle="Distribution of tickets by status"
                        labels={['Pending', 'In Progress', 'Completed', 'Closed']}
                        data={[stats.pending, stats.inProgress, stats.completed, stats.closed]}
                        colors={['#F59E0B', '#8B5CF6', '#10B981', '#64748B']}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Request Stats Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Stat 1: Total Requests */}
                    <div 
                      onClick={() => {
                        setView('requests');
                        setFilterStatus('ALL');
                      }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col items-start gap-3 cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Requests</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalRequests}</h3>
                      </div>
                    </div>

                    {/* Stat 2: Pending Requests */}
                    <div 
                      onClick={() => {
                        setView('requests');
                        setFilterStatus('PENDING');
                      }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col items-start gap-3 cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending Requests</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.pendingRequests}</h3>
                      </div>
                    </div>

                    {/* Stat 3: Approved Requests */}
                    <div 
                      onClick={() => {
                        setView('requests');
                        setFilterStatus('APPROVED');
                      }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col items-start gap-3 cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Approved Requests</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.approvedRequests}</h3>
                      </div>
                    </div>

                    {/* Stat 4: Rejected Requests */}
                    <div 
                      onClick={() => {
                        setView('requests');
                        setFilterStatus('REJECTED');
                      }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col items-start gap-3 cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Rejected Requests</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.rejectedRequests}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Request Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Request Trends Chart */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200">
                      <AreaChart 
                        title="Request Trends" 
                        subtitle="Weekly request activity"
                        labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                        data={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => {
                          const dayIndex = i === 6 ? 0 : i + 1;
                          return requests.filter(r => new Date(r.createdAt).getDay() === dayIndex).length;
                        })}
                        data2={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => {
                          const dayIndex = i === 6 ? 0 : i + 1;
                          return requests.filter(r => new Date(r.createdAt).getDay() === dayIndex && r.status === 'APPROVED').length;
                        })}
                        legend1="Created"
                        legend2="Approved"
                      />
                    </div>

                    {/* Request Status Distribution */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200">
                      <PieChart 
                        title="Request Status" 
                        subtitle="Distribution of requests by status"
                        labels={['Pending', 'Approved', 'Rejected', 'Completed']}
                        data={[stats.pendingRequests, stats.approvedRequests, stats.rejectedRequests, stats.completedRequests]}
                        colors={['#F59E0B', '#10B981', '#EF4444', '#3B82F6']}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Tickets & Requests Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Tickets (Current Tasks) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Recent Tickets</h3>
                    <button onClick={() => setView('tickets')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View All →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {tickets.slice(0, 5).map(ticket => (
                      <div key={ticket.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-slate-100" onClick={() => setSelectedTicket(ticket)}>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 text-sm truncate">{ticket.issue}</h4>
                            <p className="text-xs text-slate-500">{ticket.branch?.name || ticket.manualBranchName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 ml-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(
                              ['INVOICE', 'PAID'].includes(ticket.status) ? 'CLOSED' : ticket.status
                            )}`} />
                            <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                              {(['INVOICE', 'PAID'].includes(ticket.status) ? 'CLOSED' : ticket.status).replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {tickets.length === 0 && (
                      <div className="text-center py-8 text-slate-500">No recent tickets</div>
                    )}
                  </div>
                </div>

                {/* Recent Requests Activity */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Recent Requests</h3>
                    <button onClick={() => setView('requests')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View All →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {requests.slice(0, 5).map(request => (
                      <div key={request.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-slate-100" onClick={() => handleRequestClick(request)}>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0 text-sm font-semibold">
                            {request.user?.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 text-sm truncate">{request.title}</h4>
                            <p className="text-xs text-slate-500">{request.user?.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <span className="text-xs text-slate-400 whitespace-nowrap">{formatRelativeTime(request.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                    {requests.length === 0 && (
                      <div className="text-center py-8 text-slate-500">No recent requests</div>
                    )}
                  </div>
                </div>
              </div>
              </>
              )}
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
