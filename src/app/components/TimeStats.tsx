
import React, { useEffect, useState } from 'react';
import { StackedComboChart } from './StackedComboChart';
import { Card, CardBody } from './Card';
import { Clock, User, Calendar, TrendingUp, Timer, PlayCircle, Users, X, Circle } from 'lucide-react';
import { Select } from './Select';

interface TimeStatsProps {
  currentUser?: any;
}

interface ActiveUser {
  id: string;
  user: {
    id: string;
    username: string;
    role: string;
    email?: string;
  };
  startTime: string;
  elapsedMinutes: number;
}

// Helper function to format hours/minutes nicely
const formatDuration = (hours: number): string => {
  if (hours === 0) return '0m';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// Format detailed time
const formatDetailedTime = (hours: number): string => {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h === 0 && m === 0) return `${s}s`;
  if (h === 0) return `${m}m ${s}s`;
  return `${h}h ${m}m ${s}s`;
};

export function TimeStats({ currentUser }: TimeStatsProps) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [activeUsersData, setActiveUsersData] = useState<{
    activeUsers: ActiveUser[];
    activeCount: number;
    totalTrackableUsers: number;
  } | null>(null);
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);

  useEffect(() => {
    fetchStats();
    if (currentUser?.role === 'ADMIN') {
      fetchActiveUsers();
      // Refresh active users every 30 seconds
      const interval = setInterval(fetchActiveUsers, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.role]);

  const fetchActiveUsers = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      
      const res = await fetch('/api/admin/active-users', { headers });
      if (res.ok) {
        const data = await res.json();
        setActiveUsersData(data);
      }
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      
      // Use different endpoint based on role
      const endpoint = currentUser?.role === 'ADMIN' ? '/api/admin/work-stats' : '/api/work-logs/my-stats';
      const res = await fetch(endpoint, { headers });
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStats = roleFilter === 'ALL' 
    ? stats 
    : stats.filter(s => s.user.role === roleFilter);

  // Prepare chart data - Aggregate duration by day and priority
  const getChartData = () => {
    const labels: string[] = [];
    const dateToIdx = new Map<string, number>();
    
    // Initialize last 7 days
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i)); // -6, -5, ... -0
        const dateStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
        dateToIdx.set(dateStr, i);
    }

    const p1 = new Array(7).fill(0);
    const p2 = new Array(7).fill(0);
    const p3 = new Array(7).fill(0);
    const dailyTicketIds = new Array(7).fill(0).map(() => new Set());

    filteredStats.forEach(stat => {
        stat.logs.forEach((log: any) => {
            // Use startTime instead of date
            const logDate = log.startTime || log.date;
            if (!logDate) return;
            
            const dateStr = new Date(logDate).toISOString().split('T')[0];
            const idx = dateToIdx.get(dateStr);
            if (idx !== undefined) {
                const hours = (log.duration || 0) / 60;
                const priority = log.ticket?.priority || 'P3';
                
                if (priority === 'P1') p1[idx] += hours;
                else if (priority === 'P2') p2[idx] += hours;
                else p3[idx] += hours;

                if (log.ticket?.id) {
                     dailyTicketIds[idx].add(log.ticket.id);
                }
            }
        });
    });

    const round = (val: number) => Math.round(val * 10) / 10;

    return {
        labels,
        bars: [
            { label: 'Critical (P1)', data: p1.map(round), color: '#EF4444' }, // red-500
            { label: 'High (P2)', data: p2.map(round), color: '#F59E0B' }, // amber-500
            { label: 'Normal (P3)', data: p3.map(round), color: '#3B82F6' }, // blue-500
        ],
        line: {
            label: 'Active Tickets',
            data: dailyTicketIds.map(s => s.size),
            color: '#10B981' // emerald-500
        }
    };
  };

  const chartData = getChartData();
  const totalHours = filteredStats.reduce((acc, s) => acc + s.totalHours, 0);
  const totalSessions = filteredStats.reduce((acc, s) => acc + (s.logs?.length || 0), 0);
  const activeUsers = filteredStats.filter(s => s.totalHours > 0).length;
  const totalUsers = filteredStats.length;

  // Get all logs for session history
  const allLogs = filteredStats.flatMap(stat => 
    (stat.logs || []).map((log: any) => ({
      ...log,
      startTime: log.startTime || log.date, // Handle both formats
      userName: stat.user?.username,
      userRole: stat.user?.role
    }))
  ).sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900">Time Tracking</h2>
           <p className="text-slate-500 text-sm mt-1">Track your work hours and productivity</p>
        </div>
        <div className="flex items-center gap-3">
           {currentUser?.role === 'ADMIN' && (
               <Select
                 value={roleFilter}
                 onChange={(e) => setRoleFilter(e.target.value)}
                 options={[
                   { value: 'ALL', label: 'All Roles' },
                   { value: 'TECHNICAL', label: 'Field Specialists' },
                   { value: 'DEVELOPER', label: 'Developers' },
                   { value: 'ADMIN', label: 'Admins' },
                 ]}
                 label=""
               />
           )}
        </div>
      </div>

      {/* Summary Cards - Improved Design */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${currentUser?.role === 'ADMIN' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        {/* Total Hours Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-2xl shadow-lg shadow-blue-500/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">
                {currentUser?.role === 'ADMIN' ? 'Total Hours' : 'My Total Hours'}
              </p>
              <h3 className="text-3xl font-bold text-white">{formatDuration(totalHours)}</h3>
              <p className="text-blue-200 text-xs mt-2">{formatDetailedTime(totalHours)} exact</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Active Users Card - Admin Only */}
        {currentUser?.role === 'ADMIN' && (
          <div 
            onClick={() => setShowActiveUsersModal(true)}
            className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 rounded-2xl shadow-lg shadow-emerald-500/20 cursor-pointer hover:from-emerald-500 hover:to-emerald-600 transition-all duration-200 hover:scale-[1.02]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">Active Now</p>
                <h3 className="text-3xl font-bold text-white">
                  {activeUsersData?.activeCount ?? 0}
                </h3>
                <p className="text-emerald-200 text-xs mt-2">
                  {activeUsersData?.totalTrackableUsers ?? 0} trackable users
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl relative">
                <Users className="w-6 h-6 text-white" />
                {(activeUsersData?.activeCount ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sessions Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Sessions (30 days)</p>
              <h3 className="text-3xl font-bold text-slate-900">{totalSessions}</h3>
              <p className="text-slate-400 text-xs mt-2">Clock in/out records</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <PlayCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Average Per Day */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">Daily Average</p>
              <h3 className="text-3xl font-bold text-slate-900">{formatDuration(totalHours / 7)}</h3>
              <p className="text-slate-400 text-xs mt-2">Based on last 7 days</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">This Week</p>
              <h3 className="text-3xl font-bold text-slate-900">{formatDuration(totalHours)}</h3>
              <p className="text-slate-400 text-xs mt-2">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - Today</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-xl">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Graph - Admin Only */}
      {currentUser?.role === 'ADMIN' && (
      <Card>
          <CardBody>
             <StackedComboChart
                title="Work Hours & Ticket Volume"
                subtitle="Daily hours by priority vs active ticket count"
                labels={chartData.labels}
                bars={chartData.bars}
                line={chartData.line}
             />
          </CardBody>
      </Card>
      )}

      {/* User Breakdown - Admin Only */}
      {currentUser?.role === 'ADMIN' && filteredStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">User Breakdown</h3>
                <p className="text-sm text-slate-500">Hours tracked per team member</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Users className="w-4 h-4" />
                {totalUsers} users
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-slate-100">
            {filteredStats
              .sort((a, b) => b.totalHours - a.totalHours)
              .map((stat: any) => (
              <div key={stat.user.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* User Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      stat.user.role === 'ADMIN' ? 'bg-blue-600' :
                      stat.user.role === 'DEVELOPER' ? 'bg-amber-600' :
                      stat.user.role === 'TECHNICAL' ? 'bg-cyan-600' :
                      'bg-slate-600'
                    }`}>
                      {stat.user.username.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* User Info */}
                    <div>
                      <div className="font-semibold text-slate-900">{stat.user.username}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          stat.user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                          stat.user.role === 'DEVELOPER' ? 'bg-amber-100 text-amber-700' :
                          stat.user.role === 'TECHNICAL' ? 'bg-cyan-100 text-cyan-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {stat.user.role === 'TECHNICAL' ? 'Field Specialist' : stat.user.role}
                        </span>
                        <span className="text-xs text-slate-400">{stat.logs?.length || 0} sessions</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Hours */}
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-900">{formatDuration(stat.totalHours)}</div>
                    <div className="text-xs text-slate-400">{formatDetailedTime(stat.totalHours)}</div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        stat.user.role === 'ADMIN' ? 'bg-blue-500' :
                        stat.user.role === 'DEVELOPER' ? 'bg-amber-500' :
                        stat.user.role === 'TECHNICAL' ? 'bg-cyan-500' :
                        'bg-slate-500'
                      }`}
                      style={{ width: `${Math.min((stat.totalHours / Math.max(totalHours, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session History - Improved */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {currentUser?.role === 'ADMIN' ? 'All Sessions' : 'My Session History'}
              </h3>
              <p className="text-sm text-slate-500">Recent work sessions</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Timer className="w-4 h-4" />
              {totalSessions} sessions
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {allLogs.length > 0 ? (
            allLogs.slice(0, 10).map((log: any, index: number) => {
              const startTime = new Date(log.startTime);
              const endTime = log.endTime ? new Date(log.endTime) : null;
              const duration = log.duration || 0; // in minutes
              
              return (
                <div key={log.id || index} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Date Badge */}
                      <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-100 rounded-xl">
                        <span className="text-xs font-medium text-slate-500 uppercase">
                          {startTime.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-slate-900">
                          {startTime.getDate()}
                        </span>
                      </div>
                      
                      {/* Session Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="font-semibold text-slate-900">
                            {endTime 
                              ? endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                              : <span className="text-emerald-600">In Progress</span>
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {currentUser?.role === 'ADMIN' && log.userName && (
                            <span className="text-sm text-slate-600">{log.userName}</span>
                          )}
                          {log.ticket?.incNumber && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                              {log.ticket.incNumber}
                            </span>
                          )}
                          {!log.ticket && (
                            <span className="text-xs text-slate-400">General work session</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Duration */}
                    <div className="text-right">
                      <div className={`text-lg font-bold ${endTime ? 'text-slate-900' : 'text-emerald-600'}`}>
                        {formatDuration(duration / 60)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDetailedTime(duration / 60)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-6 py-12 text-center">
              <Timer className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No sessions recorded yet</p>
              <p className="text-sm text-slate-400 mt-1">Start tracking your work time by clocking in</p>
            </div>
          )}
        </div>
        
        {allLogs.length > 10 && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
            <span className="text-sm text-slate-500">Showing 10 of {allLogs.length} sessions</span>
          </div>
        )}
      </div>

      {/* Active Users Modal */}
      {showActiveUsersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-emerald-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Active Users</h3>
                    <p className="text-emerald-100 text-sm">Currently clocked in</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowActiveUsersModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[60vh]">
              {activeUsersData?.activeUsers && activeUsersData.activeUsers.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {activeUsersData.activeUsers.map((activeUser) => {
                    const hours = Math.floor(activeUser.elapsedMinutes / 60);
                    const minutes = activeUser.elapsedMinutes % 60;
                    const elapsedStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                    
                    return (
                      <div key={activeUser.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* User Avatar with pulse */}
                            <div className="relative">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                                activeUser.user.role === 'DEVELOPER' ? 'bg-amber-600' :
                                activeUser.user.role === 'TECHNICAL' ? 'bg-cyan-600' :
                                'bg-slate-600'
                              }`}>
                                {activeUser.user.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                <Circle className="w-2 h-2 text-white fill-current" />
                              </span>
                            </div>
                            
                            {/* User Info */}
                            <div>
                              <div className="font-semibold text-slate-900">{activeUser.user.username}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  activeUser.user.role === 'DEVELOPER' ? 'bg-amber-100 text-amber-700' :
                                  activeUser.user.role === 'TECHNICAL' ? 'bg-cyan-100 text-cyan-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {activeUser.user.role === 'TECHNICAL' ? 'Field Specialist' : activeUser.user.role}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Time Info */}
                          <div className="text-right">
                            <div className="text-lg font-bold text-emerald-600">{elapsedStr}</div>
                            <div className="text-xs text-slate-400">
                              Started {new Date(activeUser.startTime).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium">No Active Users</p>
                  <p className="text-sm text-slate-400 mt-1">No one is currently clocked in</p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {activeUsersData?.activeCount ?? 0} of {activeUsersData?.totalTrackableUsers ?? 0} users active
                </span>
                <button
                  onClick={() => {
                    fetchActiveUsers();
                  }}
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
