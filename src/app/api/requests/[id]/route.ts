import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// GET single request
export async function GET(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const params = await context.params;
    const requestData = await prisma.request.findUnique({
      where: { id: params.id },
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
    });

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Regular users can only view requests from their team or their own requests
    if (authResult.user.role === 'USER') {
      const currentUser = await prisma.user.findUnique({
        where: { id: authResult.user.userId },
        select: { teamId: true },
      });

      const requestUser = await prisma.user.findUnique({
        where: { id: requestData.userId },
        select: { teamId: true },
      });

      // Allow access if:
      // 1. It's the user's own request, OR
      // 2. Both users are in the same team (and team is not null)
      const hasAccess = 
        requestData.userId === authResult.user.userId ||
        (currentUser?.teamId && requestUser?.teamId && currentUser.teamId === requestUser.teamId);

      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ request: requestData });
  } catch (error) {
    console.error('Get request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update request (Admin only for status updates)
export async function PUT(request: NextRequest, context: Params) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const params = await context.params;
    const { status, title, description, projectId } = await request.json();

    const updateData: any = {};
    
    // Status updates are admin only
    if (status && authResult.user.role === 'ADMIN') {
      updateData.status = status;
    }

    // Users can update their own request details if it's still pending
    const existingRequest = await prisma.request.findUnique({
      where: { id: params.id },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check if user owns the request
    if (existingRequest.userId === authResult.user.userId && existingRequest.status === 'PENDING') {
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (projectId !== undefined) updateData.projectId = projectId;
    } else if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedRequest = await prisma.request.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({ request: updatedRequest });
  } catch (error) {
    console.error('Update request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE request (Admin only)
export async function DELETE(request: NextRequest, context: Params) {
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const params = await context.params;
    await prisma.request.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Delete request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
