import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { notifyUser, notifyAdmins } from '@/lib/notifications';
import { sendAdminNotification, sendEmail } from '@/lib/email';import { generateTicketEmailHtml } from '@/lib/email-templates';
interface Params {
  params: Promise<{
    id: string;
  }>;
}

// GET all notes for a ticket
export async function GET(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const params = await context.params;
    
    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            teamId: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check access for regular users
    if (authResult.user.role === 'USER') {
      const currentUser = await prisma.user.findUnique({
        where: { id: authResult.user.userId },
        select: { teamId: true },
      });

      const hasAccess = 
        ticket.userId === authResult.user.userId ||
        ticket.assignedToUserId === authResult.user.userId ||
        (currentUser?.teamId && ticket.user.teamId && currentUser.teamId === ticket.user.teamId);

      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const notes = await prisma.ticketNote.findMany({
      where: { ticketId: params.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new note for a ticket
export async function POST(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const params = await context.params;
    const { note } = await request.json();

    if (!note) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      );
    }

    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            teamId: true,
          },
        },
        branch: true,
        assignedTo: {
          select: {
            username: true,
          }
        }
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check access for regular users
    if (authResult.user.role === 'USER') {
      const currentUser = await prisma.user.findUnique({
        where: { id: authResult.user.userId },
        select: { teamId: true },
      });

      const hasAccess = 
        ticket.userId === authResult.user.userId ||
        ticket.assignedToUserId === authResult.user.userId ||
        (currentUser?.teamId && ticket.user.teamId && currentUser.teamId === ticket.user.teamId);

      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const newNote = await prisma.ticketNote.create({
      data: {
        ticketId: params.id,
        userId: authResult.user.userId,
        note,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    // Notify about new note
    if (authResult.user.role === 'ADMIN') {
      // Admin added a note - notify the ticket owner
      await notifyUser(
        ticket.userId,
        'New Note on Your Ticket',
        `Admin added a note: ${note.substring(0, 100)}${note.length > 100 ? '...' : ''}`,
        'INFO',
        `/dashboard?view=tickets&ticketId=${ticket.id}`
      );

      // Send email to ticket owner
      const ticketUser = await prisma.user.findUnique({
        where: { id: ticket.userId },
        select: { email: true, username: true }
      });

      if (ticketUser?.email) {
        const emailHtml = generateTicketEmailHtml({
          headline: 'New Note on Ticket',
          recipientName: ticketUser.username || 'User',
          message: 'An admin has added a note to your ticket.',
          ticket: {
            id: ticket.id,
            incNumber: ticket.incNumber,
            issue: ticket.issue,
            status: ticket.status,
            priority: ticket.priority,
            createdAt: ticket.createdAt,
            assignedTo: ticket.assignedTo,
            branch: ticket.branch,
            manualBranchName: ticket.manualBranchName,
            additionalDetails: ticket.additionalDetails,
            localContactName: ticket.localContactName,
            localContactEmail: ticket.localContactEmail,
            localContactPhone: ticket.localContactPhone,
          },
          notes: note,
          link: `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard?view=tickets&ticketId=${ticket.id}`
        });

        await sendEmail(
          ticketUser.email,
          `New Note on Ticket: ${ticket.issue}`,
          `Hello ${ticketUser.username},\n\n` +
          `An admin has added a note to your ticket.\n\n` +
          `Ticket: ${ticket.issue}\n` +
          `Note: ${note}\n` +
          `\nView your ticket: ${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard?view=tickets&ticketId=${ticket.id}`,
          emailHtml
        );
      }
    } else {
      // User added a note - notify admins
      await notifyAdmins(
        'New Note Added',
        `${newNote.user.username} added a note to ticket: ${note.substring(0, 100)}${note.length > 100 ? '...' : ''}`,
        'INFO',
        `/admin/tickets/${ticket.id}`
      );

      // Send email to admins
      const emailHtml = generateTicketEmailHtml({
        headline: 'New Note on Ticket',
        recipientName: 'Admin',
        message: `A new note has been added by ${newNote.user.username} (${authResult.user.role}).`,
        ticket: {
          id: ticket.id,
          incNumber: ticket.incNumber,
          issue: ticket.issue,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          assignedTo: ticket.assignedTo,
          branch: ticket.branch,
          manualBranchName: ticket.manualBranchName,
          additionalDetails: ticket.additionalDetails,
          localContactName: ticket.localContactName,
          localContactEmail: ticket.localContactEmail,
          localContactPhone: ticket.localContactPhone,
        },
        notes: note,
        link: `${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/tickets/${ticket.id}`
      });

      await sendAdminNotification(
        `New Note on Ticket: ${ticket.issue}`,
        `A new note has been added by ${newNote.user.username} (${authResult.user.role}).\n\n` +
        `Ticket: ${ticket.issue}\n` +
        `Note: ${note}\n` +
        `Link: ${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/tickets/${ticket.id}`,
        emailHtml
      );
    }

    return NextResponse.json({ note: newNote }, { status: 201 });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
