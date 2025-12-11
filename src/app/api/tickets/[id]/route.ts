import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

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
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        branch: true,
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

    // Regular users can only view tickets from their team or their own tickets
    if (authResult.user.role === 'USER') {
      const currentUser = await prisma.user.findUnique({
        where: { id: authResult.user.userId },
        select: { teamId: true },
      });

      const ticketUser = await prisma.user.findUnique({
        where: { id: ticket.userId },
        select: { teamId: true },
      });

      // Allow access if:
      // 1. It's the user's own ticket, OR
      // 2. Both users are in the same team (and team is not null)
      const hasAccess = 
        ticket.userId === authResult.user.userId ||
        (currentUser?.teamId && ticketUser?.teamId && currentUser.teamId === ticketUser.teamId);

      if (!hasAccess) {
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
