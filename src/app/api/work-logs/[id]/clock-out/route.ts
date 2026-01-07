import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function PUT(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const workLog = await prisma.workLog.findUnique({
        where: { id }
    });

    if (!workLog) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Only the owner of the session or an ADMIN can close it
    if (workLog.userId !== auth.userId && auth.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure only allowed roles (DEVELOPER/TECHNICAL) create/close sessions (admins allowed)
    if (auth.role !== 'ADMIN' && !['DEVELOPER', 'TECHNICAL'].includes(auth.role) && workLog.userId !== auth.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (workLog.endTime) {
         return NextResponse.json({ error: 'Session already ended' }, { status: 400 });
    }

    const endTime = new Date();
    // Calculate duration in minutes (ensure at least 1 minute)
    const duration = Math.max(1, Math.round((endTime.getTime() - new Date(workLog.startTime).getTime()) / 60000));

    const updated = await prisma.workLog.update({
        where: { id },
        data: {
            endTime,
            duration
        }
    });

    return NextResponse.json({ workLog: updated });

  } catch (error) {
    console.error('Error clocking out:', error);
    return NextResponse.json({ error: 'Internal User Error' }, { status: 500 });
  }
}
