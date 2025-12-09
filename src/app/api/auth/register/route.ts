import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Public registration is disabled
    // Only admins can create user accounts through the admin panel
    return NextResponse.json(
      { 
        error: 'Public registration is disabled. Please contact an administrator to create an account.',
        code: 'REGISTRATION_DISABLED'
      },
      { status: 403 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    
    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
