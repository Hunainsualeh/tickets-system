'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { 
  Bell, 
  RefreshCw, 
  CheckCheck, 
  Trash2, 
  Clock, 
  ArrowLeft, 
  Filter,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  X,
  Ticket as TicketIcon,
  MessageSquare,
  Activity,
  FileText,
  Building2,
  Users,
  Loader2
} from 'lucide-react';
import { Card, CardBody } from '@/app/components/Card';
import { Button } from '@/app/components/Button';
import { Modal } from '@/app/components/Modal';

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, refresh, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      router.push(notification.link);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    setDeleteTargetId(notificationId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      setIsDeleting(true);
      try {
        await deleteNotification(deleteTargetId);
        setShowDeleteModal(false);
        setDeleteTargetId(null);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    // Priority to specific types if they are not just generic INFO
    if (notification.type === 'SUCCESS') return <CheckCircle className="w-6 h-6 text-green-600" />;
    if (notification.type === 'WARNING') return <AlertTriangle className="w-6 h-6 text-amber-600" />;
    if (notification.type === 'ERROR') return <AlertCircle className="w-6 h-6 text-red-600" />;

    // Infer from content for INFO type
    const title = notification.title.toLowerCase();
    const message = notification.message.toLowerCase();
    
    if (title.includes('ticket') || message.includes('ticket')) {
      return <TicketIcon className="w-6 h-6 text-blue-600" />;
    }
    if (title.includes('note') || message.includes('note')) {
      return <MessageSquare className="w-6 h-6 text-purple-600" />;
    }
    if (title.includes('status') || message.includes('status')) {
      return <Activity className="w-6 h-6 text-orange-600" />;
    }
    if (title.includes('request') || message.includes('request')) {
      return <FileText className="w-6 h-6 text-indigo-600" />;
    }
    if (title.includes('branch') || message.includes('branch')) {
      return <Building2 className="w-6 h-6 text-slate-600" />;
    }
    if (title.includes('team') || message.includes('team')) {
      return <Users className="w-6 h-6 text-teal-600" />;
    }

    return <Info className="w-6 h-6 text-blue-600" />;
  };

  const getNotificationStyles = (type: string, read: boolean) => {
    const baseStyles = "border-l-4 transition-all duration-200 hover:shadow-md";
    if (read) return `${baseStyles} border-transparent bg-white hover:bg-slate-50`;
    
    switch (type) {
      case 'SUCCESS':
        return `${baseStyles} border-green-500 bg-green-50/30`;
      case 'WARNING':
        return `${baseStyles} border-amber-500 bg-amber-50/30`;
      case 'ERROR':
        return `${baseStyles} border-red-500 bg-red-50/30`;
      default:
        return `${baseStyles} border-blue-500 bg-blue-50/30`;
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
    return notifDate.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'read' && !notification.read) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    return true;
  });

  const activeFiltersCount = (filter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                Notifications
                {unreadCount > 0 && (
                  <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </h1>
              <p className="text-slate-500 mt-2">
                Manage your alerts and updates
              </p>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className={`flex-1 sm:flex-none ${showFilters || activeFiltersCount > 0 ? 'border-blue-500 text-blue-600 bg-blue-50' : ''}`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-200 text-blue-800 text-xs rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>

              <Button
                onClick={handleRefresh}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  variant="primary"
                  className="flex-1 sm:flex-none"
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-200">
            <Card>
              <CardBody className="p-6">
                <div className="flex flex-col sm:flex-row gap-8">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
                      Status
                    </label>
                    <div className="flex gap-2">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'unread', label: 'Unread' },
                        { id: 'read', label: 'Read' }
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFilter(f.id as any)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            filter === f.id
                              ? 'bg-slate-900 text-white shadow-md'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
                      Type
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { id: 'all', label: 'All Types' },
                        { id: 'INFO', label: 'Info', icon: <Info className="w-3 h-3" /> },
                        { id: 'SUCCESS', label: 'Success', icon: <CheckCircle className="w-3 h-3" /> },
                        { id: 'WARNING', label: 'Warning', icon: <AlertTriangle className="w-3 h-3" /> },
                        { id: 'ERROR', label: 'Error', icon: <AlertCircle className="w-3 h-3" /> }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTypeFilter(t.id)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            typeFilter === t.id
                              ? 'bg-slate-900 text-white shadow-md'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {t.icon}
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {activeFiltersCount > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => {
                        setFilter('all');
                        setTypeFilter('all');
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Clear all filters
                    </button>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No notifications found</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                {notifications.length === 0
                  ? "You don't have any notifications yet. We'll notify you when important updates happen."
                  : "Try adjusting your filters to see more notifications."}
              </p>
              {activeFiltersCount > 0 && (
                <Button
                  onClick={() => {
                    setFilter('all');
                    setTypeFilter('all');
                  }}
                  variant="outline"
                  className="mt-6"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`group relative bg-white rounded-xl p-5 cursor-pointer border border-slate-200 ${getNotificationStyles(notification.type, notification.read)}`}
              >
                <div className="flex gap-5">
                  <div className="shrink-0 mt-1">
                    {getNotificationIcon(notification)}
                  </div>
                
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <div className="flex items-center gap-3">
                        <h3 className={`text-base ${!notification.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                        <button
                          onClick={(e) => handleDelete(e, notification.id)}
                          className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-slate-600 leading-relaxed">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary */}
        {notifications.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              Showing {filteredNotifications.length} of {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Notification"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Are you sure you want to delete this notification? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
