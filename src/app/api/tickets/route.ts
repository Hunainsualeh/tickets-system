import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { notifyAdmins, notifyUser } from '@/lib/notifications';

// GET all tickets
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const scope = searchParams.get('scope');
    const teamId = searchParams.get('teamId');

    const where: any = {};

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

    // Regular users can only see tickets from users in their teams
    if (authResult.user.role === 'USER') {
      const userTeamIds = currentUser?.teams.map(ut => ut.teamId) || [];
      
      if (userTeamIds.length > 0) {
        if (scope === 'me') {
          where.userId = authResult.user.userId;
        } else {
          // Filter by specific team if teamId is provided
          if (teamId) {
            if (userTeamIds.includes(teamId)) {
              // Strict filtering: Only show tickets explicitly assigned to this team
              where.teamId = teamId;
            } else {
              // User not allowed to see this team
              where.teamId = { in: [] };
            }
          } else {
            // All Teams View: Show tickets assigned to any of user's teams
            // AND unassigned tickets created by members of user's teams
            where.OR = [
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
            ];
          }
        }
      } else {
        // User not in any team - show only their own tickets
        where.userId = authResult.user.userId;
      }
    }
    // Admins can see all tickets (no filter applied)

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { issue: { contains: search } }, // Removed mode: 'insensitive' for SQLite compatibility if needed, or keep if Postgres/MySQL
        { additionalDetails: { contains: search } },
        { id: { contains: search } },
        { branch: { name: { contains: search } } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
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
        branch: true,
        team: true,
        statusHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new ticket
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { branchId, priority, issue, additionalDetails, userId, teamId } = await request.json();

    if (!branchId || !priority || !issue) {
      return NextResponse.json(
        { error: 'Branch, priority, and issue are required' },
        { status: 400 }
      );
    }

    // For regular users, use their own ID
    // For admins, they can create tickets for other users
    let ticketUserId = authResult.user.userId;
    if (authResult.user.role === 'ADMIN' && userId) {
      ticketUserId = userId;
    }

    // Determine team ID: use provided teamId, or get user's first team
    let ticketTeamId = teamId || null;
    if (!ticketTeamId) {
      const userWithTeams = await prisma.user.findUnique({
        where: { id: ticketUserId },
        select: {
          teams: {
            take: 1,
            select: {
              teamId: true,
            },
          },
        },
      });
      ticketTeamId = userWithTeams?.teams[0]?.teamId || null;
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId: ticketUserId,
        branchId,
        priority,
        issue,
        additionalDetails,
        status: 'PENDING',
        teamId: ticketTeamId,
      },
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

    // Create initial status history entry
    await prisma.statusHistory.create({
      data: {
        ticketId: ticket.id,
        status: 'PENDING',
        note: 'Ticket created',
      },
    });

    // Notify admins about new ticket
    await notifyAdmins(
      'New Ticket Created',
      `${ticket.user.username} created a new ${ticket.priority} ticket: ${ticket.issue.substring(0, 50)}${ticket.issue.length > 50 ? '...' : ''}`,
      'INFO',
      `/admin/tickets/${ticket.id}`
    );

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
