// ==========================================
// CHAT SYSTEM TYPES
// Banking Ticketing Portal - Multi-Company Chat
// ==========================================

// ==========================================
// ENUMS
// ==========================================

export type ConversationStatus = 'ACTIVE' | 'ARCHIVED' | 'CLOSED';
export type ParticipantRole = 'ADMIN' | 'MEMBER' | 'OBSERVER';
export type MessageType = 'TEXT' | 'FILE' | 'IMAGE' | 'SYSTEM';
export type MessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
export type PresenceStatus = 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';

// ==========================================
// COMPANY / TENANT TYPES
// ==========================================

export interface Company {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  parentId?: string | null;
  parent?: Company | null;
  subCompanies?: Company[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// CONVERSATION TYPES
// ==========================================

export interface Conversation {
  id: string;
  ticketId?: string | null;
  requestId?: string | null;
  title?: string | null;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  participants?: ConversationParticipant[];
  messages?: Message[];
  lastMessage?: Message | null;
  unreadCount?: number;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: string;
  leftAt?: string | null;
  lastReadAt?: string | null;
  isTyping: boolean;
  typingUpdatedAt?: string | null;
  clearedAt?: string | null;
  user?: ChatUser;
  conversation?: Conversation;
}

// ==========================================
// MESSAGE TYPES
// ==========================================

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  status: MessageStatus;
  replyToId?: string | null;
  ticketId?: string | null;
  requestId?: string | null;
  isEdited: boolean;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  sender?: ChatUser;
  replyTo?: Message | null;
  ticket?: { id: string; incNumber?: string | null; issue?: string | null; status?: string | null };
  request?: { id: string; requestNumber?: string | null; title?: string | null; status?: string | null };
  attachments?: ChatAttachment[];
  readReceipts?: MessageReadReceipt[];
}

export interface ChatAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface MessageReadReceipt {
  id: string;
  messageId: string;
  userId: string;
  readAt: string;
  user?: ChatUser;
}

// ==========================================
// USER PRESENCE TYPES
// ==========================================

export interface UserPresence {
  id: string;
  userId: string;
  status: PresenceStatus;
  lastSeenAt: string;
  socketId?: string | null;
  updatedAt: string;
  user?: ChatUser;
}

export interface ChatUser {
  id: string;
  username: string;
  email?: string | null;
  role: 'ADMIN' | 'USER' | 'DEVELOPER' | 'TECHNICAL';
  companyId?: string | null;
  isActive: boolean;
  presence?: UserPresence;
  company?: Company;
}

// ==========================================
// AUDIT TYPES
// ==========================================

export interface ChatAuditLog {
  id: string;
  userId: string;
  action: ChatAuditAction;
  resourceType: 'CONVERSATION' | 'MESSAGE' | 'ATTACHMENT';
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export type ChatAuditAction = 
  | 'CREATE_CONVERSATION'
  | 'JOIN_CONVERSATION'
  | 'LEAVE_CONVERSATION'
  | 'CLOSE_CONVERSATION'
  | 'SEND_MESSAGE'
  | 'EDIT_MESSAGE'
  | 'DELETE_MESSAGE'
  | 'UPLOAD_ATTACHMENT'
  | 'DOWNLOAD_ATTACHMENT';

// ==========================================
// SOCKET.IO EVENT TYPES
// ==========================================

export interface SocketAuthPayload {
  token: string;
  userId: string;
  companyId?: string;
  role: string;
}

export interface ServerToClientEvents {
  // Connection events
  'connect_error': (error: Error) => void;
  'authenticated': (data: { userId: string; socketId: string }) => void;
  'authentication_failed': (data: { message: string }) => void;
  
  // Message events
  'new_message': (message: Message) => void;
  'message_updated': (message: Message) => void;
  'message_deleted': (data: { messageId: string; conversationId: string }) => void;
  'messages_read': (data: { conversationId: string; userId: string; readAt: string }) => void;
  
  // Typing indicators
  'user_typing': (data: { conversationId: string; userId: string; username: string; isTyping: boolean }) => void;
  
  // Presence events
  'presence_update': (data: { userId: string; status: PresenceStatus; lastSeenAt: string }) => void;
  'user_online': (data: { userId: string; username: string }) => void;
  'user_offline': (data: { userId: string; username: string }) => void;
  
  // Conversation events
  'conversation_created': (conversation: Conversation) => void;
  'conversation_updated': (conversation: Conversation) => void;
  'participant_joined': (data: { conversationId: string; participant: ConversationParticipant }) => void;
  'participant_left': (data: { conversationId: string; userId: string }) => void;
  
  // Notification events
  'new_notification': (data: { id: string; userId: string; title: string; message: string; type: string; read: boolean; createdAt: string }) => void;
  
  // Error events
  'error': (data: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  // Authentication
  'authenticate': (payload: SocketAuthPayload) => void;
  
  // Room management
  'join_conversation': (conversationId: string) => void;
  'leave_conversation': (conversationId: string) => void;
  'join_company_room': (companyId: string) => void;
  
  // Messages
  'send_message': (data: {
    conversationId: string;
    content: string;
    messageType?: MessageType;
    replyToId?: string;
    tempId?: string; // For optimistic updates
    ticketId?: string;
    requestId?: string;
  }) => void;
  'edit_message': (data: { messageId: string; content: string }) => void;
  'delete_message': (data: { messageId: string }) => void;
  'mark_read': (data: { conversationId: string; messageIds?: string[] }) => void;
  
  // Typing
  'typing_start': (conversationId: string) => void;
  'typing_stop': (conversationId: string) => void;
  
  // Presence
  'update_presence': (status: PresenceStatus) => void;
  'heartbeat': () => void;
}

// ==========================================
// API REQUEST/RESPONSE TYPES
// ==========================================

export interface CreateConversationRequest {
  ticketId?: string;
  requestId?: string;
  title?: string;
  participantIds: string[];
}

export interface CreateConversationResponse {
  conversation: Conversation;
}

export interface GetConversationsResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GetMessagesRequest {
  conversationId: string;
  before?: string; // cursor for pagination
  limit?: number;
}

export interface GetMessagesResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  messageType?: MessageType;
  replyToId?: string;
}

export interface UploadAttachmentRequest {
  conversationId: string;
  messageId?: string; // If attaching to existing message
  file: File;
}

export interface UploadAttachmentResponse {
  attachment: ChatAttachment;
  message?: Message;
}

// ==========================================
// VALIDATION HELPERS
// ==========================================

export interface ChatPermissions {
  canSendMessage: boolean;
  canUploadFiles: boolean;
  canDeleteMessages: boolean;
  canEditMessages: boolean;
  canCloseConversation: boolean;
  canAddParticipants: boolean;
  canRemoveParticipants: boolean;
  isReadOnly: boolean;
}

export interface ConversationContext {
  conversation: Conversation;
  permissions: ChatPermissions;
  ticketStatus?: string;
  requestStatus?: string;
}

// Rate limiting
export interface RateLimitConfig {
  maxMessagesPerMinute: number;
  maxFilesPerMinute: number;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxMessagesPerMinute: 30,
  maxFilesPerMinute: 5,
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
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
  ],
};
