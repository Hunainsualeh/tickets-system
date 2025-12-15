import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notifications';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// GET single ticket
export async function GET(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const params = await context.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            teams: {
              include: {
                team: true,
              },
            },
          },
        },
        branch: true,
        team: true,
        statusHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        attachments: true,
        notes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Regular users can only view tickets from their teams or their own tickets
    if (authResult.user.role === 'USER') {
      const currentUser = await prisma.user.findUnique({
        where: { id: authResult.user.userId },
        select: { 
          teams: {
            select: {
              teamId: true,
            },
          },
        },
      });

      const ticketUser = await prisma.user.findUnique({
        where: { id: ticket.userId },
        select: { 
          teams: {
            select: {
              teamId: true,
            },
          },
        },
      });

      const currentUserTeamIds = currentUser?.teams.map(ut => ut.teamId) || [];
      const ticketUserTeamIds = ticketUser?.teams.map(ut => ut.teamId) || [];

      // Check if there's any team overlap or if it's the user's own ticket
      const hasCommonTeam = currentUserTeamIds.some(teamId => ticketUserTeamIds.includes(teamId));
      const isOwnTicket = ticket.userId === authResult.user.userId;
      const ticketInUserTeam = ticket.teamId && currentUserTeamIds.includes(ticket.teamId);

      if (!isOwnTicket && !hasCommonTeam && !ticketInUserTeam) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Get ticket error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update ticket (Admin only for status updates)
export async function PUT(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const params = await context.params;
    const { status, note, adminNote, priority, issue, additionalDetails } = await request.json();

    const updateData: any = {};
    
    // Status updates are admin only
    if (status && authResult.user.role === 'ADMIN') {
      updateData.status = status;
    }

    // Priority updates are admin only
    if (priority && authResult.user.role === 'ADMIN') {
      updateData.priority = priority;
    }

    // Users can update their own ticket details
    if (issue) updateData.issue = issue;
    if (additionalDetails !== undefined) updateData.additionalDetails = additionalDetails;

    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        branch: true,
      },
    });

    // Create status history entry if status was updated
    if (status && authResult.user.role === 'ADMIN') {
      await prisma.statusHistory.create({
        data: {
          ticketId: ticket.id,
          status,
          note: note || `Status updated to ${status}`,
          ...(adminNote && { adminNote }),
        },
      });

      // Auto-acknowledge message
      if (status === 'ACKNOWLEDGED') {
        await prisma.statusHistory.create({
          data: {
            ticketId: ticket.id,
            status: 'ACKNOWLEDGED',
            note: 'We have received your request and will begin processing it shortly.',
          },
        });
      }

      // Notify user about status change
      const statusMessages: Record<string, { title: string; type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' }> = {
        ACKNOWLEDGED: { title: 'Ticket Acknowledged', type: 'INFO' },
        IN_PROGRESS: { title: 'Ticket In Progress', type: 'INFO' },
        COMPLETED: { title: 'Ticket Completed', type: 'SUCCESS' },
        ESCALATED: { title: 'Ticket Escalated', type: 'WARNING' },
        CLOSED: { title: 'Ticket Closed', type: 'SUCCESS' },
        INVOICE: { title: 'Invoice Generated', type: 'INFO' },
        PAID: { title: 'Payment Confirmed', type: 'SUCCESS' },
      };

      const statusConfig = statusMessages[status] || { title: 'Ticket Status Updated', type: 'INFO' };
      await notifyUser(
        ticket.userId,
        statusConfig.title,
        note || `Your ticket status has been updated to ${status}${adminNote ? ` - ${adminNote}` : ''}`,
        statusConfig.type,
        `/dashboard?view=tickets&ticketId=${ticket.id}`
      );
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Update ticket error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE ticket (Admin only)
export async function DELETE(request: NextRequest, context: Params) {
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const params = await context.params;
    await prisma.ticket.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
