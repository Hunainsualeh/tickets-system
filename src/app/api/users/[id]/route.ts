import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { notifyUser } from '@/lib/notifications';
import { sendAdminNotification } from '@/lib/email';
import { generateUserUpdatedEmailHtml } from '@/lib/email-templates';

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
        email: true,
        role: true,
        isActive: true,
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
      { error: 'Internal server error', details: String(error) },
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
    const { username, password, role, teamIds, isActive, email } = await request.json();

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
    
    if (username) {
      const sanitizedUsername = username.trim().toLowerCase();
      
      // Check if username exists (excluding current user)
      const existingUser = await prisma.user.findFirst({
        where: {
          username: {
            equals: sanitizedUsername,
            mode: 'insensitive'
          },
          NOT: {
            id: params.id
          }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 409 }
        );
      }

      updateData.username = sanitizedUsername;
    }

    if (email !== undefined) {
      if (email) {
        const existingEmail = await prisma.user.findFirst({
          where: {
            email: email,
            NOT: { id: params.id }
          }
        });
        if (existingEmail) {
          return NextResponse.json(
            { error: 'Email already exists' },
            { status: 409 }
          );
        }
        updateData.email = email;
      } else {
        updateData.email = null;
      }
    }
    
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
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
          
          await notifyUser(
            params.id,
            'Team Assignment',
            `You have been added to teams: ${newTeams.map(t => t.name).join(', ')}`,
            'INFO'
          );
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
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

    // Prepare changes list for email
    const changes: string[] = [];
    if (username) changes.push(`Username changed to ${username}`);
    if (email !== undefined) changes.push(`Email changed to ${email || 'removed'}`);
    if (role) changes.push(`Role changed to ${role}`);
    if (isActive !== undefined) changes.push(`Status changed to ${isActive ? 'Active' : 'Inactive'}`);
    if (password) changes.push('Password updated');
    if (teamIds !== undefined) changes.push('Team assignments updated');

    // Send email to admin
    const emailHtml = generateUserUpdatedEmailHtml({
      username: user.username,
      email: user.email || '',
      role: user.role,
      changes,
      adminUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/users`
    });

    await sendAdminNotification(
      `User Updated: ${user.username}`,
      `A user has been updated.\n\n` +
      `Username: ${user.username}\n` +
      `Email: ${user.email || 'N/A'}\n` +
      `Role: ${user.role}\n` +
      `Changes: ${changes.join(', ')}\n` +
      `Link: ${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/users`,
      emailHtml
    );

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
