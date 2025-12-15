'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/app/components/ToastContainer';
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
import { PieChart } from '@/app/components/PieChart';
import { SearchBar } from '@/app/components/SearchBar';
import { Pagination } from '@/app/components/Pagination';
import { getStatusColor, getPriorityColor, getPriorityLabel, formatDate, formatRelativeTime } from '@/lib/utils';
import { Users, Building2, Ticket as TicketIcon, Plus, Edit, Trash2, MessageSquare, Clock, CheckCircle, XCircle, Search, Filter, AlertTriangle, MoreVertical, Mail, Phone, MapPin, ArrowLeft, Eye, History, Calendar, FileText, Briefcase } from 'lucide-react';
import { Suspense } from 'react';
import { NoteDetailModal } from '@/app/components/NoteDetailModal';
import { RequestDetail } from '@/app/components/RequestDetail';
import { AnalyticsSection } from '@/app/components/AnalyticsSection';
import { TicketCard } from '@/app/components/TicketCard';
import { TicketDetail } from '@/app/components/TicketDetail';
import { KanbanBoard } from '@/app/components/KanbanBoard';
import * as XLSX from 'xlsx';
import NotificationBell from '@/app/components/NotificationBell';

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'branches' | 'tickets' | 'requests' | 'notes' | 'analytics'>('overview');
  const [dashboardTab, setDashboardTab] = useState<'stats' | 'reports'>('stats');
  const [overviewTab, setOverviewTab] = useState<'tickets' | 'requests'>('tickets');
  const [selectedReportBranch, setSelectedReportBranch] = useState<string>('ALL');
  const [createView, setCreateView] = useState<'user' | 'branch' | 'ticket' | null>(null);
  const [branchCreateTab, setBranchCreateTab] = useState<'manual' | 'upload'>('manual');
  const [parsedBranches, setParsedBranches] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  
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
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'USER', teamIds: [] as string[] });
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
    localContactName: '',
    localContactEmail: '',
    localContactPhone: '',
    timezone: '',
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
    if (tab && ['overview', 'users', 'branches', 'tickets', 'requests', 'notes', 'analytics'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [router, searchParams]);

  // Handle deep linking to tickets
  useEffect(() => {
    const ticketId = searchParams.get('ticketId');
    if (ticketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        setSelectedTicket(ticket);
        setActiveTab('tickets');
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
        setActiveTab('requests');
      }
    }
  }, [requests, searchParams]);

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
      const [usersRes, branchesRes, ticketsRes, teamsRes, requestsRes, notesRes, meRes] = await Promise.all([
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
        apiClient.getMe(),
      ]);

      setUsers(usersRes.users);
      setBranches(branchesRes.branches);
      setTotalBranchesCount(branchesRes.pagination.total);
      setTickets(ticketsRes.tickets);
      setTeams(teamsRes.teams || []);
      setRequests(requestsRes.requests || []);
      setNotes(notesRes.notes || []);
      if (meRes.companyName) {
        setCompanyName(meRes.companyName);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchesData = async () => {
    try {
      const res = await apiClient.getBranches({ 
        page: branchesPage, 
        limit: branchesPerPage,
        search: branchSearchQuery
      });
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

  // Debounce branch search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'branches') {
        setBranchesPage(1);
        fetchBranchesData();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [branchSearchQuery]);

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
      if (userForm.teamIds && userForm.teamIds.length > 0) {
        userData.teamIds = userForm.teamIds;
      }
      await apiClient.createUser(userData);
      toast.success('User created successfully');
      setCreateView(null);
      setUserForm({ username: '', password: '', role: 'USER', teamIds: [] });
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
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
      
      toast.success(`Team "${teamForm.name}" created successfully`);
      setShowTeamModal(false);
      setTeamForm({ name: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
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
      
      toast.error('Team deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
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
        toast.error('User deleted successfully');
      } else if (deleteTarget.type === 'branch') {
        await apiClient.deleteBranch(deleteTarget.id);
        toast.error('Branch deleted successfully');
      } else if (deleteTarget.type === 'ticket') {
        await apiClient.deleteTicket(deleteTarget.id);
        toast.error('Ticket deleted successfully');
        setSelectedTicket(null);
      }
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
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
        toast.error('Failed to parse file. Please check the format.');
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
      // For better UX, we could show a progress bar, but for now simple toast is fine
      
      for (const branch of parsedBranches) {
        try {
           await apiClient.createBranch(branch);
           successCount++;
        } catch (err) {
           console.error("Failed to create branch", branch, err);
           errorCount++;
        }
      }
      
      if (errorCount === 0) {
        toast.success(`Successfully created ${successCount} branch${successCount > 1 ? 'es' : ''}`);
      } else {
        toast.warning(`Created ${successCount} branch${successCount > 1 ? 'es' : ''}, ${errorCount} failed`);
      }
      setCreateView(null);
      setParsedBranches([]);
      setBranchCreateTab('manual');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createBranch(branchForm);
      toast.success('Branch created successfully');
      setCreateView(null);
      setBranchForm({
        name: '',
        branchNumber: '',
        category: 'BRANCH',
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEditBranch = (branch: Branch) => {
    setBranchForm({
      name: branch.name,
      branchNumber: branch.branchNumber,
      category: branch.category,
    });
    setIsEditingBranch(true);
    setEditingBranchId(branch.id);
    setCreateView('branch');
    setBranchCreateTab('manual');
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranchId) return;

    try {
      await apiClient.updateBranch(editingBranchId, branchForm);
      toast.success('Branch updated successfully');
      setCreateView(null);
      setBranchForm({
        name: '',
        branchNumber: '',
        category: 'BRANCH',
      });
      setIsEditingBranch(false);
      setEditingBranchId(null);
      fetchBranchesData();
    } catch (error: any) {
      toast.error(error.message);
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
      toast.success('Ticket created successfully');
      window.dispatchEvent(new Event('refresh-notifications'));
      setCreateView(null);
      setTicketForm({
        userId: '',
        branchId: '',
        incNumber: '',
        priority: 'P2',
        issue: '',
        additionalDetails: '',
        status: 'PENDING',
        localContactName: '',
        localContactEmail: '',
        localContactPhone: '',
        timezone: '',
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleViewTicket = async (ticketId: string) => {
    try {
      const result = await apiClient.getTicket(ticketId);
      setSelectedTicket(result.ticket);
    } catch (error: any) {
      toast.error(error.message);
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
      toast.success('Ticket status updated successfully');
      window.dispatchEvent(new Event('refresh-notifications'));
      setShowStatusModal(false);
      setStatusUpdate({ ticketId: '', status: '', adminNote: '' });
      fetchData();
      // Refresh selected ticket if viewing
      if (selectedTicket && selectedTicket.id === statusUpdate.ticketId) {
        handleViewTicket(statusUpdate.ticketId);
      }
    } catch (error: any) {
      toast.error(error.message);
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
            <TicketDetail 
              ticket={selectedTicket}
              currentUser={user}
              onBack={() => setSelectedTicket(null)}
              onAddNote={async (note) => {
                if (!selectedTicket) return;
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
                  
                  toast.success('Note added successfully');
                  handleViewTicket(selectedTicket.id);
                  fetchData();
                } catch (error: any) {
                  toast.error(error.message);
                }
              }}
              onUpdateStatus={(status) => handleUpdateTicketStatus(selectedTicket.id, status)}
              onDelete={() => handleDeleteTicket(selectedTicket.id)}
              onViewHistory={() => router.push(`/admin/tickets/${selectedTicket.id}/timeline`)}
            />
          ) : createView ? (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <button 
                  onClick={() => setCreateView(null)} 
                  className="text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors"
                >
                  <span className="text-xl">←</span> Back to List
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
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">
                    {createView === 'user' && 'Create New User'}
                    {createView === 'branch' && (isEditingBranch ? 'Edit Branch' : 'Create New Branch')}
                    {createView === 'ticket' && 'Create New Ticket'}
                  </h1>
                  <p className="text-slate-500">
                    {createView === 'user' && 'Add a new user to the system'}
                    {createView === 'branch' && (isEditingBranch ? 'Update branch details' : 'Add a new branch location')}
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
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-bold text-slate-700 mb-3">
                            Assign Teams (Optional)
                          </label>
                          <div className="space-y-2">
                            {teams.map(team => (
                              <label key={team.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer border border-slate-200 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={userForm.teamIds.includes(team.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setUserForm({ ...userForm, teamIds: [...userForm.teamIds, team.id] });
                                    } else {
                                      setUserForm({ ...userForm, teamIds: userForm.teamIds.filter(id => id !== team.id) });
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                    {team.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-slate-900">{team.name}</span>
                                </div>
                              </label>
                            ))}
                            {teams.length === 0 && (
                              <div className="text-center py-4 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                                <p className="text-sm text-slate-500">No teams available. Create teams first.</p>
                              </div>
                            )}
                          </div>
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
                          Create User
                        </Button>
                      </div>
                    </form>
                  )}

                  {createView === 'branch' && (
                    <div className="space-y-6">
                      {/* Tabs */}
                      {!isEditingBranch && (
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
                      )}

                      {branchCreateTab === 'manual' ? (
                        <form onSubmit={isEditingBranch ? handleUpdateBranch : handleCreateBranch} className="space-y-6">
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
                              onClick={() => {
                                setCreateView(null);
                                setIsEditingBranch(false);
                                setEditingBranchId(null);
                              }}
                              className="text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                            >
                              Cancel
                            </Button>
                            <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-500 text-white border-0">
                              {isEditingBranch ? 'Update Branch' : 'Create Branch'}
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
                          searchable={true}
                        />
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

                      {/* Local Contact Information Section */}
                      <div className="border-t border-slate-200 pt-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Local Contact Information (Optional)</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <Input
                            label="Contact Name"
                            value={ticketForm.localContactName}
                            onChange={(e) => setTicketForm({ ...ticketForm, localContactName: e.target.value })}
                            placeholder="e.g., John Doe"
                          />
                          <Input
                            label="Contact Email"
                            type="email"
                            value={ticketForm.localContactEmail}
                            onChange={(e) => setTicketForm({ ...ticketForm, localContactEmail: e.target.value })}
                            placeholder="e.g., john.doe@example.com"
                          />
                          <Input
                            label="Contact Phone"
                            type="tel"
                            value={ticketForm.localContactPhone}
                            onChange={(e) => setTicketForm({ ...ticketForm, localContactPhone: e.target.value })}
                            placeholder="e.g., +1 234 567 8900"
                          />
                          <Input
                            label="Timezone"
                            value={ticketForm.timezone}
                            onChange={(e) => setTicketForm({ ...ticketForm, timezone: e.target.value })}
                            placeholder="e.g., America/New_York, Europe/London"
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
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 lg:mb-8 mt-12 lg:mt-0">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                    {activeTab === 'overview' && 'Admin Dashboard'}
                    {activeTab === 'users' && 'User Management'}
                    {activeTab === 'branches' && 'Branches Management'}
                    {activeTab === 'tickets' && 'Tickets Management'}
                    {activeTab === 'requests' && 'Requests Management'}
                    {activeTab === 'notes' && 'Notes Management'}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    {activeTab === 'overview' && 'Monitor and manage all tickets, requests, and system activity'}
                    {activeTab === 'users' && 'Manage system users and permissions'}
                    {activeTab === 'branches' && 'Manage branch locations'}
                    {activeTab === 'tickets' && 'View and manage all tickets'}
                    {activeTab === 'requests' && 'View and manage all user requests'}
                    {activeTab === 'notes' && 'View all ticket notes and communications'}
                  </p>
                </div>
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

          {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Tab Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
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
                onClick={() => setDashboardTab('reports')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dashboardTab === 'reports'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Analytics
              </button>
            </div>

            {dashboardTab === 'stats' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column - Tickets/Requests List (2/3 width) */}
                <div className="xl:col-span-2 space-y-6">
                  {/* Stats Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total Tickets */}
                    <div 
                      onClick={() => {
                        setActiveTab('tickets');
                        setTicketFilterStatus('ALL');
                      }}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-500 mb-1">Total Tickets</p>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-900">{stats.totalTickets}</h3>
                            <span className="text-xs font-semibold text-green-600">▲ +12%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Completed */}
                    <div 
                      onClick={() => {
                        setActiveTab('tickets');
                        setTicketFilterStatus('COMPLETED');
                      }}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-500 mb-1">Completed</p>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-900">{stats.completedTickets}</h3>
                            <span className="text-xs font-semibold text-green-600">▲ +8%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pending */}
                    <div 
                      onClick={() => {
                        setActiveTab('tickets');
                        setTicketFilterStatus('PENDING');
                      }}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                          <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-500 mb-1">Pending</p>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-900">{stats.pendingTickets}</h3>
                            <span className="text-xs font-semibold text-red-600">▼ -3%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tickets/Requests Tabs */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex border-b border-slate-200">
                      <button
                        onClick={() => setOverviewTab('tickets')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                          overviewTab === 'tickets'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        Tickets ({stats.totalTickets})
                      </button>
                      <button
                        onClick={() => setOverviewTab('requests')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                          overviewTab === 'requests'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        Requests ({stats.totalRequests})
                      </button>
                    </div>

                    <div className="p-6">
                      {overviewTab === 'tickets' ? (
                        <div className="space-y-3">
                          {paginatedTickets.length === 0 ? (
                            <div className="text-center py-12">
                              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                              <p className="text-slate-600">No tickets found</p>
                            </div>
                          ) : (
                            <>
                              {paginatedTickets.map((ticket) => (
                                <TicketCard
                                  key={ticket.id}
                                  ticket={ticket}
                                  onClick={() => handleViewTicket(ticket.id)}
                                  onDelete={() => handleDeleteTicket(ticket.id)}
                                />
                              ))}
                              <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                              />
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">{requests.length === 0 ? (
                          <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-600">No requests found</p>
                          </div>
                        ) : (
                          requests.slice(0, 5).map((request: any) => (
                            <div 
                              key={request.id}
                              onClick={() => {
                                setSelectedRequest(request);
                                setActiveTab('requests');
                              }}
                              className="p-4 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer transition-all group"
                            >
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                  {request.user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h4 className="font-bold text-slate-900 line-clamp-1">{request.title}</h4>
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
                                  <p className="text-sm text-slate-600 line-clamp-2">{request.description}</p>
                                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                                    <span className="text-xs text-slate-400">
                                      {formatRelativeTime(request.createdAt)}
                                    </span>
                                    <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Stats & Quick Actions (1/3 width) */}
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                      <div 
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => router.push('/admin/users')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">Total Users</span>
                        </div>
                        <span className="text-lg font-bold text-slate-900">{users.length}</span>
                      </div>
                      <div 
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => router.push('/admin?tab=branches')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">Branches</span>
                        </div>
                        <span className="text-lg font-bold text-slate-900">{branches.length}</span>
                      </div>
                      <div 
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => router.push('/admin/teams')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-700">Teams</span>
                        </div>
                        <span className="text-lg font-bold text-slate-900">{teams.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ticket Priority Distribution */}
                  <PieChart 
                    title="Priority Distribution"
                    subtitle="Tickets by priority level"
                    data={[
                      tickets.filter(t => t.priority === 'P1').length,
                      tickets.filter(t => t.priority === 'P2').length,
                      tickets.filter(t => t.priority === 'P3').length
                    ]}
                    labels={['High (P1)', 'Medium (P2)', 'Low (P3)']}
                    colors={['#EF4444', '#F59E0B', '#10B981']}
                  />

                  {/* Quick Actions */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Quick Actions</h3>
                    <p className="text-slate-500 text-sm mb-4">Manage system efficiently</p>
                    <div className="space-y-2">
                      <button 
                        onClick={() => setShowUserModal(true)}
                        className="w-full bg-slate-900 text-white py-2.5 px-4 rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add User
                      </button>
                      <button 
                        onClick={() => setShowBranchModal(true)}
                        className="w-full bg-white text-slate-700 py-2.5 px-4 rounded-xl font-medium hover:bg-slate-50 transition-colors border border-slate-200 flex items-center justify-center gap-2"
                      >
                        <Building2 className="w-4 h-4" />
                        Add Branch
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {dashboardTab === 'reports' && (
              <div className="space-y-6">
                {/* Analytics Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Analytics & Reports</h2>
                    <p className="text-slate-500">Detailed insights and performance metrics</p>
                  </div>
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
                </div>

                {/* Analytics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Tickets by Branch</h3>
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

                    {(selectedUser as any).teams && (selectedUser as any).teams.length > 0 && (
                      <div className="bg-linear-to-br from-blue-50 to-purple-50 p-6 rounded-3xl border border-blue-100 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4">Assigned Teams</h3>
                        <div className="space-y-2">
                          {(selectedUser as any).teams.map((userTeam: any) => (
                            <div key={userTeam.id} className="flex items-center gap-3 p-3 bg-white/70 rounded-xl">
                              <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                {userTeam.team?.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{userTeam.team?.name}</p>
                                <p className="text-xs text-slate-500">Added {formatRelativeTime(userTeam.createdAt)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Activity & Details */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-8 py-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                      </div>
                      
                      <div className="p-8">
                        <div className="space-y-8">
                          {/* Activity Feed */}
                          <div className="relative pl-8 border-l-2 border-slate-100 space-y-8">
                            {tickets
                              .filter(t => t.userId === selectedUser.id)
                              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .slice(0, 5)
                              .map(ticket => (
                                <div key={ticket.id} className="relative">
                                  <div className="absolute -left-[33px] top-0 w-8 h-8 rounded-full bg-blue-50 border-4 border-white flex items-center justify-center text-blue-600">
                                    <TicketIcon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-slate-900">
                                      <span className="font-bold">Created ticket</span>
                                    </p>
                                    <p className="text-sm text-slate-600 mt-1 line-clamp-1">{ticket.issue}</p>
                                    <p className="text-xs text-slate-500 mt-1">{formatRelativeTime(ticket.createdAt)}</p>
                                  </div>
                                </div>
                              ))}
                            
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
                variant="teal"
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
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index} className="animate-pulse">
                        <TableCell><div className="h-4 bg-slate-200 rounded w-24"></div></TableCell>
                        <TableCell><div className="h-6 bg-slate-200 rounded-full w-16"></div></TableCell>
                        <TableCell><div className="h-6 bg-slate-200 rounded-full w-20"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded w-8"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded w-24"></div></TableCell>
                        <TableCell><div className="h-8 w-8 bg-slate-200 rounded"></div></TableCell>
                      </TableRow>
                    ))
                  ) : users.map((user: any) => (
                    <TableRow key={user.id} onClick={() => setSelectedUser(user)} className="cursor-pointer hover:bg-slate-50">
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'ADMIN' ? 'info' : 'default'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.teams && user.teams.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.teams.slice(0, 2).map((userTeam: any) => (
                              <Badge key={userTeam.id} variant="default" size="sm">
                                {userTeam.team?.name}
                              </Badge>
                            ))}
                            {user.teams.length > 2 && (
                              <Badge variant="default" size="sm">
                                +{user.teams.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">No teams</span>
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
                  {!loading && tickets
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
                        variant="navy"
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
                variant="slate"
              />
            </div>

            {/* Actions Toolbar */}
            <div className="flex justify-end items-center mb-4 gap-3">
              <div className={`relative flex justify-end transition-all duration-300 ease-in-out ${isSearchExpanded ? 'w-64' : 'w-10'}`}>
                {isSearchExpanded ? (
                  <div className="w-full animate-in fade-in zoom-in-95 duration-200">
                    <SearchBar
                      placeholder="Search branches..."
                      value={branchSearchQuery}
                      onChange={setBranchSearchQuery}
                      autoFocus
                      onBlur={() => !branchSearchQuery && setIsSearchExpanded(false)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setIsSearchExpanded(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                )}
              </div>
              <Button onClick={() => {
                setIsEditingBranch(false);
                setBranchForm({ name: '', branchNumber: '', category: 'BRANCH' });
                setCreateView('branch');
              }}>
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
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index} className="animate-pulse">
                        <TableCell><div className="h-4 bg-slate-200 rounded w-24"></div></TableCell>
                        <TableCell><div className="h-6 bg-slate-200 rounded-full w-20"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 rounded w-48"></div></TableCell>
                        <TableCell><div className="flex gap-2"><div className="h-8 w-8 bg-slate-200 rounded"></div><div className="h-8 w-8 bg-slate-200 rounded"></div></div></TableCell>
                      </TableRow>
                    ))
                  ) : branches.map((branch) => (
                    <TableRow key={branch.id} onClick={() => setSelectedBranch(branch)} className="cursor-pointer hover:bg-slate-50">
                      <TableCell className="font-medium">{branch.branchNumber}</TableCell>
                      <TableCell>
                        <Badge>{branch.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{branch.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditBranch(branch);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
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
                        </div>
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

          {activeTab === 'analytics' && user && (
            loading ? (
              <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-96 bg-slate-200 rounded-2xl"></div>
                  <div className="h-96 bg-slate-200 rounded-2xl"></div>
                </div>
              </div>
            ) : (
              <AnalyticsSection 
                tickets={tickets} 
                requests={requests}
                users={users}
                currentUser={user} 
              />
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
                variant="navy"
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
                            { value: 'INVOICE', label: 'Invoice' },
                            { value: 'PAID', label: 'Paid' },
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
              <Button onClick={() => setCreateView('ticket')} variant="outline" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Ticket
              </Button>
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
              ) : tickets
                .filter(t => ticketFilterStatus === 'ALL' || t.status === ticketFilterStatus)
                .filter(t => ticketFilterPriority === 'ALL' || t.priority === ticketFilterPriority)
                .map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => handleViewTicket(ticket.id)}
                    onDelete={() => handleDeleteTicket(ticket.id)}
                  />
                ))}
              
              {!loading && tickets
                .filter(t => ticketFilterStatus === 'ALL' || t.status === ticketFilterStatus)
                .filter(t => ticketFilterPriority === 'ALL' || t.priority === ticketFilterPriority)
                .length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                  <TicketIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-slate-900">No tickets found</h3>
                  <p className="text-slate-500">Try adjusting your filters or create a new ticket.</p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-6 h-[calc(100vh-12rem)]">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Requests Management</h2>
                  <p className="text-sm text-slate-500 mt-1">Manage and track all user requests</p>
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
                {loading ? (
                  <div className="flex gap-4 min-w-max">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-80 bg-slate-50 rounded-xl p-4 animate-pulse">
                        <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, j) => (
                            <div key={j} className="bg-white rounded-lg p-4 h-32 border border-slate-100"></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
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
                        toast.success('Request status updated');
                      } catch (error) {
                        console.error('Update request error:', error);
                        toast.error('Failed to update request status');
                      }
                    }}
                  />
                )}
              </div>

              {/* Request Detail Modal */}
              {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRequest(null)}>
                  <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
                  </div>
                </div>
              )}
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
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <MessageSquare className="w-5 h-5 text-slate-600" />
                    </div>
                    <span className="font-medium text-slate-600">Total Notes</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{notes.length}</h3>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <Users className="w-5 h-5 text-slate-600" />
                    </div>
                    <span className="font-medium text-slate-600">User Notes</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{notes.filter((n: any) => n.user?.role === 'USER').length}</h3>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <MessageSquare className="w-5 h-5 text-slate-600" />
                    </div>
                    <span className="font-medium text-slate-600">Admin Notes</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{notes.filter((n: any) => n.user?.role === 'ADMIN').length}</h3>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 h-48 animate-pulse">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                          <div className="h-3 bg-slate-200 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-full"></div>
                        <div className="h-3 bg-slate-200 rounded w-full"></div>
                        <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : notes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notes.map((note: any) => (
                    <div 
                      key={note.id} 
                      className="relative group h-full"
                    >
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 text-left relative h-full flex flex-col">
                        {/* Chat Bubble Tail */}
                        <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white border-b border-r transform rotate-45 border-slate-200 group-hover:border-slate-300" />

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
                              note.user?.role === 'ADMIN'
                                ? 'bg-orange-100 text-orange-600 border-orange-200'
                                : 'bg-purple-100 text-purple-600 border-purple-200'
                            }`}>
                              {note.user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{note.user?.username}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
                                {note.user?.role === 'ADMIN' ? 'Administrator' : (note.user?.team?.name || 'User')}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-full">
                            {formatRelativeTime(note.createdAt)}
                          </span>
                        </div>
                        
                        <p className="text-slate-600 text-sm leading-relaxed mb-4 flex-1 line-clamp-4">
                          {note.note}
                        </p>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md max-w-[150px]">
                            <TicketIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{note.ticket?.issue}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs hover:bg-slate-100"
                              onClick={() => {
                                setSelectedNote(note);
                                setShowNoteDetailModal(true);
                              }}
                            >
                              View
                            </Button>
                            {note.ticket?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs hover:bg-slate-100"
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
          </>
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
          <CustomSelect
            label="User"
            value={ticketForm.userId}
            onChange={(value) => setTicketForm({ ...ticketForm, userId: value })}
            options={users.map((u) => ({ value: u.id, label: u.username }))}
            placeholder="Select User"
            searchable={true}
          />
          <CustomSelect
            label="Branch"
            value={ticketForm.branchId}
            onChange={(value) => setTicketForm({ ...ticketForm, branchId: value })}
            options={branches.map((b) => ({ value: b.id, label: `${b.branchNumber} - ${b.name}` }))}
            placeholder="Select Branch"
            searchable={true}
          />
          <Select
            label="Priority"
            value={ticketForm.priority}
            onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
            options={[
              { value: 'P1', label: 'P1 - Within 4 Hours' },
              { value: 'P2', label: 'P2 - Next Working Day' },
              { value: 'P3', label: 'P3 - Within 48 Hours' },
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
          <div className="border-t border-slate-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Local Contact Information (Optional)</h3>
            <div className="space-y-4">
              <Input
                label="Contact Name"
                value={ticketForm.localContactName}
                onChange={(e) => setTicketForm({ ...ticketForm, localContactName: e.target.value })}
                placeholder="e.g., John Doe"
              />
              <Input
                label="Contact Email"
                type="email"
                value={ticketForm.localContactEmail}
                onChange={(e) => setTicketForm({ ...ticketForm, localContactEmail: e.target.value })}
                placeholder="e.g., john.doe@example.com"
              />
              <Input
                label="Contact Phone"
                type="tel"
                value={ticketForm.localContactPhone}
                onChange={(e) => setTicketForm({ ...ticketForm, localContactPhone: e.target.value })}
                placeholder="e.g., +1 234 567 8900"
              />
              <Input
                label="Timezone"
                value={ticketForm.timezone}
                onChange={(e) => setTicketForm({ ...ticketForm, timezone: e.target.value })}
                placeholder="e.g., America/New_York, Europe/London"
              />
            </div>
          </div>
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
