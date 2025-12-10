import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

// GET all notes (admin can see all, users see only their team's)
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    const scope = searchParams.get('scope');

    let where: any = {};

    // Get current user's team info
    const currentUser = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        teamId: true,
        role: true,
      },
    });

    // Regular users can only see notes from tickets in their team
    if (authResult.user.role === 'USER') {
      if (currentUser?.teamId) {
        if (scope === 'me') {
          where.ticket = {
            userId: authResult.user.userId,
          };
        } else {
          // User belongs to a team - show notes from all team tickets
          where.ticket = {
            user: {
              teamId: currentUser.teamId,
            },
          };
        }
      } else {
        // User not in a team - show only notes from their tickets
        where.ticket = {
          userId: authResult.user.userId,
        };
      }
    }

    if (ticketId) {
      where.ticketId = ticketId;
    }

    const notes = await prisma.ticketNote.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            teamId: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        ticket: {
          select: {
            id: true,
            issue: true,
            status: true,
            priority: true,
            incNumber: true,
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Get all notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
