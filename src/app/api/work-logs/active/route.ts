import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeSession = await prisma.workLog.findFirst({
        where: {
            userId: auth.userId,
            endTime: null 
        },
        orderBy: {
            startTime: 'desc'
        }
    });

    // Calculate today's total minutes
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayLogs = await prisma.workLog.findMany({
        where: {
            userId: auth.userId,
            startTime: {
                gte: startOfDay
            },
            endTime: {
                not: null
            }
        }
    });

    const todayMinutes = todayLogs.reduce((acc, log) => acc + (log.duration || 0), 0);

    return NextResponse.json({ activeSession, todayMinutes });
  } catch (error) {
    console.error('Error fetching active session:', error);
    return NextResponse.json({ error: 'Internal User Error' }, { status: 500 });
  }
}
