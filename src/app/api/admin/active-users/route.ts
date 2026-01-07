import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin should access this
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users who are currently clocked in (have active session with no endTime)
    const activeWorkLogs = await prisma.workLog.findMany({
      where: {
        endTime: null, // No end time means still clocked in
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            email: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    // Calculate elapsed time for each active session
    const now = new Date();
    const activeUsers = activeWorkLogs.map((log) => {
      const startTime = new Date(log.startTime);
      const elapsedMs = now.getTime() - startTime.getTime();
      const elapsedMinutes = Math.floor(elapsedMs / 60000);

      return {
        id: log.id,
        user: log.user,
        startTime: log.startTime,
        elapsedMinutes,
      };
    });

    // Runtime logging for debugging
    console.log('[admin/active-users] called by:', auth.userId, auth.role);
    console.log('[admin/active-users] active usernames:', activeUsers.map(u => u.user.username));

    // Get total user count (DEVELOPER and TECHNICAL only - those who can clock in)
    const totalTrackableUsers = await prisma.user.count({
      where: {
        role: {
          in: ['DEVELOPER', 'TECHNICAL'],
        },
        isActive: true,
      },
    });

    return NextResponse.json({
      activeUsers,
      activeCount: activeUsers.length,
      totalTrackableUsers,
    });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
