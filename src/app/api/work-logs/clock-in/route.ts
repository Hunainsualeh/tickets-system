import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Developers / Field Support (and Admin) can clock in
    if (!['DEVELOPER', 'TECHNICAL', 'ADMIN'].includes(auth.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already has active session
    const existing = await prisma.workLog.findFirst({
        where: {
            userId: auth.userId,
            endTime: null
        }
    });

    if (existing) {
        return NextResponse.json({ error: 'Already clocked in', workLog: existing }, { status: 400 });
    }

    let ticketId: string | undefined;
    try {
        const body = await req.text();
        if (body) {
            const parsed = JSON.parse(body);
            ticketId = parsed.ticketId;
        }
    } catch {
        // No body or invalid JSON is fine
    }

    // Validate ticketId if provided
    let validatedTicketId: string | null = null;
    if (ticketId) {
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            return NextResponse.json({ error: 'Invalid ticketId' }, { status: 400 });
        }
        validatedTicketId = ticketId;
    }

    // Create start entry
    const payload: any = {
        userId: auth.userId,
        ...(validatedTicketId ? { ticketId: validatedTicketId } : {}),
        startTime: new Date()
    };

    const workLog = await prisma.workLog.create({
        data: payload as any
    });
    
    return NextResponse.json({ workLog }, { status: 201 });

  } catch (error) {
    console.error('Error clocking in:', error);
    return NextResponse.json({ error: 'Internal User Error' }, { status: 500 });
  }
}
