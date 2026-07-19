import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BellRing,
  CheckCheck,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  Loader2,
} from 'lucide-react';
import {
  formatAdminNotificationTime,
  getSafeAdminNotificationUrl,
  mergeAdminNotifications,
} from '../utils/adminNotifications';

const PAGE_SIZE = 10;

const AdminNotificationsPanel = ({ token, unreadCount, onUnreadCountChange }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const config = useCallback(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const refreshUnreadCount = useCallback(async () => {
    const { data } = await axios.get('/api/admin/notifications/unread-count', config());
    const nextCount = Number(data.unreadCount) || 0;
    onUnreadCountChange(nextCount);
    return nextCount;
  }, [config, onUnreadCountChange]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialNotifications = async () => {
      setLoading(true);
      setError('');

      try {
        const [{ data: listData }, { data: countData }] = await Promise.all([
          axios.get('/api/admin/notifications', {
            ...config(),
            params: { limit: PAGE_SIZE },
          }),
          axios.get('/api/admin/notifications/unread-count', config()),
        ]);

        if (!cancelled) {
          setNotifications(listData.notifications || []);
          setNextCursor(listData.nextCursor || null);
          setHasMore(Boolean(listData.hasMore));
          onUnreadCountChange(Number(countData.unreadCount) || 0);
        }
      } catch (requestError) {
        console.error(requestError);
        if (!cancelled) {
          setError(requestError.response?.data?.message || 'Unable to load admin notifications.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInitialNotifications();

    return () => {
      cancelled = true;
    };
  }, [config, onUnreadCountChange]);

  const loadMore = async () => {
    if (!nextCursor || action) {
      return;
    }

    setAction('load-more');
    setError('');
    setSuccess('');

    try {
      const { data } = await axios.get('/api/admin/notifications', {
        ...config(),
        params: { limit: PAGE_SIZE, cursor: nextCursor },
      });
      setNotifications((current) => mergeAdminNotifications(current, data.notifications || []));
      setNextCursor(data.nextCursor || null);
      setHasMore(Boolean(data.hasMore));
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.response?.data?.message || 'Unable to load more notifications.');
    } finally {
      setAction('');
    }
  };

  const openNotification = async (notification) => {
    if (action) {
      return;
    }

    const notificationId = String(notification.id);
    setAction(`open:${notificationId}`);
    setError('');
    setSuccess('');

    try {
      if (!notification.isRead) {
        const { data } = await axios.patch(
          `/api/admin/notifications/${notificationId}/read`,
          {},
          config()
        );
        setNotifications((current) =>
          current.map((item) => (String(item.id) === notificationId ? data.notification : item))
        );
      }

      try {
        await refreshUnreadCount();
      } catch (countError) {
        console.error(countError);
      }

      navigate(getSafeAdminNotificationUrl(notification));
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.response?.data?.message || 'Unable to open this notification.');
      setAction('');
    }
  };

  const markAllRead = async () => {
    if (action || unreadCount < 1) {
      return;
    }

    setAction('read-all');
    setError('');
    setSuccess('');

    try {
      const { data } = await axios.patch('/api/admin/notifications/read-all', {}, config());
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date().toISOString(),
        }))
      );
      await refreshUnreadCount();
      setSuccess(data.message || 'All notifications marked as read.');
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.response?.data?.message || 'Unable to mark notifications as read.');
    } finally {
      setAction('');
    }
  };

  const createSample = async () => {
    if (action) {
      return;
    }

    setAction('sample');
    setError('');
    setSuccess('');

    try {
      const { data } = await axios.post('/api/admin/notifications/test', {}, config());
      setNotifications((current) => mergeAdminNotifications([data.notification], current));
      await refreshUnreadCount();
      setSuccess('Sample notification created for this admin account.');
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.response?.data?.message || 'Unable to create a sample notification.');
    } finally {
      setAction('');
    }
  };

  return (
    <section className="mb-6 rounded-lg border border-gray-100 bg-white shadow-sm" aria-labelledby="admin-notification-history-heading">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-primary">
            <BellRing size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="admin-notification-history-heading" className="font-serif text-lg font-bold text-brand-dark">
                Admin notifications
              </h2>
              {unreadCount > 0 && (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold text-white" aria-label={`${unreadCount} unread notifications`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">Newest order activity for this admin account.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={createSample}
            disabled={Boolean(action)}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-brand-accent/30 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-primary transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action === 'sample' ? <Loader2 size={15} className="mr-2 animate-spin" /> : <FlaskConical size={15} className="mr-2" />}
            Create Sample
          </button>
          <button
            type="button"
            onClick={markAllRead}
            disabled={Boolean(action) || unreadCount < 1}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-dark transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {action === 'read-all' ? <Loader2 size={15} className="mr-2 animate-spin" /> : <CheckCheck size={15} className="mr-2" />}
            Mark All Read
          </button>
        </div>
      </div>

      <div aria-busy={loading} aria-live="polite">
        {loading ? (
          <div className="flex min-h-36 items-center justify-center p-6 text-sm text-gray-500" role="status">
            <Loader2 size={18} className="mr-2 animate-spin" /> Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <BellRing size={24} className="mx-auto text-brand-accent" aria-hidden="true" />
            <p className="mt-3 font-serif text-lg font-bold text-brand-dark">No notifications yet</p>
            <p className="mt-1 text-sm text-gray-500">New order activity will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              const isOpening = action === `open:${notification.id}`;

              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(notification)}
                    disabled={Boolean(action)}
                    className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-brand-light/60 disabled:cursor-wait disabled:opacity-70 ${notification.isRead ? 'bg-white' : 'bg-[#fbf8f3]'}`}
                    aria-label={`${notification.isRead ? '' : 'Unread: '}${notification.title}. Open order ${notification.orderNumber}`}
                  >
                    <span className={`mt-2 h-2.5 w-2.5 rounded-full ${notification.isRead ? 'bg-gray-200' : 'bg-brand-accent'}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`break-words font-serif text-base text-brand-dark ${notification.isRead ? 'font-semibold' : 'font-bold'}`}>
                          {notification.title}
                        </span>
                        <span className="break-all text-xs font-bold uppercase tracking-[0.12em] text-brand-accent">
                          Order #{notification.orderNumber}
                        </span>
                      </span>
                      <span className="mt-1 block break-words text-sm leading-6 text-gray-600">{notification.message}</span>
                      <time className="mt-2 block text-xs text-gray-400" dateTime={notification.createdAt}>
                        {formatAdminNotificationTime(notification.createdAt)}
                      </time>
                    </span>
                    <span className="mt-1 inline-flex h-8 w-8 items-center justify-center text-brand-primary" aria-hidden="true">
                      {isOpening ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {hasMore && !loading && (
        <div className="border-t border-gray-100 p-3 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={Boolean(action)}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-dark transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action === 'load-more' ? <Loader2 size={15} className="mr-2 animate-spin" /> : <ChevronDown size={15} className="mr-2" />}
            Load More
          </button>
        </div>
      )}

      {success && <p className="border-t border-gray-100 px-4 py-3 text-sm font-medium text-green-700" role="status">{success}</p>}
      {error && <p className="border-t border-gray-100 px-4 py-3 text-sm font-medium text-red-700" role="alert">{error}</p>}
    </section>
  );
};

export default AdminNotificationsPanel;
