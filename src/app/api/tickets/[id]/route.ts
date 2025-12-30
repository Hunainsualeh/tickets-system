import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { generateTicketEmailHtml } from '@/lib/email-templates';

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
        assignedTo: {
          select: {
            id: true,
            username: true,
            role: true,
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

    // Developers and Technical users can only view tickets assigned to them
    if (authResult.user.role === 'DEVELOPER' || authResult.user.role === 'TECHNICAL') {
      if (ticket.assignedToUserId !== authResult.user.userId) {
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

    // Developers and Technical users can only update tickets assigned to them
    if (authResult.user.role === 'DEVELOPER' || authResult.user.role === 'TECHNICAL') {
      const existingTicket = await prisma.ticket.findUnique({
        where: { id: params.id },
        select: { assignedToUserId: true }
      });
      
      if (!existingTicket || existingTicket.assignedToUserId !== authResult.user.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { status, note, adminNote, priority, issue, additionalDetails, assignedToUserId } = await request.json();

    const updateData: any = {};
    
    // Status updates are allowed for ADMIN, DEVELOPER, TECHNICAL
    const allowedRoles = ['ADMIN', 'DEVELOPER', 'TECHNICAL'];
    if (status && allowedRoles.includes(authResult.user.role)) {
      updateData.status = status;
    }

    // Priority updates are admin only
    if (priority && authResult.user.role === 'ADMIN') {
      updateData.priority = priority;
    }

    // Assignment updates are admin only
    if (assignedToUserId !== undefined && authResult.user.role === 'ADMIN') {
      // Check if assignment changed
      const previousTicket = await prisma.ticket.findUnique({
        where: { id: params.id },
        select: { assignedToUserId: true, issue: true }
      });
      
      const assignmentChanged = previousTicket && previousTicket.assignedToUserId !== assignedToUserId;
      
      updateData.assignedToUserId = assignedToUserId;
      
      // Send notification if ticket is newly assigned
      if (assignmentChanged && assignedToUserId) {
        await notifyUser(
          assignedToUserId,
          'New Ticket Assigned',
          `You have been assigned to ticket: ${previousTicket?.issue || 'Support Request'}`,
          'INFO',
          `/dashboard?view=tickets&ticketId=${params.id}`
        );
      }
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
        assignedTo: {
          select: {
            username: true,
            email: true,
          }
        },
        branch: true,
      },
    });

    // Create status history entry if status was updated
    if (status && allowedRoles.includes(authResult.user.role)) {
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

      // Only notify user if status is NOT INVOICE or PAID
      if (status !== 'INVOICE' && status !== 'PAID') {
        await notifyUser(
          ticket.userId,
          statusConfig.title,
          note || `Your ticket status has been updated to ${status}${adminNote ? ` - ${adminNote}` : ''}`,
          statusConfig.type,
          `/dashboard?view=tickets&ticketId=${ticket.id}`
        );

        // Send email to user
        const ticketUser = await prisma.user.findUnique({
          where: { id: ticket.userId },
          select: { email: true, username: true }
        });

        if (ticketUser?.email) {
          const emailHtml = generateTicketEmailHtml({
            headline: statusConfig.title,
            recipientName: ticketUser.username || 'User',
            message: `Your ticket status has been updated to ${status}.`,
            ticket: {
              id: ticket.id,
              issue: ticket.issue,
              status: ticket.status,
              priority: ticket.priority,
              createdAt: ticket.createdAt,
              assignedTo: ticket.assignedTo,
              branch: ticket.branch,
              additionalDetails: ticket.additionalDetails,
            },
            notes: (note ? `Note: ${note}\n` : '') + (adminNote ? `Admin Note: ${adminNote}` : ''),
            link: `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard?view=tickets&ticketId=${ticket.id}`
          });

          await sendEmail(
            ticketUser.email,
            `${statusConfig.title}: ${ticket.issue}`,
            `Hello ${ticketUser.username},\n\n` +
            `Your ticket status has been updated to ${status}.\n` +
            `Note: ${note || 'No additional notes'}\n` +
            (adminNote ? `Admin Note: ${adminNote}\n` : '') +
            `\nView your ticket: ${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard?view=tickets&ticketId=${ticket.id}`,
            emailHtml
          );
        }
      }

      // Send email to assigned user if it's not the current user
      if (ticket.assignedTo?.email && ticket.assignedToUserId !== authResult.user.userId) {
        const emailHtml = generateTicketEmailHtml({
          headline: statusConfig.title,
          recipientName: ticket.assignedTo.username || 'User',
          message: `Ticket status has been updated to ${status}.`,
          ticket: {
            id: ticket.id,
            issue: ticket.issue,
            status: ticket.status,
            priority: ticket.priority,
            createdAt: ticket.createdAt,
            assignedTo: ticket.assignedTo,
            branch: ticket.branch,
            additionalDetails: ticket.additionalDetails,
          },
          notes: (note ? `Note: ${note}\n` : '') + (adminNote ? `Admin Note: ${adminNote}` : ''),
          link: `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard?view=tickets&ticketId=${ticket.id}`
        });

        await sendEmail(
          ticket.assignedTo.email,
          `${statusConfig.title}: ${ticket.issue}`,
          `Hello ${ticket.assignedTo.username},\n\n` +
          `Ticket status has been updated to ${status}.\n` +
          `Note: ${note || 'No additional notes'}\n` +
          (adminNote ? `Admin Note: ${adminNote}\n` : '') +
          `\nView ticket: ${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard?view=tickets&ticketId=${ticket.id}`,
          emailHtml
        );
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
