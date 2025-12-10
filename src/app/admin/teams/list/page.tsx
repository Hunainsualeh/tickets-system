'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Sidebar } from '@/app/components/Sidebar';
import { Button } from '@/app/components/Button';
import { Modal } from '@/app/components/Modal';
import { Input } from '@/app/components/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/Table';
import { Edit2, Trash2, ArrowLeft, Users } from 'lucide-react';

function TeamsListPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '' });

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
      const res = await apiClient.getTeams();
      setTeams(res.teams || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (team: any) => {
    setEditingTeam(team);
    setEditForm({ name: team.name });
    setShowEditModal(true);
  };

  const handleUpdateTeam = async () => {
    if (!editForm.name.trim()) {
      alert('Please enter a team name');
      return;
    }

    try {
      await apiClient.updateTeam(editingTeam.id, { name: editForm.name });
      setShowEditModal(false);
      setEditingTeam(null);
      fetchTeams();
    } catch (error) {
      console.error('Error updating team:', error);
      alert('Failed to update team');
    }
  };

  const handleDeleteClick = (team: any) => {
    setDeletingTeam(team);
    setShowDeleteModal(true);
  };

  const handleDeleteTeam = async () => {
    try {
      await apiClient.deleteTeam(deletingTeam.id);
      setShowDeleteModal(false);
      setDeletingTeam(null);
      fetchTeams();
    } catch (error: any) {
      console.error('Error deleting team:', error);
      alert(error.message || 'Failed to delete team');
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
        }}
        title="Edit Team"
      >
        <div className="space-y-4">
          <Input
            label="Team Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ name: e.target.value })}
            placeholder="e.g., Development Team"
            required
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowEditModal(false);
                setEditingTeam(null);
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
