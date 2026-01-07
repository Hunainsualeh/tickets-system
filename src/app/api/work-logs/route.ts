
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId');
    const userId = searchParams.get('userId');

    const where: any = {};
    if (ticketId) where.ticketId = ticketId;
    if (userId) where.userId = userId;

    // Users can see their own logs.
    // Admin/Developer/Technical can see others? 
    // Let's restrict regular users to their own logs unless ticketId is involved (maybe they can see who worked on their ticket?)
    // For now, allow internal roles to see all, users to see own.
    
    // Actually, "Field Support" and "Developer" implies internal. 
    // Basic auth check already done.
    
    // If not admin/dev/tech, restrict to own userId
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    const isInternal = ['ADMIN', 'DEVELOPER', 'TECHNICAL'].includes(user?.role || '');

    if (!isInternal && (!userId || userId !== auth.userId)) {
         where.userId = auth.userId;
    }

    // @ts-ignore
    const logs = await prisma.workLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          }
        },
        ticket: {
          select: {
            id: true,
            incNumber: true,
            issue: true
          }
        }
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Fetch logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
