import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.userId;

    // Get work logs for the current user from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const workLogs = await prisma.workLog.findMany({
      where: {
        userId: userId,
        startTime: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        ticket: {
          select: {
            id: true,
            incNumber: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    // Calculate total hours
    const totalMinutes = workLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
    const totalHours = totalMinutes / 60;

    // Group by day for chart data
    const dailyStats: Record<string, number> = {};
    workLogs.forEach(log => {
      const day = log.startTime.toISOString().split('T')[0];
      dailyStats[day] = (dailyStats[day] || 0) + (log.duration || 0) / 60;
    });

    // Format logs for display
    const formattedLogs = workLogs.map(log => ({
      id: log.id,
      startTime: log.startTime,
      endTime: log.endTime,
      duration: log.duration,
      ticket: log.ticket ? {
        id: log.ticket.id,
        incNumber: log.ticket.incNumber
      } : null
    }));

    // Return in a format compatible with TimeStats (matching admin format)
    const stats = [{
      user: {
        id: userId,
        username: auth.username || 'User',
        role: auth.role
      },
      totalHours: totalHours,
      logs: formattedLogs,
      dailyStats: dailyStats
    }];

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching my stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
