import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET: string = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';
const JWT_ISSUER = 'ticketing-system';
const JWT_AUDIENCE = 'ticketing-app-users';

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}


export const verifyAuth = async (req: NextRequest) => {
  const token = req.headers.get('authorization')?.split(' ')[1];

  if (!token) {
    return null;
  }

  try {
    const decoded = verifyToken(token);
    return decoded;
  } catch (error) {
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  // Use a higher cost factor for better security
  return await bcrypt.hash(password, 12);
};

export const comparePasswords = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: JWTPayload): string => {
  // Add additional security claims
  return jwt.sign(
    {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      // Add timestamp for token tracking
      timestamp: Date.now(),
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      // Use RS256 algorithm in production for better security
      algorithm: 'HS256',
    } as jwt.SignOptions
  );
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    }) as JWTPayload;

    // Additional validation
    if (!decoded.userId || !decoded.username || !decoded.role) {
      console.error('Invalid token payload: missing required fields');
      return null;
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error('Token expired:', error.message);
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error('Invalid token:', error.message);
    } else {
      console.error('Token verification error:', error);
    }
    return null;
  }
};

export const refreshToken = (oldToken: string): string | null => {
  const payload = verifyToken(oldToken);
  if (!payload) {
    return null;
  }

  // Generate new token with same payload
  return generateToken({
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
  });
};
