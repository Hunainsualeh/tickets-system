/**
 * Chat Users API Route
 * GET - Get users available for chat (with presence)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/middleware';
import { getAdminChatableUsers, getPresenceForUsers } from '@/lib/chat-service';
import { prisma } from '@/lib/prisma';

// GET /api/chat/users - Get users available for chat
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const includePresence = searchParams.get('includePresence') !== 'false';

    const user = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: { role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let chatableUsers;

    if (user.role === 'ADMIN') {
      // Admins can chat with all users in their company scope
      chatableUsers = await getAdminChatableUsers(authResult.user.userId);
    } else {
      // Regular users can only chat with admins
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
          id: { not: authResult.user.userId },
          // Company isolation - if user has company, admin must be in same company
          ...(user.companyId && { companyId: user.companyId }),
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          companyId: true,
        },
      });

      // Get presence for admins
      if (includePresence && admins.length > 0) {
        const adminIds = admins.map(a => a.id);
        const presences = await getPresenceForUsers(adminIds);
        const presenceMap = new Map(presences.map(p => [p.userId, p]));

        chatableUsers = admins.map(admin => ({
          ...admin,
          presence: presenceMap.get(admin.id) || { status: 'OFFLINE', lastSeenAt: null },
        }));
      } else {
        chatableUsers = admins.map(admin => ({
          ...admin,
          presence: { status: 'OFFLINE', lastSeenAt: null },
        }));
      }
    }

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      chatableUsers = chatableUsers.filter(u =>
        u.username.toLowerCase().includes(searchLower) ||
        (u.email && u.email.toLowerCase().includes(searchLower))
      );
    }

    // Transform dates
    const transformedUsers = chatableUsers.map(u => ({
      ...u,
      presence: {
        ...u.presence,
        lastSeenAt: u.presence.lastSeenAt 
          ? new Date(u.presence.lastSeenAt).toISOString() 
          : null,
      },
    }));

    return NextResponse.json({ users: transformedUsers });
  } catch (error: any) {
    console.error('Error fetching chat users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
