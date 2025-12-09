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
    const branches = await prisma.branch.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ branches });
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
    const { name, branchNumber, address, localContact, category } = await request.json();

    if (!name || !branchNumber || !address || !localContact || !category) {
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
        address,
        localContact,
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
