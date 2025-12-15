import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// GET single user
export async function GET(request: NextRequest, context: Params) {
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const params = await context.params;
    const user = await prisma.user.findUnique({
      where: { id: params.id },
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
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update user
export async function PUT(request: NextRequest, context: Params) {
  const params = await context.params;
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { username, password, role, teamIds } = await request.json();

    // Validate teams if provided
    if (teamIds !== undefined && Array.isArray(teamIds) && teamIds.length > 0) {
      const teams = await prisma.team.findMany({
        where: { id: { in: teamIds } },
      });

      if (teams.length !== teamIds.length) {
        return NextResponse.json(
          { error: 'One or more invalid teams selected' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    
    if (username) updateData.username = username;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await hashPassword(password);
    }

    // Handle team assignments
    if (teamIds !== undefined) {
      // Get current teams before deletion
      const currentTeams = await prisma.userTeam.findMany({
        where: { userId: params.id },
        select: { teamId: true },
      });
      const currentTeamIds = currentTeams.map(t => t.teamId);

      // Delete existing team assignments
      await prisma.userTeam.deleteMany({
        where: { userId: params.id },
      });

      // Create new team assignments
      if (Array.isArray(teamIds) && teamIds.length > 0) {
        updateData.teams = {
          create: teamIds.map((teamId: string) => ({
            teamId,
          })),
        };

        // Notify user about new team assignments (not user creation)
        const newTeamIds = teamIds.filter((tid: string) => !currentTeamIds.includes(tid));
        if (newTeamIds.length > 0) {
          const newTeams = await prisma.team.findMany({
            where: { id: { in: newTeamIds } },
            select: { name: true },
          });
          
          if (newTeams.length > 0) {
            const teamNames = newTeams.map(t => t.name).join(', ');
            await notifyUser(
              params.id,
              'Added to Team',
              `You have been added to ${newTeams.length > 1 ? 'teams' : 'team'}: ${teamNames}`,
              'SUCCESS',
              '/dashboard'
            );
          }
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE user
export async function DELETE(request: NextRequest, context: Params) {
  const params = await context.params;
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
