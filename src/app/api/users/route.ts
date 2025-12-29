import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { sendAdminNotification, sendEmail } from '@/lib/email';
import { generateWelcomeEmailHtml, generateNewUserAdminEmailHtml } from '@/lib/email-templates';

// GET all users (Admin only)
export async function GET(request: NextRequest) {
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const users = await prisma.user.findMany({
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
            assignedTickets: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// POST create new user (Admin only)
export async function POST(request: NextRequest) {
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { username, password, role, teamIds, email } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Sanitize username
    const sanitizedUsername = username.trim().toLowerCase();

    // Check if username already exists (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: { 
        username: {
          equals: sanitizedUsername,
          mode: 'insensitive'
        }
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Check if email already exists
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }
    }

    // Validate teams if provided
    if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
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

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username: sanitizedUsername,
        email: email || null,
        password: hashedPassword,
        role: role || 'USER',
        teams: teamIds && Array.isArray(teamIds) && teamIds.length > 0 ? {
          create: teamIds.map((teamId: string) => ({
            teamId,
          })),
        } : undefined,
      },
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

    // Send welcome email to user
    if (user.email) {
      const welcomeHtml = generateWelcomeEmailHtml({
        username: user.username,
        role: user.role,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/login`
      });

      await sendEmail(
        user.email,
        'Welcome to Ticket System',
        `Hello ${user.username},\n\nWelcome to the Ticket System. Your account has been created.\n\nUsername: ${user.username}\nRole: ${user.role}\n\nLog in here: ${process.env.NEXT_PUBLIC_APP_URL || ''}/login`,
        welcomeHtml
      );
    }

    // Send email to admin
    const adminHtml = generateNewUserAdminEmailHtml({
      username: user.username,
      email: user.email || 'N/A',
      role: user.role,
      adminUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/users`
    });

    await sendAdminNotification(
      `New User Created: ${user.username}`,
      `A new user has been created.\n\n` +
      `Username: ${user.username}\n` +
      `Email: ${user.email || 'N/A'}\n` +
      `Role: ${user.role}\n` +
      `Link: ${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/users`,
      adminHtml
    );

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE bulk users (Admin only)
export async function DELETE(request: NextRequest) {
  const authResult = requireAdmin(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'User IDs are required' },
        { status: 400 }
      );
    }

    // Prevent deleting self
    if (ids.includes(authResult.user.userId)) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await prisma.user.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({ message: 'Users deleted successfully' });
  } catch (error) {
    console.error('Bulk delete users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
