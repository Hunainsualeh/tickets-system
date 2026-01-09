/**
 * Chat Service - Backend Logic
 * Handles all chat operations with multi-tenant security
 * Banking Ticketing Portal
 */

import { prisma } from './prisma';
import { createNotification } from './notifications';
import type {
  Conversation,
  ConversationParticipant,
  Message,
  ChatUser,
  ChatPermissions,
  ConversationContext,
  PresenceStatus,
  MessageType,
  ConversationStatus,
  ChatAuditAction,
} from '@/types/chat';

// ==========================================
// AUDIT LOGGING
// ==========================================

export async function createAuditLog(
  userId: string,
  action: ChatAuditAction,
  resourceType: 'CONVERSATION' | 'MESSAGE' | 'ATTACHMENT',
  resourceId: string,
  metadata?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await prisma.chatAuditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break operations
  }
}

// ==========================================
// AUTHORIZATION HELPERS
// ==========================================

/**
 * Check if a user can access a conversation
 * Verifies: participant membership + company isolation
 */
export async function canAccessConversation(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
      leftAt: null, // Must be active participant
    },
    include: {
      user: {
        select: {
          companyId: true,
          role: true,
        },
      },
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: { companyId: true },
              },
            },
          },
        },
      },
    },
  });

  if (!participant) return false;

  // Admins can access conversations within their company scope
  const userCompanyId = participant.user.companyId;
  
  // Ensure all participants belong to allowed companies
  // (same company or parent/child company relationship)
  if (userCompanyId) {
    const allowedCompanyIds = await getAllowedCompanyIds(userCompanyId);
    const allParticipantCompanies = participant.conversation.participants
      .map(p => p.user.companyId)
      .filter(Boolean) as string[];
    
    const unauthorized = allParticipantCompanies.some(
      companyId => !allowedCompanyIds.includes(companyId)
    );
    
    if (unauthorized) return false;
  }

  return true;
}

/**
 * Get all company IDs a user can access (self + parent + children)
 */
export async function getAllowedCompanyIds(companyId: string): Promise<string[]> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      parent: true,
      subCompanies: true,
    },
  });

  if (!company) return [companyId];

  const allowedIds = [companyId];
  
  // Include parent company
  if (company.parentId) {
    allowedIds.push(company.parentId);
  }
  
  // Include sub-companies
  company.subCompanies.forEach(sub => {
    allowedIds.push(sub.id);
  });

  return allowedIds;
}

/**
 * Check if two users can have a conversation
 * Rules: Admin can chat with any user in their company scope
 * Users can only chat with Admins
 */
export async function canInitiateConversation(
  initiatorId: string,
  targetUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const [initiator, target] = await Promise.all([
    prisma.user.findUnique({
      where: { id: initiatorId },
      select: { id: true, role: true, companyId: true, isActive: true },
    }),
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, companyId: true, isActive: true },
    }),
  ]);

  if (!initiator || !target) {
    return { allowed: false, reason: 'User not found' };
  }

  if (!initiator.isActive || !target.isActive) {
    return { allowed: false, reason: 'User account is inactive' };
  }

  // Self-chat not allowed
  if (initiatorId === targetUserId) {
    return { allowed: false, reason: 'Cannot start conversation with yourself' };
  }

  // Company isolation check
  if (initiator.companyId && target.companyId) {
    const allowedCompanies = await getAllowedCompanyIds(initiator.companyId);
    if (!allowedCompanies.includes(target.companyId)) {
      return { allowed: false, reason: 'Cross-company communication not allowed' };
    }
  }

  // Role-based rules: Admin can chat with anyone, Users can only chat with Admins
  const isInitiatorAdmin = initiator.role === 'ADMIN';
  const isTargetAdmin = target.role === 'ADMIN';

  if (!isInitiatorAdmin && !isTargetAdmin) {
    return { allowed: false, reason: 'Users can only communicate with administrators' };
  }

  return { allowed: true };
}

/**
 * Get chat permissions for a user in a conversation
 */
