/**
 * Chat Presence API Route
 * GET - Get presence for users
 * PUT - Update own presence
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { updatePresence, getPresenceForUsers } from '@/lib/chat-service';
import type { PresenceStatus } from '@/types/chat';

// GET /api/chat/presence?userIds=id1,id2,id3
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get('userIds');

    if (!userIdsParam) {
      return NextResponse.json(
        { error: 'userIds parameter is required' },
        { status: 400 }
      );
    }

    const userIds = userIdsParam.split(',').filter(Boolean);

    if (userIds.length === 0) {
      return NextResponse.json({ presences: [] });
    }

    if (userIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 user IDs allowed' },
        { status: 400 }
      );
    }

    const presences = await getPresenceForUsers(userIds);

    // Transform dates to ISO strings
    const transformedPresences = presences.map(p => ({
      ...p,
      lastSeenAt: p.lastSeenAt ? new Date(p.lastSeenAt).toISOString() : null,
    }));

    return NextResponse.json({ presences: transformedPresences });
  } catch (error: any) {
    console.error('Error fetching presence:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch presence' },
      { status: 500 }
    );
  }
}

// PUT /api/chat/presence - Update own presence
export async function PUT(request: NextRequest) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { status } = body;

    const validStatuses: PresenceStatus[] = ['ONLINE', 'AWAY', 'BUSY', 'OFFLINE'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ONLINE, AWAY, BUSY, OFFLINE' },
        { status: 400 }
      );
    }

    const presence = await updatePresence(authResult.user.userId, status);

    return NextResponse.json({
      presence: {
        ...presence,
        lastSeenAt: presence.lastSeenAt.toISOString(),
        updatedAt: presence.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error updating presence:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update presence' },
      { status: 500 }
    );
  }
}
