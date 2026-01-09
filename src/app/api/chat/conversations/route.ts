/**
 * Conversations API Route
 * GET - List user's conversations
 * POST - Create new conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import {
  createConversation,
  getUserConversations,
  getConversationStats,
} from '@/lib/chat-service';

// GET /api/chat/conversations - List conversations
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') as 'ACTIVE' | 'ARCHIVED' | 'CLOSED' | undefined;
    const includeStats = searchParams.get('includeStats') === 'true';

    const result = await getUserConversations(authResult.user.userId, {
      page,
      pageSize,
      status: status || undefined,
    });

    // Optionally include stats
    let stats = null;
    if (includeStats) {
      stats = await getConversationStats(authResult.user.userId);
    }

    return NextResponse.json({
      ...result,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST /api/chat/conversations - Create new conversation
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { participantIds, ticketId, requestId, title } = body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one participant is required' },
        { status: 400 }
      );
    }

    // Validate participant IDs are strings
    if (!participantIds.every(id => typeof id === 'string')) {
      return NextResponse.json(
        { error: 'Invalid participant IDs' },
        { status: 400 }
      );
    }

    const conversation = await createConversation({
      initiatorId: authResult.user.userId,
      participantIds,
      ticketId,
      requestId,
      title,
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    
    // Handle specific errors
    if (error.message.includes('not allowed') || error.message.includes('Cannot add')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
