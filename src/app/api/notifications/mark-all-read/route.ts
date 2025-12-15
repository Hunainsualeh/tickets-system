import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenEdge } from '@/lib/jwt-edge';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Check Authorization header first
    const authHeader = request.headers.get('authorization');
    let token: string | undefined | null = authHeader ? authHeader.split(' ')[1] : undefined;

    // Fallback to cookie if no header token
    if (!token) {
      token = request.cookies.get('auth-token')?.value || request.cookies.get('token')?.value;
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyTokenEdge(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: {
        userId: decoded.userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
