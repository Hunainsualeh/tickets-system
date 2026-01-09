/**
 * WebSocket Server - Socket.IO Implementation
 * Banking Ticketing Portal - Real-Time Chat
 * 
 * Security-First Design:
 * - JWT Authentication on every connection
 * - Room-based isolation (company + conversation)
 * - Rate limiting
 * - Input validation
 * - Audit logging
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from './auth';
import {
  sendMessage,
  markMessagesAsRead,
  updatePresence,
  setTypingStatus,
  canAccessConversation,
  createAuditLog,
} from './chat-service';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketAuthPayload,
  PresenceStatus,
  MessageType,
} from '@/types/chat';

// ==========================================
// TYPES
// ==========================================

interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  userId?: string;
  username?: string;
  companyId?: string;
  role?: string;
  authenticated?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ==========================================
// RATE LIMITING
// ==========================================

const rateLimits = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 30;
const MAX_EVENTS_PER_WINDOW = 100;

function checkRateLimit(userId: string, eventType: 'message' | 'event'): boolean {
  const key = `${userId}:${eventType}`;
  const now = Date.now();
  const entry = rateLimits.get(key);
  
  const limit = eventType === 'message' ? MAX_MESSAGES_PER_WINDOW : MAX_EVENTS_PER_WINDOW;

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

// ==========================================
// CONNECTED USERS TRACKING
// ==========================================

const connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

function addConnectedUser(userId: string, socketId: string) {
  if (!connectedUsers.has(userId)) {
    connectedUsers.set(userId, new Set());
  }
  connectedUsers.get(userId)!.add(socketId);
}

function removeConnectedUser(userId: string, socketId: string) {
  const sockets = connectedUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      connectedUsers.delete(userId);
    }
  }
}

function isUserConnected(userId: string): boolean {
  return connectedUsers.has(userId) && connectedUsers.get(userId)!.size > 0;
}

function getUserSocketIds(userId: string): string[] {
  return Array.from(connectedUsers.get(userId) || []);
}

// ==========================================
// SOCKET SERVER INITIALIZATION
// ==========================================

let io: SocketServer<ClientToServerEvents, ServerToClientEvents> | null = null;

export function initializeSocketServer(httpServer: HTTPServer) {
  if (io) {
    console.log('Socket.IO server already initialized');
    return io;
  }

  io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000, // Heartbeat interval
    pingTimeout: 60000,
    transports: ['websocket', 'polling'],
  });

  // ==========================================
  // AUTHENTICATION MIDDLEWARE
  // ==========================================

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyToken(token);
      if (!payload) {
        return next(new Error('Invalid or expired token'));
      }

      // Attach user info to socket
      socket.userId = payload.userId;
      socket.username = payload.username;
      socket.role = payload.role;
      socket.authenticated = true;

      // Get company ID from database for complete isolation
      const { prisma } = await import('./prisma');
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { companyId: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error('User account inactive or not found'));
      }

      socket.companyId = user.companyId || undefined;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // ==========================================
  // CONNECTION HANDLER
  // ==========================================

  io.on('connection', async (socket: AuthenticatedSocket) => {
    if (!socket.userId || !socket.authenticated) {
      socket.disconnect(true);
      return;
    }

    const userId = socket.userId;
    const socketId = socket.id;

    console.log(`User connected: ${socket.username} (${userId}) - Socket: ${socketId}`);

    // Track connected user
    const wasOnline = isUserConnected(userId);
    addConnectedUser(userId, socketId);

    // Update presence to online
    await updatePresence(userId, 'ONLINE', socketId);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join company room for isolation
    if (socket.companyId) {
      socket.join(`company:${socket.companyId}`);
    }

    // Emit authenticated event
    socket.emit('authenticated', { userId, socketId });

    // Broadcast online status if this is first connection
    if (!wasOnline) {
      io?.emit('user_online', { userId, username: socket.username || '' });
      io?.emit('presence_update', {
        userId,
        status: 'ONLINE',
        lastSeenAt: new Date().toISOString(),
      });
    }

    // ==========================================
    // EVENT HANDLERS
    // ==========================================

    // Join conversation room
    socket.on('join_conversation', async (conversationId: string) => {
      if (!checkRateLimit(userId, 'event')) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many requests' });
        return;
      }

      try {
        const hasAccess = await canAccessConversation(userId, conversationId);
        if (!hasAccess) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Access denied to conversation' });
          return;
        }

        socket.join(`chat:${conversationId}`);
        console.log(`User ${userId} joined conversation ${conversationId}`);
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { code: 'JOIN_FAILED', message: 'Failed to join conversation' });
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`chat:${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // Send message
    socket.on('send_message', async (data) => {
      if (!checkRateLimit(userId, 'message')) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Message rate limit exceeded' });
        return;
      }

      try {
        const { conversationId, content, messageType, replyToId, tempId, ticketId, requestId } = data;

        // Validate input
        if (!conversationId || !content || typeof content !== 'string') {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid message data' });
          return;
        }

        // Sanitize content (basic XSS prevention)
        const sanitizedContent = content
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .trim();

        if (sanitizedContent.length === 0 || sanitizedContent.length > 10000) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid message length' });
          return;
        }

        const message = await sendMessage({
          conversationId,
          senderId: userId,
          content: sanitizedContent,
          messageType: (messageType as MessageType) || 'TEXT',
          replyToId,
          ticketId, 
          requestId
        });

        // Broadcast to conversation room
        io?.to(`chat:${conversationId}`).emit('new_message', {
          ...message,
          createdAt: message.createdAt.toISOString(),
          status: 'SENT',
        } as any);

        console.log(`Message sent in conversation ${conversationId} by ${userId}`);

        // Notification: Emit to participants
        try {
          const { prisma } = await import('./prisma');
          const participants = await prisma.conversationParticipant.findMany({
            where: { 
              conversationId, 
              leftAt: null,
              userId: { not: userId }
            },
            select: { userId: true }
          });

          participants.forEach(p => {
             // Emit to user's personal room
             io?.to(`user:${p.userId}`).emit('new_notification', {
                id: `temp-${Date.now()}-${Math.random()}`,
                userId: p.userId,
                title: `New message from ${socket.username || 'User'}`,
                message: sanitizedContent.length > 50 ? `${sanitizedContent.substring(0, 50)}...` : sanitizedContent,
                type: 'INFO',
                read: false,
                createdAt: new Date().toISOString(),
             });
          });
        } catch (notifError) {
           console.error('Failed to emit socket notifications:', notifError);
        }
      } catch (error: any) {
        console.error('Error sending message:', error);
        socket.emit('error', { 
          code: 'SEND_FAILED', 
          message: error.message || 'Failed to send message' 
        });
      }
    });

    // Edit message
    socket.on('edit_message', async (data) => {
      if (!checkRateLimit(userId, 'event')) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many requests' });
        return;
      }

      try {
        const { messageId, content } = data;
        
        // Import edit function
        const { editMessage } = await import('./chat-service');
        const updatedMessage = await editMessage(messageId, userId, content);

        // Get conversation ID for broadcast
        const { prisma } = await import('./prisma');
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { conversationId: true },
        });

        if (message) {
          io?.to(`chat:${message.conversationId}`).emit('message_updated', {
            ...updatedMessage,
            createdAt: updatedMessage.createdAt.toISOString(),
            editedAt: updatedMessage.editedAt?.toISOString() || null,
          } as any);
        }
      } catch (error: any) {
        socket.emit('error', { code: 'EDIT_FAILED', message: error.message || 'Failed to edit message' });
      }
    });

    // Delete message
    socket.on('delete_message', async (data) => {
      if (!checkRateLimit(userId, 'event')) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many requests' });
        return;
      }

      try {
        const { messageId } = data;
        
        const { deleteMessage } = await import('./chat-service');
        const result = await deleteMessage(messageId, userId);

        io?.to(`chat:${result.conversationId}`).emit('message_deleted', {
          messageId: result.messageId,
          conversationId: result.conversationId,
        });
      } catch (error: any) {
        socket.emit('error', { code: 'DELETE_FAILED', message: error.message || 'Failed to delete message' });
      }
    });

    // Mark messages as read
    socket.on('mark_read', async (data) => {
      if (!checkRateLimit(userId, 'event')) return;

      try {
        const { conversationId, messageIds } = data;
        const result = await markMessagesAsRead(conversationId, userId, messageIds);

        // Broadcast read status to conversation
        io?.to(`chat:${conversationId}`).emit('messages_read', {
          conversationId,
          userId,
          readAt: result.readAt,
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Typing indicators
    socket.on('typing_start', async (conversationId: string) => {
      if (!checkRateLimit(userId, 'event')) return;

      try {
        await setTypingStatus(conversationId, userId, true);
        socket.to(`chat:${conversationId}`).emit('user_typing', {
          conversationId,
          userId,
          username: socket.username || '',
          isTyping: true,
        });
      } catch (error) {
        console.error('Error updating typing status:', error);
      }
    });

    socket.on('typing_stop', async (conversationId: string) => {
      try {
        await setTypingStatus(conversationId, userId, false);
        socket.to(`chat:${conversationId}`).emit('user_typing', {
          conversationId,
          userId,
          username: socket.username || '',
          isTyping: false,
        });
      } catch (error) {
        console.error('Error updating typing status:', error);
      }
    });

    // Presence updates
    socket.on('update_presence', async (status: PresenceStatus) => {
      if (!checkRateLimit(userId, 'event')) return;

      try {
        await updatePresence(userId, status, socketId);
        io?.emit('presence_update', {
          userId,
          status,
          lastSeenAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    });

    // Heartbeat
    socket.on('heartbeat', async () => {
      try {
        await updatePresence(userId, 'ONLINE', socketId);
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    });

    // ==========================================
    // DISCONNECT HANDLER
    // ==========================================

    socket.on('disconnect', async (reason) => {
      console.log(`User disconnected: ${socket.username} (${userId}) - Reason: ${reason}`);

      removeConnectedUser(userId, socketId);

      // Only set offline if no other connections
      if (!isUserConnected(userId)) {
        await updatePresence(userId, 'OFFLINE');
        io?.emit('user_offline', { userId, username: socket.username || '' });
        io?.emit('presence_update', {
          userId,
          status: 'OFFLINE',
          lastSeenAt: new Date().toISOString(),
        });
      }

      // Clear typing status in all conversations
      const { prisma } = await import('./prisma');
      await prisma.conversationParticipant.updateMany({
        where: { userId },
        data: { isTyping: false },
      });
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  console.log('Socket.IO server initialized');
  return io;
}

// ==========================================
// UTILITY EXPORTS
// ==========================================

export function getSocketServer() {
  return io;
}

export function emitToUser(userId: string, event: keyof ServerToClientEvents, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToConversation(conversationId: string, event: keyof ServerToClientEvents, data: any) {
  if (io) {
    io.to(`chat:${conversationId}`).emit(event, data);
  }
}

export function emitToCompany(companyId: string, event: keyof ServerToClientEvents, data: any) {
  if (io) {
    io.to(`company:${companyId}`).emit(event, data);
  }
}

export function getOnlineUserIds(): string[] {
  return Array.from(connectedUsers.keys());
}

export function getConnectionCount(): number {
  let count = 0;
  for (const sockets of connectedUsers.values()) {
    count += sockets.size;
  }
  return count;
}