export async function getChatPermissions(
  userId: string,
  conversationId: string
): Promise<ChatPermissions> {
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
      leftAt: null,
    },
    include: {
      user: { select: { role: true } },
      conversation: {
        include: {
          // Check linked ticket/request status
        },
      },
    },
  });

  // Default: no permissions
  const noPermissions: ChatPermissions = {
    canSendMessage: false,
    canUploadFiles: false,
    canDeleteMessages: false,
    canEditMessages: false,
    canCloseConversation: false,
    canAddParticipants: false,
    canRemoveParticipants: false,
    isReadOnly: true,
  };

  if (!participant) return noPermissions;

  const isAdmin = participant.user.role === 'ADMIN';
  const isConvAdmin = participant.role === 'ADMIN';
  const isObserver = participant.role === 'OBSERVER';
  const isClosed = participant.conversation.status === 'CLOSED';

  // Check if linked ticket is closed
  let ticketClosed = false;
  if (participant.conversation.ticketId) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: participant.conversation.ticketId },
      select: { status: true },
    });
    ticketClosed = ticket?.status === 'CLOSED' || ticket?.status === 'PAID';
  }

  const isReadOnly = isClosed || ticketClosed || isObserver;

  return {
    canSendMessage: !isReadOnly,
    canUploadFiles: !isReadOnly,
    canDeleteMessages: !isReadOnly && (isAdmin || isConvAdmin),
    canEditMessages: !isReadOnly,
    canCloseConversation: isAdmin || isConvAdmin,
    canAddParticipants: isAdmin || isConvAdmin,
    canRemoveParticipants: isAdmin || isConvAdmin,
    isReadOnly,
  };
}

// ==========================================
// CONVERSATION OPERATIONS
// ==========================================

export interface CreateConversationParams {
  initiatorId: string;
  participantIds: string[];
  ticketId?: string;
  requestId?: string;
  title?: string;
}

export async function createConversation(params: CreateConversationParams) {
  const { initiatorId, participantIds, ticketId, requestId, title } = params;

  // Validate initiator is included
  const allParticipantIds = Array.from(new Set([initiatorId, ...participantIds]));

  // Check for existing 1-on-1 conversation to avoid duplicates
  if (allParticipantIds.length === 2 && !ticketId && !requestId && !title) {
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: allParticipantIds[0] } } },
          { participants: { some: { userId: allParticipantIds[1] } } },
        ],
      },
      include: {
        participants: true,
      },
    });

    if (existing) {
      // Setup checks to ensure it's strictly a 1-on-1 chat (no other participants)
      const isOneOnOne = existing.participants.length === 2;
      const isActive = existing.status !== 'CLOSED';
      
      if (isOneOnOne && isActive) {
        // Reactivate if one user had cleared it (by resetting clearedAt/leftAt)
        // Here we just return it. 
        // We may need to ensure the initiator is not "left". 
        // But for now returning existing is better than duplicate.
         // Ensure both are active participants (not left)
         const p = existing.participants.find(p => p.userId === initiatorId);
         if (p && (p.leftAt || p.clearedAt)) {
            await prisma.conversationParticipant.update({
              where: { id: p.id },
              data: { leftAt: null, clearedAt: null }
            });
         }
         const p2 = existing.participants.find(p => p.userId !== initiatorId);
         if (p2 && (p2.leftAt || p2.clearedAt)) {
             // Optionally rejoin the other user too if they left? 
             // Usually sending a message brings it back. 
             // Just creating the conversation handle should be enough.
         }
        return existing;
      }
    }
  }

  // Validate all participants can communicate
  for (const targetId of participantIds) {
    if (targetId === initiatorId) continue;
    const check = await canInitiateConversation(initiatorId, targetId);
    if (!check.allowed) {
      throw new Error(`Cannot add participant ${targetId}: ${check.reason}`);
    }
  }

  // Create conversation with participants
  const conversation = await prisma.conversation.create({
    data: {
      ticketId,
      requestId,
      title,
      status: 'ACTIVE',
      participants: {
        create: allParticipantIds.map((userId, index) => ({
          userId,
          role: userId === initiatorId ? 'ADMIN' : 'MEMBER',
        })),
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              companyId: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  // Create system message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: initiatorId,
      content: 'Conversation started',
      messageType: 'SYSTEM',
      status: 'SENT',
    },
  });

  // Audit log
  await createAuditLog(
    initiatorId,
    'CREATE_CONVERSATION',
    'CONVERSATION',
    conversation.id,
    { participantIds: allParticipantIds, ticketId, requestId }
  );

  return conversation;
}

