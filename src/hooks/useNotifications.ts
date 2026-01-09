import { useState, useEffect, useCallback } from 'react';
import { getSocket } from './useChat';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  read: boolean;
  link?: string | null;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/notifications', {
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    
    // Poll for notifications every 30 seconds as backup
    const pollInterval = setInterval(fetchNotifications, 30000);
    
    // Listen for real-time notifications
    const socket = getSocket();
    if (socket) {
      const handleNewNotification = (notification: any) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      };
      
      socket.on('new_notification', handleNewNotification);
      
      return () => {
        socket.off('new_notification', handleNewNotification);
        clearInterval(pollInterval);
      };
    }
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchNotifications]);

  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setUnreadCount((prev) => {
          const notification = notifications.find((n) => n.id === notificationId);
          return notification && !notification.read ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
