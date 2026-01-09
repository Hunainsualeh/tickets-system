/**
 * Single Conversation API Route
 * GET - Get conversation details with messages
 * PUT - Update conversation (close, archive)
 * DELETE - Leave conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import {
  getConversation,
  closeConversation,
  getChatPermissions,
  canAccessConversation,
  deleteConversation,
} from '@/lib/chat-service';
import { prisma } from '@/lib/prisma';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/chat/conversations/[id] - Get conversation details
export async function GET(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await context.params;

    const conversation = await getConversation(id, authResult.user.userId);
    const permissions = await getChatPermissions(authResult.user.userId, id);

    return NextResponse.json({
      conversation,
      permissions,
    });
  } catch (error: any) {
    console.error('Error fetching conversation:', error);

    if (error.message.includes('Access denied')) {
      return NextResponse.json(
        { error: 'Access denied to conversation' },
        { status: 403 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// PUT /api/chat/conversations/[id] - Update conversation
export async function PUT(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, reason } = body;

    switch (action) {
      case 'close':
        const closedConversation = await closeConversation(
          id,
          authResult.user.userId,
          reason
        );
        return NextResponse.json({ conversation: closedConversation });

      case 'archive':
        // Archive conversation
        const permissions = await getChatPermissions(authResult.user.userId, id);
        if (!permissions.canCloseConversation) {
          return NextResponse.json(
            { error: 'Not authorized to archive conversation' },
            { status: 403 }
          );
        }

        const archivedConversation = await prisma.conversation.update({
          where: { id },
          data: { status: 'ARCHIVED' },
        });
        return NextResponse.json({ conversation: archivedConversation });

      case 'reopen':
        // Reopen a closed conversation
        const reopenPermissions = await getChatPermissions(authResult.user.userId, id);
        if (!reopenPermissions.canCloseConversation) {
          return NextResponse.json(
            { error: 'Not authorized to reopen conversation' },
            { status: 403 }
          );
        }

        const reopenedConversation = await prisma.conversation.update({
          where: { id },
          data: { 
            status: 'ACTIVE',
            closedAt: null,
          },
        });
        return NextResponse.json({ conversation: reopenedConversation });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update conversation' },
      { status: 500 }
    );
  }
}
// DELETE /api/chat/conversations/[id] - Delete/Clear conversation for user
export async function DELETE(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { id } = await context.params;

    // Check if user is participant
    const canAccess = await canAccessConversation(authResult.user.userId, id);
    if (!canAccess) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Call service to clear/delete
    await deleteConversation(id, authResult.user.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}


