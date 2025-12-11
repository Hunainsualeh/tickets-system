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

interface AnalyticsSectionProps {
  tickets: Ticket[];
  users?: User[]; // For admin to filter by creator
  currentUser: User;
}

const ticketBg: Record<string, string> = {
  orange: 'bg-[#FFC107]',
  green: 'bg-[#10B981]',
  blue: 'bg-[#3B82F6]',
  red: 'bg-[#EF4444]',
  purple: 'bg-[#A855F7]',
  gray: 'bg-[#64748B]',
  indigo: 'bg-[#6366F1]',
};

const ticketText: Record<string, string> = {
  orange: 'text-slate-900',
  green: 'text-white',
  blue: 'text-white',
  red: 'text-white',
  purple: 'text-white',
  gray: 'text-white',
  indigo: 'text-white',
};

const ticketSubText: Record<string, string> = {
  orange: 'text-slate-800/80',
  green: 'text-white/80',
  blue: 'text-white/80',
  red: 'text-white/80',
  purple: 'text-white/80',
  gray: 'text-white/80',
  indigo: 'text-white/80',
};

const ticketIconBg: Record<string, string> = {
  orange: 'bg-black/10',
  green: 'bg-white/20',
  blue: 'bg-white/20',
  red: 'bg-white/20',
  purple: 'bg-white/20',
  gray: 'bg-white/20',
  indigo: 'bg-white/20',
};

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ tickets, users, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'analytics'>('analytics');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL'); // ALL, YEAR, MONTH, WEEK, CUSTOM
  const [creatorFilter, setCreatorFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter Logic
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

  // Analytics Logic
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

    // Timeline Data (Last 12 months or days depending on filter)
    // For simplicity, let's do tickets created per month for the current year
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

  const getTicketTheme = (status: string) => {
    switch (status) {
      case 'PENDING': return 'orange';
      case 'IN_PROGRESS': return 'blue';
      case 'CLOSED': 
      case 'COMPLETED':
      case 'PAID':
      case 'INVOICE': return 'green';
      case 'ESCALATED': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-slate-500">View ticket statistics and detailed reports</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'tickets' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Ticket View
            </div>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'analytics' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytic View
            </div>
          </button>
        </div>
      </div>

      {/* Filters Section (Common for both views) */}
      <Card>
        <CardBody className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
            
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'CLOSED', label: 'Closed' },
                { value: 'COMPLETED', label: 'Completed' },
              ]}
            />

            <CustomSelect
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
          </div>

          {timeFilter === 'CUSTOM' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 animate-in fade-in slide-in-from-top-2">
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

          {users && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <CustomSelect
                  value={creatorFilter}
                  onChange={setCreatorFilter}
                  options={[
                    { value: 'ALL', label: 'All Users' },
                    ...users.map(u => ({ value: u.id, label: u.username }))
                  ]}
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Total Count Display */}
      <div className="bg-linear-to-br from-slate-50 to-blue-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <List className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Tickets Found</p>
            <h3 className="text-3xl font-bold text-slate-900">{stats.total}</h3>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-600">
            {statusFilter !== 'ALL' ? `Showing ${statusFilter.toLowerCase().replace('_', ' ')} tickets` : 'Showing all tickets'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {timeFilter === 'YEAR' ? 'This year' : timeFilter === 'MONTH' ? 'This month' : timeFilter === 'WEEK' ? 'This week' : 'All time'}
          </p>
        </div>
      </div>

      {activeTab === 'tickets' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => {
              const theme = getTicketTheme(ticket.status);
              const bgColor = ticketBg[theme];
              const textColor = ticketText[theme];
              const subTextColor = ticketSubText[theme];
              const iconBg = ticketIconBg[theme];

              return (
                <div 
                  key={ticket.id}
                  className={`relative w-full ${bgColor} rounded-2xl p-5 text-left transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] cursor-pointer group`}
                >
                  {/* Ticket Stub Notches */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#F8FAFC] rounded-full" />
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#F8FAFC] rounded-full" />
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${iconBg} p-2 rounded-xl backdrop-blur-sm`}>
                      <Building2 className={`w-6 h-6 ${textColor}`} />
                    </div>
                    <div className="bg-white/90 px-2 py-1 rounded-md shadow-sm">
                      <span className="text-xs font-bold text-slate-900">#{ticket.incNumber || ticket.id.substring(0, 6)}</span>
                    </div>
                  </div>
                  
                  <h3 className={`${textColor} font-bold text-lg leading-tight mb-2 line-clamp-2`}>
                    {ticket.branch?.name}
                  </h3>
                  <p className={`${subTextColor} text-sm mb-4 line-clamp-2 font-medium`}>
                    {ticket.issue}
                  </p>
                  
                  <div className={`flex items-center justify-between ${subTextColor} text-xs font-medium border-t border-black/5 pt-3`}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(ticket.createdAt)}</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full ${iconBg} ${textColor}`}>
                      {ticket.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100">
              <p className="text-slate-600">No tickets found matching your filters</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatRow
              label="Total Tickets"
              count={stats.total}
              icon={List}
              color="orange"
              variant="ticket"
              asTicket={true}
            />
            <StatRow
              label="Closed Tickets"
              count={stats.closed}
              icon={CheckCircle}
              color="green"
              variant="ticket"
              asTicket={true}
            />
            <StatRow
              label="Open Tickets"
              count={stats.open}
              icon={Clock}
              color="blue"
              variant="ticket"
              asTicket={true}
            />
          </div>

          {/* Charts */}
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
              title="Status Distribution"
              subtitle="Current status breakdown of all tickets"
              data={Object.values(stats.statusCounts)}
              labels={Object.keys(stats.statusCounts)}
            />

            <BarChart
              title="Priority Distribution"
              subtitle="Tickets categorized by urgency level"
              data={[stats.priorityCounts.P1, stats.priorityCounts.P2, stats.priorityCounts.P3]}
              labels={['P1 (High)', 'P2 (Medium)', 'P3 (Low)']}
              color="#6366F1"
            />
          </div>
        </div>
      )}
    </div>
  );
};