export async function getConversation(conversationId: string, userId: string) {
  // Verify access
  const hasAccess = await canAccessConversation(userId, conversationId);
  if (!hasAccess) {
    throw new Error('Access denied to conversation');
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        where: { leftAt: null },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
      },
      messages: {
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          attachments: true,
          readReceipts: true,
          ticket: {
            select: {
              id: true,
              incNumber: true,
              status: true,
              issue: true,
            }
          },
          request: {
            select: {
              id: true,
              requestNumber: true,
              status: true,
              title: true,
            }
          }
        },
      },
    },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Reverse messages for chronological order
  conversation.messages.reverse();

  return conversation;
}

export async function getUserConversations(
  userId: string,
  options: { page?: number; pageSize?: number; status?: ConversationStatus } = {}
) {
  const { page = 1, pageSize = 20, status } = options;
  const skip = (page - 1) * pageSize;

  // Get conversations where user is active participant
  const where = {
    participants: {
      some: {
        userId,
        leftAt: null,
        clearedAt: null, // Only show non-cleared conversations
      },
    },
    ...(status && { status }),
  };

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                role: true,
                isActive: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, username: true },
            },
          },
        },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  // Calculate unread counts for each conversation
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      const participant = await prisma.conversationParticipant.findFirst({
        where: { conversationId: conv.id, userId },
        select: { lastReadAt: true },
      });

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          createdAt: participant?.lastReadAt
            ? { gt: participant.lastReadAt }
            : undefined,
        },
      });

      return {
        ...conv,
        lastMessage: conv.messages[0] || null,
        unreadCount,
      };
    })
  );

  return {
    conversations: conversationsWithUnread,
    total,
    page,
    pageSize,
  };
}

export async function closeConversation(
  conversationId: string,
  userId: string,
  reason?: string
) {
  const permissions = await getChatPermissions(userId, conversationId);
  if (!permissions.canCloseConversation) {
    throw new Error('Not authorized to close conversation');
  }

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
  });

  // Add system message
  await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      content: reason ? `Conversation closed: ${reason}` : 'Conversation closed',
      messageType: 'SYSTEM',
      status: 'SENT',
    },
  });

  await createAuditLog(
    userId,
    'CLOSE_CONVERSATION',
    'CONVERSATION',
    conversationId,
    { reason }
  );

  return conversation;
}

// ==========================================
// MESSAGE OPERATIONS
// ==========================================

export interface SendMessageParams {
  conversationId: string;
  senderId: string;
  content: string;
  messageType?: MessageType;
  replyToId?: string;
  ticketId?: string;
  requestId?: string;
}

