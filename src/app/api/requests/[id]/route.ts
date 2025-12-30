import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notifications';

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
    });

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Regular users can only view requests from their team or their own requests
    if (authResult.user.role === 'USER') {
      const currentUser = await prisma.user.findUnique({
        where: { id: authResult.user.userId },
        select: { 
          teamId: true,
          teams: { select: { teamId: true } }
        },
      });

      const requestUser = await prisma.user.findUnique({
        where: { id: requestData.userId },
        select: { 
          teamId: true,
          teams: { select: { teamId: true } }
        },
      });

      const currentUserTeamIds = [
        currentUser?.teamId,
        ...(currentUser?.teams?.map(t => t.teamId) || [])
      ].filter(Boolean) as string[];

      const requestUserTeamIds = [
        requestUser?.teamId,
        ...(requestUser?.teams?.map(t => t.teamId) || [])
      ].filter(Boolean) as string[];

      // Allow access if:
      // 1. It's the user's own request, OR
      // 2. They share at least one team
      const hasAccess = 
        requestData.userId === authResult.user.userId ||
        currentUserTeamIds.some(id => requestUserTeamIds.includes(id));

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

      // Create history record
      await prisma.requestHistory.create({
        data: {
          requestId: params.id,
          status: status,
          note: `Status updated to ${status}`,
        }
      });
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

    // If no changes, return the existing request with full details
    if (Object.keys(updateData).length === 0) {
      const fullRequest = await prisma.request.findUnique({
        where: { id: params.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              teamId: true,
              teams: { include: { team: true } },
            },
          },
          attachments: true,
          history: { orderBy: { createdAt: 'desc' } },
        },
      });
      return NextResponse.json({ request: fullRequest });
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
            teams: {
              include: {
                team: true,
              },
            },
          },
        },
        attachments: true,
        history: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // Notify user about status change if admin updated it
    if (status && authResult.user.role === 'ADMIN') {
      const statusMessages: Record<string, { title: string; type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' }> = {
        APPROVED: { title: 'Request Approved', type: 'SUCCESS' },
        REJECTED: { title: 'Request Rejected', type: 'WARNING' },
        IN_PROGRESS: { title: 'Request In Progress', type: 'INFO' },
        COMPLETED: { title: 'Request Completed', type: 'SUCCESS' },
      };

      const statusConfig = statusMessages[status] || { title: 'Request Status Updated', type: 'INFO' };
      await notifyUser(
        updatedRequest.userId,
        statusConfig.title,
        `Your request "${updatedRequest.title}" status has been updated to ${status}`,
        statusConfig.type,
        `/dashboard?view=requests&requestId=${updatedRequest.id}`
      );
    }

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
