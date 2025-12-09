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
import { Plus, CheckCircle, Clock, AlertCircle, MessageSquare, XCircle, Search, Filter, Calendar, Building2, Copy, User as UserIcon, Shield, Lock } from 'lucide-react';
import { Suspense } from 'react';

function UserDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'create' | 'tickets' | 'profile'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'calendar'>('overview');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Reset page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(tickets.length / itemsPerPage);
  const paginatedTickets = tickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [ticketForm, setTicketForm] = useState({
    branchId: '',
    priority: 'MEDIUM',
    issue: '',
    additionalDetails: '',
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }

    const userData = JSON.parse(storedUser);
    setUser(userData);
    fetchData();

    // Update view from URL params
    const viewParam = searchParams.get('view');
    if (viewParam && ['dashboard', 'create', 'tickets', 'profile'].includes(viewParam)) {
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
      const [branchesRes, ticketsRes] = await Promise.all([
        apiClient.getBranches(),
        apiClient.getTickets({ search: searchQuery }),
      ]);

      setBranches(branchesRes.branches);
      setTickets(ticketsRes.tickets);
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
  }, [searchQuery]);

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
        priority: 'MEDIUM',
        issue: '',
        additionalDetails: '',
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
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Address</p>
                          <p className="text-sm text-slate-700">{selectedTicket.branch?.address}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Contact</p>
                          <p className="text-sm text-slate-700">{selectedTicket.branch?.localContact}</p>
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

                      <CustomSelect
                        label="Priority"
                        value={ticketForm.priority}
                        onChange={(value) => setTicketForm({ ...ticketForm, priority: value })}
                        options={[
                          { value: 'HIGH', label: 'High - Urgent issue requiring immediate attention' },
                          { value: 'MEDIUM', label: 'Medium - Important but not urgent' },
                          { value: 'LOW', label: 'Low - Can be addressed later' },
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
                  </div>
                </div>
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
          ) : (
            <>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 mt-12 lg:mt-0">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
                  <p className="text-sm text-slate-600 mt-1">Manage your dispatch requests</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
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
                                  <p className="text-xs text-slate-500">#{ticket.id.substring(0, 8)}</p>
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
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <StatCard
                        title="My Tickets"
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
