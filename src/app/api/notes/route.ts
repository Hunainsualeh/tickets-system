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
    const teamId = searchParams.get('teamId');

    let where: any = {};

    // Get current user's team info
    const currentUser = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        teams: {
          select: {
            teamId: true,
          },
        },
        role: true,
      },
    });

    // Regular users can only see notes from tickets in their teams
    if (authResult.user.role === 'USER') {
      const userTeamIds = currentUser?.teams.map(ut => ut.teamId) || [];
      
      if (userTeamIds.length > 0) {
        if (scope === 'me') {
          where.ticket = {
            userId: authResult.user.userId,
          };
        } else {
          // Filter by specific team if teamId is provided
          if (teamId) {
            if (userTeamIds.includes(teamId)) {
              // Strict filtering: Only show notes from tickets explicitly assigned to this team
              where.ticket = {
                teamId: teamId,
              };
            } else {
              // User not allowed to see this team
              where.ticket = {
                teamId: { in: [] },
              };
            }
          } else {
            // All Teams View: Show notes from tickets assigned to any of user's teams
            // AND unassigned tickets created by members of user's teams
            where.ticket = {
              OR: [
                {
                  teamId: {
                    in: userTeamIds,
                  },
                },
                {
                  AND: [
                    { teamId: null },
                    {
                      user: {
                        teams: {
                          some: {
                            teamId: {
                              in: userTeamIds,
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              ],
            };
          }
        }
      } else {
        // User not in any team - show only notes from their tickets
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
            teams: {
              include: {
                team: true,
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
