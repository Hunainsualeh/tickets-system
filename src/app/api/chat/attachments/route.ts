/**
 * Chat Attachments API Route
 * POST - Upload attachment to a conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { canAccessConversation, getChatPermissions, createAuditLog } from '@/lib/chat-service';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Allowed file types for banking compliance
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// POST /api/chat/attachments
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversationId') as string | null;
    const messageContent = formData.get('message') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Verify access and permissions
    const hasAccess = await canAccessConversation(authResult.user.userId, conversationId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to conversation' },
        { status: 403 }
      );
    }

    const permissions = await getChatPermissions(authResult.user.userId, conversationId);
    if (!permissions.canUploadFiles) {
      return NextResponse.json(
        { error: 'File upload not allowed in this conversation' },
        { status: 403 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Allowed types: images, PDF, Word, Excel, CSV, TXT' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Generate secure filename
    const fileExtension = path.extname(file.name);
    const secureFileName = `${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
    
    // Create upload directory structure
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat', conversationId);
    await mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, secureFileName);
    const fileUrl = `/uploads/chat/${conversationId}/${secureFileName}`;

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Create message with attachment
    const messageType = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
    const content = messageContent || `Shared ${file.type.startsWith('image/') ? 'an image' : 'a file'}: ${file.name}`;

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: authResult.user.userId,
        content,
        messageType,
        status: 'SENT',
        attachments: {
          create: {
            fileName: file.name,
            fileUrl,
            fileSize: file.size,
            mimeType: file.type,
          },
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        attachments: true,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Audit log
    await createAuditLog(
      authResult.user.userId,
      'UPLOAD_ATTACHMENT',
      'ATTACHMENT',
      message.attachments[0].id,
      {
        conversationId,
        messageId: message.id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      request.headers.get('user-agent') || undefined
    );

    // Emit to socket if available
    try {
      const { emitToConversation } = await import('@/lib/socket-server');
      emitToConversation(conversationId, 'new_message', {
        ...message,
        createdAt: message.createdAt.toISOString(),
        attachments: message.attachments.map(att => ({
          ...att,
          uploadedAt: att.uploadedAt.toISOString(),
        })),
      });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    return NextResponse.json({
      message: {
        ...message,
        createdAt: message.createdAt.toISOString(),
        attachments: message.attachments.map(att => ({
          ...att,
          uploadedAt: att.uploadedAt.toISOString(),
        })),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading attachment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload attachment' },
      { status: 500 }
    );
  }
}
