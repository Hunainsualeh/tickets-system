'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  RefreshCw, 
  CheckCheck, 
  X, 
  Clock, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  ChevronRight,
  Ticket as TicketIcon,
  MessageSquare,
  Activity,
  FileText,
  Building2,
  Users
} from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotificationBell() {
  const { notifications, unreadCount, refresh, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefreshEvent = () => {
      refresh();
    };
    window.addEventListener('refresh-notifications', handleRefreshEvent);
    return () => window.removeEventListener('refresh-notifications', handleRefreshEvent);
  }, [refresh]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const getNotificationIcon = (notification: Notification) => {
    // Priority to specific types if they are not just generic INFO
    if (notification.type === 'SUCCESS') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (notification.type === 'WARNING') return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    if (notification.type === 'ERROR') return <AlertCircle className="w-5 h-5 text-red-600" />;

    // Infer from content for INFO type
    const title = notification.title.toLowerCase();
    const message = notification.message.toLowerCase();
    
    if (title.includes('ticket') || message.includes('ticket')) {
      return <TicketIcon className="w-5 h-5 text-blue-600" />;
    }
    if (title.includes('note') || message.includes('note')) {
      return <MessageSquare className="w-5 h-5 text-purple-600" />;
    }
    if (title.includes('status') || message.includes('status')) {
      return <Activity className="w-5 h-5 text-orange-600" />;
    }
    if (title.includes('request') || message.includes('request')) {
      return <FileText className="w-5 h-5 text-indigo-600" />;
    }
    if (title.includes('branch') || message.includes('branch')) {
      return <Building2 className="w-5 h-5 text-slate-600" />;
    }
    if (title.includes('team') || message.includes('team')) {
      return <Users className="w-5 h-5 text-teal-600" />;
    }

    return <Info className="w-5 h-5 text-blue-600" />;
  };

  const getNotificationStyles = (type: string, read: boolean) => {
    const baseStyles = "border-l-4 transition-colors duration-200";
    if (read) return `${baseStyles} border-transparent bg-white hover:bg-slate-50`;
    
    switch (type) {
      case 'SUCCESS':
        return `${baseStyles} border-green-500 bg-green-50/50 hover:bg-green-50`;
      case 'WARNING':
        return `${baseStyles} border-amber-500 bg-amber-50/50 hover:bg-amber-50`;
      case 'ERROR':
        return `${baseStyles} border-red-500 bg-red-50/50 hover:bg-red-50`;
      default:
        return `${baseStyles} border-blue-500 bg-blue-50/50 hover:bg-blue-50`;
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const seconds = Math.floor((now.getTime() - notifDate.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return notifDate.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-2 h-2 bg-red-500 rounded-full ring-2 ring-white">
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="fixed left-4 right-4 top-20 z-50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[400px] bg-white rounded-xl shadow-2xl ring-1 ring-black/5 border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full shadow-sm">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleRefresh}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Mark all read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent bg-slate-50/30">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-900 font-medium">No notifications</p>
                <p className="text-sm text-slate-500 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer group relative ${getNotificationStyles(notification.type, notification.read)}`}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-0.5">
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`text-sm ${!notification.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {notification.title}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                    
                    {/* Hover Actions */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-slate-100">
                      <button
                        onClick={(e) => handleDelete(e, notification.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50">
            <Link
              href="/dashboard/notifications"
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-blue-100 hover:shadow-sm group"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
