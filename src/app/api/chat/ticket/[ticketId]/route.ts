/**
 * Ticket Chat API Route
 * GET - Get or create conversation for a ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { getOrCreateTicketConversation, getChatPermissions } from '@/lib/chat-service';
import { prisma } from '@/lib/prisma';

interface Params {
  params: Promise<{
    ticketId: string;
  }>;
}

// GET /api/chat/ticket/[ticketId] - Get or create ticket conversation
export async function GET(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { ticketId } = await context.params;

    // Verify ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        userId: true,
        assignedToUserId: true,
        status: true,
        user: {
          select: {
            teams: { select: { teamId: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Check access based on user role
    const currentUser = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        role: true,
        teams: { select: { teamId: true } },
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Access control
    const isAdmin = currentUser.role === 'ADMIN';
    const isTicketOwner = ticket.userId === authResult.user.userId;
    const isAssigned = ticket.assignedToUserId === authResult.user.userId;

    // Check team membership
    const userTeamIds = currentUser.teams.map(t => t.teamId);
    const ticketUserTeamIds = ticket.user?.teams.map(t => t.teamId) || [];
    const hasTeamAccess = userTeamIds.some(tid => ticketUserTeamIds.includes(tid));

    if (!isAdmin && !isTicketOwner && !isAssigned && !hasTeamAccess) {
      return NextResponse.json(
        { error: 'Access denied to ticket' },
        { status: 403 }
      );
    }

    // Get or create conversation
    const conversation = await getOrCreateTicketConversation(
      ticketId,
      authResult.user.userId
    );

    // Get permissions
    const permissions = await getChatPermissions(
      authResult.user.userId,
      conversation!.id
    );

    // Check if chat should be read-only based on ticket status
    const isTicketClosed = ['CLOSED', 'PAID'].includes(ticket.status);

    return NextResponse.json({
      conversation: {
        ...conversation,
        createdAt: conversation!.createdAt.toISOString(),
        updatedAt: conversation!.updatedAt.toISOString(),
        participants: conversation!.participants.map(p => ({
          ...p,
          joinedAt: p.joinedAt.toISOString(),
          lastReadAt: p.lastReadAt?.toISOString() || null,
        })),
      },
      permissions: {
        ...permissions,
        isReadOnly: permissions.isReadOnly || isTicketClosed,
      },
      ticketStatus: ticket.status,
    });
  } catch (error: any) {
    console.error('Error getting ticket conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get ticket conversation' },
      { status: 500 }
    );
  }
}