export async function sendMessage(params: SendMessageParams) {
  const { conversationId, senderId, content, messageType = 'TEXT', replyToId, ticketId, requestId } = params;

  // Verify permissions
  const permissions = await getChatPermissions(senderId, conversationId);
  if (!permissions.canSendMessage) {
    throw new Error('Not authorized to send messages in this conversation');
  }

  // Validate content
  if (!content || content.trim().length === 0) {
    throw new Error('Message content cannot be empty');
  }

  if (content.length > 10000) {
    throw new Error('Message content exceeds maximum length');
  }

  // Validate replyTo if provided
  if (replyToId) {
    const replyToMessage = await prisma.message.findFirst({
      where: { id: replyToId, conversationId },
    });
    if (!replyToMessage) {
      throw new Error('Reply target message not found');
    }
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content: content.trim(),
      messageType,
      replyToId,
      ticketId,
      requestId,
      status: 'SENT',
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          senderId: true,
        },
      },
      ticket: {
        select: {
          id: true,
          incNumber: true,
          issue: true,
          status: true,
        }
      },
      request: {
        select: {
          id: true,
          requestNumber: true,
          title: true,
          status: true,
        }
      },
      attachments: true,
    },
  });

  // Re-activate conversation for all participants if they "cleared" it
  // This ensures the chat pops up again for the receiver
  await prisma.conversationParticipant.updateMany({
    where: {
      conversationId,
      clearedAt: { not: null },
    },
    data: {
      clearedAt: null,
    },
  });

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Audit log
  await createAuditLog(
    senderId,
    'SEND_MESSAGE',
    'MESSAGE',
    message.id,
    { conversationId, messageType }
  );

  // Send notifications to other participants
  try {
    const participants = await prisma.conversationParticipant.findMany({
      where: { 
        conversationId, 
        leftAt: null 
      },
      select: { userId: true }
    });

    await Promise.all(participants.map(p => {
      if (p.userId !== senderId) {
        return createNotification({
          userId: p.userId,
          title: `New message from ${message.sender.username}`,
          message: content.length > 50 ? `${content.substring(0, 50)}...` : content,
          type: 'INFO',
        });
      }
      return Promise.resolve();
    }));
  } catch (error) {
    console.error('Failed to send message notifications:', error);
    // Don't fail the message send if notifications fail
  }

  return message;
}

export async function getMessages(
  conversationId: string,
  userId: string,
  options: { limit?: number; before?: string } = {}
) {
  const { limit = 50, before } = options;

  // Verify access
  const hasAccess = await canAccessConversation(userId, conversationId);
  if (!hasAccess) {
    throw new Error('Access denied to conversation');
  }

  const where: any = {
    conversationId,
    deletedAt: null,
  };

  if (before) {
    const cursorMessage = await prisma.message.findUnique({
      where: { id: before },
      select: { createdAt: true },
    });
    if (cursorMessage) {
      where.createdAt = { lt: cursorMessage.createdAt };
    }
  }

  const messages = await prisma.message.findMany({
    where,
    take: limit + 1, // Fetch one extra to check if there are more
    orderBy: { createdAt: 'desc' },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          sender: {
            select: { id: true, username: true },
          },
        },
      },
      attachments: true,
      readReceipts: {
        include: {
          user: {
            select: { id: true, username: true },
          },
        },
      },
      ticket: {
        select: {
          id: true,
          incNumber: true,
          status: true,
          issue: true,
        }
      },
      request: {
        select: {
          id: true,
          requestNumber: true,
          status: true,
          title: true,
        }
      }
    },
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  // Reverse for chronological order
  messages.reverse();

  return {
    messages,
    hasMore,
    nextCursor: hasMore ? messages[0]?.id : undefined,
  };
}

export async function editMessage(
  messageId: string,
  userId: string,
  newContent: string
) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      senderId: true,
      conversationId: true,
      createdAt: true,
    },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  // Only sender can edit their own messages
  if (message.senderId !== userId) {
    throw new Error('Cannot edit another user\'s message');
  }

  // Check if message is too old to edit (24 hours)
  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  const maxEditTime = 24 * 60 * 60 * 1000; // 24 hours
  if (messageAge > maxEditTime) {
    throw new Error('Message is too old to edit');
  }

  const permissions = await getChatPermissions(userId, message.conversationId);
  if (!permissions.canEditMessages) {
    throw new Error('Not authorized to edit messages');
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: newContent.trim(),
      isEdited: true,
      editedAt: new Date(),
    },
    include: {
      sender: {
        select: { id: true, username: true, role: true },
      },
      attachments: true,
      ticket: {
        select: {
          id: true,
          incNumber: true,
          status: true,
          issue: true,
        },
      },
      request: {
        select: {
          id: true,
          requestNumber: true,
          status: true,
          title: true,
        },
      },
    },
  });

  await createAuditLog(
    userId,
    'EDIT_MESSAGE',
    'MESSAGE',
    messageId,
    { previousContent: message }
  );

  return updated;
}

