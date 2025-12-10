'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Sidebar } from '@/app/components/Sidebar';
import { Button } from '@/app/components/Button';
import { Modal } from '@/app/components/Modal';
import { Input } from '@/app/components/Input';
import { Plus, Users, Eye, List } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/app/components/StatCard';

function TeamsPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '' });
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await apiClient.getTeams();
      const fetchedTeams = res.teams || [];
      setTeams(fetchedTeams);
      // Set the first team as active tab
      if (fetchedTeams.length > 0 && !activeTab) {
        setActiveTab(fetchedTeams[0].id);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamForm.name.trim()) {
      alert('Please enter a team name');
      return;
    }

    try {
      await apiClient.createTeam({ name: teamForm.name });
      setTeamForm({ name: '' });
      setShowTeamModal(false);
      fetchTeams();
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Failed to create team');
    }
  };

  const activeTeam = teams.find(t => t.id === activeTab);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar userRole="ADMIN" username={user?.username} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Teams</h1>
                <p className="text-slate-600">Manage your teams, view hierarchy, and team members</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => router.push('/admin/teams/list')}
                  className="flex items-center gap-2"
                >
                  <List className="w-4 h-4" />
                  View All
                </Button>
                <Button onClick={() => setShowTeamModal(true)} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Team
                </Button>
              </div>
            </div>

          </div>

          {/* Team Statistics Card */}
          {!loading && teams.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Teams"
                  count={teams.length}
                  icon={Users}
                  variant="purple"
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No teams found</h3>
              <p className="text-slate-500 mb-4">Get started by creating a new team.</p>
              <Button onClick={() => setShowTeamModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="bg-white rounded-t-2xl border border-slate-200 border-b-0">
                <div className="flex overflow-x-auto">
                  {teams.map((team, index) => (
                    <button
                      key={team.id}
                      onClick={() => setActiveTab(team.id)}
                      className={`
                        relative px-6 py-4 font-medium text-sm whitespace-nowrap transition-all
                        ${activeTab === team.id 
                          ? 'text-blue-600 bg-blue-50/50' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }
                        ${index === 0 ? 'rounded-tl-2xl' : ''}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{team.name}</span>
                        <span className={`
                          ml-1 px-2 py-0.5 text-xs rounded-full
                          ${activeTab === team.id 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-slate-100 text-slate-600'
                          }
                        `}>
                          {team._count?.users || team.users?.length || 0}
                        </span>
                      </div>
                      {activeTab === team.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div className="bg-white rounded-b-2xl border border-slate-200 p-8">
                {activeTeam ? (
                  <>
                    {/* Before we start... section */}
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-slate-900 mb-4">Before we start...</h2>
                      <p className="text-slate-600 mb-6">
                        Confirm you have the correct team members on your team to complete registration.
                      </p>
                    </div>

                    {/* People Section */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Users className="w-5 h-5 text-slate-600" />
                          People
                        </h3>
                        <Link href={`/admin/teams/${activeTeam.id}`}>
                          <Button variant="ghost" size="sm" className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            View Hierarchy
                          </Button>
                        </Link>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {activeTeam.users?.map((member: any) => (
                          <div key={member.id} className="relative bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
                            <div className="flex flex-col items-center text-center">
                              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold mb-3 shadow-md">
                                {member.username.charAt(0).toUpperCase()}
                              </div>
                              <h4 className="font-bold text-slate-900 mb-1">{member.username}</h4>
                              <span className={`
                                text-xs px-2 py-1 rounded-full font-medium
                                ${member.role === 'ADMIN' 
                                  ? 'bg-purple-100 text-purple-700' 
                                  : 'bg-green-100 text-green-700'
                                }
                              `}>
                                {member.role === 'ADMIN' ? '✓ Authorized' : 'User'}
                              </span>
                            </div>
                            {member.role === 'ADMIN' && (
                              <div className="absolute top-2 right-2">
                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Add Team Member Card */}
                        <div 
                          onClick={() => router.push('/admin?tab=users')}
                          className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                        >
                          <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors mb-3 mx-auto">
                              <Plus className="w-8 h-8" />
                            </div>
                            <p className="text-sm font-medium text-slate-600 group-hover:text-blue-600">Add Member</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Team Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 p-4 bg-slate-50 rounded-xl">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">{activeTeam.users?.length || 0}</p>
                        <p className="text-sm text-slate-600">Total Members</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">
                          {activeTeam.users?.filter((u: any) => u.role === 'ADMIN').length || 0}
                        </p>
                        <p className="text-sm text-slate-600">Admins</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {activeTeam.users?.filter((u: any) => u.role === 'USER').length || 0}
                        </p>
                        <p className="text-sm text-slate-600">Users</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-500">Select a team to view details</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Create Team Modal */}
      <Modal
        isOpen={showTeamModal}
        onClose={() => {
          setShowTeamModal(false);
          setTeamForm({ name: '' });
        }}
        title="Create New Team"
      >
        <div className="space-y-4">
          <Input
            label="Team Name"
            value={teamForm.name}
            onChange={(e) => setTeamForm({ name: e.target.value })}
            placeholder="e.g., Development Team"
            required
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowTeamModal(false);
                setTeamForm({ name: '' });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTeam}>
              Create Team
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function TeamsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <TeamsPageContent />
    </Suspense>
  );
}
