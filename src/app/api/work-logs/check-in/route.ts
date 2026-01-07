
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Check if there's already an active log for this user and ticket
    // @ts-ignore
    const activeLog = await prisma.workLog.findFirst({
      where: {
        userId: auth.userId,
        ticketId: ticketId,
        endTime: null,
      },
    });

    if (activeLog) {
      return NextResponse.json({ error: 'You are already checked in to this ticket', log: activeLog }, { status: 400 });
    }

    // @ts-ignore
    const log = await prisma.workLog.create({
      data: {
        ticketId,
        userId: auth.userId,
        startTime: new Date(),
      },
    });

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
