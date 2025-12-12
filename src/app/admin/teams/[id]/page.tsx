'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Sidebar } from '@/app/components/Sidebar';
import { Button } from '@/app/components/Button';
import { ArrowLeft, Users, Crown, UserCircle, Shield, Briefcase, CheckCircle, Clock, Eye, Activity } from 'lucide-react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';

// Enhanced Card Component for Hierarchy with profile photos and stats
const HierarchyCard = ({ user, role, type, ticketCount }: any) => {
  const isRoot = type === 'root';
  const isAdmin = type === 'admin';
  
  return (
    <div className={`
      relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 bg-white hover:shadow-lg group cursor-pointer
      ${isRoot 
        ? 'border-blue-400 shadow-md hover:shadow-xl w-64 min-h-[140px]' 
        : isAdmin 
        ? 'border-purple-300 shadow-sm hover:shadow-lg w-56 min-h-[130px]'
        : 'border-slate-200 hover:border-slate-300 w-48 min-h-[120px]'
      }
    `}>
      {/* Connector Dot Top */}
      {!isRoot && (
        <div className="absolute -top-[21px] left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-400 rounded-full border-2 border-white shadow-sm"></div>
      )}
      
      {/* Connector Dot Bottom */}
      {(isRoot || isAdmin) && (
        <div className="absolute -bottom-[21px] left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-400 rounded-full border-2 border-white shadow-sm"></div>
      )}

      {/* Avatar */}
      <div className={`
        relative w-14 h-14 rounded-full flex items-center justify-center mb-3 text-white shadow-md font-bold text-lg
        ${isRoot 
          ? 'bg-linear-to-br from-blue-500 to-blue-600 ring-2 ring-blue-200' 
          : isAdmin 
          ? 'bg-linear-to-br from-purple-500 to-purple-600 ring-2 ring-purple-200' 
          : 'bg-linear-to-br from-slate-400 to-slate-500 ring-2 ring-slate-200'
        }
      `}>
        {user?.username?.charAt(0).toUpperCase() || 'T'}
        {isRoot && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
            <Crown className="w-3 h-3 text-yellow-700" />
          </div>
        )}
        {isAdmin && !isRoot && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-400 rounded-full border-2 border-white flex items-center justify-center">
            <Shield className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>
      
      {/* Name and Role */}
      <h3 className="font-bold text-slate-900 text-center truncate w-full px-2 text-base mb-1">
        {user?.username || user}
      </h3>
      <p className={`text-xs font-semibold uppercase tracking-wider ${
        isRoot ? 'text-blue-600' : isAdmin ? 'text-purple-600' : 'text-slate-500'
      }`}>
        {role}
      </p>
      
      {/* Stats Badge */}
      {typeof ticketCount === 'number' && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md">
            <Activity className="w-3 h-3 text-slate-600" />
            <span className="font-semibold text-slate-700">{ticketCount}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Activity Timeline Component
const ActivityTimeline = ({ activities }: { activities: any[] }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900">Recent Activity</h3>
        <Clock className="w-5 h-5 text-slate-400" />
      </div>
      
      <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto">
        {activities.length > 0 ? activities.map((activity, idx) => (
          <div key={idx} className="flex items-start gap-3 group">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              activity.type === 'ticket' ? 'bg-blue-100' :
              activity.type === 'member' ? 'bg-green-100' :
              'bg-purple-100'
            }`}>
              {activity.type === 'ticket' ? (
                <Activity className={`w-4 h-4 ${
                  activity.status === 'COMPLETED' ? 'text-green-600' : 'text-blue-600'
                }`} />
              ) : activity.type === 'member' ? (
                <Users className="w-4 h-4 text-green-600" />
              ) : (
                <Eye className="w-4 h-4 text-purple-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900 font-medium truncate">{activity.user}</p>
              <p className="text-xs text-slate-600">{activity.action}</p>
              <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(activity.timestamp)}</p>
            </div>
            {activity.status && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                activity.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                activity.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {activity.status}
              </span>
            )}
          </div>
        )) : (
          <div className="text-center py-8 text-slate-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    
    if (resolvedParams.id) {
        fetchTeam(resolvedParams.id);
        fetchTeamTickets(resolvedParams.id);
    }
  }, [resolvedParams.id]);

  const fetchTeam = async (id: string) => {
    try {
      const res = await apiClient.getTeam(id);
      setTeam(res.team);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamTickets = async (id: string) => {
    try {
      const res = await apiClient.getTickets({ teamId: id });
      setTickets(res.tickets || []);
    } catch (error) {
      console.error('Error fetching team tickets:', error);
    }
  };

  const admins = team?.users?.map((ut: any) => ut.user).filter((u: any) => u.role === 'ADMIN') || [];
  const users = team?.users?.map((ut: any) => ut.user).filter((u: any) => u.role === 'USER') || [];

  // Get user ticket counts
  const getUserTicketCount = (userId: string) => {
    return tickets.filter(t => t.userId === userId).length;
  };

  // Generate activity timeline
  const generateActivities = () => {
    const activities: any[] = [];
    
    // Add recent tickets
    const recentTickets = tickets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    recentTickets.forEach(ticket => {
      activities.push({
        type: 'ticket',
        user: ticket.user?.username || 'Unknown',
        action: `${ticket.status === 'COMPLETED' ? 'Completed' : 'Created'} ticket: ${ticket.issue.substring(0, 40)}...`,
        timestamp: ticket.updatedAt || ticket.createdAt,
        status: ticket.status
      });
    });

    // Add team member joins
    team?.users?.slice(0, 3).forEach((ut: any) => {
      activities.push({
        type: 'member',
        user: ut.user.username,
        action: 'Joined the team',
        timestamp: ut.createdAt || new Date().toISOString()
      });
    });

    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 10);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar userRole="ADMIN" username={user?.username} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8">
          {/* Header & Stats */}
          <div className="mb-8">
            <Link href="/admin/teams" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Teams
            </Link>
            
            {team && (
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pb-6">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">{team.name}</h1>
                  <p className="text-slate-600">Team Hierarchy & Structure</p>
                </div>
                
                <div className="flex items-center gap-6 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{team.users?.length || 0}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Members</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{admins.length}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leaders</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{tickets.length}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tickets</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {loading ? (
             <div className="flex justify-center items-center h-64">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
             </div>
          ) : team ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Hierarchy Section */}
              <div className="xl:col-span-8">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    Hierarchy
                  </h2>
                  
                  <div className="flex flex-col items-center pb-12">
                    {/* Level 1: Team Root */}
                    <div className="relative mb-16">
                      <HierarchyCard 
                        user={team.name}
                        role="Team"
                        type="root"
                        ticketCount={tickets.length}
                      />
                      {/* Vertical Line Down */}
                      {(admins.length > 0 || users.length > 0) && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-full h-16 w-0.5 bg-blue-300"></div>
                      )}
                    </div>

                    {/* Level 2: Admins */}
                    {admins.length > 0 && (
                      <div className="relative mb-16 w-full">
                        {/* Horizontal Connector Bar */}
                        {admins.length > 1 && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-[calc(100%-8rem)] max-w-4xl h-8 border-t-2 border-l-2 border-r-2 border-blue-300 rounded-t-2xl"></div>
                        )}
                        
                        <div className="flex flex-wrap justify-center gap-8 relative z-10">
                          {admins.map((admin: any) => (
                            <div key={admin.id} className="flex flex-col items-center">
                              {/* Vertical Line Up to Connector */}
                              {admins.length > 1 && (
                                <div className="h-8 w-0.5 bg-blue-300 -mt-8 mb-0"></div>
                              )}
                              
                              <HierarchyCard 
                                user={admin}
                                role="Team Lead"
                                type="admin"
                                ticketCount={getUserTicketCount(admin.id)}
                              />
                              
                              {/* Vertical Line Down to Users (Only if users exist) */}
                              {users.length > 0 && (
                                <div className="h-16 w-0.5 bg-blue-300"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Level 3: Users */}
                    {users.length > 0 && (
                      <div className="relative w-full">
                        {/* Horizontal Connector Bar for Users */}
                        {users.length > 1 && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-[calc(100%-6rem)] max-w-6xl h-8 border-t-2 border-l-2 border-r-2 border-blue-200 rounded-t-2xl"></div>
                        )}

                        <div className="flex flex-wrap justify-center gap-6 relative z-10 px-4">
                          {users.map((user: any) => (
                            <div key={user.id} className="flex flex-col items-center">
                              {users.length > 1 && (
                                <div className="h-8 w-0.5 bg-blue-200 -mt-8 mb-0"></div>
                              )}
                              <HierarchyCard 
                                user={user}
                                role="Team Member"
                                type="user"
                                ticketCount={getUserTicketCount(user.id)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Empty State if no members */}
                    {admins.length === 0 && users.length === 0 && (
                      <div className="text-center text-slate-500 bg-slate-50 p-12 rounded-2xl border-2 border-dashed border-slate-300">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="font-medium">No members in this team yet</p>
                        <p className="text-sm mt-1">Add team members to see the hierarchy</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Timeline Sidebar */}
              <div className="xl:col-span-4">
                <ActivityTimeline activities={generateActivities()} />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <h3 className="text-lg font-medium text-slate-900">Team not found</h3>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
