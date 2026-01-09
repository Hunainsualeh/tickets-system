/**
 * ChatWindow Component
 * Main chat interface with messages, input, and real-time features
 * Banking Ticketing Portal
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import type { Message, ChatPermissions, PresenceStatus } from '@/types/chat';
import { Send, Paperclip, X, Reply, Edit2, Trash2, MoreVertical, Check, CheckCheck, Image, FileText, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';

// ==========================================
// TYPES
// ==========================================

interface ChatWindowProps {
  conversationId?: string;
  ticketId?: string;
  onClose?: () => void;
  className?: string;
  compact?: boolean;
}

// ==========================================
// UTILITIES
// ==========================================

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
    default: return 'bg-gray-400';
  }
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

// ==========================================
// MESSAGE COMPONENT
// ==========================================

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  permissions: ChatPermissions | null;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: Message) => void;
}

function MessageItem({ message, isOwn, permissions, onEdit, onDelete, onReply }: MessageItemProps) {
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
      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender name (for others) */}
        {!isOwn && (
          <div className="text-xs text-slate-500 mb-1 px-1">
            {message.sender?.username}
          </div>
        )}

        {/* Reply reference */}
        {message.replyTo && (
          <div className={`text-xs px-3 py-1 mb-1 rounded border-l-2 ${
            isOwn 
              ? 'bg-blue-50 border-blue-300' 
              : 'bg-slate-50 border-slate-300'
          }`}>
            <span className="font-medium">{message.replyTo.sender?.username}</span>
            <p className="truncate text-slate-600">{message.replyTo.content}</p>
          </div>
        )}

        {/* Message bubble */}
        <div 
          className={`relative px-4 py-2 rounded-2xl ${
            isOwn 
              ? 'bg-blue-600 text-white rounded-br-md' 
              : 'bg-slate-100 text-slate-900 rounded-bl-md'
          }`}
        >
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 bg-transparent border-b border-white/50 focus:outline-none"
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
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              
              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-2 rounded ${
                        isOwn ? 'bg-blue-500/30 hover:bg-blue-500/50' : 'bg-slate-200 hover:bg-slate-300'
                      }`}
                    >
                      {att.mimeType.startsWith('image/') ? (
                        <img 
                          src={att.fileUrl} 
                          alt={att.fileName} 
                          className="max-w-[200px] max-h-[150px] rounded"
                        />
                      ) : (
                        <>
                          {getFileIcon(att.mimeType)}
                          <span className="text-sm truncate">{att.fileName}</span>
                        </>
                      )}
                    </a>
                  ))}
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
              className={`absolute top-6 ${isOwn ? '-left-20' : '-right-20'} bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 min-w-[100px]`}
              onMouseLeave={() => setShowMenu(false)}
            >
              <button
                onClick={() => {
                  onReply(message);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
              >
                <Reply className="w-4 h-4" /> Reply
              </button>
              {canEdit && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
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
// MAIN COMPONENT
// ==========================================

export function ChatWindow({ conversationId, ticketId, onClose, className = '', compact = false }: ChatWindowProps) {
  const {
    isConnected,
    isConnecting,
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
  const [uploadError, setUploadError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentUserId = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('user') || '{}').id 
    : null;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when viewing
  useEffect(() => {
    if (conversation && messages.length > 0) {
      markAsRead();
    }
  }, [conversation, messages.length, markAsRead]);

  // Infinite scroll for loading more messages
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop } = messagesContainerRef.current;
    if (scrollTop === 0 && hasMore && !isLoadingMore) {
      loadMoreMessages();
    }
  }, [hasMore, isLoadingMore, loadMoreMessages]);

  // Handle message send
  const handleSend = async () => {
    if (!inputValue.trim() || permissions?.isReadOnly) return;

    try {
      await sendMessage(inputValue.trim(), replyTo?.id);
      setInputValue('');
      setReplyTo(null);
      stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle file upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      await uploadFile(file);
    } catch (error: any) {
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (e.target.value) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  // Get other participant for header
  const otherParticipant = conversation?.participants?.find(
    p => p.userId !== currentUserId
  );

  // Render typing indicator
  const typingUsersArray = Array.from(typingUsers.values()).filter(
    (_, idx) => typingUsers.size <= 3 || idx < 2
  );

  return (
    <div className={`flex flex-col bg-white rounded-xl shadow-xl border border-slate-200 ${compact ? 'h-[400px]' : 'h-[600px]'} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
        <div className="flex items-center gap-3">
          {otherParticipant && (
            <>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  {otherParticipant.user?.username.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  getPresenceColor((otherParticipant.user as any)?.presence?.status || 'OFFLINE')
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {otherParticipant.user?.username}
                </h3>
                <p className="text-xs text-slate-500">
                  {(otherParticipant.user as any)?.presence?.status || 'Offline'}
                </p>
              </div>
            </>
          )}
          {!otherParticipant && conversation?.title && (
            <h3 className="font-semibold text-slate-900">
              {conversation.title}
            </h3>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-500' : 'text-slate-400'}`}>
            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-200"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          )}
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

      {/* Read-only banner */}
      {permissions?.isReadOnly && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-yellow-700 text-sm">
          This conversation is read-only. You cannot send messages.
        </div>
      )}

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1 bg-slate-50"
      >
        {/* Load more indicator */}
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

        {/* Messages list */}
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwn={message.senderId === currentUserId}
            permissions={permissions}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onReply={(msg) => setReplyTo(msg)}
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
            <span>
              {typingUsersArray.map(u => u.username).join(', ')}
              {typingUsers.size > 3 && ` and ${typingUsers.size - 2} others`}
              {' '}typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-2">
          <Reply className="w-4 h-4 text-slate-400" />
          <div className="flex-1 text-sm">
            <span className="font-medium">{replyTo.sender?.username}</span>
            <p className="text-slate-500 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-slate-200 rounded">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {uploadError}
          <button onClick={() => setUploadError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      {!permissions?.isReadOnly && (
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            {/* File upload */}
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
              className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              ) : (
                <Paperclip className="w-5 h-5 text-slate-500" />
              )}
            </button>

            {/* Message input */}
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                handleInputChange(e);
                // Auto-resize
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
              className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[120px]"
              disabled={!conversation}
              rows={1}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || !conversation}
              className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;
