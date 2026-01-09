/**
 * ChatList Component
 * Display list of conversations with presence indicators
 * Banking Ticketing Portal
 */

'use client';

import React, { useState } from 'react';
import { useConversations, useChatUsers } from '@/hooks/useChat';
import type { Conversation, ChatUser, PresenceStatus } from '@/types/chat';
import { 
  MessageSquare, 
  Search, 
  Plus, 
  Users, 
  Loader2, 
  RefreshCw,
  Circle,
  Clock,
  Archive,
  Filter,
  ChevronDown
} from 'lucide-react';

// ==========================================
// TYPES
// ==========================================

interface ChatListProps {
  onSelectConversation: (conversationId: string) => void;
  onStartNewChat: (userId: string) => void;
  selectedConversationId?: string;
  className?: string;
}

// ==========================================
// UTILITIES
// ==========================================

function formatLastMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getPresenceColor(status: PresenceStatus): string {
  switch (status) {
    case 'ONLINE': return 'bg-green-500';
    case 'AWAY': return 'bg-yellow-500';
    case 'BUSY': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}

function getPresenceLabel(status: PresenceStatus): string {
  switch (status) {
    case 'ONLINE': return 'Online';
    case 'AWAY': return 'Away';
    case 'BUSY': return 'Busy';
    default: return 'Offline';
  }
}

// ==========================================
// CONVERSATION ITEM
// ==========================================

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  currentUserId: string;
}

function ConversationItem({ conversation, isSelected, onClick, currentUserId }: ConversationItemProps) {
  const otherParticipant = conversation.participants?.find(p => p.userId !== currentUserId);
  const lastMessage = conversation.lastMessage;
  const unreadCount = conversation.unreadCount || 0;

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 flex items-start gap-3 hover:bg-slate-100 transition-colors rounded-xl ${
        isSelected ? 'bg-blue-50 border border-blue-200' : ''
      }`}
    >
      {/* Avatar with presence */}
      <div className="relative flex-shrink-0">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
          conversation.ticketId ? 'bg-purple-500' : 'bg-blue-500'
        }`}>
          {conversation.ticketId ? (
            <MessageSquare className="w-5 h-5" />
          ) : otherParticipant?.user?.username ? (
            otherParticipant.user.username.charAt(0).toUpperCase()
          ) : (
            <Users className="w-5 h-5" />
          )}
        </div>
        {otherParticipant && (
          <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
            getPresenceColor((otherParticipant.user as any)?.presence?.status || 'OFFLINE')
          }`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-slate-900 truncate">
            {conversation.title || otherParticipant?.user?.username || 'Conversation'}
          </h4>
          {lastMessage && (
            <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
              {formatLastMessageTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 truncate">
            {lastMessage ? (
              <>
                {lastMessage.senderId === currentUserId && <span className="text-slate-400">You: </span>}
                {lastMessage.content}
              </>
            ) : (
              <span className="italic">No messages yet</span>
            )}
          </p>
          {unreadCount > 0 && (
            <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        {/* Status badge */}
        {conversation.status !== 'ACTIVE' && (
          <div className="mt-1">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              conversation.status === 'CLOSED' 
                ? 'bg-slate-100 text-slate-600' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {conversation.status === 'CLOSED' ? <Archive className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {conversation.status}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

// ==========================================
// USER ITEM (for new chat)
// ==========================================

interface UserItemProps {
  user: ChatUser & { presence?: { status: PresenceStatus; lastSeenAt: string | null } };
  onClick: () => void;
}

function UserItem({ user, onClick }: UserItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-3 flex items-center gap-3 hover:bg-slate-100 transition-colors rounded-xl"
    >
      {/* Avatar with presence */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
          getPresenceColor(user.presence?.status || 'OFFLINE')
        }`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <h4 className="font-medium text-slate-900 truncate">
          {user.username}
        </h4>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Circle className={`w-2 h-2 ${getPresenceColor(user.presence?.status || 'OFFLINE')}`} />
          {getPresenceLabel(user.presence?.status || 'OFFLINE')}
          {user.role !== 'USER' && (
            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
              {user.role}
            </span>
          )}
        </p>
      </div>
    </button>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function ChatList({ 
  onSelectConversation, 
  onStartNewChat, 
  selectedConversationId,
  className = '' 
}: ChatListProps) {
  const [view, setView] = useState<'conversations' | 'users'>('conversations');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const { 
    conversations, 
    loading: conversationsLoading, 
    stats, 
    refresh: refreshConversations,
    loadMore,
    hasMore
  } = useConversations();

  const { 
    users, 
    loading: usersLoading, 
    search: searchUsers 
  } = useChatUsers();

  const currentUserId = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('user') || '{}').id 
    : null;

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    // Status filter
    if (statusFilter !== 'ALL' && conv.status !== statusFilter) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = conv.title?.toLowerCase().includes(query);
      const matchesParticipant = conv.participants?.some(
        p => p.user?.username.toLowerCase().includes(query)
      );
      return matchesTitle || matchesParticipant;
    }
    
    return true;
  });

  // Filter users
  const filteredUsers = users.filter(user => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return user.username.toLowerCase().includes(query) ||
             user.email?.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <div className={`flex flex-col bg-white border-r border-slate-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshConversations()}
              className="p-2 rounded-full hover:bg-slate-100"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${conversationsLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setView(view === 'conversations' ? 'users' : 'conversations')}
              className={`p-2 rounded-full ${
                view === 'users' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'hover:bg-slate-100 text-slate-500'
              }`}
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (view === 'users') {
                searchUsers(e.target.value);
              }
            }}
            placeholder={view === 'conversations' ? 'Search conversations...' : 'Search users...'}
            className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-0"
          />
        </div>

        {/* Stats (for conversations view) */}
        {view === 'conversations' && stats && (
          <div className="flex items-center gap-4 mt-3 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2 py-1 rounded ${
                statusFilter === 'ALL' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2 py-1 rounded ${
                statusFilter === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter('CLOSED')}
              className={`px-2 py-1 rounded ${
                statusFilter === 'CLOSED' ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Closed ({stats.closed})
            </button>
            {stats.unreadCount > 0 && (
              <span className="ml-auto px-2 py-1 bg-red-100 text-red-700 rounded-full">
                {stats.unreadCount} unread
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {view === 'conversations' ? (
          // Conversations list
          conversationsLoading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No conversations found</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 text-sm mt-2 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={conv.id === selectedConversationId}
                  onClick={() => onSelectConversation(conv.id)}
                  currentUserId={currentUserId}
                />
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  className="w-full py-3 text-sm text-blue-600 hover:bg-slate-100 rounded-xl"
                >
                  Load more
                </button>
              )}
            </div>
          )
        ) : (
          // Users list (for new chat)
          <>
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 mb-2">
              <h3 className="text-sm font-medium text-slate-700">
                Start a new conversation
              </h3>
            </div>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <UserItem
                    key={user.id}
                    user={user as any}
                    onClick={() => onStartNewChat(user.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ChatList;
