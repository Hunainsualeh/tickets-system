/**
 * Messages API Route
 * GET - Get messages for a conversation (with pagination)
 * POST - Send a new message
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import {
  getMessages,
  sendMessage,
  canAccessConversation,
} from '@/lib/chat-service';
import { emitToConversation } from '@/lib/socket-server';

// GET /api/chat/messages?conversationId=xxx - Get messages
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const before = searchParams.get('before') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const result = await getMessages(conversationId, authResult.user.userId, {
      before,
      limit: Math.min(limit, 100), // Max 100 messages per request
    });

    // Transform dates to ISO strings
    const messages = result.messages.map(msg => ({
      ...msg,
      createdAt: msg.createdAt.toISOString(),
      editedAt: msg.editedAt?.toISOString() || null,
      deletedAt: msg.deletedAt?.toISOString() || null,
      replyTo: msg.replyTo ? {
        ...msg.replyTo,
      } : null,
      attachments: msg.attachments.map(att => ({
        ...att,
        uploadedAt: att.uploadedAt.toISOString(),
      })),
      readReceipts: msg.readReceipts.map(rr => ({
        ...rr,
        readAt: rr.readAt.toISOString(),
      })),
    }));

    return NextResponse.json({
      messages,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);

    if (error.message.includes('Access denied')) {
      return NextResponse.json(
        { error: 'Access denied to conversation' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/chat/messages - Send message (HTTP fallback)
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { conversationId, content, messageType, replyToId, ticketId, requestId } = body;

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: 'conversationId and content are required' },
        { status: 400 }
      );
    }

    // Validate content length
    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'Message content exceeds maximum length' },
        { status: 400 }
      );
    }

    // Verify access
    const hasAccess = await canAccessConversation(authResult.user.userId, conversationId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to conversation' },
        { status: 403 }
      );
    }

    const message = await sendMessage({
      conversationId,
      senderId: authResult.user.userId,
      content: content.trim(),
      messageType: messageType || 'TEXT',
      replyToId,
      ticketId,
      requestId,
    });

    // Emit to connected clients via WebSocket
    try {
      emitToConversation(conversationId, 'new_message', {
        ...message,
        createdAt: message.createdAt.toISOString(),
      });
    } catch (socketError) {
      // Don't fail if socket emit fails
      console.error('Socket emit error:', socketError);
    }

    return NextResponse.json({
      message: {
        ...message,
        createdAt: message.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error sending message:', error);

    if (error.message.includes('Not authorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
