'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { User, Branch, Ticket } from '@/types';
import { Card, CardBody, CardHeader } from '@/app/components/Card';
import { Button } from '@/app/components/Button';
import { Badge } from '@/app/components/Badge';
import { Modal } from '@/app/components/Modal';
import { Input } from '@/app/components/Input';
import { Select } from '@/app/components/Select';
import { CustomSelect } from '@/app/components/CustomSelect';
import { StatusSelect } from '@/app/components/StatusSelect';
import { Textarea } from '@/app/components/Textarea';
import { Sidebar } from '@/app/components/Sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/Table';
import { StatCard } from '@/app/components/StatCard';
import { StatRow } from '@/app/components/StatRow';
import { Timeline } from '@/app/components/Timeline';
import { AreaChart } from '@/app/components/AreaChart';
import { SearchBar } from '@/app/components/SearchBar';
import { Pagination } from '@/app/components/Pagination';
import { getStatusColor, getPriorityColor, formatDate, formatRelativeTime } from '@/lib/utils';
import { Users, Building2, Ticket as TicketIcon, Plus, Edit, Trash2, MessageSquare, Clock, CheckCircle, XCircle, Search, Filter, Calendar, AlertTriangle, MoreVertical, Mail, Phone, MapPin, ArrowLeft, Eye } from 'lucide-react';
import { Suspense } from 'react';
import { NoteDetailModal } from '@/app/components/NoteDetailModal';
import { RequestDetail } from '@/app/components/RequestDetail';
import * as XLSX from 'xlsx';

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'branches' | 'tickets' | 'requests' | 'notes'>('overview');
  const [dashboardTab, setDashboardTab] = useState<'stats' | 'calendar' | 'reports'>('stats');
  const [overviewTab, setOverviewTab] = useState<'tickets' | 'requests'>('tickets');
  const [calendarView, setCalendarView] = useState<'month' | 'timeline'>('month');
  const [selectedReportBranch, setSelectedReportBranch] = useState<string>('ALL');
  const [createView, setCreateView] = useState<'user' | 'branch' | 'ticket' | null>(null);
  const [branchCreateTab, setBranchCreateTab] = useState<'manual' | 'upload'>('manual');
  const [parsedBranches, setParsedBranches] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [statView, setStatView] = useState<'status' | 'priority'>('status');
  const [ticketFilterStatus, setTicketFilterStatus] = useState<string>('ALL');
  const [ticketFilterPriority, setTicketFilterPriority] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [branchesPage, setBranchesPage] = useState(1);
  const [totalBranchesCount, setTotalBranchesCount] = useState(0);
  const itemsPerPage = 5;
  const branchesPerPage = 10;

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showNoteDetailModal, setShowNoteDetailModal] = useState(false);
  
  // Selection State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  
  const [editingItem, setEditingItem] = useState<any>(null);
  const [statusUpdate, setStatusUpdate] = useState({ ticketId: '', status: '', adminNote: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'user' | 'branch' | 'ticket'; name?: string } | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'USER', teamId: '' });
  const [teamForm, setTeamForm] = useState({ name: '' });
  const [branchForm, setBranchForm] = useState({
    name: '',
    branchNumber: '',
    category: 'BRANCH',
  });
  const [ticketForm, setTicketForm] = useState({
    userId: '',
    branchId: '',
    incNumber: '',
    priority: 'P2',
    issue: '',
    additionalDetails: '',
    status: 'PENDING',
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      // Middleware handles the redirect, but we keep this for client-side consistency
      router.push('/login');
      return;
    }

    const userData = JSON.parse(storedUser);
    if (userData.role !== 'ADMIN') {
      // Middleware handles this too
      router.push('/dashboard');
      return;
    }

    setUser(userData);
    fetchData();
    
    // Update tab from URL params
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'users', 'branches', 'tickets', 'requests', 'notes'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [router, searchParams]);

  // Clear detail views and close modals when switching tabs
  useEffect(() => {
    setSelectedTicket(null);
    setSelectedUser(null);
    setSelectedBranch(null);
    setSelectedNote(null);
    setSelectedRequest(null);
    setShowUserModal(false);
    setShowBranchModal(false);
    setShowTicketModal(false);
    setShowStatusModal(false);
    setShowDeleteModal(false);
    setShowTeamModal(false);
    setShowNoteDetailModal(false);
    setCreateView(null);
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const [usersRes, branchesRes, ticketsRes, teamsRes, requestsRes, notesRes] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getBranches({ page: branchesPage, limit: branchesPerPage }),
        apiClient.getTickets({ search: searchQuery }),
        fetch('/api/teams', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }).then(res => res.json()),
        fetch('/api/requests', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }).then(res => res.json()),
        fetch('/api/notes', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }).then(res => res.json()),
      ]);

      setUsers(usersRes.users);
      setBranches(branchesRes.branches);
      setTotalBranchesCount(branchesRes.pagination.total);
      setTickets(ticketsRes.tickets);
      setTeams(teamsRes.teams || []);
      setRequests(requestsRes.requests || []);
      setNotes(notesRes.notes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchesData = async () => {
    try {
      const res = await apiClient.getBranches({ page: branchesPage, limit: branchesPerPage });
      setBranches(res.branches);
      setTotalBranchesCount(res.pagination.total);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'branches') {
      fetchBranchesData();
    }
  }, [branchesPage]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData: any = {
        username: userForm.username,
        password: userForm.password,
        role: userForm.role,
      };
      if (userForm.teamId) {
        userData.teamId = userForm.teamId;
      }
      await apiClient.createUser(userData);
      setCreateView(null);
      setUserForm({ username: '', password: '', role: 'USER', teamId: '' });
      fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(teamForm),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create team');
      }
      
      setShowTeamModal(false);
      setTeamForm({ name: '' });
      fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team? Users in this team will be unassigned.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete team');
      }
      
      fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    setDeleteTarget({ id, type: 'user' });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      if (deleteTarget.type === 'user') {
        await apiClient.deleteUser(deleteTarget.id);
      } else if (deleteTarget.type === 'branch') {
        await apiClient.deleteBranch(deleteTarget.id);
      } else if (deleteTarget.type === 'ticket') {
        await apiClient.deleteTicket(deleteTarget.id);
        setSelectedTicket(null);
      }
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Map data to branch structure if needed
        const mappedData = data.map((row: any) => ({
          name: row['Location'] || row['location'] || row['Branch Name'] || row['name'],
          branchNumber: (row['Branch Number'] || row['branch number'] || row['branchNumber'])?.toString(),
          category: (row['Location Type'] || row['location type'] || row['category'] || 'BRANCH').toUpperCase(),
        })).filter((b: any) => b.name && b.branchNumber); // Filter out invalid rows
        
        setParsedBranches(mappedData);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Failed to parse file. Please check the format.');
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkCreateBranches = async () => {
    if (parsedBranches.length === 0) return;

    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Show loading state if needed, or just process
      // For better UX, we could show a progress bar, but for now simple alert is fine
      
      for (const branch of parsedBranches) {
        try {
           await apiClient.createBranch(branch);
           successCount++;
        } catch (err) {
           console.error("Failed to create branch", branch, err);
           errorCount++;
        }
      }
      
      alert(`Process completed.\nCreated: ${successCount}\nFailed: ${errorCount}`);
      setCreateView(null);
      setParsedBranches([]);
      setBranchCreateTab('manual');
      fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createBranch(branchForm);
      setCreateView(null);
      setBranchForm({
        name: '',
        branchNumber: '',
        category: 'BRANCH',
      });
      fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    setDeleteTarget({ id, type: 'branch' });
    setShowDeleteModal(true);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createTicket(ticketForm);
      setCreateView(null);
      setTicketForm({
        userId: '',
        branchId: '',
        incNumber: '',
        priority: 'P2',
        issue: '',
        additionalDetails: '',
        status: 'PENDING',
      });
      fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleViewTicket = async (ticketId: string) => {
    try {
      const result = await apiClient.getTicket(ticketId);
      setSelectedTicket(result.ticket);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUpdateTicketStatus = (ticketId: string, status: string) => {
    setStatusUpdate({ ticketId, status, adminNote: '' });
    setShowStatusModal(true);
  };

  const handleConfirmStatusUpdate = async () => {
    try {
      await apiClient.updateTicket(statusUpdate.ticketId, {
        status: statusUpdate.status,
        adminNote: statusUpdate.adminNote || undefined,
      });
      setShowStatusModal(false);
      setStatusUpdate({ ticketId: '', status: '', adminNote: '' });
      fetchData();
      // Refresh selected ticket if viewing
      if (selectedTicket && selectedTicket.id === statusUpdate.ticketId) {
        handleViewTicket(statusUpdate.ticketId);
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    setDeleteTarget({ id, type: 'ticket' });
    setShowDeleteModal(true);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterPriority, searchQuery]);

  const filteredTickets = tickets.filter(ticket => 
    (!filterStatus || ticket.status === filterStatus) && 
    (!filterPriority || ticket.priority === filterPriority)
  );
  
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
    totalUsers: users.length,
    totalBranches: totalBranchesCount,
    totalTickets: tickets.length,
    totalRequests: requests.length,
    pendingRequests: requests.filter((r) => r.status === 'PENDING').length,
    pendingTickets: tickets.filter((t) => t.status === 'PENDING').length,
    activeTickets: tickets.filter((t) => ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(t.status)).length,
    completedTickets: tickets.filter((t) => t.status === 'COMPLETED').length,
    highPriority: tickets.filter((t) => t.priority === 'P1').length,
    mediumPriority: tickets.filter((t) => t.priority === 'P2').length,
    lowPriority: tickets.filter((t) => t.priority === 'P3').length,
  };

  const handleNavigation = () => {
    // Clear any detail views when navigating
    setSelectedTicket(null);
    setSelectedUser(null);
    setSelectedBranch(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        userRole={user?.role} 
        username={user?.username}
        onTabChange={(tab) => setActiveTab(tab as any)}
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
                <span className="text-xl">←</span> Back to List
              </button>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
                {/* Header */}
                <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 bg-slate-50/50 rounded-t-3xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Ticket Details</h1>
                      <Badge variant={getStatusColor(selectedTicket.status)}>
                        {selectedTicket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-slate-500 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono">#{selectedTicket.id}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Created {formatDate(selectedTicket.createdAt)}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={() => handleDeleteTicket(selectedTicket.id)} className="w-full sm:w-auto">
                      <Trash2 className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Issue Section */}
                    <section>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Issue Description</h3>
                      <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100">
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedTicket.issue}</p>
                      </div>
                    </section>

                    {/* Additional Details */}
                    {selectedTicket.additionalDetails && (
                      <section>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Additional Details</h3>
                        <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100">
                          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedTicket.additionalDetails}</p>
                        </div>
                      </section>
                    )}

                    {/* Attachments */}
                    {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                      <section>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Attachments</h3>
                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
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
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">History</h3>
                        <div className="relative pl-3 sm:pl-4 border-l-2 border-slate-100 space-y-4 sm:space-y-6">
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

                    {/* Notes Section */}
                    <section>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Notes</h3>
                      
                      {/* Add Note Form */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const note = formData.get('note') as string;
                          
                          if (!note.trim()) return;
                          
                          try {
                            const response = await fetch(`/api/tickets/${selectedTicket.id}/notes`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                              },
                              body: JSON.stringify({ note }),
                            });
                            
                            if (!response.ok) {
                              throw new Error('Failed to add note');
                            }
                            
                            // Reset form and refresh ticket
                            e.currentTarget.reset();
                            handleViewTicket(selectedTicket.id);
                            fetchData(); // Refresh notes list
                          } catch (error: any) {
                            alert(error.message);
                          }
                        }}
                        className="mb-6"
                      >
                        <div className="space-y-3">
                          <Textarea
                            name="note"
                            placeholder="Add a note to this ticket..."
                            rows={3}
                            required
                            className="resize-none"
                          />
                          <div className="flex justify-end">
                            <Button type="submit" size="sm">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Add Note
                            </Button>
                          </div>
                        </div>
                      </form>

                      {/* Display Notes */}
                      {selectedTicket.notes && selectedTicket.notes.length > 0 ? (
                        <div className="space-y-4">
                          {selectedTicket.notes.map((note: any) => (
                            <div key={note.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {note.user?.username?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">{note.user?.username}</p>
                                    <p className="text-xs text-slate-500">{formatDate(note.createdAt)}</p>
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.note}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">No notes yet</p>
                          <p className="text-xs text-slate-400 mt-1">Be the first to add a note</p>
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Sidebar Info */}
                  <div className="space-y-4 sm:space-y-6">
                    {/* Status Card */}
                    <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 sm:mb-4">Current Status</h3>
                      <StatusSelect
                        value={selectedTicket.status}
                        onChange={(value) => handleUpdateTicketStatus(selectedTicket.id, value)}
                        options={[
                          { value: 'PENDING', label: 'Pending' },
                          { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
                          { value: 'IN_PROGRESS', label: 'In Progress' },
                          { value: 'COMPLETED', label: 'Completed' },
                          { value: 'ESCALATED', label: 'Escalated' },
                          { value: 'CLOSED', label: 'Closed' },
                        ]}
                      />
                    </div>

                    {/* Priority Card */}
                    <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 sm:mb-4">Priority</h3>
                      <div className="flex items-center gap-3">
                        <Badge variant={getPriorityColor(selectedTicket.priority)} size="lg">
                          {selectedTicket.priority}
                        </Badge>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 sm:mb-4">User Information</h3>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold">
                          {selectedTicket.user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{selectedTicket.user?.username}</p>
                          <p className="text-xs text-slate-500">Requester</p>
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
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Category</p>
                          <Badge size="sm">{selectedTicket.branch?.category}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : createView ? (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={() => setCreateView(null)} 
                className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors"
              >
                <span className="text-xl">←</span> Back to List
              </button>
              
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 text-slate-900">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">
                    {createView === 'user' && 'Create New User'}
                    {createView === 'branch' && 'Create New Branch'}
                    {createView === 'ticket' && 'Create New Ticket'}
                  </h1>
                  <p className="text-slate-500">
                    {createView === 'user' && 'Add a new user to the system'}
                    {createView === 'branch' && 'Add a new branch location'}
                    {createView === 'ticket' && 'Create a ticket on behalf of a user'}
                  </p>
                </div>

                <div className="p-8">
                  {createView === 'user' && (
                    <form onSubmit={handleCreateUser} className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Input
                          label="Username"
                          value={userForm.username}
                          onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                          required
                        />
                        <Input
                          label="Password"
                          type="password"
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                          required
                        />
                        <CustomSelect
                          label="Role"
                          value={userForm.role}
                          onChange={(value) => setUserForm({ ...userForm, role: value })}
                          options={[
                            { value: 'USER', label: 'User' },
                            { value: 'ADMIN', label: 'Admin' },
                          ]}
                        />
                        <CustomSelect
                          label="Team (Optional)"
                          value={userForm.teamId}
                          onChange={(value) => setUserForm({ ...userForm, teamId: value })}
                          options={[
                            { value: '', label: 'No Team' },
                            ...teams.map(team => ({ value: team.id, label: team.name })),
                          ]}
                        />
                      </div>
                      <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          onClick={() => setCreateView(null)}
                          className="text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                          Create User
                        </Button>
                      </div>
                    </form>
                  )}

                  {createView === 'branch' && (
                    <div className="space-y-6">
                      {/* Tabs */}
                      <div className="flex border-b border-slate-200">
                        <button
                          className={`px-4 py-2 font-medium text-sm ${branchCreateTab === 'manual' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                          onClick={() => setBranchCreateTab('manual')}
                        >
                          Add Manually
                        </button>
                        <button
                          className={`px-4 py-2 font-medium text-sm ${branchCreateTab === 'upload' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                          onClick={() => setBranchCreateTab('upload')}
                        >
                          Upload CSV/XLSX
                        </button>
                      </div>

                      {branchCreateTab === 'manual' ? (
                        <form onSubmit={handleCreateBranch} className="space-y-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Input
                              label="Branch Number"
                              value={branchForm.branchNumber}
                              onChange={(e) => setBranchForm({ ...branchForm, branchNumber: e.target.value })}
                              required
                            />
                            <CustomSelect
                              label="Location Type"
                              value={branchForm.category}
                              onChange={(value) => setBranchForm({ ...branchForm, category: value })}
                              options={[
                                { value: 'BRANCH', label: 'Branch' },
                                { value: 'BACK_OFFICE', label: 'Back Office' },
                                { value: 'HYBRID', label: 'Hybrid' },
                                { value: 'DATA_CENTER', label: 'Data Center' },
                              ]}
                            />
                            <Input
                              label="Location"
                              value={branchForm.name}
                              onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              onClick={() => setCreateView(null)}
                              className="text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                            >
                              Cancel
                            </Button>
                            <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                              Create Branch
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-6">
                          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                            {isAnalyzing ? (
                              <div className="flex flex-col items-center justify-center py-4">
                                <div className="w-full max-w-xs bg-slate-200 rounded-full h-2.5 mb-4">
                                  <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-full"></div>
                                </div>
                                <p className="text-sm font-medium text-slate-600">Analyzing file...</p>
                              </div>
                            ) : (
                              <>
                                <input
                                  type="file"
                                  accept=".csv, .xlsx, .xls"
                                  onChange={handleFileUpload}
                                  className="hidden"
                                  id="branch-file-upload"
                                />
                                <label htmlFor="branch-file-upload" className="cursor-pointer">
                                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                  </div>
                                  <p className="text-lg font-medium text-slate-900 mb-1">Click to upload or drag and drop</p>
                                  <p className="text-sm text-slate-500">CSV, Excel files (xlsx, xls)</p>
                                  <p className="text-xs text-slate-400 mt-2">Required columns: Branch Number, Location Type, Location</p>
                                </label>
                              </>
                            )}
                          </div>

                          {parsedBranches.length > 0 && (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-900">Preview ({parsedBranches.length} branches)</h3>
                                <Button onClick={handleBulkCreateBranches}>
                                  Import {parsedBranches.length} Branches
                                </Button>
                              </div>
                              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                      <th className="px-4 py-3">Name</th>
                                      <th className="px-4 py-3">Number</th>
                                      <th className="px-4 py-3">Category</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {parsedBranches.map((branch, index) => (
                                      <tr key={index} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">{branch.name}</td>
                                        <td className="px-4 py-3">{branch.branchNumber}</td>
                                        <td className="px-4 py-3">
                                          <Badge size="sm">{branch.category}</Badge>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              onClick={() => setCreateView(null)}
                              className="text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {createView === 'ticket' && (
                    <form onSubmit={handleCreateTicket} className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CustomSelect
                          label="User"
                          value={ticketForm.userId}
                          onChange={(value) => setTicketForm({ ...ticketForm, userId: value })}
                          options={users.map((u) => ({ value: u.id, label: u.username }))}
                          placeholder="Select a user"
                        />
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
                            { value: 'P1', label: 'P1 (Highest)' },
                            { value: 'P2', label: 'P2 (Medium)' },
                            { value: 'P3', label: 'P3 (Lowest)' },
                          ]}
                        />
                        <div className="lg:col-span-2">
                          <Textarea
                            label="Issue"
                            value={ticketForm.issue}
                            onChange={(e) => setTicketForm({ ...ticketForm, issue: e.target.value })}
                            required
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <Textarea
                            label="Additional Details"
                            value={ticketForm.additionalDetails}
                            onChange={(e) => setTicketForm({ ...ticketForm, additionalDetails: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          onClick={() => setCreateView(null)}
                          className="text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                          Create Ticket
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 lg:mb-8 mt-12 lg:mt-0">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
              {activeTab === 'overview' && (
                <>
                  {dashboardTab === 'stats' && 'Overview'}
                  {dashboardTab === 'calendar' && 'Calendar'}
                  {dashboardTab === 'reports' && 'Reports'}
                </>
              )}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'branches' && 'Branches Management'}
              {activeTab === 'tickets' && 'Tickets Management'}
              {activeTab === 'requests' && 'Requests Management'}
              {activeTab === 'notes' && 'Notes Management'}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {activeTab === 'overview' && (
                <>
                  {dashboardTab === 'stats' && 'System overview and statistics'}
                  {dashboardTab === 'calendar' && 'Schedule and timeline view'}
                  {dashboardTab === 'reports' && 'Detailed system analytics'}
                </>
              )}
              {activeTab === 'users' && 'Manage system users and permissions'}
              {activeTab === 'branches' && 'Manage branch locations'}
              {activeTab === 'tickets' && 'View and manage all tickets'}
              {activeTab === 'requests' && 'View and manage all user requests'}
              {activeTab === 'notes' && 'View all ticket notes and communications'}
            </p>
          </div>

          {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Dashboard Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
              <button
                onClick={() => setDashboardTab('stats')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dashboardTab === 'stats'
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
              <button
                onClick={() => setDashboardTab('reports')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dashboardTab === 'reports'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Reports
              </button>
            </div>

            {dashboardTab === 'stats' && (
              <>
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                  <div className="flex items-center gap-6">
                    <h1 
                      onClick={() => setOverviewTab('tickets')}
                      className={`text-2xl lg:text-3xl font-bold cursor-pointer transition-colors ${
                        overviewTab === 'tickets' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Tickets
                    </h1>
                    <h1 
                      onClick={() => setOverviewTab('requests')}
                      className={`text-2xl lg:text-3xl font-bold cursor-pointer transition-colors ${
                        overviewTab === 'requests' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Requests
                    </h1>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <SearchBar 
                      value={searchQuery}
                      onChange={setSearchQuery}
                      className="w-full lg:w-80"
                      placeholder={overviewTab === 'tickets' ? "Search tickets..." : "Search requests..."}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Left Column: List */}
                  <div className="xl:col-span-2 space-y-4">
                    {overviewTab === 'tickets' ? (
                      <>
                        {paginatedTickets.length === 0 ? (
                          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-600">No tickets found</p>
                          </div>
                        ) : (
                          <>
                            {paginatedTickets.map((ticket) => (
                              <div 
                                key={ticket.id}
                                onClick={() => handleViewTicket(ticket.id)}
                                className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                              >
                                <div className="flex flex-col sm:flex-row items-start gap-4">
                                  {/* User Avatar */}
                                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg shrink-0">
                                    {ticket.user?.username?.charAt(0).toUpperCase()}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0 w-full">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                      <div>
                                        <h3 className="font-bold text-slate-900 truncate">{ticket.user?.username}</h3>
                                        <p className="text-xs text-slate-500">#{ticket.id.substring(0, 8)}</p>
                                      </div>
                                      <Badge variant={getPriorityColor(ticket.priority)}>
                                        {ticket.priority}
                                      </Badge>
                                    </div>
                                    
                                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{ticket.issue}</p>
                                    
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-50">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 font-bold">
                                          {ticket.branch?.name?.charAt(0)}
                                        </div>
                                        <span className="text-xs text-slate-500">{ticket.branch?.name}</span>
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
                                          <span className="text-xs text-slate-400">Date</span>
                                          <span className="text-xs font-medium text-slate-600">
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <button className="hidden sm:block p-2 text-slate-300 hover:text-slate-600">
                                    <div className="w-1 h-1 bg-current rounded-full mb-1" />
                                    <div className="w-1 h-1 bg-current rounded-full mb-1" />
                                    <div className="w-1 h-1 bg-current rounded-full" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            
                            <Pagination
                              currentPage={currentPage}
                              totalPages={totalPages}
                              onPageChange={setCurrentPage}
                            />
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {requests.length === 0 ? (
                          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-600">No requests found</p>
                          </div>
                        ) : (
                          requests.slice(0, 10).map((request: any) => (
                            <div 
                              key={request.id}
                              onClick={() => {
                                setSelectedRequest(request);
                                setActiveTab('requests');
                              }}
                              className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                            >
                              <div className="flex flex-col sm:flex-row items-start gap-4">
                                {/* User Avatar */}
                                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg shrink-0">
                                  {request.user?.username?.charAt(0).toUpperCase()}
                                </div>
                                
                                <div className="flex-1 min-w-0 w-full">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                    <div className="flex-1">
                                      <h3 className="font-bold text-slate-900 line-clamp-1">{request.title}</h3>
                                      <p className="text-xs text-slate-500 mt-1">
                                        by {request.user?.username}
                                        {request.user?.team && <span className="text-slate-400"> • {request.user.team.name}</span>}
                                      </p>
                                    </div>
                                    <Badge variant={
                                      request.status === 'COMPLETED' ? 'success' :
                                      request.status === 'APPROVED' ? 'info' :
                                      request.status === 'REJECTED' ? 'danger' :
                                      request.status === 'IN_PROGRESS' ? 'warning' :
                                      'default'
                                    }>
                                      {request.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  
                                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{request.description}</p>
                                  
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-2">
                                      {request.projectId && (
                                        <span className="text-xs text-slate-500">Project: {request.projectId}</span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-400">Created</span>
                                      <span className="text-xs font-medium text-slate-600">
                                        {formatRelativeTime(request.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <button className="hidden sm:block p-2 text-slate-300 hover:text-slate-600">
                                  <div className="w-1 h-1 bg-current rounded-full mb-1" />
                                  <div className="w-1 h-1 bg-current rounded-full mb-1" />
                                  <div className="w-1 h-1 bg-current rounded-full" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}

                        {requests.length > 10 && (
                          <div className="text-center pt-4">
                            <Button variant="outline" onClick={() => setActiveTab('requests')}>
                              View All Requests
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Right Column: Stats & Widgets */}
                  <div className="space-y-8">
                    {overviewTab === 'tickets' ? (
                      /* Stats Grid */
                      <div className="space-y-6">
                        {/* Toggle */}
                        <div className="bg-white p-1 rounded-xl inline-flex border border-slate-200 w-full">
                          <button 
                            onClick={() => setStatView('status')}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${statView === 'status' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                          >
                            Status
                          </button>
                          <button 
                            onClick={() => setStatView('priority')}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${statView === 'priority' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                          >
                            Priority
                          </button>
                        </div>

                        {/* Stats List */}
                        <div className="space-y-3">
                          {statView === 'status' ? (
                            <>
                              <StatRow
                                label="All Tickets"
                                count={stats.totalTickets}
                                icon={MessageSquare}
                                color="orange"
                                onClick={() => setFilterStatus(null)}
                                active={filterStatus === null}
                              />
                              <StatRow
                                label="Pending"
                                count={stats.pendingTickets}
                                icon={Clock}
                                color="green"
                                onClick={() => setFilterStatus(filterStatus === 'PENDING' ? null : 'PENDING')}
                                active={filterStatus === 'PENDING'}
                              />
                              <StatRow
                                label="Completed"
                                count={stats.completedTickets}
                                icon={CheckCircle}
                                color="blue"
                                onClick={() => setFilterStatus(filterStatus === 'COMPLETED' ? null : 'COMPLETED')}
                                active={filterStatus === 'COMPLETED'}
                              />
                              <StatRow
                                label="Cancelled"
                                count={tickets.filter(t => t.status === 'CLOSED').length}
                                icon={XCircle}
                                color="gray"
                                onClick={() => setFilterStatus(filterStatus === 'CLOSED' ? null : 'CLOSED')}
                                active={filterStatus === 'CLOSED'}
                              />
                            </>
                          ) : (
                            <>
                              <StatRow
                                label="All Priorities"
                                count={stats.totalTickets}
                                icon={MessageSquare}
                                color="indigo"
                                onClick={() => setFilterPriority(null)}
                                active={filterPriority === null}
                              />
                              <StatRow
                                label="High Priority"
                                count={stats.highPriority}
                                icon={AlertTriangle}
                                color="red"
                                onClick={() => setFilterPriority(filterPriority === 'HIGH' ? null : 'HIGH')}
                                active={filterPriority === 'HIGH'}
                              />
                              <StatRow
                                label="Medium Priority"
                                count={stats.mediumPriority}
                                icon={AlertTriangle}
                                color="orange"
                                onClick={() => setFilterPriority(filterPriority === 'MEDIUM' ? null : 'MEDIUM')}
                                active={filterPriority === 'MEDIUM'}
                              />
                              <StatRow
                                label="Low Priority"
                                count={stats.lowPriority}
                                icon={AlertTriangle}
                                color="blue"
                                onClick={() => setFilterPriority(filterPriority === 'LOW' ? null : 'LOW')}
                                active={filterPriority === 'LOW'}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Requests Stats */
                      <div className="space-y-3">
                        <StatCard
                          title="Total Requests"
                          count={stats.totalRequests}
                          icon={MessageSquare}
                          variant="purple"
                        />
                        <StatCard
                          title="Pending"
                          count={stats.pendingRequests}
                          icon={Clock}
                          variant="orange"
                        />
                        <StatCard
                          title="Approved"
                          count={requests.filter((r: any) => r.status === 'APPROVED').length}
                          icon={CheckCircle}
                          variant="green"
                        />
                        <StatCard
                          title="In Progress"
                          count={requests.filter((r: any) => r.status === 'IN_PROGRESS').length}
                          icon={Clock}
                          variant="blue"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}



            {dashboardTab === 'calendar' && (
              <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    {calendarView === 'timeline' && (
                      <button 
                        onClick={() => setCalendarView('month')}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        title="Back to Month View"
                      >
                        <ArrowLeft size={20} className="text-slate-600" />
                      </button>
                    )}
                    <h2 className="text-xl font-bold text-slate-900">Calendar</h2>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                    <Button variant="outline" size="sm" className="shrink-0">Today</Button>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 shrink-0">
                      <button className="p-1 hover:bg-white rounded shadow-sm transition-all">
                        <span className="sr-only">Previous month</span>
                        ←
                      </button>
                      <button 
                        onClick={() => setCalendarView(calendarView === 'month' ? 'timeline' : 'month')}
                        className="text-sm font-medium px-2 hover:bg-white rounded py-1 transition-colors flex items-center gap-2 whitespace-nowrap"
                        title="Click to toggle view"
                      >
                        <span>December 2025</span>
                        <span className="text-xs text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                          {calendarView === 'month' ? 'View Timeline' : 'View Month'}
                        </span>
                      </button>
                      <button className="p-1 hover:bg-white rounded shadow-sm transition-all">
                        <span className="sr-only">Next month</span>
                        →
                      </button>
                    </div>
                  </div>
                </div>
                
                {calendarView === 'month' ? (
                  <div className="overflow-x-auto pb-4">
                    <div className="min-w-[600px] grid grid-cols-7 gap-px bg-slate-100 rounded-lg border border-slate-200">
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
                          <div 
                            key={i} 
                            onClick={() => day > 0 && day <= 31 && setCalendarView('timeline')}
                            className={`bg-white min-h-[120px] p-3 transition-colors ${
                              day < 1 || day > 31 
                                ? 'bg-slate-50/50 text-slate-400' 
                                : 'hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            {day > 0 && day <= 31 && (
                              <>
                                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-2 ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                                  {day}
                                </div>
                                <div className="space-y-1">
                                  {dayTickets.map(ticket => (
                                    <div 
                                      key={ticket.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewTicket(ticket.id);
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
                                  {dayTickets.length === 0 && day === 9 && (
                                    <div className="text-xs bg-slate-100 text-slate-600 p-1.5 rounded mb-1 truncate">
                                      Team Meeting
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <Timeline tickets={tickets} currentDate={new Date(2025, 11, 1)} />
                )}
              </div>
            )}            {dashboardTab === 'reports' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="col-span-1">
                  <AreaChart 
                    title="Ticket Trends" 
                    subtitle="Weekly ticket volume and completion status"
                    action={
                      <div className="w-56">
                        <CustomSelect
                          value={selectedReportBranch}
                          onChange={(value) => setSelectedReportBranch(value)}
                          options={[
                            { value: 'ALL', label: 'All Branches' },
                            ...branches.map(b => ({ value: b.id, label: b.name }))
                          ]}
                        />
                      </div>
                    }
                    labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                    data={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => {
                      const dayIndex = i === 6 ? 0 : i + 1;
                      const relevantTickets = selectedReportBranch === 'ALL' 
                        ? tickets 
                        : tickets.filter(t => t.branchId === selectedReportBranch);
                      return relevantTickets.filter(t => new Date(t.createdAt).getDay() === dayIndex).length;
                    })}
                    data2={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => {
                      const dayIndex = i === 6 ? 0 : i + 1;
                      const relevantTickets = selectedReportBranch === 'ALL' 
                        ? tickets 
                        : tickets.filter(t => t.branchId === selectedReportBranch);
                      return relevantTickets.filter(t => new Date(t.createdAt).getDay() === dayIndex && t.status === 'COMPLETED').length;
                    })}
                    legend1="Total Tickets"
                    legend2="Completed"
                  />
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-6">Tickets by Branch</h3>
                  <div className="space-y-4">
                    {branches.slice(0, 5).map(branch => {
                      const branchTickets = tickets.filter(t => t.branchId === branch.id);
                      const count = branchTickets.length;
                      const total = tickets.length || 1;
                      const percentage = Math.round((count / total) * 100);
                      
                      return (
                        <div key={branch.id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-700 font-medium">{branch.name}</span>
                            <span className="text-slate-500">{count} tickets ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {branches.length === 0 && (
                      <div className="text-center text-slate-500 py-8">No branches found</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

          {activeTab === 'users' && (
            selectedUser ? (
              <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={() => setSelectedUser(null)} 
                  className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors"
                >
                  <span className="text-xl">←</span> Back to Users
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: User Profile */}
                  <div className="space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                      <div className="w-24 h-24 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-3xl font-bold text-slate-600 mb-4">
                        {selectedUser.username.charAt(0).toUpperCase()}
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedUser.username}</h2>
                      <p className="text-slate-500 text-sm mb-6">User ID: #{selectedUser.id.substring(0, 8)}</p>
                      
                      <div className="pt-6 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Joined On</p>
                        <p className="text-sm font-medium text-slate-900">{formatDate(selectedUser.createdAt)}</p>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-4">User Stats</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                          <span className="text-sm text-slate-600">Total Tickets</span>
                          <span className="font-bold text-slate-900">{selectedUser._count?.tickets || 0}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                          <span className="text-sm text-slate-600">Role</span>
                          <Badge variant={selectedUser.role === 'ADMIN' ? 'info' : 'default'}>{selectedUser.role}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Activity & Details */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-8 py-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                      </div>
                      
                      <div className="p-8">
                        <div className="space-y-8">
                          {/* Mock Activity Feed - In real app, fetch user specific logs */}
                          <div className="relative pl-8 border-l-2 border-slate-100 space-y-8">
                            <div className="relative">
                              <div className="absolute -left-[33px] top-0 w-8 h-8 rounded-full bg-blue-50 border-4 border-white flex items-center justify-center text-blue-600">
                                <TicketIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm text-slate-900"><span className="font-bold">Created a new ticket</span> regarding printer issues</p>
                                <p className="text-xs text-slate-500 mt-1">Today, 12:00 PM</p>
                              </div>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-[33px] top-0 w-8 h-8 rounded-full bg-green-50 border-4 border-white flex items-center justify-center text-green-600">
                                <CheckCircle className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm text-slate-900"><span className="font-bold">Ticket #1234</span> was marked as resolved</p>
                                <p className="text-xs text-slate-500 mt-1">Yesterday, 4:30 PM</p>
                              </div>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-[33px] top-0 w-8 h-8 rounded-full bg-slate-100 border-4 border-white flex items-center justify-center text-slate-600">
                                <Users className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm text-slate-900">Account created</p>
                                <p className="text-xs text-slate-500 mt-1">{formatDate(selectedUser.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Total Users"
                count={stats.totalUsers}
                icon={Users}
                variant="blue"
              />
            </div>

            {/* Actions Toolbar */}
            <div className="flex justify-end mb-4">
              <Button onClick={() => setCreateView('user')}>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => (
                    <TableRow key={user.id} onClick={() => setSelectedUser(user)} className="cursor-pointer hover:bg-slate-50">
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'ADMIN' ? 'info' : 'default'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.team ? (
                          <Badge variant="default">{user.team.name}</Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">No team</span>
                        )}
                      </TableCell>
                      <TableCell>{user._count?.tickets || 0}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tickets
                    .filter(t => ticketFilterStatus === 'ALL' || t.status === ticketFilterStatus)
                    .filter(t => ticketFilterPriority === 'ALL' || t.priority === ticketFilterPriority)
                    .length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No tickets found
                      </td>
                    </tr>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
            )
          )}

          {activeTab === 'branches' && (
            selectedBranch ? (
              <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={() => setSelectedBranch(null)} 
                  className="mb-6 text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors"
                >
                  <span className="text-xl">←</span> Back to Branches
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Branch Profile */}
                  <div className="space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
                      <div className="w-24 h-24 mx-auto bg-blue-50 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 mb-4">
                        <Building2 className="w-10 h-10" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedBranch.name}</h2>
                      <p className="text-slate-500 text-sm mb-6">#{selectedBranch.branchNumber}</p>
                      
                      <div className="pt-6 border-t border-slate-100 text-left space-y-4">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location Type</p>
                          <Badge>{selectedBranch.category}</Badge>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location</p>
                          <p className="text-sm text-slate-700">{selectedBranch.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Branch Stats & Tickets */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <StatCard
                        title="Total Tickets"
                        count={tickets.filter(t => t.branchId === selectedBranch.id).length}
                        icon={TicketIcon}
                        variant="purple"
                      />
                      <StatCard
                        title="Pending Issues"
                        count={tickets.filter(t => t.branchId === selectedBranch.id && t.status === 'PENDING').length}
                        icon={Clock}
                        variant="orange"
                      />
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-8 py-6 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900">Recent Tickets from this Branch</h3>
                      </div>
                      <div className="p-0">
                        <Table>
                          <TableHeader>
                            <tr>
                              <TableHead>ID</TableHead>
                              <TableHead>Issue</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Date</TableHead>
                            </tr>
                          </TableHeader>
                          <TableBody>
                            {tickets
                              .filter(t => t.branchId === selectedBranch.id)
                              .slice(0, 5)
                              .map(ticket => (
                                <TableRow key={ticket.id}>
                                  <TableCell className="font-mono text-xs">#{ticket.id.substring(0, 6)}</TableCell>
                                  <TableCell className="max-w-xs truncate">{ticket.issue}</TableCell>
                                  <TableCell>
                                    <Badge variant={getStatusColor(ticket.status)} size="sm">
                                      {ticket.status.replace('_', ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-500">
                                    {formatDate(ticket.createdAt)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            {tickets.filter(t => t.branchId === selectedBranch.id).length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">No tickets found for this branch</td>
                              </tr>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900">Branch Management</h2>
            </div>

            {/* Total Branches Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Total Branches"
                count={stats.totalBranches}
                icon={Building2}
                variant="purple"
              />
            </div>

            {/* Actions Toolbar */}
            <div className="flex justify-end mb-4">
              <Button onClick={() => setCreateView('branch')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Branch
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Branch Number</TableHead>
                    <TableHead>Location Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow key={branch.id} onClick={() => setSelectedBranch(branch)} className="cursor-pointer hover:bg-slate-50">
                      <TableCell className="font-medium">{branch.branchNumber}</TableCell>
                      <TableCell>
                        <Badge>{branch.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{branch.name}</TableCell>
                      <TableCell>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBranch(branch.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={branchesPage}
              totalPages={Math.ceil(totalBranchesCount / branchesPerPage)}
              onPageChange={setBranchesPage}
            />
          </div>
            )
          )}

          {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900">Ticket Management</h2>
            </div>

            {/* Total Tickets Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Total Tickets"
                count={stats.totalTickets}
                icon={TicketIcon}
                variant="orange"
              />
            </div>

            {/* Filters and Actions Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end items-end sm:items-center mb-4">
              <div className="relative">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {(ticketFilterPriority !== 'ALL' || ticketFilterStatus !== 'ALL') && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </Button>

                {showFilters && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-10 animate-in fade-in zoom-in-95 duration-200">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Priority</label>
                        <CustomSelect
                          value={ticketFilterPriority}
                          onChange={setTicketFilterPriority}
                          options={[
                            { value: 'ALL', label: 'All Priorities' },
                            { value: 'HIGH', label: 'High' },
                            { value: 'MEDIUM', label: 'Medium' },
                            { value: 'LOW', label: 'Low' },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Status</label>
                        <CustomSelect
                          value={ticketFilterStatus}
                          onChange={setTicketFilterStatus}
                          options={[
                            { value: 'ALL', label: 'All Statuses' },
                            { value: 'PENDING', label: 'Pending' },
                            { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
                            { value: 'IN_PROGRESS', label: 'In Progress' },
                            { value: 'COMPLETED', label: 'Completed' },
                            { value: 'ESCALATED', label: 'Escalated' },
                            { value: 'CLOSED', label: 'Closed' },
                          ]}
                        />
                      </div>
                      
                      {(ticketFilterPriority !== 'ALL' || ticketFilterStatus !== 'ALL') && (
                        <button 
                          onClick={() => {
                            setTicketFilterPriority('ALL');
                            setTicketFilterStatus('ALL');
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-medium w-full text-center pt-2 border-t border-slate-100"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={() => setCreateView('ticket')} className="bg-[#052e16] hover:bg-[#052e16]/90 w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Ticket
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {tickets
                    .filter(t => ticketFilterStatus === 'ALL' || t.status === ticketFilterStatus)
                    .filter(t => ticketFilterPriority === 'ALL' || t.priority === ticketFilterPriority)
                    .map((ticket) => (
                    <TableRow key={ticket.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleViewTicket(ticket.id)}>
                      <TableCell className="font-mono text-xs">
                        {ticket.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>{ticket.user?.username}</TableCell>
                      <TableCell>{ticket.branch?.name}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{ticket.issue}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <StatusSelect
                          value={ticket.status}
                          onChange={(value) => handleUpdateTicketStatus(ticket.id, value)}
                          options={[
                            { value: 'PENDING', label: 'Pending' },
                            { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
                            { value: 'IN_PROGRESS', label: 'In Progress' },
                            { value: 'COMPLETED', label: 'Completed' },
                            { value: 'ESCALATED', label: 'Escalated' },
                            { value: 'CLOSED', label: 'Closed' },
                          ]}
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteTicket(ticket.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          )}
            </>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-6 h-[calc(100vh-12rem)]">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Requests Management</h2>
                  <p className="text-sm text-slate-500 mt-1">Total: {requests.length} requests</p>
                </div>
              </div>

              {/* Chat-like Layout */}
              <div className="flex gap-4 h-[calc(100%-12rem)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                        {requests.map((request: any) => (
                          <button
                            key={request.id}
                            onClick={() => setSelectedRequest(request)}
                            className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                              selectedRequest?.id === request.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-slate-900 line-clamp-1">
                                  {request.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                  by {request.user?.username}
                                  {request.user?.team && <span className="text-slate-400"> • {request.user.team.name}</span>}
                                </p>
                              </div>
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
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span className="font-mono">#{request.id.substring(0, 8)}</span>
                              <span>{formatRelativeTime(request.createdAt)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <MessageSquare className="w-16 h-16 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No requests found</h3>
                        <p className="text-sm text-slate-500">Requests will appear here when users submit them</p>
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
                      isAdmin={true}
                      onStatusChange={async (requestId, status) => {
                        try {
                          await fetch(`/api/requests/${requestId}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            },
                            body: JSON.stringify({ status }),
                          });
                          fetchData();
                          // Update selected request
                          setSelectedRequest({ ...selectedRequest, status });
                        } catch (error) {
                          console.error('Update request error:', error);
                        }
                      }}
                      onDelete={async (requestId) => {
                        if (confirm('Are you sure you want to delete this request?')) {
                          try {
                            await fetch(`/api/requests/${requestId}`, {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                              },
                            });
                            setSelectedRequest(null);
                            fetchData();
                          } catch (error) {
                            console.error('Delete request error:', error);
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <MessageSquare className="w-10 h-10 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Select a request</h3>
                      <p className="text-sm text-slate-500">Choose a request from the list to view and manage its details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">User Notes</h2>
                  <p className="text-sm text-slate-500 mt-1">Review communication from users on tickets</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Notes"
                  count={notes.length}
                  icon={MessageSquare}
                  variant="blue"
                />
                <StatCard
                  title="User Notes"
                  count={notes.filter((n: any) => n.user?.role === 'USER').length}
                  icon={Users}
                  variant="purple"
                />
                <StatCard
                  title="Admin Notes"
                  count={notes.filter((n: any) => n.user?.role === 'ADMIN').length}
                  icon={MessageSquare}
                  variant="orange"
                />
              </div>

              {notes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notes.map((note: any) => (
                    <div 
                      key={note.id} 
                      className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                    >
                      {/* Card Header */}
                      <div className="p-4 border-b border-slate-100">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-mono text-slate-500 truncate">
                              Ticket #{note.ticket?.id.slice(0, 8) || 'N/A'}
                            </span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs text-slate-500">{formatDate(note.createdAt)}</span>
                          </div>
                          {note.user?.role === 'ADMIN' && (
                            <Badge variant="warning" size="sm">Admin</Badge>
                          )}
                        </div>
                        
                        {note.ticket && (
                          <div className="flex items-start gap-2">
                            <p className="text-sm font-medium text-slate-900 line-clamp-1 flex-1">
                              {note.ticket.issue}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-4 flex-1 flex flex-col">
                        {/* Note Content */}
                        <p className="text-sm text-slate-700 leading-relaxed mb-4 line-clamp-4 flex-1">
                          {note.note}
                        </p>

                        {/* User Info */}
                        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                            note.user?.role === 'ADMIN' 
                              ? 'bg-orange-100 text-orange-600' 
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {note.user?.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{note.user?.username}</p>
                            {note.user?.team && (
                              <p className="text-xs text-slate-500 truncate">{note.user.team.name}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setSelectedNote(note);
                            setShowNoteDetailModal(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          View
                        </Button>
                        {note.ticket?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1"
                            onClick={() => {
                              setActiveTab('tickets');
                              handleViewTicket(note.ticket.id);
                            }}
                          >
                            Ticket
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="text-center py-16">
                    <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No notes found</h3>
                    <p className="text-slate-500">Notes will appear here when users add them to tickets</p>
                  </div>
                </div>
              )}
            </div>
          )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Are you sure?</h3>
            <p className="text-slate-500">
              This action cannot be undone. This will permanently delete the {deleteTarget?.type}.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete {deleteTarget?.type}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Team Modal */}
      <Modal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        title="Create New Team"
        size="sm"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <Input
            label="Team Name"
            value={teamForm.name}
            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
            required
            placeholder="e.g., Development Team, Support Team"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowTeamModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Team</Button>
          </div>
        </form>
      </Modal>

      {/* User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Create New User"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Username"
            value={userForm.username}
            onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
            required
          />
          <Input
            label="Password"
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            required
          />
          <Select
            label="Role"
            value={userForm.role}
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
            options={[
              { value: 'USER', label: 'User' },
              { value: 'ADMIN', label: 'Admin' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowUserModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </Modal>

      {/* Branch Modal */}
      <Modal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        title="Create New Branch"
        size="lg"
      >
        <form onSubmit={handleCreateBranch} className="space-y-4">
          <Input
            label="Branch Name"
            value={branchForm.name}
            onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
            required
          />
          <Input
            label="Branch Number"
            value={branchForm.branchNumber}
            onChange={(e) => setBranchForm({ ...branchForm, branchNumber: e.target.value })}
            required
          />
          <Select
            label="Category"
            value={branchForm.category}
            onChange={(e) => setBranchForm({ ...branchForm, category: e.target.value })}
            options={[
              { value: 'BRANCH', label: 'Branch' },
              { value: 'BACK_OFFICE', label: 'Back Office' },
              { value: 'HYBRID', label: 'Hybrid' },
              { value: 'DATA_CENTER', label: 'Data Center' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowBranchModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Branch</Button>
          </div>
        </form>
      </Modal>

      {/* Ticket Modal */}
      <Modal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        title="Create New Ticket"
        size="lg"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <Select
            label="User"
            value={ticketForm.userId}
            onChange={(e) => setTicketForm({ ...ticketForm, userId: e.target.value })}
            options={[
              { value: '', label: 'Select User' },
              ...users.map((u) => ({ value: u.id, label: u.username })),
            ]}
            required
          />
          <Select
            label="Branch"
            value={ticketForm.branchId}
            onChange={(e) => setTicketForm({ ...ticketForm, branchId: e.target.value })}
            options={[
              { value: '', label: 'Select Branch' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
            required
          />
          <Select
            label="Priority"
            value={ticketForm.priority}
            onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
            options={[
              { value: 'HIGH', label: 'High' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'LOW', label: 'Low' },
            ]}
          />
          <Textarea
            label="Issue Description"
            value={ticketForm.issue}
            onChange={(e) => setTicketForm({ ...ticketForm, issue: e.target.value })}
            rows={4}
            required
          />
          <Textarea
            label="Additional Details (Optional)"
            value={ticketForm.additionalDetails}
            onChange={(e) => setTicketForm({ ...ticketForm, additionalDetails: e.target.value })}
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowTicketModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Ticket</Button>
          </div>
        </form>
      </Modal>

      {/* Status Update Modal with Admin Note */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Ticket Status"
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              statusUpdate.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
              statusUpdate.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' :
              'bg-slate-100 text-slate-600'
            }`}>
              {statusUpdate.status === 'COMPLETED' ? <CheckCircle className="w-6 h-6" /> :
               statusUpdate.status === 'IN_PROGRESS' ? <Clock className="w-6 h-6" /> :
               <TicketIcon className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">New Status</p>
              <div className="mt-1">
                <Badge variant={getStatusColor(statusUpdate.status)} size="lg">
                  {statusUpdate.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
          
          <Textarea
            label="Admin Note (Optional)"
            value={statusUpdate.adminNote}
            onChange={(e) => setStatusUpdate({ ...statusUpdate, adminNote: e.target.value })}
            placeholder="Add a note about this status change that will be visible to the user..."
            rows={4}
            className="bg-white"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStatusUpdate} className="bg-slate-900 hover:bg-slate-800 text-white">
              Confirm Update
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ticket Details Modal - REMOVED (Replaced by Full Page View) */}
        </div>
      </main>

      {/* Note Detail Modal */}
      <NoteDetailModal
        isOpen={showNoteDetailModal}
        onClose={() => {
          setShowNoteDetailModal(false);
          setSelectedNote(null);
        }}
        note={selectedNote}
        isAdmin={true}
      />
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-slate-600">Loading...</div></div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
