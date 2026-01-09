/**
 * ChatPanel Component
 * Full chat interface combining list and window
 * Banking Ticketing Portal
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { MessageSquare, X, Minimize2, Maximize2, ChevronLeft } from 'lucide-react';

// ==========================================
// TYPES
// ==========================================

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialConversationId?: string;
  initialTicketId?: string;
  position?: 'sidebar' | 'floating' | 'fullscreen';
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function ChatPanel({ 
  isOpen, 
  onClose, 
  initialConversationId, 
  initialTicketId,
  position = 'floating'
}: ChatPanelProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(initialConversationId);
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>(initialTicketId);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showList, setShowList] = useState(!initialConversationId && !initialTicketId);

  // Update when initial values change
  useEffect(() => {
    if (initialConversationId) {
      setSelectedConversationId(initialConversationId);
      setSelectedTicketId(undefined);
      setShowList(false);
    }
    if (initialTicketId) {
      setSelectedTicketId(initialTicketId);
      setSelectedConversationId(undefined);
      setShowList(false);
    }
  }, [initialConversationId, initialTicketId]);

  // Handle selecting a conversation from list
  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setSelectedTicketId(undefined);
    setShowList(false);
  }, []);

  // Handle starting a new chat with a user
  const handleStartNewChat = useCallback(async (userId: string) => {
    try {
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
      setShowList(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }, []);

  // Handle back to list
  const handleBackToList = useCallback(() => {
    setShowList(true);
    setSelectedConversationId(undefined);
    setSelectedTicketId(undefined);
  }, []);

  if (!isOpen) return null;

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium">Chat</span>
          <Maximize2 className="w-4 h-4 ml-2" />
        </button>
      </div>
    );
  }

  // Position-based styling
  const positionClasses = {
    floating: 'fixed bottom-4 right-4 w-[400px] h-[600px] max-h-[80vh] z-50 rounded-2xl shadow-2xl',
    sidebar: 'fixed top-0 right-0 w-[400px] h-full z-50 shadow-xl',
    fullscreen: 'fixed inset-0 z-50',
  };

  return (
    <div className={`bg-white flex flex-col border border-slate-200 ${positionClasses[position]}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-blue-600 text-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          {!showList && (selectedConversationId || selectedTicketId) && (
            <button
              onClick={handleBackToList}
              className="p-1 rounded hover:bg-blue-500"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <MessageSquare className="w-5 h-5" />
          <h2 className="font-semibold">Chat</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded hover:bg-blue-500"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-blue-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showList ? (
          <ChatList
            onSelectConversation={handleSelectConversation}
            onStartNewChat={handleStartNewChat}
            selectedConversationId={selectedConversationId}
            className="h-full"
          />
        ) : (
          <ChatWindow
            conversationId={selectedConversationId}
            ticketId={selectedTicketId}
            onClose={handleBackToList}
            className="h-full rounded-none border-0 shadow-none"
            compact
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// CHAT FLOATING BUTTON
// ==========================================

interface ChatFloatingButtonProps {
  unreadCount?: number;
  onClick: () => void;
}

export function ChatFloatingButton({ unreadCount = 0, onClick }: ChatFloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105"
    >
      <MessageSquare className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

// ==========================================
// TICKET CHAT BUTTON (for ticket detail pages)
// ==========================================

interface TicketChatButtonProps {
  ticketId: string;
  ticketTitle?: string;
}

export function TicketChatButton({ ticketId, ticketTitle }: TicketChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Open Chat</span>
      </button>

      {isOpen && (
        <ChatPanel
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          initialTicketId={ticketId}
          position="floating"
        />
      )}
    </>
  );
}

export default ChatPanel;
