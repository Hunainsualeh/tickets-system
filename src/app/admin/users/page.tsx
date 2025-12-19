'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/ToastContainer';
import { apiClient } from '@/lib/api-client';
import { Sidebar } from '@/app/components/Sidebar';
import { Button } from '@/app/components/Button';
import { Modal } from '@/app/components/Modal';
import { Input } from '@/app/components/Input';
import { StatCard } from '@/app/components/StatCard';
import { Users, Plus, Edit, Trash2, UserPlus, Shield, UserCheck, Building2, Eye, EyeOff } from 'lucide-react';

function UsersManagementContent() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<any>(null);
  const [companyName, setCompanyName] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'USER',
    teamIds: [] as string[],
  });
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; username: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    setUser(parsedUser);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, teamsRes, meRes] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getTeams(),
        apiClient.getMe(),
      ]);
      setUsers(usersRes.users || []);
      setTeams(teamsRes.teams || []);
      if (meRes.companyName) {
        setCompanyName(meRes.companyName);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setUserForm({
      username: '',
      password: '',
      role: 'USER',
      teamIds: [],
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setModalMode('edit');
    setSelectedUser(user);
    setUserForm({
      username: user.username,
      password: '',
      role: user.role,
      teamIds: user.teams?.map((ut: any) => ut.team.id) || [],
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!userForm.username.trim()) {
      toast.warning('Please enter a username');
      return;
    }

    if (modalMode === 'create' && !userForm.password.trim()) {
      toast.warning('Please enter a password');
      return;
    }

    try {
      const data: any = {
        username: userForm.username,
        role: userForm.role,
        teamIds: userForm.teamIds,
      };

      if (userForm.password.trim()) {
        data.password = userForm.password;
      }

      if (modalMode === 'create') {
        await apiClient.createUser(data);
        toast.success('User created successfully');
      } else {
        await apiClient.updateUser(selectedUser.id, data);
        toast.success('User updated successfully');
      }

      setShowModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Failed to save user');
    }
  };

  const handleDelete = (userId: string, username: string) => {
    setUserToDelete({ id: userId, username });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await apiClient.deleteUser(userToDelete.id);
      toast.success(`User "${userToDelete.username}" deleted successfully`);
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const toggleTeam = (teamId: string) => {
    setUserForm((prev) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id) => id !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar userRole="ADMIN" username={user?.username} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">User Management</h1>
                <p className="text-slate-600">Manage users, assign teams, and control access</p>
              </div>
              {companyName && (
                <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                  <span className="font-semibold text-slate-700">{companyName}</span>
                </div>
              )}
            </div>
          </div>

          {/* User Statistics Cards */}
          {!loading && users.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Users"
                  count={users.length}
                  icon={Users}
                  variant="teal"
                />
                <StatCard
                  title="Admin Users"
                  count={users.filter((u) => u.role === 'ADMIN').length}
                  icon={Shield}
                  variant="navy"
                />
                <StatCard
                  title="Regular Users"
                  count={users.filter((u) => u.role === 'USER').length}
                  icon={UserCheck}
                  variant="slate"
                />
              </div>

              {/* Actions Toolbar */}
              <div className="flex justify-end gap-2 mt-4">
                <Button onClick={openCreateModal} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add User
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Teams
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Tickets
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{user.username}</div>
                              <div className="text-sm text-slate-500">
                                Joined {new Date(user.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.teams && user.teams.length > 0 ? (
                              user.teams.map((ut: any) => (
                                <span
                                  key={ut.team.id}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
                                >
                                  {ut.team.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-400">No teams</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {user._count?.tickets || 0} tickets
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit user"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id, user.username)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit User Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setTeamSearchQuery('');
        }}
        title={modalMode === 'create' ? 'Create New User' : 'Edit User'}
      >
        <div className="space-y-5">
          <Input
            label="Username"
            value={userForm.username}
            onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
            placeholder="Enter username"
            required
          />

          <Input
            label={modalMode === 'create' ? 'Password' : 'Password (leave empty to keep current)'}
            type={showPassword ? 'text' : 'password'}
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            placeholder="Enter password"
            required={modalMode === 'create'}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hover:text-slate-700 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            }
          />

          {/* Improved Role Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserForm({ ...userForm, role: 'USER' })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  userForm.role === 'USER'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users className={`w-4 h-4 ${
                    userForm.role === 'USER' ? 'text-blue-600' : 'text-slate-500'
                  }`} />
                  <span className={`font-semibold ${
                    userForm.role === 'USER' ? 'text-blue-900' : 'text-slate-700'
                  }`}>User</span>
                </div>
                <p className="text-xs text-slate-500">Standard access</p>
              </button>
              
              <button
                type="button"
                onClick={() => setUserForm({ ...userForm, role: 'ADMIN' })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  userForm.role === 'ADMIN'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield className={`w-4 h-4 ${
                    userForm.role === 'ADMIN' ? 'text-purple-600' : 'text-slate-500'
                  }`} />
                  <span className={`font-semibold ${
                    userForm.role === 'ADMIN' ? 'text-purple-900' : 'text-slate-700'
                  }`}>Admin</span>
                </div>
                <p className="text-xs text-slate-500">Full access</p>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700">
                Assign to Teams
              </label>
              {userForm.teamIds.length > 0 && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  {userForm.teamIds.length} selected
                </span>
              )}
            </div>
            
            {/* Selected Teams as Tags */}
            {userForm.teamIds.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                {userForm.teamIds.map((teamId) => {
                  const team = teams.find((t) => t.id === teamId);
                  return team ? (
                    <div
                      key={team.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium shadow-sm"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{team.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleTeam(team.id)}
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
            )}

            {/* Search Box for Teams */}
            {teams.length > 5 && (
              <div className="mb-3">
                <div className="relative">
                  <input
                    type="text"
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    placeholder="Search teams..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Available Teams List */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <div className="max-h-60 overflow-y-auto">
                {teams.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No teams available</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {teams
                      .filter((team) =>
                        team.name.toLowerCase().includes(teamSearchQuery.toLowerCase())
                      )
                      .map((team) => (
                        <label
                          key={team.id}
                          className={`flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                            userForm.teamIds.includes(team.id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={userForm.teamIds.includes(team.id)}
                            onChange={() => toggleTeam(team.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              userForm.teamIds.includes(team.id)
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {team.name.charAt(0).toUpperCase()}
                            </div>
                            <span className={`text-sm font-medium truncate ${
                              userForm.teamIds.includes(team.id) ? 'text-blue-900' : 'text-slate-700'
                            }`}>
                              {team.name}
                            </span>
                          </div>
                          {userForm.teamIds.includes(team.id) && (
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
                    {teams.filter((team) =>
                      team.name.toLowerCase().includes(teamSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="p-4 text-center">
                        <p className="text-sm text-slate-500">No teams found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Select multiple teams for this user to access
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {modalMode === 'create' ? 'Create User' : 'Update User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Are you sure you want to delete user <span className="font-semibold text-slate-900">{userToDelete?.username}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function UsersManagementPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-slate-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    }>
      <UsersManagementContent />
    </Suspense>
  );
}
