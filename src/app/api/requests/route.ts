import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

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

    const where: any = {};

    // Get current user's team info
    const currentUser = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        teamId: true,
        role: true,
      },
    });

    // Regular users can only see requests from users in their team
    if (authResult.user.role === 'USER') {
      if (currentUser?.teamId) {
        if (scope === 'me') {
          where.userId = authResult.user.userId;
        } else {
          // User belongs to a team - show requests from all team members
          where.user = {
            teamId: currentUser.teamId,
          };
        }
      } else {
        // User not in a team - show only their own requests
        where.userId = authResult.user.userId;
      }
    }
    // Admins can see all requests (no filter applied)

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { projectId: { contains: search } },
        { id: { contains: search } },
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
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        attachments: {
          orderBy: {
            uploadedAt: 'desc',
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

    const newRequest = await prisma.request.create({
      data: {
        userId: authResult.user.userId,
        title,
        description,
        projectId: projectId || null,
        status: 'PENDING',
      },
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
        attachments: true,
      },
    });

    return NextResponse.json({ request: newRequest }, { status: 201 });
  } catch (error) {
    console.error('Create request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
