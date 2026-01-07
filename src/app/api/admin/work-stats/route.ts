
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only Admin/Developer/Technical should access stats
    const userRole = (await prisma.user.findUnique({ where: { id: auth.userId } }))?.role;
    if (!['ADMIN', 'DEVELOPER', 'TECHNICAL'].includes(userRole || '')) {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Aggregate total hours per user
    // We want to group by userId and sum duration
    // @ts-ignore
    const logs = await prisma.workLog.findMany({
        where: {
            duration: { not: null }
        },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    role: true
                }
            },
            ticket: {
                select: {
                    id: true,
                    incNumber: true,
                    issue: true,
                    priority: true
                }
            }
        }
    });

    // Grouping manually since Prisma groupBy doesn't support relation text fields easily in one go for user details
    const userStatsMap = new Map<string, { user: any, totalMinutes: number, logs: any[] }>();

    logs.forEach((log: any) => {
        if (!log.duration) return;
        
        if (!userStatsMap.has(log.userId)) {
            userStatsMap.set(log.userId, {
                user: log.user,
                totalMinutes: 0,
                logs: []
            });
        }
        
        const stat = userStatsMap.get(log.userId);
        if (stat) {
            stat.totalMinutes += log.duration;
            stat.logs.push({
                id: log.id,
                startTime: log.startTime, // Use startTime for consistency
                endTime: log.endTime,
                date: log.startTime, // Keep date for backwards compatibility
                duration: log.duration,
                ticket: log.ticket // Include ticket info
            });
        }
    });

    const stats = Array.from(userStatsMap.values()).map(s => ({
        ...s,
        totalHours: Math.round((s.totalMinutes / 60) * 10) / 10
    }));

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
