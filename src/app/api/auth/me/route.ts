import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        id: true,
        username: true,
        role: true,
        teamId: true,
        createdAt: true,
        updatedAt: true,
        teams: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle legacy teamId if teams is empty
    let userWithTeams = { ...user };
    if (user.teams.length === 0 && user.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: user.teamId },
      });
      if (team) {
        // Construct a fake UserTeam object
        userWithTeams.teams = [{
          id: 'legacy',
          userId: user.id,
          teamId: team.id,
          createdAt: new Date(),
          team: team
        }] as any;
      }
    }

    return NextResponse.json({ 
      user: userWithTeams,
      companyName: "Valley National Bank" 
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