export async function deleteMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, conversationId: true },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  const permissions = await getChatPermissions(userId, message.conversationId);
  
  // Sender can delete their own messages, admins can delete any
  const canDelete = message.senderId === userId || permissions.canDeleteMessages;
  if (!canDelete) {
    throw new Error('Not authorized to delete this message');
  }

  // Soft delete
  await prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });

  await createAuditLog(
    userId,
    'DELETE_MESSAGE',
    'MESSAGE',
    messageId,
    { conversationId: message.conversationId }
  );

  return { success: true, messageId, conversationId: message.conversationId };
}

export async function markMessagesAsRead(
  conversationId: string,
  userId: string,
  messageIds?: string[]
) {
  // Verify access
  const hasAccess = await canAccessConversation(userId, conversationId);
  if (!hasAccess) {
    throw new Error('Access denied to conversation');
  }

  const now = new Date();

  // Update participant's last read timestamp
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: now },
  });

  // Create read receipts for specific messages if provided
  if (messageIds && messageIds.length > 0) {
    const existingReceipts = await prisma.messageReadReceipt.findMany({
      where: {
        messageId: { in: messageIds },
        userId,
      },
      select: { messageId: true },
    });

    const existingMessageIds = new Set(existingReceipts.map(r => r.messageId));
    const newMessageIds = messageIds.filter(id => !existingMessageIds.has(id));

    if (newMessageIds.length > 0) {
      await prisma.messageReadReceipt.createMany({
        data: newMessageIds.map(messageId => ({
          messageId,
          userId,
          readAt: now,
        })),
        skipDuplicates: true,
      });
    }
  }

  return { success: true, readAt: now.toISOString() };
}

// ==========================================
// PRESENCE OPERATIONS
// ==========================================

export async function updatePresence(
  userId: string,
  status: PresenceStatus,
  socketId?: string
) {
  const presence = await prisma.userPresence.upsert({
    where: { userId },
    create: {
      userId,
      status,
      socketId,
      lastSeenAt: new Date(),
    },
    update: {
      status,
      socketId: status === 'OFFLINE' ? null : socketId,
      lastSeenAt: new Date(),
    },
    include: {
      user: {
        select: { id: true, username: true },
      },
    },
  });

  return presence;
}

export async function getPresenceForUsers(userIds: string[]) {
  const presences = await prisma.userPresence.findMany({
    where: { userId: { in: userIds } },
    include: {
      user: {
        select: { id: true, username: true, role: true },
      },
    },
  });

  // Map presence by userId for easy lookup
  const presenceMap = new Map(presences.map(p => [p.userId, p]));

  // For users without presence records, assume offline
  return userIds.map(userId => {
    const presence = presenceMap.get(userId);
    if (presence) return presence;
    return {
      userId,
      status: 'OFFLINE' as PresenceStatus,
      lastSeenAt: null,
    };
  });
}

export async function setTypingStatus(
  conversationId: string,
  userId: string,
  isTyping: boolean
) {
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: {
      isTyping,
      typingUpdatedAt: new Date(),
    },
  });

  return { conversationId, userId, isTyping };
}

// ==========================================
// CONVERSATION-TICKET LINKING
// ==========================================

