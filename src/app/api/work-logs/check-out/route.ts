
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { logId } = await req.json();

    if (!logId) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    // @ts-ignore
    const log = await prisma.workLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    if (log.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (log.endTime) {
      return NextResponse.json({ error: 'Already checked out' }, { status: 400 });
    }

    const endTime = new Date();
    const startTime = new Date(log.startTime);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);

    // @ts-ignore
    const updatedLog = await prisma.workLog.update({
      where: { id: logId },
      data: {
        endTime,
        duration: durationMinutes,
      },
    });

    return NextResponse.json({ log: updatedLog });
  } catch (error) {
    console.error('Check-out error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
