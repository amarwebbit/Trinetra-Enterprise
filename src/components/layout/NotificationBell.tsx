'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bell, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string;
}

// Module-level cache to deduplicate requests across component remounts & page transitions
let globalNotificationCache: {
  data: { notifications: Notification[]; unreadCount: number } | null;
  lastFetch: number;
} = { data: null, lastFetch: 0 };

let inFlightFetchPromise: Promise<{ notifications: Notification[]; unreadCount: number }> | null = null;

const CACHE_TTL_MS = 60000; // 60 seconds cache

export function NotificationBell() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(() => globalNotificationCache.data?.notifications || []);
  const [unreadCount, setUnreadCount] = useState<number>(() => globalNotificationCache.data?.unreadCount || 0);
  const [isLoading, setIsLoading] = useState(!globalNotificationCache.data);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async (force = false) => {
    // 1. Skip if user is not authenticated or session is loading
    if (status !== 'authenticated' || !session?.user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    const now = Date.now();
    // 2. Return cached data if fetched less than CACHE_TTL_MS ago
    if (!force && globalNotificationCache.data && (now - globalNotificationCache.lastFetch < CACHE_TTL_MS)) {
      setNotifications(globalNotificationCache.data.notifications);
      setUnreadCount(globalNotificationCache.data.unreadCount);
      setIsLoading(false);
      return;
    }

    // 3. Reuse in-flight request if another component/mount requested it simultaneously
    if (inFlightFetchPromise) {
      try {
        const resData = await inFlightFetchPromise;
        setNotifications(resData.notifications);
        setUnreadCount(resData.unreadCount);
      } catch (e) {}
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      inFlightFetchPromise = (async () => {
        const response = await fetch('/api/notifications');
        if (response.status === 401) {
          return { notifications: [], unreadCount: 0 };
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return {
          notifications: data.notifications || [],
          unreadCount: data.unreadCount || 0,
        };
      })();

      const result = await inFlightFetchPromise;
      globalNotificationCache = { data: result, lastFetch: Date.now() };
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (err: any) {
      if (err?.name !== 'TypeError') {
        setError('Could not load notifications');
      }
    } finally {
      inFlightFetchPromise = null;
      setIsLoading(false);
    }
  }, [status, session]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotifications();
      
      // Poll every 60 seconds, but ONLY if document is visible
      const interval = setInterval(() => {
        if (!document.hidden) {
          fetchNotifications(true);
        }
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [status, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      if (response.ok) {
        const updatedList = notifications.map(n => 
          n.id === id ? { ...n, is_read: true } : n
        );
        const newUnread = Math.max(0, unreadCount - 1);
        setNotifications(updatedList);
        setUnreadCount(newUnread);
        globalNotificationCache = {
          data: { notifications: updatedList, unreadCount: newUnread },
          lastFetch: Date.now(),
        };
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      
      if (response.ok) {
        const updatedList = notifications.map(n => ({ ...n, is_read: true }));
        setNotifications(updatedList);
        setUnreadCount(0);
        globalNotificationCache = {
          data: { notifications: updatedList, unreadCount: 0 },
          lastFetch: Date.now(),
        };
        toast.success('All notifications marked as read');
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'exam_result': return '📊';
      case 'exam_reminder': return '⏰';
      case 'announcement': return '📢';
      case 'assignment': return '📄';
      default: return '🔔';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <p>{error}</p>
                <button 
                  onClick={() => fetchNotifications(true)}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id);
                    }
                    if (notification.link) {
                      window.location.href = notification.link;
                    }
                    setIsOpen(false);
                  }}
                  className={`px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    !notification.is_read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {notification.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/notifications');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
