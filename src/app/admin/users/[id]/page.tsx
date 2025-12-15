'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Sidebar } from '@/app/components/Sidebar';
import { Button } from '@/app/components/Button';
import { Badge } from '@/app/components/Badge';
import { TicketCard } from '@/app/components/TicketCard';
import { ArrowLeft, Users, Shield, Ticket, Calendar, Mail } from 'lucide-react';
import Link from 'next/link';

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(storedUser);
    if (user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    setCurrentUser(user);
    
    if (resolvedParams.id) {
      fetchUserDetail(resolvedParams.id);
    }
  }, [resolvedParams.id]);

  const fetchUserDetail = async (id: string) => {
    try {
      // Fetch user details
      const userRes = await fetch(`/api/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const userData = await userRes.json();
      setUserDetail(userData.user);

      // Fetch user's tickets
      const ticketsRes = await fetch(`/api/tickets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const ticketsData = await ticketsRes.json();
      // Filter tickets for this user
      const userTickets = ticketsData.tickets.filter((t: any) => t.userId === id);
      setTickets(userTickets);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar userRole="ADMIN" username={currentUser?.username} />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </main>
      </div>
    );
  }

  if (!userDetail) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar userRole="ADMIN" username={currentUser?.username} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">User not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar userRole="ADMIN" username={currentUser?.username} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8">
          {/* Back Button */}
          <Link href="/admin/users" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Link>

          {/* User Profile Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                {userDetail.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900">{userDetail.username}</h1>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    userDetail.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {userDetail.role === 'ADMIN' && <Shield className="w-3.5 h-3.5" />}
                    {userDetail.role}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Date(userDetail.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Ticket className="w-4 h-4" />
                    <span>{userDetail._count?.tickets || 0} tickets</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Teams Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Teams
                </h2>
                {userDetail.teams && userDetail.teams.length > 0 ? (
                  <div className="space-y-3">
                    {userDetail.teams.map((userTeam: any) => (
                      <div key={userTeam.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold">
                          {userTeam.team.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{userTeam.team.name}</p>
                          <p className="text-xs text-slate-500">
                            Member since {new Date(userTeam.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Not assigned to any team</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tickets Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Recent Tickets
                </h2>
                {tickets.length > 0 ? (
                  <div className="space-y-3">
                    {tickets.slice(0, 10).map((ticket: any) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onClick={() => router.push(`/admin?tab=tickets&ticketId=${ticket.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No tickets created yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
