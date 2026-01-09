/**
 * Single Message API Route
 * PUT - Edit message
 * DELETE - Delete message
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { editMessage, deleteMessage } from '@/lib/chat-service';
import { emitToConversation } from '@/lib/socket-server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// PUT /api/chat/messages/[id] - Edit message
export async function PUT(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
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

    const message = await editMessage(id, authResult.user.userId, content.trim());

    // Emit update to connected clients
    try {
      emitToConversation(message.conversationId, 'message_updated', {
        ...message,
        createdAt: message.createdAt.toISOString(),
        editedAt: message.editedAt?.toISOString() || null,
      });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    return NextResponse.json({
      message: {
        ...message,
        createdAt: message.createdAt.toISOString(),
        editedAt: message.editedAt?.toISOString() || null,
      },
    });
  } catch (error: any) {
    console.error('Error editing message:', error);

    if (error.message.includes('Cannot edit') || error.message.includes('Not authorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    if (error.message.includes('too old')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to edit message' },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/messages/[id] - Delete message
export async function DELETE(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await context.params;

    const result = await deleteMessage(id, authResult.user.userId);

    // Emit deletion to connected clients
    try {
      emitToConversation(result.conversationId, 'message_deleted', {
        messageId: result.messageId,
        conversationId: result.conversationId,
      });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting message:', error);

    if (error.message.includes('Not authorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete message' },
      { status: 500 }
    );
  }
}
