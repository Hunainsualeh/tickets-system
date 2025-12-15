import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenEdge } from '@/lib/jwt-edge';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
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

    const notifications = await prisma.notification.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 notifications
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: decoded.userId,
        read: false,
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

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
    if (!decoded || !decoded.userId || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, title, message, type, link } = body;

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'INFO',
        link,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
