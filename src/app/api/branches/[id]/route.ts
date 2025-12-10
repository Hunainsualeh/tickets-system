import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// GET single branch
export async function GET(request: NextRequest, context: Params) {
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const params = await context.params;
    const branch = await prisma.branch.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    return NextResponse.json({ branch });
  } catch (error) {
    console.error('Get branch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update branch
export async function PUT(request: NextRequest, context: Params) {
  const params = await context.params;
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { name, branchNumber, category } = await request.json();

    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (branchNumber) updateData.branchNumber = branchNumber;
    if (category) updateData.category = category;

    const branch = await prisma.branch.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ branch });
  } catch (error) {
    console.error('Update branch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE branch
export async function DELETE(request: NextRequest, context: Params) {
  const params = await context.params;
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    await prisma.branch.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Delete branch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