export async function getOrCreateTicketConversation(
  ticketId: string,
  initiatorId: string
) {
  // Check if conversation already exists for this ticket
  let conversation = await prisma.conversation.findFirst({
    where: { ticketId, status: 'ACTIVE' },
    include: {
      participants: {
        where: { leftAt: null },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (conversation) {
    // Check if initiator is already a participant
    const isParticipant = conversation.participants.some(
      p => p.userId === initiatorId
    );
    
    if (!isParticipant) {
      // Add initiator as participant
      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: initiatorId,
          role: 'MEMBER',
        },
      });
      
      // Refetch with updated participants
      conversation = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          participants: {
            where: { leftAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });
    }
    
    return conversation;
  }

  // Get ticket info to add relevant participants
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      userId: true,
      assignedToUserId: true,
      issue: true,
    },
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  // Create participants list: ticket creator, assigned user, initiator
  const participantIds = new Set([ticket.userId, initiatorId]);
  if (ticket.assignedToUserId) {
    participantIds.add(ticket.assignedToUserId);
  }

  // Also add all admins
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  });
  admins.forEach(admin => participantIds.add(admin.id));

  // Create conversation
  conversation = await prisma.conversation.create({
    data: {
      ticketId,
      title: `Ticket: ${ticket.issue.substring(0, 50)}`,
      status: 'ACTIVE',
      participants: {
        create: Array.from(participantIds).map(userId => ({
          userId,
          role: userId === initiatorId ? 'ADMIN' : 'MEMBER',
        })),
      },
    },
    include: {
      participants: {
        where: { leftAt: null },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  // Add system message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: initiatorId,
      content: 'Chat started for ticket support',
      messageType: 'SYSTEM',
      status: 'SENT',
    },
  });

  await createAuditLog(
    initiatorId,
    'CREATE_CONVERSATION',
    'CONVERSATION',
    conversation.id,
    { ticketId, participantIds: Array.from(participantIds) }
  );

  return conversation;
}

// ==========================================
// ADMIN SPECIFIC OPERATIONS
// ==========================================

export async function getAdminChatableUsers(adminId: string) {
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { role: true, companyId: true },
  });

  if (!admin || admin.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }

  // Get allowed company IDs
  const allowedCompanyIds = admin.companyId
    ? await getAllowedCompanyIds(admin.companyId)
    : null;

  // Get all active users within company scope
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { not: adminId },
      ...(allowedCompanyIds && { companyId: { in: allowedCompanyIds } }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      companyId: true,
      teams: {
        include: { team: true },
      },
    },
    orderBy: { username: 'asc' },
  });

  // Get presence for all users
  const userIds = users.map(u => u.id);
  const presences = await getPresenceForUsers(userIds);
  const presenceMap = new Map(presences.map(p => [p.userId, p]));

  return users.map(user => ({
    ...user,
    presence: presenceMap.get(user.id) || { status: 'OFFLINE', lastSeenAt: null },
  }));
}

export async function getConversationStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const isAdmin = user?.role === 'ADMIN';

  // Base where clause for conversations user is part of
  const baseWhere = {
    participants: {
      some: {
        userId,
        leftAt: null,
        clearedAt: null,
      },
    },
  };

  const [total, active, closed] = await Promise.all([
    prisma.conversation.count({ where: baseWhere }),
    prisma.conversation.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
    prisma.conversation.count({ where: { ...baseWhere, status: 'CLOSED' } }),
  ]);

  // Calculate unread count based on lastReadAt
  const participants = await prisma.conversationParticipant.findMany({
    where: {
      userId,
      leftAt: null,
      clearedAt: null,
      conversation: { status: 'ACTIVE' },
    },
    select: {
      conversationId: true,
      lastReadAt: true,
    },
  });

  let unreadCount = 0;
  
  // efficient parallel check
  await Promise.all(
    participants.map(async (p) => {
      const count = await prisma.message.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: userId },
          createdAt: p.lastReadAt ? { gt: p.lastReadAt } : undefined,
        },
        take: 1, // We only need to know if there is at least one
      });
      if (count > 0) unreadCount++;
    })
  );

  return {
    total,
    active,
    closed,
    unreadCount,
  };
}

// ==========================================
// DELETE OPERATIONS
// ==========================================

export async function deleteConversation(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new Error('Conversation not found');
  }

  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: {
      clearedAt: new Date(),
    },
  });

  return true;
}
