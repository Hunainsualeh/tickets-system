'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Sidebar } from '@/app/components/Sidebar';
import { Button } from '@/app/components/Button';
import { ArrowLeft, Users, Crown, UserCircle } from 'lucide-react';
import Link from 'next/link';

// Tree Node Component
const TreeNode = ({ label, role, avatar, isRoot = false, isAdmin = false }: any) => {
  return (
    <div className={`
      relative flex flex-col items-center p-5 bg-white rounded-2xl border shadow-sm transition-all hover:shadow-lg hover:scale-105
      ${isRoot 
        ? 'border-blue-300 bg-blue-50/30 shadow-blue-100 min-w-[220px]' 
        : isAdmin 
        ? 'border-purple-200 bg-purple-50/30 min-w-[180px]'
        : 'border-slate-200 min-w-[180px]'
      }
    `}>
      {isAdmin && !isRoot && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shadow-md">
          <Crown className="w-4 h-4 text-white" />
        </div>
      )}
      <div className="mb-3">
        {avatar}
      </div>
      <span className={`font-bold text-center mb-1 ${isRoot ? 'text-lg text-blue-900' : 'text-sm text-slate-900'}`}>
        {label}
      </span>
      {role && (
        <span className={`
          text-xs font-medium mt-1 px-3 py-1 rounded-full
          ${isRoot 
            ? 'bg-blue-100 text-blue-700' 
            : isAdmin 
            ? 'bg-purple-100 text-purple-700'
            : 'bg-green-100 text-green-700'
          }
        `}>
          {role}
        </span>
      )}
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

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar userRole="ADMIN" username={user?.username} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <Link href="/admin/teams" className="inline-flex items-center text-sm text-slate-600 hover:text-blue-600 mb-6 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Teams
            </Link>
            
            {team && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 mb-1">{team.name}</h1>
                      <p className="text-slate-600">Team Hierarchy & Structure</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 bg-slate-50 px-6 py-4 rounded-xl">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900">{team.users?.length || 0}</p>
                      <p className="text-xs text-slate-600 uppercase tracking-wide">Total Members</p>
                    </div>
                    <div className="w-px h-10 bg-slate-200"></div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {team.users?.filter((u: any) => u.role === 'ADMIN').length || 0}
                      </p>
                      <p className="text-xs text-slate-600 uppercase tracking-wide">Admins</p>
                    </div>
                    <div className="w-px h-10 bg-slate-200"></div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {team.users?.filter((u: any) => u.role === 'USER').length || 0}
                      </p>
                      <p className="text-xs text-slate-600 uppercase tracking-wide">Users</p>
                    </div>
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
            <div className="bg-white rounded-2xl border border-slate-200 p-12">
              <div className="flex justify-center overflow-x-auto py-12 min-h-[600px]">
                <div className="flex flex-col items-center">
                  {/* Root Node (Team) */}
                  <div className="z-10">
                    <TreeNode 
                        label={team.name} 
                        isRoot={true}
                        role="Project Manager"
                        avatar={
                            <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg">
                                <Users className="w-10 h-10" />
                            </div>
                        }
                    />
                  </div>
                  
                  {/* Children (Users) */}
                  {team.users && team.users.length > 0 && (
                    <>
                      <div className="w-0.5 h-16 bg-slate-300"></div>
                      <div className="flex gap-4">
                         {team.users.map((u: any, index: number) => (
                            <div key={u.id} className="flex flex-col items-center relative px-8">
                               {/* Top horizontal line */}
                               <div className={`absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300 ${index === 0 ? 'invisible' : ''}`}></div>
                               <div className={`absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300 ${index === team.users.length - 1 ? 'invisible' : ''}`}></div>
                               
                               {/* Vertical line to child */}
                               <div className="w-0.5 h-16 bg-slate-300"></div>
                               
                               {/* Child Node */}
                               <TreeNode 
                                    label={u.username}
                                    role={u.role === 'ADMIN' ? 'Senior Developer' : 'Developer'}
                                    isAdmin={u.role === 'ADMIN'}
                                    avatar={
                                        <div className={`
                                          w-16 h-16 rounded-full flex items-center justify-center font-bold shadow-md text-xl
                                          ${u.role === 'ADMIN' 
                                            ? 'bg-purple-500 text-white border-4 border-purple-200' 
                                            : 'bg-green-500 text-white border-4 border-green-200'
                                          }
                                        `}>
                                            {u.username.charAt(0).toUpperCase()}
                                        </div>
                                    }
                                />
                            </div>
                         ))}
                      </div>
                    </>
                  )}
                  
                  {/* Legend */}
                  <div className="mt-16 flex items-center gap-8 bg-slate-50 px-8 py-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium text-slate-700">Team Lead</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                      <span className="text-sm font-medium text-slate-700">Admin</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-slate-700">User</span>
                    </div>
                  </div>
               </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Team not found</h3>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
