/**
 * useChat React Hook
 * Real-time chat functionality with Socket.IO
 * Banking Ticketing Portal
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  Conversation,
  Message,
  ChatUser,
  ChatPermissions,
  PresenceStatus,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/types/chat';

// ==========================================
// SOCKET CONNECTION SINGLETON
// ==========================================

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let connectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 5;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  return socketInstance;
}

export function createSocket(token: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  // SECURITY: Always disconnect and recreate socket to prevent stale token usage
  // This is critical for banking applications to prevent user impersonation
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;

  socketInstance = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
  connectionAttempts = 0;
}

// ==========================================
// TYPES
// ==========================================

interface UseChatOptions {
  conversationId?: string;
  ticketId?: string;
  autoConnect?: boolean;
}

interface ChatState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  conversation: Conversation | null;
  messages: Message[];
  permissions: ChatPermissions | null;
  typingUsers: Map<string, { username: string; timeout: NodeJS.Timeout }>;
  unreadCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

interface UseChatReturn extends ChatState {
  // Connection
  connect: () => void;
  disconnect: () => void;
  
  // Messages
  sendMessage: (content: string, replyToId?: string, ticketId?: string, requestId?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markAsRead: () => void;
  
  // Typing
  startTyping: () => void;
  stopTyping: () => void;
  
  // Presence
  updatePresence: (status: PresenceStatus) => void;
  
  // File upload
  uploadFile: (file: File, message?: string) => Promise<void>;
  
  // Refresh
  refreshConversation: () => Promise<void>;
}

// ==========================================
// MAIN HOOK
// ==========================================

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { conversationId, ticketId, autoConnect = true } = options;

  const [state, setState] = useState<ChatState>({
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    conversation: null,
    messages: [],
    permissions: null,
    typingUsers: new Map(),
    unreadCount: 0,
    hasMore: false,
    isLoadingMore: false,
  });

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesCursorRef = useRef<string | undefined>(undefined);

  // ==========================================
  // SOCKET CONNECTION
  // ==========================================

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState(prev => ({
        ...prev,
        connectionError: 'No authentication token',
        isConnecting: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, connectionError: null }));

    const socket = createSocket(token);

    if (socket.connected) {
      // If reusing an existing connection, we must re-verify the token/user identity
      // or simply force a reconnect to be safe.
      // For security in banking context, forcing a reconnect with the fresh token is safer
      socket.disconnect();
    }

    socket.on('authenticated', ({ userId: socketUserId }) => {
      // Security Check: Verify socket user matches local session
      try {
        const localUserStr = localStorage.getItem('user');
        if (localUserStr) {
          const localUser = JSON.parse(localUserStr);
          if (localUser.id && localUser.id !== socketUserId) {
            console.error('Security Mismatch: Socket authenticated as different user. Forcing logout.');
            disconnectSocket();
            localStorage.clear();
            window.location.href = '/login';
            return;
          }
        }
      } catch (e) {
        console.error('Session verification failed', e);
      }

      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        connectionError: null,
      }));
      connectionAttempts = 0;

      // Refresh data on re-connection to get any missed messages
      refreshConversation();
    });

    socket.on('connect_error', (error) => {
      connectionAttempts++;
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: connectionAttempts < MAX_RECONNECTION_ATTEMPTS,
        connectionError: error.message,
      }));
    });

    socket.on('disconnect', (reason) => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: reason === 'io server disconnect' ? false : true,
      }));
    });

    socket.on('authenticated', ({ userId, socketId }) => {
      console.log('Chat authenticated:', userId);
    });

    socket.on('authentication_failed', ({ message }) => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        connectionError: message,
      }));
    });

    socket.on('error', ({ code, message }) => {
      console.error('Chat error:', code, message);
    });

    // Message events
    socket.on('new_message', (message) => {
      setState(prev => {
        // Avoid duplicates
        if (prev.messages.some(m => m.id === message.id)) {
          return prev;
        }
        return {
          ...prev,
          messages: [...prev.messages, message],
          unreadCount: prev.unreadCount + 1,
        };
      });
    });

    socket.on('message_updated', (updatedMessage) => {
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m.id === updatedMessage.id ? updatedMessage : m
        ),
      }));
    });

    socket.on('message_deleted', ({ messageId }) => {
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(m => m.id !== messageId),
      }));
    });

    socket.on('messages_read', ({ conversationId: convId, userId, readAt }) => {
      // Update read receipts in state if needed
    });

    // Typing events
    socket.on('user_typing', ({ conversationId: convId, userId, username, isTyping }) => {
      setState(prev => {
        const newTypingUsers = new Map(prev.typingUsers);
        
        if (isTyping) {
          // Clear existing timeout
          const existing = newTypingUsers.get(userId);
          if (existing?.timeout) {
            clearTimeout(existing.timeout);
          }
          
          // Set new timeout to auto-clear
          const timeout = setTimeout(() => {
            setState(p => {
              const updated = new Map(p.typingUsers);
              updated.delete(userId);
              return { ...p, typingUsers: updated };
            });
          }, 3000);
          
          newTypingUsers.set(userId, { username, timeout });
        } else {
          const existing = newTypingUsers.get(userId);
          if (existing?.timeout) {
            clearTimeout(existing.timeout);
          }
          newTypingUsers.delete(userId);
        }
        
        return { ...prev, typingUsers: newTypingUsers };
      });
    });

    // Presence events
    socket.on('presence_update', ({ userId, status, lastSeenAt }) => {
      // Update participant presence in conversation
      setState(prev => {
        if (!prev.conversation) return prev;
        return {
          ...prev,
          conversation: {
            ...prev.conversation,
            participants: prev.conversation.participants?.map(p =>
              p.userId === userId
                ? { ...p, user: { ...p.user!, presence: { status, lastSeenAt } } as any }
                : p
            ),
          },
        };
      });
    });

    if (!socket.connected) {
      socket.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    const socket = getSocket();
    if (socket && conversationId) {
      socket.emit('leave_conversation', conversationId);
    }
    disconnectSocket();
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
  }, [conversationId]);

  // ==========================================
  // CONVERSATION LOADING
  // ==========================================

  const loadConversation = useCallback(async (convId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chat/conversations/${convId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        conversation: data.conversation,
        permissions: data.permissions,
        messages: data.conversation.messages || [],
      }));

      // Join conversation room
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('join_conversation', convId);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }, []);

  const loadTicketConversation = useCallback(async (tId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chat/ticket/${tId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load ticket conversation');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        conversation: data.conversation,
        permissions: data.permissions,
        messages: data.conversation.messages || [],
      }));

      // Join conversation room
      const socket = getSocket();
      if (socket?.connected && data.conversation?.id) {
        socket.emit('join_conversation', data.conversation.id);
      }
    } catch (error) {
      console.error('Error loading ticket conversation:', error);
    }
  }, []);

  const refreshConversation = useCallback(async () => {
    if (conversationId) {
      await loadConversation(conversationId);
    } else if (ticketId) {
      await loadTicketConversation(ticketId);
    }
  }, [conversationId, ticketId, loadConversation, loadTicketConversation]);

  // ==========================================
  // MESSAGE OPERATIONS
  // ==========================================

  const sendMessage = useCallback(async (content: string, replyToId?: string, ticketId?: string, requestId?: string) => {
    const socket = getSocket();
    const convId = state.conversation?.id;

    if (!convId || !content.trim()) return;

    if (socket?.connected) {
      // Send via WebSocket for real-time
      socket.emit('send_message', {
        conversationId: convId,
        content: content.trim(),
        messageType: 'TEXT',
        replyToId,
        ticketId,
        requestId,
      });
    } else {
      // Fallback to HTTP
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversationId: convId,
            content: content.trim(),
            messageType: 'TEXT',
            replyToId,
            ticketId,
            requestId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, data.message],
        }));
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    }
  }, [state.conversation?.id]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    const socket = getSocket();

    if (socket?.connected) {
      socket.emit('edit_message', { messageId, content });
    } else {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit message');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m.id === messageId ? data.message : m
        ),
      }));
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    const socket = getSocket();

    if (socket?.connected) {
      socket.emit('delete_message', { messageId });
    } else {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(m => m.id !== messageId),
      }));
    }
  }, []);

  const deleteConversation = useCallback(async (convId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chat/conversations/${convId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      // If this was the current conversation, clear state
      if (state.conversation?.id === convId) {
        setState(prev => ({
          ...prev,
          conversation: null,
          messages: [],
        }));
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }, [state.conversation?.id]);

  const loadMoreMessages = useCallback(async () => {
    const convId = state.conversation?.id;
    if (!convId || state.isLoadingMore || !state.hasMore) return;

    setState(prev => ({ ...prev, isLoadingMore: true }));

    try {
      const token = localStorage.getItem('token');
      const cursor = state.messages[0]?.id;
      const response = await fetch(
        `/api/chat/messages?conversationId=${convId}&before=${cursor || ''}&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        messages: [...data.messages, ...prev.messages],
        hasMore: data.hasMore,
        isLoadingMore: false,
      }));
      messagesCursorRef.current = data.nextCursor;
    } catch (error) {
      console.error('Error loading more messages:', error);
      setState(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [state.conversation?.id, state.isLoadingMore, state.hasMore, state.messages]);

  const markAsRead = useCallback(async () => {
    const convId = state.conversation?.id;
    if (!convId) return;

    const socket = getSocket();
    
    if (socket?.connected) {
      socket.emit('mark_read', { conversationId: convId });
      setState(prev => ({ ...prev, unreadCount: 0 }));
    } else {
      // HTTP fallback when socket not connected
      try {
        const token = localStorage.getItem('token');
        await fetch(`/api/chat/conversations/${convId}/read`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setState(prev => ({ ...prev, unreadCount: 0 }));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  }, [state.conversation?.id]);

  // ==========================================
  // TYPING INDICATORS
  // ==========================================

  const startTyping = useCallback(() => {
    const socket = getSocket();
    const convId = state.conversation?.id;
    
    if (convId && socket?.connected) {
      socket.emit('typing_start', convId);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Auto-stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', convId);
      }, 3000);
    }
  }, [state.conversation?.id]);

  const stopTyping = useCallback(() => {
    const socket = getSocket();
    const convId = state.conversation?.id;
    
    if (convId && socket?.connected) {
      socket.emit('typing_stop', convId);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [state.conversation?.id]);

  // ==========================================
  // PRESENCE
  // ==========================================

  const updatePresenceStatus = useCallback((status: PresenceStatus) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('update_presence', status);
    }
  }, []);

  // ==========================================
  // FILE UPLOAD
  // ==========================================

  const uploadFile = useCallback(async (file: File, message?: string) => {
    const convId = state.conversation?.id;
    if (!convId) throw new Error('No conversation');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', convId);
    if (message) {
      formData.append('message', message);
    }

    const token = localStorage.getItem('token');
    const response = await fetch('/api/chat/attachments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file');
    }

    const data = await response.json();
    // Message will be added via socket event
    return data;
  }, [state.conversation?.id]);

  // ==========================================
  // EFFECTS
  // ==========================================

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      // Cleanup typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [autoConnect, connect]);

  // Load conversation when ID changes
  useEffect(() => {
    if (conversationId) {
      // Load conversation immediately via HTTP (don't wait for socket)
      loadConversation(conversationId);
    }
  }, [conversationId, loadConversation]);

  // Load ticket conversation
  useEffect(() => {
    if (ticketId && state.isConnected) {
      loadTicketConversation(ticketId);
    }
  }, [ticketId, state.isConnected, loadTicketConversation]);

  // Heartbeat for presence
  useEffect(() => {
    if (!state.isConnected) return;

    const socket = getSocket();
    const interval = setInterval(() => {
      if (socket?.connected) {
        socket.emit('heartbeat');
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [state.isConnected]);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    editMessage,
    deleteMessage,
    loadMoreMessages,
    markAsRead,
    startTyping,
    stopTyping,
    updatePresence: updatePresenceStatus,
    uploadFile,
    refreshConversation,
    deleteConversation,
  };
}

// ==========================================
// CONVERSATIONS LIST HOOK
// ==========================================

interface UseConversationsReturn {
  conversations: Conversation[];
  total: number;
  loading: boolean;
  error: string | null;
  stats: {
    total: number;
    active: number;
    closed: number;
    unreadCount: number;
  } | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UseConversationsReturn['stats']>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchConversations = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/chat/conversations?page=${pageNum}&pageSize=20&includeStats=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();

      if (append) {
        setConversations(prev => [...prev, ...data.conversations]);
      } else {
        setConversations(data.conversations);
      }

      setTotal(data.total);
      setStats(data.stats);
      setHasMore(data.conversations.length === 20);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setPage(1);
    await fetchConversations(1);
  }, [fetchConversations]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchConversations(nextPage, true);
  }, [hasMore, loading, page, fetchConversations]);

  useEffect(() => {
    fetchConversations(1);
  }, [fetchConversations]);

  return {
    conversations,
    total,
    loading,
    error,
    stats,
    refresh,
    loadMore,
    hasMore,
  };
}

// ==========================================
// CHAT USERS HOOK
// ==========================================

interface ChatUserWithPresence {
  id: string;
  username: string;
  email?: string | null;
  role: string;
  presence?: {
    status: PresenceStatus;
    lastSeenAt: string | null;
  };
}

interface UseChatUsersReturn {
  users: ChatUserWithPresence[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  search: (query: string) => void;
}

export function useChatUsers(): UseChatUsersReturn {
  const [users, setUsers] = useState<ChatUserWithPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = useCallback(async (search: string = '') => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const url = search
        ? `/api/chat/users?search=${encodeURIComponent(search)}`
        : '/api/chat/users';

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchUsers(searchQuery);
  }, [fetchUsers, searchQuery]);

  const search = useCallback((query: string) => {
    setSearchQuery(query);
    fetchUsers(query);
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refresh,
    search,
  };
}

export default useChat;
