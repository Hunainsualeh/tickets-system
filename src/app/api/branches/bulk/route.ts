import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const branches = await request.json();

    if (!Array.isArray(branches)) {
      return NextResponse.json(
        { error: 'Request body must be an array of branches' },
        { status: 400 }
      );
    }

    if (branches.length === 0) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    // Validate branches
    for (const branch of branches) {
      if (!branch.name || !branch.branchNumber || !branch.category) {
        return NextResponse.json(
          { error: 'All fields (name, branchNumber, category) are required for each branch' },
          { status: 400 }
        );
      }
    }

    // Use createMany with skipDuplicates to ignore existing branch numbers
    const result = await prisma.branch.createMany({
      data: branches.map(b => ({
        name: b.name,
        branchNumber: b.branchNumber,
        category: b.category,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ 
      count: result.count,
      message: `Successfully processed ${branches.length} branches. Created ${result.count} new branches.`
    }, { status: 201 });

  } catch (error) {
    console.error('Bulk create branches error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { ids, deleteAll, search } = await request.json();

    if (deleteAll) {
      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { branchNumber: { contains: search, mode: 'insensitive' } },
        ];
      }

      const result = await prisma.branch.deleteMany({ where });
      
      return NextResponse.json({ 
        count: result.count,
        message: `Successfully deleted ${result.count} branches.`
      }, { status: 200 });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Request body must contain an array of ids' },
        { status: 400 }
      );
    }

    const result = await prisma.branch.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({ 
      count: result.count,
      message: `Successfully deleted ${result.count} branches.`
    }, { status: 200 });

  } catch (error) {
    console.error('Bulk delete branches error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
