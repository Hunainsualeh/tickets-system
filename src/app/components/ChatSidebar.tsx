/**
 * ChatSidebar Component
 * Full chat interface for sidebar view - Light Theme
 * Banking Ticketing Portal
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useConversations, useChatUsers, useChat } from '@/hooks/useChat';
import type { Conversation, ChatUser, PresenceStatus, Message, ChatPermissions } from '@/types/chat';
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
  ChevronLeft,
  Send,
  Paperclip,
  X,
  Reply,
  Edit2,
  Trash2,
  MoreVertical,
  Check,
  CheckCheck,
  Image,
  FileText,
  AlertCircle,
  Wifi,
  WifiOff,
  Ticket,
  FileSpreadsheet,
  ChevronRight,
  Info
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { TicketDetail } from './TicketDetail';
import { Modal } from './Modal';

// ==========================================
// TYPES
// ==========================================

interface ChatSidebarProps {
  userRole?: 'ADMIN' | 'USER' | 'DEVELOPER' | 'TECHNICAL';
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

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

function getPresenceColor(status: PresenceStatus): string {
  switch (status) {
    case 'ONLINE': return 'bg-green-500';
    case 'AWAY': return 'bg-yellow-500';
    case 'BUSY': return 'bg-red-500';
    default: return 'bg-slate-400';
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
// CONVERSATION ITEM (Deprecated/Removed from view but kept for types if needed)
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
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold ${
          conversation.ticketId ? 'bg-purple-500' : 'bg-blue-500'
        }`}>
          {conversation.ticketId ? (
            <Ticket className="w-5 h-5" />
          ) : otherParticipant?.user?.username ? (
            otherParticipant.user.username.charAt(0).toUpperCase()
          ) : (
            <Users className="w-5 h-5" />
          )}
        </div>
        {otherParticipant && (
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            getPresenceColor((otherParticipant.user as any)?.presence?.status || 'OFFLINE')
          }`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-0.5">
          <h4 className="font-semibold text-slate-900 truncate text-sm">
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
            <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">
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
// USER CARD ITEM (Combined)
// ==========================================

interface UserCardItemProps {
  user: any; // ChatUser & Presence
  conversation?: Conversation; // Existing conversation if any
  onClick: () => void;
  currentUserId: string;
}

function UserCardItem({ user, conversation, onClick, currentUserId }: UserCardItemProps) {
  const isOnline = user.presence?.status === 'ONLINE';
  const hasUnread = (conversation?.unreadCount || 0) > 0;
  const lastMessage = conversation?.lastMessage;

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 flex items-start gap-4 hover:bg-slate-50 transition-all rounded-2xl border ${
        hasUnread ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100'
      } group mb-2 shadow-sm hover:shadow-md`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${
           hasUnread ? 'bg-blue-600' : 'bg-slate-400'
        }`}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center bg-white`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left pt-0.5">
        <div className="flex items-center justify-between mb-0.5">
          <h4 className={`font-semibold text-sm truncate ${hasUnread ? 'text-slate-900' : 'text-slate-700'}`}>
            {user.username}
             {user.role !== 'USER' && (
                <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium border border-slate-200 uppercase tracking-wide">
                  {user.role}
                </span>
             )}
          </h4>
          {lastMessage && (
            <span className={`text-[10px] font-medium ${hasUnread ? 'text-blue-600' : 'text-slate-400'}`}>
              {formatLastMessageTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2">
            <p className={`text-xs truncate leading-relaxed ${hasUnread ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                {lastMessage ? (
                <>
                    {lastMessage.senderId === currentUserId && <span className="opacity-70">You: </span>}
                    {lastMessage.content}
                </>
                ) : (
                <span className="opacity-50 italic">Start a conversation</span>
                )}
            </p>
            {hasUnread && (
                <span className="shrink-0 h-5 min-w-[20px] px-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-blue-200">
                    {(conversation?.unreadCount || 0) > 9 ? '9+' : conversation?.unreadCount}
                </span>
            )}
        </div>
      </div>
    </button>
  );
}

// ==========================================
// TICKET/REQUEST LINKER MODAL
// ==========================================

interface TicketLinkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTicket: (ticketId: string) => void;
  onSelectRequest: (requestId: string) => void;
}

function TicketLinkerModal({ isOpen, onClose, onSelectTicket, onSelectRequest }: TicketLinkerModalProps) {
  const [activeTab, setActiveTab] = useState<'tickets' | 'requests'>('tickets');
  const [tickets, setTickets] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ticketsRes, requestsRes] = await Promise.all([
          apiClient.getTickets(),
          apiClient.getRequests(),
        ]);
        setTickets(ticketsRes.tickets || []);
        setRequests(requestsRes.requests || []);
      } catch (error) {
        console.error('Error fetching tickets/requests:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen]);

  const filteredTickets = tickets.filter(t => 
    t.issue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.incNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = requests.filter(r =>
    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.requestNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Link Item" size="lg">
      <div className="flex flex-col h-[500px] -m-4">
        {/* Tabs & Search Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-4">
          {/* Custom Tab Switcher */}
          <div className="flex p-1 bg-slate-200/60 rounded-xl relative">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200 z-10 ${
                activeTab === 'tickets' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Tickets</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'tickets' ? 'bg-blue-100 text-blue-700' : 'bg-slate-300 text-slate-600'
              }`}>
                {filteredTickets.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200 z-10 ${
                activeTab === 'requests' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Requests</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'requests' ? 'bg-purple-100 text-purple-700' : 'bg-slate-300 text-slate-600'
              }`}>
                {filteredRequests.length}
              </span>
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Loading data...</p>
            </div>
          ) : activeTab === 'tickets' ? (
            filteredTickets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Ticket className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No tickets found</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => onSelectTicket(ticket.id)}
                    className="group flex items-start gap-4 p-4 text-left bg-white hover:bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5 rounded-2xl transition-all duration-200"
                  >
                    <div className={`shrink-0 p-2.5 rounded-xl ${
                      ticket.priority === 'P1' ? 'bg-red-50 text-red-600' :
                      ticket.priority === 'P2' ? 'bg-orange-50 text-orange-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {ticket.incNumber || 'NO-ID'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wide ${
                            ticket.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            ticket.priority === 'P1' ? 'text-red-700 border-red-200' :
                            ticket.priority === 'P2' ? 'text-orange-700 border-orange-200' :
                            'text-green-700 border-green-200'
                        }`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-slate-700 line-clamp-1 mb-1 group-hover:text-blue-700 transition-colors">
                        {ticket.issue}
                      </h4>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                          {ticket.branch?.name || 'No Branch'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            filteredRequests.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FileSpreadsheet className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No requests found</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredRequests.map((request) => (
                  <button
                    key={request.id}
                    onClick={() => onSelectRequest(request.id)}
                    className="group flex items-start gap-4 p-4 text-left bg-white hover:bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md hover:shadow-purple-900/5 rounded-2xl transition-all duration-200"
                  >
                    <div className="shrink-0 p-2.5 rounded-xl bg-purple-50 text-purple-600">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {request.requestNumber || 'NO-ID'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wide ${
                            request.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-sm font-medium text-slate-700 line-clamp-1 mb-1 group-hover:text-purple-700 transition-colors">
                        {request.title}
                      </h4>
                       <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </Modal>
  );
}

// ==========================================
// MESSAGE ITEM
// ==========================================

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  permissions: ChatPermissions | null;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: Message) => void;
  onViewTicket: (ticketId: string) => void;
  onViewRequest: (requestId: string) => void;
}

function MessageItem({ message, isOwn, permissions, onEdit, onDelete, onReply, onViewTicket, onViewRequest }: MessageItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent);
    }
    setIsEditing(false);
  };

  const canEdit = isOwn && permissions?.canEditMessages && message.messageType === 'TEXT';
  const canDelete = (isOwn || permissions?.canDeleteMessages) && !message.deletedAt;

  if (message.deletedAt) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className="px-4 py-2 rounded-2xl bg-slate-100 italic text-slate-500 text-sm">
          Message deleted
        </div>
      </div>
    );
  }

  if (message.messageType === 'SYSTEM') {
    return (
      <div className="flex justify-center mb-3">
        <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 group`}>
      <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender name (for others) */}
        {!isOwn && (
          <div className="text-xs text-slate-500 mb-1 px-1 font-medium">
            {message.sender?.username}
          </div>
        )}

        {/* Reply reference */}
        {message.replyTo && (
          <div className={`text-xs px-3 py-1 mb-1 rounded-xl border-l-2 ${
            isOwn 
              ? 'bg-blue-50 border-blue-300' 
              : 'bg-slate-50 border-slate-300'
          }`}>
            <span className="font-medium">{message.replyTo.sender?.username}</span>
            <p className="truncate text-slate-600">{message.replyTo.content}</p>
          </div>
        )}

        {/* Linked Ticket Reference */}
        {message.ticket && (
          <button 
            onClick={() => message.ticket && onViewTicket(message.ticket.id)}
            className="block w-full text-left mb-2 max-w-sm group/ticket"
          >
            <div className="flex items-start gap-3 p-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100/80 hover:border-purple-300 transition-all cursor-pointer shadow-sm">
              <div className="shrink-0 p-2 rounded-lg bg-white/60 text-purple-600 shadow-sm">
                <Ticket className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-purple-800 text-xs tracking-wide">
                    {message.ticket.incNumber || 'TICKET'}
                  </span>
                  {message.ticket.status && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-white/60 text-purple-700 border border-purple-100">
                      {message.ticket.status}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate leading-snug">
                  {message.ticket.issue || 'No issue description'}
                </p>
                <div className="text-[10px] text-purple-600/80 mt-1.5 flex items-center gap-1 font-medium">
                  <span>View Ticket Details</span>
                  <ChevronRight className="w-3 h-3 transition-transform group-hover/ticket:translate-x-0.5" />
                </div>
              </div>
            </div>
          </button>
        )}
        
        {/* Linked Request Reference */}
        {message.request && (
           <button 
            onClick={() => message.request && onViewRequest(message.request.id)}
            className="block w-full text-left mb-2 max-w-sm group/request"
          >
            <div className="flex items-start gap-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100/80 hover:border-indigo-300 transition-all cursor-pointer shadow-sm">
              <div className="shrink-0 p-2 rounded-lg bg-white/60 text-indigo-600 shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                 <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-indigo-800 text-xs tracking-wide">
                    {message.request.requestNumber || 'REQUEST'}
                  </span>
                  {message.request.status && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-white/60 text-indigo-700 border border-indigo-100">
                      {message.request.status}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate leading-snug">
                  {message.request.title || 'No title'}
                </p>
                <div className="text-[10px] text-indigo-600/80 mt-1.5 flex items-center gap-1 font-medium">
                  <span>View Request Details</span>
                  <ChevronRight className="w-3 h-3 transition-transform group-hover/request:translate-x-0.5" />
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Message bubble */}
        <div 
          className={`relative px-4 py-2.5 rounded-2xl ${
            isOwn 
              ? 'bg-blue-600 text-white rounded-br-md text-right' 
              : 'bg-slate-100 text-slate-900 rounded-bl-md text-left'
          }`}
        >
          {/* Sender Name for Own Messages */}
          {isOwn && (
             <div className="text-[10px] text-blue-100 mb-1 font-medium text-right">
                You
             </div>
          )}

          {/* Sender Name for Others (Inside Bubble if preferred, or kept outside as before) */}
          {/* Currently outside, let's keep it outside but add option inside if needed */}
          
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 bg-transparent border-b border-white/50 focus:outline-none text-sm text-inherit"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <button onClick={handleEdit} className="hover:opacity-70">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsEditing(false)} className="hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
              
              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.attachments.map((att) => {
                    const isImage = att.mimeType.startsWith('image/');
                    const isPDF = att.mimeType.includes('pdf');
                    const isWord = att.mimeType.includes('word') || att.mimeType.includes('document');
                    const isExcel = att.mimeType.includes('spreadsheet') || att.mimeType.includes('excel') || att.mimeType.includes('csv');
  
                    let bgColor = 'bg-slate-100';
                    let borderColor = 'border-slate-200';
                    let iconColor = 'text-slate-500';
                    let iconBg = 'bg-slate-200';
  
                    if (isPDF) {
                      bgColor = 'bg-red-50'; borderColor = 'border-red-100'; iconColor = 'text-red-500'; iconBg = 'bg-red-100';
                    } else if (isWord) {
                      bgColor = 'bg-blue-50'; borderColor = 'border-blue-100'; iconColor = 'text-blue-500'; iconBg = 'bg-blue-100';
                    } else if (isExcel) {
                      bgColor = 'bg-green-50'; borderColor = 'border-green-100'; iconColor = 'text-green-500'; iconBg = 'bg-green-100';
                    }
  
                    return (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group relative flex flex-col items-center justify-center w-28 h-24 p-2 rounded-xl border ${
                          isOwn 
                            ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white' 
                            : `${bgColor} ${borderColor} hover:brightness-95 text-slate-700`
                        } transition-all no-underline overflow-hidden`}
                      >
                        {isImage ? (
                          <>
                            <img 
                              src={att.fileUrl} 
                              alt={att.fileName} 
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className={`absolute inset-0 ${isOwn ? 'bg-black/10' : 'bg-black/0'} group-hover:bg-black/10 transition-colors`} />
                          </>
                        ) : (
                          <>
                            <div className={`mb-2 p-2 rounded-lg ${isOwn ? 'bg-white/20' : `${iconBg} ${iconColor}`}`}>
                              <FileText className={`w-5 h-5 ${isOwn ? 'text-white' : ''}`} />
                            </div>
                            <div className="w-full text-center overflow-hidden">
                              <p className="text-[10px] font-medium truncate px-1 leading-tight mb-0.5">{att.fileName}</p>
                              <p className={`text-[9px] ${isOwn ? 'text-white/70' : 'text-slate-500'}`}>
                                {(att.fileSize / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Menu button */}
          {(canEdit || canDelete) && !isEditing && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`absolute -top-1 ${isOwn ? '-left-6' : '-right-6'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-slate-200`}
            >
              <MoreVertical className="w-4 h-4 text-slate-500" />
            </button>
          )}

          {/* Dropdown menu */}
          {showMenu && (
            <div 
              className={`absolute top-6 ${isOwn ? '-left-24' : '-right-24'} bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-10 min-w-[100px]`}
              onMouseLeave={() => setShowMenu(false)}
            >
              <button
                onClick={() => {
                  onReply(message);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 text-slate-700"
              >
                <Reply className="w-4 h-4" /> Reply
              </button>
              {canEdit && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2 text-slate-700"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => {
                    onDelete(message.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-slate-100 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Timestamp and status */}
        <div className={`flex items-center gap-1 mt-1 px-1 text-xs text-slate-500 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span>{formatMessageTime(message.createdAt)}</span>
          {message.isEdited && <span className="italic">(edited)</span>}
          {isOwn && (
            message.status === 'READ' 
              ? <CheckCheck className="w-3 h-3 text-blue-500" />
              : <Check className="w-3 h-3" />
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TICKET VIEWER MODAL
// ==========================================

function TicketViewerModal({ ticketId, onClose }: { ticketId: string, onClose: () => void }) {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : null;

  useEffect(() => {
    if (!ticketId) return;
    setLoading(true);
    // Use an IIFE or standard fetch logic
    const fetchTicket = async () => {
        try {
            const res = await apiClient.getTicket(ticketId);
            setTicket(res.ticket || res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    fetchTicket();
  }, [ticketId]);

  return (
    <Modal isOpen={!!ticketId} onClose={onClose} size="xl" title="Ticket Details">
       {loading ? (
         <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
       ) : ticket ? (
         <div className="max-h-[80vh] overflow-y-auto -m-4">
            <TicketDetail 
                ticket={ticket}
                currentUser={user}
                onBack={onClose}
                onAddNote={async (note) => {
                    await apiClient.addNote(ticket.id, note);
                    const res = await apiClient.getTicket(ticket.id);
                    setTicket(res.ticket);
                }}
                onUpdateStatus={async (status) => {
                     await apiClient.updateTicket(ticket.id, { status, statusNote: "Status updated from chat" });
                     const res = await apiClient.getTicket(ticket.id);
                     setTicket(res.ticket);
                }}
            />
         </div>
       ) : (
         <p className="text-center p-4">Ticket not found</p>
       )}
    </Modal>
  );
}

// ==========================================
// CHAT WINDOW (Inline)
// ==========================================

interface ChatWindowInlineProps {
  conversationId?: string;
  ticketId?: string;
  onBack: () => void;
  onRefresh?: () => void;
}

function ChatWindowInline({ conversationId, ticketId, onBack, onRefresh }: ChatWindowInlineProps) {
  const {
    isConnected,
    connectionError,
    conversation,
    messages,
    permissions,
    typingUsers,
    hasMore,
    isLoadingMore,
    sendMessage,
    editMessage,
    deleteMessage,
    deleteConversation,
    loadMoreMessages,
    markAsRead,
    startTyping,
    stopTyping,
    uploadFile,
    connect,
  } = useChat({ conversationId, ticketId });

  const [inputValue, setInputValue] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showTicketSelector, setShowTicketSelector] = useState(false);
  
  // New State for Modal and Linking Confirmation
  const [viewingTicketId, setViewingTicketId] = useState<string | null>(null);
  const [viewingRequestId, setViewingRequestId] = useState<string | null>(null);
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  // Delete Confirmation State
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const currentUserId = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('user') || '{}').id 
    : null;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when conversation is loaded and visible
  useEffect(() => {
    if (conversation) {
      // Always mark as read when viewing a conversation
      markAsRead();
      // Refresh the sidebar list to update badges after a short delay
      const timer = setTimeout(() => {
        onRefresh?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [conversation?.id, markAsRead, onRefresh]);

  // Handle message send
  const handleSend = async () => {
    if (!inputValue.trim() || permissions?.isReadOnly) return;

    try {
      await sendMessage(inputValue.trim(), replyTo?.id, pendingTicketId || undefined, pendingRequestId || undefined);
      setInputValue('');
      setReplyTo(null);
      setPendingTicketId(null);
      setPendingRequestId(null);
      stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleDeleteConversation = async () => {
    setIsDeletingConversation(true);
  };

  const confirmDeleteConversation = async () => {
    try {
      if (conversation?.id) {
        await deleteConversation(conversation.id);
        onBack();
      }
    } catch (e) {
      console.error('Failed to delete', e);
    } finally {
      setIsDeletingConversation(false);
    }
  };

  const confirmDeleteMessage = async () => {
    if (messageToDelete) {
      await deleteMessage(messageToDelete);
      setMessageToDelete(null);
    }
  };

  // Handle file upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadFile(file);
    } catch (error: any) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value) {
      startTyping();
    } else {
      stopTyping();
    }
  };
  
  const handleSelectTicketLink = (tId: string) => {
    setPendingTicketId(tId);
    setPendingRequestId(null);
    setShowTicketSelector(false);
  };

  const handleSelectRequestLink = (rId: string) => {
    setPendingRequestId(rId);
    setPendingTicketId(null);
    setShowTicketSelector(false);
  };

  // Get other participant for header
  const otherParticipant = conversation?.participants?.find(
    p => p.userId !== currentUserId
  );

  const typingUsersArray = Array.from(typingUsers.values());

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-slate-100"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        
        {otherParticipant && (
          <>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                {otherParticipant.user?.username.charAt(0).toUpperCase()}
              </div>
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                getPresenceColor((otherParticipant.user as any)?.presence?.status || 'OFFLINE')
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-sm truncate">
                {otherParticipant.user?.username}
              </h3>
              <p className="text-xs text-slate-500">
                {(otherParticipant.user as any)?.presence?.status || 'Offline'}
              </p>
            </div>
          </>
        )}
        {!otherParticipant && conversation?.title && (
          <h3 className="font-semibold text-slate-900 text-sm flex-1">
            {conversation.title}
          </h3>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={handleDeleteConversation}
             className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"
            title="Delete Chat"
          >
             <Trash2 className="w-4 h-4" />
          </button>
          
          {/* Connection status */}
          <div className={`p-2 ${isConnected ? 'text-green-500' : 'text-slate-400'}`}>
            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Connection error */}
      {connectionError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {connectionError}
          <button 
            onClick={connect}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 bg-slate-50"
      >
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}

        {hasMore && !isLoadingMore && (
          <button
            onClick={loadMoreMessages}
            className="w-full py-2 text-sm text-blue-600 hover:underline"
          >
            Load earlier messages
          </button>
        )}

        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwn={message.senderId === currentUserId}
            permissions={permissions}
            onEdit={editMessage}
            onDelete={setMessageToDelete}
            onReply={(msg) => setReplyTo(msg)}
            onViewTicket={(tId) => setViewingTicketId(tId)}
            onViewRequest={(rId) => setViewingRequestId(rId)}
          />
        ))}

        {/* Typing indicator */}
        {typingUsersArray.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-500 px-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{typingUsersArray.map(u => u.username).join(', ')} typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pending Link Preview */}
      {(pendingTicketId || pendingRequestId) && (
        <div className="px-4 py-3 bg-white border-t border-slate-100">
           <div className={`relative overflow-hidden rounded-xl border ${pendingTicketId ? 'border-purple-200 bg-purple-50' : 'border-indigo-200 bg-indigo-50'} p-3 shadow-sm`}>
             <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg ${pendingTicketId ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {pendingTicketId ? <Ticket className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${pendingTicketId ? 'bg-purple-200 text-purple-800' : 'bg-indigo-200 text-indigo-800'}`}>
                          {pendingTicketId ? 'Ticket' : 'Request'}
                      </span>
                      <span className={`text-xs font-mono font-medium ${pendingTicketId ? 'text-purple-700' : 'text-indigo-700'}`}>
                          #{pendingTicketId || pendingRequestId}
                      </span>
                    </div>
                    <p className={`text-sm font-medium leading-snug ${pendingTicketId ? 'text-purple-900' : 'text-indigo-900'}`}>
                       Linked {pendingTicketId ? 'Ticket' : 'Request'} Attachment
                    </p>
                    <p className="text-xs text-slate-500 mt-1">This item will be visible in the chat message.</p>
                </div>
                 <button onClick={() => { setPendingTicketId(null); setPendingRequestId(null); }} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-slate-500" />
                 </button>
             </div>
           </div>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-2">
          <Reply className="w-4 h-4 text-slate-400" />
          <div className="flex-1 text-sm">
            <span className="font-medium text-slate-700">{replyTo.sender?.username}</span>
            <p className="text-slate-500 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-slate-200 rounded">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}

      {/* Input */}
      {!permissions?.isReadOnly && (
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-end gap-2 bg-slate-50 p-1.5 rounded-[24px] border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 focus-within:bg-white transition-all shadow-sm">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              disabled={isUploading || !permissions?.canUploadFiles}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !permissions?.canUploadFiles}
              className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors flex-shrink-0 mb-0.5"
              title="Attach file"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setShowTicketSelector(true)}
              disabled={isUploading || !permissions?.canSendMessage}
              className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors flex-shrink-0 mb-0.5"
              title="Link Ticket/Request"
            >
               <Ticket className="w-5 h-5" />
            </button>

            <textarea
              value={inputValue}
              onChange={(e) => {
                handleInputChange(e as any);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 px-2 py-2.5 bg-transparent border-0 text-slate-900 placeholder:text-slate-500 text-sm focus:ring-0 focus:outline-none resize-none min-h-[44px] max-h-[120px]"
              disabled={!conversation}
              rows={1}
            />

            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || !conversation}
              className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-sm flex-shrink-0 mb-0.5 group"
            >
              <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* View Ticket Modal */}
      {viewingTicketId && (
        <TicketViewerModal 
          ticketId={viewingTicketId} 
          onClose={() => setViewingTicketId(null)} 
        />
      )}

      {/* Ticket/Request Linking Modal */}
      <TicketLinkerModal 
        isOpen={showTicketSelector}
        onClose={() => setShowTicketSelector(false)}
        onSelectTicket={handleSelectTicketLink}
        onSelectRequest={handleSelectRequestLink}
      />

      {/* Delete Chat Confirmation Modal */}
      <Modal 
        isOpen={isDeletingConversation} 
        onClose={() => setIsDeletingConversation(false)}
        title="Delete Chat"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100 text-red-700">
            <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-6 h-6" />
            </div>
            <div>
                <h4 className="font-semibold text-sm">Delete this conversation?</h4>
                <p className="text-xs opacity-90">This action cannot be undone.</p>
            </div>
          </div>
          <p className="text-slate-600">Are you sure you want to delete this chat?</p>
          <div className="flex justify-end gap-3">
            <button 
                onClick={() => setIsDeletingConversation(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={confirmDeleteConversation}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
                Delete Chat
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Message Confirmation Modal */}
      <Modal 
        isOpen={!!messageToDelete} 
        onClose={() => setMessageToDelete(null)}
        title="Delete Message"
        size="sm"
      >
         <div className="space-y-4">
          <p className="text-slate-600">Are you sure you want to delete this message?</p>
          <div className="flex justify-end gap-3 pt-2">
            <button 
                onClick={() => setMessageToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={confirmDeleteMessage}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
                Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function ChatSidebar({ userRole, className = '' }: ChatSidebarProps) {
  const [view, setView] = useState<'list' | 'chat' | 'users'>('list');
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');
  const [userFilter, setUserFilter] = useState<'ALL' | 'ACTIVE'>('ALL');

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
    refresh: refreshUsers,
    search: searchUsers 
  } = useChatUsers();

  // Initial Fetch of users when component mounts
  useEffect(() => {
     refreshUsers();
  }, [refreshUsers]);

  const currentUserId = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('user') || '{}').id 
    : null;

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    if (statusFilter !== 'ALL' && conv.status !== statusFilter) return false;
    
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
    if (userFilter === 'ACTIVE' && (!user.presence || user.presence.status === 'OFFLINE')) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return user.username.toLowerCase().includes(query) ||
             user.email?.toLowerCase().includes(query);
    }
    return true;
  });

  // Handle selecting a conversation
  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setSelectedTicketId(undefined);
    setView('chat');
  }, []);

  // Handle starting a new chat
  const handleStartNewChat = useCallback(async (userId: string) => {
    try {
      // Optimistically select if exists in conversations
      const existing = conversations.find(c => c.participants?.some(p => p.userId === userId));
      if (existing) {
          setSelectedConversationId(existing.id);
          setSelectedTicketId(undefined);
          setView('chat');
          return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          participantIds: [userId],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      setSelectedConversationId(data.conversation.id);
      setSelectedTicketId(undefined);
      setView('chat');
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }, []);

  // Handle ticket selection
  const handleSelectTicket = useCallback((ticketId: string) => {
    setSelectedTicketId(ticketId);
    setSelectedConversationId(undefined);
    setView('chat');
  }, []);

  // Handle request selection (creates conversation linked to request)
  const handleSelectRequest = useCallback(async (requestId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId,
          participantIds: [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      setSelectedConversationId(data.conversation.id);
      setSelectedTicketId(undefined);
      setView('chat');
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }, []);

  // Back to list
  const handleBack = useCallback(() => {
    setView('list');
    setSelectedConversationId(undefined);
    setSelectedTicketId(undefined);
    refreshConversations();
  }, [refreshConversations]);

  // Render chat view
  if (view === 'chat' && (selectedConversationId || selectedTicketId)) {
    return (
      <div className={`flex flex-col h-full bg-white ${className}`}>
        <ChatWindowInline
          conversationId={selectedConversationId}
          ticketId={selectedTicketId}
          onBack={handleBack}
          onRefresh={refreshConversations}
        />
      </div>
    );
  }

  // Render users view (for new chat)
  if (view === 'users') {
    return (
      <div className={`flex flex-col h-full bg-white ${className}`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setView('list')}
              className="p-1.5 rounded-lg hover:bg-slate-100"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-lg font-semibold text-slate-900">New Chat</h2>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
           {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setUserFilter('ALL')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                userFilter === 'ALL' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setUserFilter('ACTIVE')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                userFilter === 'ACTIVE' 
                  ? 'bg-green-100 text-green-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Active Now
            </button>
          </div>
        </div>

        {/* Users list */}
        <div className="flex-1 overflow-y-auto p-2">
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <UserCardItem
                  key={user.id}
                  user={user as any}
                  currentUserId={currentUserId as string}
                  onClick={() => handleStartNewChat(user.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render conversations list
  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
            {/* Unread Badge */}
            {stats && stats.unreadCount > 0 && (
               <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-sm animate-pulse">
                 {stats.unreadCount}
               </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                  refreshConversations();
                  refreshUsers();
              }}
              className="p-2 rounded-lg hover:bg-slate-100"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${conversationsLoading || usersLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 px-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>

        {/* Stats tabs - Redesigned */}
        {stats && (
          <div className="space-y-2 mb-2">
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'ALL' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <span>All</span>
                <span className={`text-[10px] ${statusFilter === 'ALL' ? 'text-blue-500' : 'text-slate-400'}`}>
                  {stats.total}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'ACTIVE' 
                    ? 'bg-white text-green-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <span>Active</span>
                <span className={`text-[10px] ${statusFilter === 'ACTIVE' ? 'text-green-500' : 'text-slate-400'}`}>
                  {stats.active}
                </span>
              </button>
              <button
                onClick={() => setStatusFilter('CLOSED')}
                className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'CLOSED' 
                    ? 'bg-white text-slate-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <span>Closed</span>
                <span className={`text-[10px] ${statusFilter === 'CLOSED' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {stats.closed}
                </span>
              </button>
            </div>
            
            {stats.unreadCount > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                 <div className="flex items-center gap-2">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </div>
                    <span className="text-xs font-medium text-red-700 flex items-center gap-1">
                      Unread Messages
                    </span>
                 </div>
                 <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                    {stats.unreadCount}
                 </span>
              </div>
            )}
          </div>
        )}
      </div>

        {/* Main User List (Replaces Conversation List) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {conversationsLoading && usersLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Loading chats...</p>
            </div>
          ) : (
            <>
               {/* Use the users list but merged with conversation data */}
               {(() => {
                  // Merge strategy: Show all users. If a conversation exists, attach it.
                  // Filter out current user
                  const allUsers = users.filter((u: any) => u.id !== currentUserId);

                  // Filter by search AND status
                  const displayedUsers = allUsers.filter((u: any) => {
                     // 1. Search
                     const matchesSearch = !searchQuery || u.username.toLowerCase().includes(searchQuery.toLowerCase());
                     if (!matchesSearch) return false;

                     // 2. Status Filter
                     if (statusFilter === 'ALL') return true;

                     const conv = conversations.find(c => 
                          c.participants?.some(p => p.userId === u.id) && !c.ticketId && !c.requestId
                     );
                     
                     if (statusFilter === 'ACTIVE') return conv?.status === 'ACTIVE';
                     if (statusFilter === 'CLOSED') return conv?.status === 'CLOSED';
                     
                     return true;
                  });
                  
                  if (displayedUsers.length === 0) {
                      return (
                         <div className="text-center py-12 text-slate-500">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No users found</p>
                         </div>
                      )
                  }

                  return displayedUsers.map((user: any) => {
                      // Find conversation for this user
                      // NOTE: This assumes 1-on-1 conversations mainly. 
                      // If we have group chats, this logic needs separate handling or a separate section.
                      // For now, based on "one conversation per user" model requested.
                      const conversation = conversations.find(c => 
                          c.participants?.some(p => p.userId === user.id) && !c.ticketId && !c.requestId
                      );

                      return (
                          <UserCardItem
                            key={user.id}
                            user={user}
                            conversation={conversation}
                            currentUserId={currentUserId}
                            onClick={() => handleStartNewChat(user.id)}
                          />
                      );
                  });
               })()}
            </>
          )}
        </div>
      </div>
  );
}

export default ChatSidebar;
