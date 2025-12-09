import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

export const authenticateToken = (request: NextRequest) => {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  let token = authHeader && authHeader.split(' ')[1];

  // Fallback to cookie if no header token
  if (!token) {
    token = request.cookies.get('auth-token')?.value || null;
  }

  if (!token) {
    return { authenticated: false, user: null };
  }

  const user = verifyToken(token);
  if (!user) {
    return { authenticated: false, user: null };
  }

  return { authenticated: true, user };
};

export const requireAuth = (request: NextRequest) => {
  const { authenticated, user } = authenticateToken(request);

  if (!authenticated || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return { user };
};

export const requireAdmin = (request: NextRequest) => {
  const { authenticated, user } = authenticateToken(request);

  if (!authenticated || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  return { user };
};
