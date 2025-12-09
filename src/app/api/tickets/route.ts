import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

// GET all tickets
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');

    const where: any = {};

    // Regular users can only see their own tickets
    if (authResult.user.role === 'USER') {
      where.userId = authResult.user.userId;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { issue: { contains: search } }, // Removed mode: 'insensitive' for SQLite compatibility if needed, or keep if Postgres/MySQL
        { additionalDetails: { contains: search } },
        { id: { contains: search } },
        { branch: { name: { contains: search } } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        branch: true,
        statusHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new ticket
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { branchId, priority, issue, additionalDetails, userId } = await request.json();

    if (!branchId || !priority || !issue) {
      return NextResponse.json(
        { error: 'Branch, priority, and issue are required' },
        { status: 400 }
      );
    }

    // For regular users, use their own ID
    // For admins, they can create tickets for other users
    let ticketUserId = authResult.user.userId;
    if (authResult.user.role === 'ADMIN' && userId) {
      ticketUserId = userId;
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId: ticketUserId,
        branchId,
        priority,
        issue,
        additionalDetails,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        branch: true,
      },
    });

    // Create initial status history entry
    await prisma.statusHistory.create({
      data: {
        ticketId: ticket.id,
        status: 'PENDING',
        note: 'Ticket created',
      },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
