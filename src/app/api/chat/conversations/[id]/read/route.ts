/**
 * Mark Conversation as Read API Route
 * POST - Mark all messages in conversation as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { markMessagesAsRead, canAccessConversation } from '@/lib/chat-service';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/chat/conversations/[id]/read - Mark conversation as read
export async function POST(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await context.params;

    // Verify access
    const hasAccess = await canAccessConversation(authResult.user.userId, id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to conversation' },
        { status: 403 }
      );
    }

    const result = await markMessagesAsRead(id, authResult.user.userId);

    return NextResponse.json({
      success: true,
      readAt: result.readAt,
    });
  } catch (error: any) {
    console.error('Error marking conversation as read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark as read' },
      { status: 500 }
    );
  }
}
