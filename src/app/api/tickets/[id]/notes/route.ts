import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { notifyUser, notifyAdmins } from '@/lib/notifications';

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
    } else {
      // User added a note - notify admins
      await notifyAdmins(
        'New Note Added',
        `${newNote.user.username} added a note to ticket: ${note.substring(0, 100)}${note.length > 100 ? '...' : ''}`,
        'INFO',
        `/admin/tickets/${ticket.id}`
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
