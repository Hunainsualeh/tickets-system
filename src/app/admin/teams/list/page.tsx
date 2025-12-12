'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/ToastContainer';
import { apiClient } from '@/lib/api-client';
import { Sidebar } from '@/app/components/Sidebar';
import { Button } from '@/app/components/Button';
import { Modal } from '@/app/components/Modal';
import { Input } from '@/app/components/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/Table';
import { Edit2, Trash2, ArrowLeft, Users, UserMinus, Search, Shield } from 'lucide-react';

function TeamsListPageContent() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '' });
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState<any>(null);

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
      const [teamsRes, usersRes] = await Promise.all([
        apiClient.getTeams(),
        apiClient.getUsers(),
      ]);
      setTeams(teamsRes.teams || []);
      setAllUsers(usersRes.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (team: any) => {
    setEditingTeam(team);
    setEditForm({ name: team.name });
    setMemberSearchQuery('');
    setShowEditModal(true);
  };

  const handleUpdateTeam = async () => {
    if (!editForm.name.trim()) {
      toast.warning('Please enter a team name');
      return;
    }

    try {
      await apiClient.updateTeam(editingTeam.id, { name: editForm.name });
      toast.success(`Team "${editForm.name}" updated successfully`);
      setShowEditModal(false);
      setEditingTeam(null);
      fetchTeams();
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Failed to update team');
    }
  };

  const handleDeleteClick = (team: any) => {
    setDeletingTeam(team);
    setShowDeleteModal(true);
  };

  const handleDeleteTeam = async () => {
    try {
      await apiClient.deleteTeam(deletingTeam.id);
      toast.error(`Team "${deletingTeam.name}" deleted successfully`);
      setShowDeleteModal(false);
      setDeletingTeam(null);
      fetchTeams();
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast.error(error.message || 'Failed to delete team');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }

    try {
      const userToUpdate = allUsers.find((u) => u.id === userId);
      if (!userToUpdate) return;

      const currentTeamIds = userToUpdate.teams?.map((ut: any) => ut.team.id) || [];
      const newTeamIds = currentTeamIds.filter((id: string) => id !== editingTeam.id);

      await apiClient.updateUser(userId, {
        teamIds: newTeamIds,
      });

      toast.success(`Member removed from team successfully`);
      
      // Refresh data
      await fetchTeams();
      
      // Update the editing team state
      const updatedTeam = teams.find(t => t.id === editingTeam.id);
      if (updatedTeam) {
        setEditingTeam(updatedTeam);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member from team');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar userRole="ADMIN" username={user?.username} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/admin/teams')}
              className="mb-4 pl-0 hover:bg-transparent hover:text-blue-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Teams View
            </Button>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">All Teams</h1>
                <p className="text-slate-600">Manage all teams in the system</p>
              </div>
            </div>
          </div>

          {/* Teams Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No teams found</h3>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900">{team.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span>{team._count?.users || team.users?.length || 0} members</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(team.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(team)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(team)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </main>

      {/* Edit Team Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTeam(null);
          setMemberSearchQuery('');
        }}
        title="Edit Team"
      >
        <div className="space-y-6">
          <Input
            label="Team Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ name: e.target.value })}
            placeholder="e.g., Development Team"
            required
          />

          {/* Members Management Section */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Team Members</h3>
            
            {/* Search Box */}
            <div className="relative mb-4">
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search members..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>

            {/* Members List */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <div className="max-h-64 overflow-y-auto">
                {editingTeam?.users && editingTeam.users.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {editingTeam.users
                      .filter((member: any) =>
                        member.username.toLowerCase().includes(memberSearchQuery.toLowerCase())
                      )
                      .map((member: any) => (
                        <div key={member.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 truncate">{member.username}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              {member.role === 'ADMIN' ? (
                                <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                                  <Shield className="w-3 h-3" />
                                  Admin
                                </span>
                              ) : (
                                <span>User</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                          >
                            <UserMinus className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      ))}
                    {editingTeam.users.filter((member: any) =>
                      member.username.toLowerCase().includes(memberSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="p-6 text-center">
                        <p className="text-sm text-slate-500">No members found</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No members in this team</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowEditModal(false);
                setEditingTeam(null);
                setMemberSearchQuery('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateTeam}>
              Update Team
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingTeam(null);
        }}
        title="Delete Team"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Are you sure you want to delete the team <span className="font-bold text-slate-900">{deletingTeam?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            Note: You cannot delete a team that has members. Please remove or reassign members first.
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingTeam(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteTeam}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Team
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function TeamsListPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <TeamsListPageContent />
    </Suspense>
  );
}
