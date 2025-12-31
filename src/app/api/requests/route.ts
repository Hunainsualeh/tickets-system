import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { notifyAdmins } from '@/lib/notifications';
import { sendAdminNotification } from '@/lib/email';
import { generateNewRequestEmailHtml } from '@/lib/email-templates';
import { generateCustomId } from '@/lib/id-generator';

// GET all requests
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const scope = searchParams.get('scope');
    const teamId = searchParams.get('teamId');

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

    // Regular users can only see requests from users in their teams
    if (authResult.user.role === 'USER') {
      let userTeamIds = currentUser?.teams?.map(ut => ut.teamId) || [];
      
      // Fallback to legacy teamId if no teams found
      if (userTeamIds.length === 0 && currentUser?.teamId) {
        userTeamIds = [currentUser.teamId];
      }
      
      if (userTeamIds.length > 0) {
        if (scope === 'me') {
          where.userId = authResult.user.userId;
        } else {
          // Filter by specific team if teamId is provided
          if (teamId) {
            if (userTeamIds.includes(teamId)) {
              // Show requests from users in THIS team
              where.user = {
                OR: [
                  { teams: { some: { teamId: teamId } } },
                  { teamId: teamId }
                ]
              };
            } else {
              // User not allowed to see this team
              return NextResponse.json({ requests: [] });
            }
          } else {
            // User belongs to teams - show requests from all team members
            where.user = {
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
            };
          }
        }
      } else {
        // User not in any team - show only their own requests
        where.userId = authResult.user.userId;
      }
    }
    // Admins can see all requests (no filter applied)

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { projectId: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const requests = await prisma.request.findMany({
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
        attachments: {
          orderBy: {
            uploadedAt: 'desc',
          },
        },
        history: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new request
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { title, description, projectId } = await request.json();

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Fetch User details for ID generation
    const userWithTeams = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        username: true,
        teams: {
          take: 1,
          select: {
            team: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    const teamName = userWithTeams?.teams[0]?.team?.name;
    const requestNumber = generateCustomId(
      teamName,
      userWithTeams?.username || 'Unknown',
      'REQ',
      'REQUEST'
    );

    const newRequest = await prisma.request.create({
      data: {
        userId: authResult.user.userId,
        title,
        description,
        projectId: projectId || null,
        status: 'PENDING',
        requestNumber,
        history: {
          create: {
            status: 'PENDING',
            note: 'Request created',
          }
        }
      },
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
        attachments: true,
        history: true,
      },
    });

    // Notify admins about new request (non-blocking)
    try {
      await notifyAdmins(
        'New Request Created',
        `${newRequest.user.username} created a new request: ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`,
        'INFO',
        `/admin/requests/${newRequest.id}`
      );

      // Send email to admin
      const emailHtml = generateNewRequestEmailHtml({
        title: newRequest.title,
        description: newRequest.description,
        username: newRequest.user.username,
        projectId: newRequest.projectId || undefined,
        requestId: newRequest.id,
        requestUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/requests/${newRequest.id}`,
        requestNumber: newRequest.requestNumber || undefined
      });

      await sendAdminNotification(
        `New Request Created: ${newRequest.title}`,
        `A new request has been created by ${newRequest.user.username}.\n\n` +
        `Title: ${newRequest.title}\n` +
        `Description: ${newRequest.description}\n` +
        `Project ID: ${newRequest.projectId || 'N/A'}\n` +
        `Link: ${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/requests/${newRequest.id}`,
        emailHtml
      );
    } catch (notifyError) {
      console.error('Failed to send notifications for new request:', notifyError);
      // Continue execution - don't fail the request just because notification failed
    }

    return NextResponse.json({ request: newRequest }, { status: 201 });
  } catch (error) {
    console.error('Create request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE bulk requests (Admin only)
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
        { error: 'Request IDs are required' },
        { status: 400 }
      );
    }

    await prisma.request.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({ message: 'Requests deleted successfully' });
  } catch (error) {
    console.error('Bulk delete requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
