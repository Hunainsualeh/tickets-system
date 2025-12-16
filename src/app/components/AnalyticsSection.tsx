'use client';

import React, { useState, useMemo } from 'react';
import { Ticket, User } from '@/types';
import { Card, CardHeader, CardBody } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { CustomSelect } from './CustomSelect';
import { StatRow } from './StatRow';
import { Badge } from './Badge';
import { AreaChart } from './AreaChart';
import { PieChart } from './PieChart';
import { BarChart } from './BarChart';
import { Search, Filter, BarChart3, List, PieChart as PieChartIcon, Calendar, Building2, User as UserIcon, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { getStatusColor, getPriorityColor, getPriorityLabel, formatDate, formatRelativeTime } from '@/lib/utils';

import { TicketCard } from './TicketCard';
import { SearchBar } from './SearchBar';

interface AnalyticsSectionProps {
  tickets: Ticket[];
  requests?: any[];
  users?: User[]; // For admin to filter by creator
  currentUser: User;
  hideHeader?: boolean;
  defaultTab?: 'tickets' | 'requests' | 'analytics';
  companyName?: string;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ tickets, requests = [], users, currentUser, hideHeader = false, defaultTab = 'tickets', companyName }) => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'requests' | 'analytics'>(defaultTab);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL'); // ALL, YEAR, MONTH, WEEK, CUSTOM
  const [creatorFilter, setCreatorFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter Logic for Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = 
        ticket.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.incNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.branch?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || ticket.priority === priorityFilter;
      const matchesCreator = creatorFilter === 'ALL' || ticket.userId === creatorFilter;
      
      let matchesTime = true;
      const ticketDate = new Date(ticket.createdAt);
      const now = new Date();
      
      if (timeFilter === 'YEAR') {
        matchesTime = ticketDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'MONTH') {
        matchesTime = ticketDate.getMonth() === now.getMonth() && ticketDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'WEEK') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesTime = ticketDate >= oneWeekAgo;
      } else if (timeFilter === 'CUSTOM' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the end date fully
        matchesTime = ticketDate >= start && ticketDate <= end;
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesCreator && matchesTime;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, timeFilter, creatorFilter, startDate, endDate]);

  // Filter Logic for Requests
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesSearch = 
        request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
      const matchesCreator = creatorFilter === 'ALL' || request.userId === creatorFilter;
      
      let matchesTime = true;
      const requestDate = new Date(request.createdAt);
      const now = new Date();
      
      if (timeFilter === 'YEAR') {
        matchesTime = requestDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'MONTH') {
        matchesTime = requestDate.getMonth() === now.getMonth() && requestDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'WEEK') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesTime = requestDate >= oneWeekAgo;
      } else if (timeFilter === 'CUSTOM' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesTime = requestDate >= start && requestDate <= end;
      }

      return matchesSearch && matchesStatus && matchesCreator && matchesTime;
    });
  }, [requests, searchQuery, statusFilter, timeFilter, creatorFilter, startDate, endDate]);

  // Analytics Logic for Tickets
  const stats = useMemo(() => {
    const total = filteredTickets.length;
    const closed = filteredTickets.filter(t => t.status === 'CLOSED').length;
    const open = filteredTickets.filter(t => ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(t.status)).length;
    
    // Status Breakdown
    const statusCounts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    // Priority Breakdown
    const priorityCounts: Record<string, number> = { P1: 0, P2: 0, P3: 0 };
    filteredTickets.forEach(t => {
      if (priorityCounts[t.priority] !== undefined) {
        priorityCounts[t.priority]++;
      } else {
        priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
      }
    });

    // Timeline Data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const ticketsPerMonth = new Array(12).fill(0);
    const closedPerMonth = new Array(12).fill(0);

    filteredTickets.forEach(t => {
      const d = new Date(t.createdAt);
      if (d.getFullYear() === new Date().getFullYear()) {
        ticketsPerMonth[d.getMonth()]++;
        if (t.status === 'CLOSED') {
          closedPerMonth[d.getMonth()]++;
        }
      }
    });

    return { total, closed, open, statusCounts, priorityCounts, ticketsPerMonth, closedPerMonth, months };
  }, [filteredTickets]);

  // Analytics Logic for Requests
  const requestStats = useMemo(() => {
    const total = filteredRequests.length;
    const completed = filteredRequests.filter(r => r.status === 'COMPLETED').length;
    const pending = filteredRequests.filter(r => ['PENDING', 'IN_PROGRESS'].includes(r.status)).length;
    
    const statusCounts: Record<string, number> = {};
    filteredRequests.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const requestsPerMonth = new Array(12).fill(0);
    const completedPerMonth = new Array(12).fill(0);

    filteredRequests.forEach(r => {
      const d = new Date(r.createdAt);
      if (d.getFullYear() === new Date().getFullYear()) {
        requestsPerMonth[d.getMonth()]++;
        if (r.status === 'COMPLETED') {
          completedPerMonth[d.getMonth()]++;
        }
      }
    });

    return { total, completed, pending, statusCounts, requestsPerMonth, completedPerMonth, months };
  }, [filteredRequests]);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className={`flex flex-col sm:flex-row ${hideHeader ? 'justify-end' : 'justify-between'} items-start gap-4`}>
        {!hideHeader && (
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
              <p className="text-slate-500 mt-1">View ticket and request statistics</p>
            </div>
            {companyName && (
              <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                <span className="font-semibold text-slate-700">{companyName}</span>
              </div>
            )}
          </div>
        </div>
        )}
        <div className={`flex bg-slate-100 p-1 rounded-lg ${hideHeader ? 'w-full sm:w-auto' : ''}`}>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none ${
              activeTab === 'tickets' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <List className="w-4 h-4" />
              Tickets
            </div>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none ${
              activeTab === 'requests' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <List className="w-4 h-4" />
              Requests
            </div>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none ${
              activeTab === 'analytics' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </div>
          </button>
        </div>
      </div>

      {/* Search, Filter & Stats Section */}
      <Card className="overflow-visible">
        <CardBody className="p-4 space-y-4">
          {/* Top Row: Search & Filter Toggle */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={activeTab === 'requests' ? "Search requests..." : "Search tickets..."}
              />
            </div>
            <Button 
              variant={showFilters ? "primary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(statusFilter !== 'ALL' || priorityFilter !== 'ALL' || timeFilter !== 'ALL' || creatorFilter !== 'ALL') && (
                <span className="flex h-2 w-2 rounded-full bg-blue-600" />
              )}
            </Button>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
              <CustomSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={activeTab === 'requests' ? [
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'REJECTED', label: 'Rejected' },
                ] : [
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'CLOSED', label: 'Closed' },
                  { value: 'COMPLETED', label: 'Completed' },
                ]}
              />

              <CustomSelect
                label="Time Period"
                value={timeFilter}
                onChange={setTimeFilter}
                options={[
                  { value: 'ALL', label: 'All Time' },
                  { value: 'YEAR', label: 'This Year' },
                  { value: 'MONTH', label: 'This Month' },
                  { value: 'WEEK', label: 'This Week' },
                  { value: 'CUSTOM', label: 'Custom Range' },
                ]}
              />

              {users && (
                <CustomSelect
                  label="Created By"
                  value={creatorFilter}
                  onChange={setCreatorFilter}
                  options={[
                    { value: 'ALL', label: 'All Users' },
                    ...users.map(u => ({ value: u.id, label: u.username }))
                  ]}
                />
              )}
            </div>
          )}

          {timeFilter === 'CUSTOM' && showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 py-2 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 py-2 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          )}
          
          {/* Stats Summary Row */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
             <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg">
                  <List className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Found</span>
                  <div className="text-2xl font-bold text-slate-900 leading-none mt-1">
                    {activeTab === 'requests' ? requestStats.total : stats.total}
                  </div>
                </div>
             </div>
             
             <div className="text-right">
                <div className="text-sm font-medium text-slate-900">
                  {statusFilter !== 'ALL' ? `Showing ${statusFilter.toLowerCase().replace('_', ' ')} items` : 'Showing all items'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {timeFilter === 'YEAR' ? 'This year' : timeFilter === 'MONTH' ? 'This month' : timeFilter === 'WEEK' ? 'This week' : 'All time'}
                </div>
             </div>
          </div>
        </CardBody>
      </Card>

      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => window.location.href = `/dashboard?ticketId=${ticket.id}&view=tickets`}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100">
              <p className="text-slate-600">No tickets found matching your filters</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <div 
                key={request.id}
                className="relative w-full bg-white border border-slate-200 rounded-2xl p-5 text-left transition-all duration-300 hover:shadow-md hover:border-blue-300 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <List className="w-6 h-6 text-slate-600" />
                  </div>
                  <div className="bg-slate-100 px-2 py-1 rounded-md">
                    <span className="text-xs font-bold text-slate-700">REQ</span>
                  </div>
                </div>
                
                <h3 className="text-slate-900 font-bold text-lg leading-tight mb-2 line-clamp-2">
                  {request.title}
                </h3>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2 font-medium">
                  {request.description}
                </p>
                
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(request.createdAt)}</span>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    request.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    request.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {request.status.replace('_', ' ')}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100">
              <p className="text-slate-600">No requests found matching your filters</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Ticket Analytics */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Ticket Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500 mb-1">Total Tickets</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500 mb-1">Closed Tickets</p>
                <h3 className="text-2xl font-bold text-green-600">{stats.closed}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500 mb-1">Open Tickets</p>
                <h3 className="text-2xl font-bold text-blue-600">{stats.open}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <AreaChart
                  data={stats.ticketsPerMonth}
                  data2={stats.closedPerMonth}
                  labels={stats.months}
                  title="Ticket Trends (This Year)"
                  subtitle="Track ticket creation and resolution over time"
                  legend1="Created"
                  legend2="Resolved"
                />
              </div>

              <PieChart
                title="Ticket Status Distribution"
                subtitle="Current status breakdown of all tickets"
                data={Object.values(stats.statusCounts)}
                labels={Object.keys(stats.statusCounts)}
              />

              <BarChart
                title="Ticket Priority Distribution"
                subtitle="Tickets categorized by urgency level"
                data={[stats.priorityCounts.P1, stats.priorityCounts.P2, stats.priorityCounts.P3]}
                labels={['P1 (High)', 'P2 (Medium)', 'P3 (Low)']}
                color="#6366F1"
              />
            </div>
          </div>

          {/* Request Analytics */}
          <div className="space-y-6 pt-8 border-t border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Request Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500 mb-1">Total Requests</p>
                <h3 className="text-2xl font-bold text-slate-900">{requestStats.total}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500 mb-1">Completed Requests</p>
                <h3 className="text-2xl font-bold text-green-600">{requestStats.completed}</h3>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500 mb-1">Pending Requests</p>
                <h3 className="text-2xl font-bold text-blue-600">{requestStats.pending}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <AreaChart
                  data={requestStats.requestsPerMonth}
                  data2={requestStats.completedPerMonth}
                  labels={requestStats.months}
                  title="Request Trends (This Year)"
                  subtitle="Track request creation and completion over time"
                  legend1="Created"
                  legend2="Completed"
                />
              </div>

              <PieChart
                title="Request Status Distribution"
                subtitle="Current status breakdown of all requests"
                data={Object.values(requestStats.statusCounts)}
                labels={Object.keys(requestStats.statusCounts)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
