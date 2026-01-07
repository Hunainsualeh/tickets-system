import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { notifyAdmins, notifyUser } from '@/lib/notifications';
import { sendAdminNotification } from '@/lib/email';
import { generateTicketEmailHtml } from '@/lib/email-templates';
import { generateCustomId } from '@/lib/id-generator';

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
    const assignedToUserId = searchParams.get('assignedToUserId');
    const userId = searchParams.get('userId');

    const where: any = {};

    // Get current user's team info
    const currentUser = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        teamId: true,
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
      let userTeamIds = currentUser?.teams.map(ut => ut.teamId) || [];
      
      // Fallback to legacy teamId if no teams found
      if (userTeamIds.length === 0 && currentUser?.teamId) {
        userTeamIds = [currentUser.teamId];
      }
      
      if (userTeamIds.length > 0) {
        if (scope === 'me') {
          where.OR = [
            { userId: authResult.user.userId },
            { assignedToUserId: authResult.user.userId }
          ];
        } else {
          // Filter by specific team if teamId is provided
          if (teamId) {
            if (userTeamIds.includes(teamId)) {
              // Strict filtering: Only show tickets explicitly assigned to this team
              // OR unassigned tickets created by members of this team
              where.OR = [
                { teamId: teamId },
                {
                  AND: [
                    { teamId: null },
                    {
                      user: {
                        OR: [
                          { teams: { some: { teamId: teamId } } },
                          { teamId: teamId }
                        ]
                      }
                    }
                  ]
                }
              ];
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
                      OR: [
                        {
                          teams: {
                            some: {
                              teamId: {
                                in: userTeamIds,
                              },
                            },
                          },
                        },
                        {
                          teamId: {
                            in: userTeamIds
                          }
                        }
                      ]
                    },
                  },
                ],
              },
            ];
          }
        }
      } else {
        // User not in any team - show only their own tickets or assigned to them
        where.OR = [
          { userId: authResult.user.userId },
          { assignedToUserId: authResult.user.userId }
        ];
      }
    }

    // Developers and Technical users can only see tickets assigned to them
    if (authResult.user.role === 'DEVELOPER' || authResult.user.role === 'TECHNICAL') {
      if (assignedToUserId && assignedToUserId !== authResult.user.userId) {
        return NextResponse.json({ tickets: [] });
      }
      where.assignedToUserId = authResult.user.userId;
    }

    // Admins can see all tickets (no filter applied)

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assignedToUserId) {
      where.assignedToUserId = assignedToUserId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      const searchConditions: any[] = [
        { issue: { contains: search, mode: 'insensitive' } },
        { additionalDetails: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { incNumber: { contains: search, mode: 'insensitive' } },
        { branch: { name: { contains: search, mode: 'insensitive' } } },
        { branch: { branchNumber: { contains: search, mode: 'insensitive' } } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
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
                role: true,
              },
            },
          },
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
    let { branchId, newBranchName, priority, issue, additionalDetails, userId, teamId, localContactName, localContactEmail, localContactPhone, timezone, assignedToUserId, incNumber: providedIncNumber } = await request.json();

    let finalBranchId = branchId;
    let manualBranchName = null;

    // Handle manual branch creation
    if (branchId === 'OTHER' && newBranchName) {
      finalBranchId = null;
      manualBranchName = newBranchName;
    }

    if ((!finalBranchId && !manualBranchName) || !priority || !issue) {
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
    let teamName: string | undefined;

    if (ticketTeamId) {
      const team = await prisma.team.findUnique({
        where: { id: ticketTeamId },
        select: { name: true }
      });
      teamName = team?.name;
    } else {
      const userWithTeams = await prisma.user.findUnique({
        where: { id: ticketUserId },
        select: {
          teams: {
            take: 1,
            select: {
              team: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
          },
        },
      });
      ticketTeamId = userWithTeams?.teams[0]?.team?.id || null;
      teamName = userWithTeams?.teams[0]?.team?.name;
    }

    // Fetch Branch Number and Creator Name for ID generation
    const [branch, creator] = await Promise.all([
      finalBranchId ? prisma.branch.findUnique({
        where: { id: finalBranchId },
        select: { branchNumber: true }
      }) : Promise.resolve(null),
      prisma.user.findUnique({
        where: { id: ticketUserId },
        select: { username: true }
      })
    ]);

    const incNumber = providedIncNumber || generateCustomId(
      teamName,
      creator?.username || 'Unknown',
      branch?.branchNumber || 'MAN',
      'TICKET'
    );

    const ticketData: any = {
        userId: ticketUserId,
        branchId: finalBranchId,
        manualBranchName,
        priority,
        issue,
        additionalDetails,
        status: 'PENDING',
        teamId: ticketTeamId,
        incNumber,
        localContactName,
        localContactEmail,
        localContactPhone,
        timezone,
        assignedToUserId: assignedToUserId || null,
    };

    const ticket = await prisma.ticket.create({
      data: ticketData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
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

    // Create initial status history entry
    await prisma.statusHistory.create({
      data: {
        ticketId: ticket.id,
        status: 'PENDING',
        note: 'Ticket created',
      },
    });

    // Notify assigned user if ticket was assigned during creation
    if (assignedToUserId) {
      await notifyUser(
        assignedToUserId,
        'New Ticket Assigned',
        `You have been assigned to ticket: ${ticket.issue}`,
        'INFO',
        `/dashboard?view=tickets&ticketId=${ticket.id}`
      );
    }

    // Notify admins about new ticket
    const ticketWithUser = ticket as any;
    await notifyAdmins(
      'New Ticket Created',
      `${ticketWithUser.user.username} created a new ${ticket.priority} ticket: ${ticket.issue.substring(0, 50)}${ticket.issue.length > 50 ? '...' : ''}`,
      'INFO',
      `/admin/tickets/${ticket.id}`
    );

    // Send email to admin
    const emailHtml = generateTicketEmailHtml({
      headline: 'New Ticket Created',
      recipientName: 'Admin',
      message: `A new ticket has been created by ${ticketWithUser.user.username}.`,
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
      link: `${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/tickets/${ticket.id}`
    });

    await sendAdminNotification(
      `New Ticket Created: ${ticket.issue}`,
      `A new ticket has been created by ${ticketWithUser.user.username}.\n\n` +
      `Priority: ${ticket.priority}\n` +
      `Issue: ${ticket.issue}\n` +
      `Details: ${ticket.additionalDetails || 'N/A'}\n` +
      `Branch: ${ticket.branch?.name || ticket.manualBranchName || 'N/A'}\n` +
      `Link: ${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/tickets/${ticket.id}`,
      emailHtml
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

// DELETE bulk tickets (Admin only)
export async function DELETE(request: NextRequest) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // Only admins can bulk delete
  if (authResult.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Ticket IDs are required' },
        { status: 400 }
      );
    }

    await prisma.ticket.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({ message: 'Tickets deleted successfully' });
  } catch (error) {
    console.error('Bulk delete tickets error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

