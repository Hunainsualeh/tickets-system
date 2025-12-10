import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

// GET all branches
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '1000'); // Default high for backward compatibility
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { branchNumber: { contains: search, mode: 'insensitive' } },
      ]
    } : {};

    const [branches, total] = await prisma.$transaction([
      prisma.branch.findMany({
        where: where as any,
        orderBy: {
          name: 'asc',
        },
        skip,
        take: limit,
      }),
      prisma.branch.count({ where: where as any }),
    ]);

    return NextResponse.json({ 
      branches,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Get branches error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new branch (Admin only)
export async function POST(request: NextRequest) {
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { name, branchNumber, category } = await request.json();

    if (!name || !branchNumber || !category) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if branch number already exists
    const existingBranch = await prisma.branch.findUnique({
      where: { branchNumber },
    });

    if (existingBranch) {
      return NextResponse.json(
        { error: 'Branch number already exists' },
        { status: 409 }
      );
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        branchNumber,
        category,
      },
    });

    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    console.error('Create branch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
