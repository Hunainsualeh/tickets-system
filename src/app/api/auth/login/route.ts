import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePasswords, generateToken } from '@/lib/auth';

// Rate limiting map (in production, use Redis or a proper rate limiter)
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  if (!attempts || now > attempts.resetTime) {
    loginAttempts.set(identifier, { count: 1, resetTime: now + LOCKOUT_TIME });
    return true;
  }

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  attempts.count++;
  return true;
}

function resetRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { username, password } = body;

    // Input validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input format' },
        { status: 400 }
      );
    }

    // Sanitize username (prevent injection)
    const sanitizedUsername = username.trim().toLowerCase();

    // Check rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `${clientIp}:${sanitizedUsername}`;

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil(LOCKOUT_TIME / 1000)
        },
        { status: 429 }
      );
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { username: sanitizedUsername },
      select: {
        id: true,
        username: true,
        password: true,
        role: true,
        teamId: true,
        createdAt: true,
        teams: {
          include: {
            team: true,
          },
        },
      },
    });

    // Generic error message to prevent user enumeration
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await comparePasswords(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Reset rate limit on successful login
    resetRateLimit(rateLimitKey);

    // Generate JWT token with enhanced payload
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // Return success response with token and user info
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        teamId: user.teamId,
        teams: user.teams,
      },
      expiresIn: '7d',
    });

    // Set secure HTTP-only cookie for additional security
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    // Don't expose internal error details
    return NextResponse.json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}
