'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/ToastContainer';
import { apiClient } from '@/lib/api-client';
import { Sidebar } from '@/app/components/Sidebar';
import { Button } from '@/app/components/Button';
import { Modal } from '@/app/components/Modal';
import { Input } from '@/app/components/Input';
import { Plus, Users, Eye, List, ChevronLeft, ChevronRight, UserPlus, Shield, Building2 } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/app/components/StatCard';

function TeamsPageContent() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<any>(null);
  const [companyName, setCompanyName] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '' });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1); // -1 for rounding tolerance
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [teams]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = 300;
      if (direction === 'left') {
        current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
      // Check scroll after animation (approximate)
      setTimeout(checkScroll, 300);
    }
  };

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
      const [teamsRes, usersRes, meRes] = await Promise.all([
        apiClient.getTeams(),
        apiClient.getUsers(),
        apiClient.getMe(),
      ]);
      const fetchedTeams = teamsRes.teams || [];
      setTeams(fetchedTeams);
      setUsers(usersRes.users || []);
      if (meRes.companyName) {
        setCompanyName(meRes.companyName);
      }
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
      toast.warning('Please enter a team name');
      return;
    }

    try {
      await apiClient.createTeam({ name: teamForm.name });
      toast.success(`Team "${teamForm.name}" created successfully`);
      setTeamForm({ name: '' });
      setShowTeamModal(false);
      fetchTeams();
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  const openAddMembersModal = () => {
    setSelectedUserIds([]);
    setShowAddMembersModal(true);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) {
      toast.warning('Please select at least one user');
      return;
    }

    try {
      // Update each selected user to add them to the active team
      await Promise.all(
        selectedUserIds.map((userId) => {
          const user = users.find((u) => u.id === userId);
          const currentTeamIds = user?.teams?.map((ut: any) => ut.team.id) || [];
          if (!currentTeamIds.includes(activeTab)) {
            return apiClient.updateUser(userId, {
              teamIds: [...currentTeamIds, activeTab],
            });
          }
          return Promise.resolve();
        })
      );

      toast.success(`${selectedUserIds.length} member(s) added to team successfully`);
      setShowAddMembersModal(false);
      setSelectedUserIds([]);
      
      // Refresh teams data to show newly added members
      await fetchTeams();
    } catch (error) {
      console.error('Error adding members:', error);
      toast.error('Failed to add members to team');
    }
  };

  const activeTeam = teams.find(t => t.id === activeTab);
  const activeTeamMemberIds = activeTeam?.users?.map((u: any) => u.userId) || [];
  const availableUsers = users.filter((u) => !activeTeamMemberIds.includes(u.id));

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar userRole="ADMIN" username={user?.username} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Teams Management</h1>
                <p className="text-slate-600">Manage your teams, view hierarchy, and team members</p>
              </div>
              {companyName && (
                <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                  <span className="font-semibold text-slate-700">{companyName}</span>
                </div>
              )}
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
                  variant="charcoal"
                />
              </div>

              {/* Actions Toolbar */}
              <div className="flex justify-end gap-2 mt-4">
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
              <div className="bg-white rounded-t-2xl border border-slate-200 border-b-0 relative group">
                {/* Scroll Buttons */}
                {canScrollLeft && (
                  <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button 
                      onClick={() => scroll('left')}
                      className="h-full px-2 bg-linear-to-r from-white via-white/80 to-transparent hover:text-blue-600 text-slate-400 transition-colors"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>
                )}
                {canScrollRight && (
                  <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button 
                      onClick={() => scroll('right')}
                      className="h-full px-2 bg-linear-to-l from-white via-white/80 to-transparent hover:text-blue-600 text-slate-400 transition-colors"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div 
                  ref={scrollContainerRef}
                  onScroll={checkScroll}
                  className="flex overflow-x-auto no-scrollbar scroll-smooth"
                >
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
              <div className="bg-white rounded-b-2xl border border-slate-200 p-4 sm:p-8">
                {activeTeam ? (
                  <>
                    {/* Team Header Section */}
                    <div className="mb-8 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-3xl font-bold text-slate-900 mb-2">{activeTeam.name}</h2>
                          <p className="text-slate-500">Manage team members and settings</p>
                        </div>
                        <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex -space-x-3">
                            {activeTeam.users?.slice(0, 5).map((u: any, i: number) => (
                              <div key={i} className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-sm font-bold text-blue-600 shadow-sm">
                                {u.username?.charAt(0).toUpperCase()}
                              </div>
                            ))}
                            {(activeTeam.users?.length || 0) > 5 && (
                              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                                +{(activeTeam.users?.length || 0) - 5}
                              </div>
                            )}
                          </div>
                          <div className="h-8 w-px bg-slate-200"></div>
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-slate-900 leading-none">{activeTeam.users?.length || 0}</span>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Members</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* People Section */}
                    <div className="mb-8">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
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
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {activeTeam.users && activeTeam.users.length > 0 ? (
                          <>
                            {activeTeam.users.map((member: any) => (
                              <div 
                                key={member.id} 
                                onClick={() => router.push(`/admin/users/${member.id}`)}
                                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer"
                              >
                                <div className="flex flex-col items-center text-center">
                                  <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold mb-3">
                                    {member.username.charAt(0).toUpperCase()}
                                  </div>
                                  <h4 className="font-semibold text-slate-900 mb-2 text-sm">{member.username}</h4>
                                  <span className={`
                                    inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium
                                    ${member.role === 'ADMIN' 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-slate-100 text-slate-600'
                                    }
                                  `}>
                                    {member.role === 'ADMIN' && (
                                      <Shield className="w-3 h-3" />
                                    )}
                                    {member.role === 'ADMIN' ? 'Admin' : 'User'}
                                  </span>
                                </div>
                              </div>
                            ))}
                            
                            {/* Add Team Member Card */}
                            <div 
                              onClick={openAddMembersModal}
                              className="border-2 border-dashed border-slate-300 rounded-xl p-5 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group min-h-40"
                            >
                              <div className="text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors mb-2 mx-auto">
                                  <Plus className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-medium text-slate-600 group-hover:text-blue-600">Add Member</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* Show only Add Member card when no members */
                          <div 
                            onClick={openAddMembersModal}
                            className="border-2 border-dashed border-slate-300 rounded-xl p-5 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group min-h-40"
                          >
                            <div className="text-center">
                              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors mb-2 mx-auto">
                                <Plus className="w-6 h-6" />
                              </div>
                              <p className="text-sm font-medium text-slate-600 group-hover:text-blue-600">Add Member</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Team Stats */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 text-sm text-slate-600 border-t border-slate-100 pt-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{activeTeam.users?.length || 0}</span>
                        <span>Total Members</span>
                      </div>
                      <div className="hidden sm:block h-4 w-px bg-slate-200"></div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-600">
                          {activeTeam.users?.filter((u: any) => u.role === 'ADMIN').length || 0}
                        </span>
                        <span>Admins</span>
                      </div>
                      <div className="hidden sm:block h-4 w-px bg-slate-200"></div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">
                          {activeTeam.users?.filter((u: any) => u.role === 'USER').length || 0}
                        </span>
                        <span>Users</span>
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

      {/* Add Members Modal */}
      <Modal
        isOpen={showAddMembersModal}
        onClose={() => {
          setShowAddMembersModal(false);
          setSelectedUserIds([]);
        }}
        title="Add Members to Team"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="w-4 h-4 text-slate-500" />
            <span>
              Select users to add to <strong className="text-slate-900">{activeTeam?.name}</strong>
            </span>
          </div>
          
          {/* Selected Users as Tags */}
          {selectedUserIds.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                Selected Members ({selectedUserIds.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedUserIds.map((userId) => {
                  const user = users.find((u) => u.id === userId);
                  return user ? (
                    <div
                      key={user.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium shadow-sm"
                    >
                      <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span>{user.username}</span>
                      {user.role === 'ADMIN' && (
                        <Shield className="w-3 h-3" />
                      )}
                      <button
                        type="button"
                        onClick={() => toggleUserSelection(user.id)}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Available Users List */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="max-h-96 overflow-y-auto">
              {availableUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-medium">
                    All users are already members of this team
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {availableUsers.map((user) => (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedUserIds.includes(user.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {user.username}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          {user.role === 'ADMIN' ? (
                            <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            <span>User</span>
                          )}
                          {user.teams && user.teams.length > 0 && (
                            <span className="flex items-center gap-1">
                              <span>•</span>
                              <Users className="w-3 h-3" />
                              <span>{user.teams.length} team{user.teams.length > 1 ? 's' : ''}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedUserIds.includes(user.id) && (
                        <svg
                          className="w-5 h-5 text-blue-600 shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddMembersModal(false);
                setSelectedUserIds([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddMembers} disabled={selectedUserIds.length === 0}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add {selectedUserIds.length > 0 ? `${selectedUserIds.length} ` : ''}Member{selectedUserIds.length !== 1 ? 's' : ''}
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
