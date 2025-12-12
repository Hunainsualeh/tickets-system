'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Sidebar } from '@/app/components/Sidebar';
import { Button } from '@/app/components/Button';
import { ArrowLeft, Users, Crown, UserCircle, Shield, Briefcase } from 'lucide-react';
import Link from 'next/link';

// Card Component for Hierarchy Nodes
const HierarchyCard = ({ title, role, type, count, icon: Icon }: any) => {
  const isRoot = type === 'root';
  const isAdmin = type === 'admin';
  
  return (
    <div className={`
      relative flex flex-col items-center p-3 rounded-xl border transition-all duration-300 bg-white
      ${isRoot 
        ? 'border-blue-200 shadow-sm w-56 z-20' 
        : isAdmin 
        ? 'border-purple-200 shadow-sm w-48 z-10'
        : 'border-slate-100 hover:border-blue-200 hover:shadow-md w-40'
      }
    `}>
      {/* Connector Dot Top */}
      {!isRoot && (
        <div className="absolute -top-[17px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-300 rounded-full z-10"></div>
      )}
      
      {/* Connector Dot Bottom */}
      {(isRoot || isAdmin) && (
        <div className="absolute -bottom-[17px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-300 rounded-full z-10"></div>
      )}

      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center mb-2 text-white shadow-sm
        ${isRoot ? 'bg-blue-600' : isAdmin ? 'bg-purple-600' : 'bg-slate-400'}
      `}>
        {Icon ? <Icon className="w-5 h-5" /> : <UserCircle className="w-5 h-5" />}
      </div>
      
      <h3 className="font-semibold text-slate-900 text-center truncate w-full px-2 text-sm">{title}</h3>
      <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
        isRoot ? 'text-blue-600' : isAdmin ? 'text-purple-600' : 'text-slate-500'
      }`}>
        {role}
      </p>
    </div>
  );
};

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
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

  const admins = team?.users?.map((ut: any) => ut.user).filter((u: any) => u.role === 'ADMIN') || [];
  const users = team?.users?.map((ut: any) => ut.user).filter((u: any) => u.role === 'USER') || [];

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar userRole="ADMIN" username={user?.username} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8">
          {/* Header & Stats */}
          <div className="mb-12">
            <Link href="/admin/teams" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Teams
            </Link>
            
            {team && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-1">{team.name}</h1>
                  <p className="text-slate-500">Team Hierarchy & Structure</p>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{team.users?.length || 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Members</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{admins.length}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admins</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{users.length}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Users</p>
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
            <div className="flex flex-col items-center pb-20 pt-8">
              {/* Level 1: Team Root */}
              <div className="relative mb-12">
                <HierarchyCard 
                  title={team.name}
                  role="Project Manager"
                  type="root"
                  icon={Briefcase}
                />
                {/* Vertical Line Down */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full h-12 w-px bg-slate-300"></div>
              </div>

              {/* Level 2: Admins */}
              {admins.length > 0 && (
                <div className="relative mb-12 w-full">
                  {/* Horizontal Connector Bar */}
                  {admins.length > 1 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[calc(100%-10rem)] max-w-3xl h-6 border-t border-l border-r border-slate-300 rounded-t-xl"></div>
                  )}
                  
                  <div className="flex flex-wrap justify-center gap-6 relative z-10">
                    {admins.map((admin: any) => (
                      <div key={admin.id} className="flex flex-col items-center">
                        {/* Vertical Line Up to Connector */}
                        <div className="h-6 w-px bg-slate-300 -mt-6 mb-0"></div>
                        
                        <HierarchyCard 
                          title={admin.username}
                          role="Team Lead"
                          type="admin"
                          icon={Crown}
                        />
                        
                        {/* Vertical Line Down to Users (Only if users exist) */}
                        {users.length > 0 && (
                          <div className="h-12 w-px bg-slate-300"></div>
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
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[calc(100%-8rem)] max-w-5xl h-6 border-t border-l border-r border-slate-300 rounded-t-xl"></div>

                  <div className="flex flex-wrap justify-center gap-4 relative z-10 px-4">
                    {users.map((user: any) => (
                      <div key={user.id} className="flex flex-col items-center">
                        <div className="h-6 w-px bg-slate-300 -mt-6 mb-0"></div>
                        <HierarchyCard 
                          title={user.username}
                          role="User"
                          type="user"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Empty State if no members */}
              {admins.length === 0 && users.length === 0 && (
                <div className="text-center text-slate-500 bg-white p-8 rounded-xl border border-dashed border-slate-300">
                  <p>No members in this team yet.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-slate-900">Team not found</h3>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
