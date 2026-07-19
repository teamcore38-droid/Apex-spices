import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BellRing, Loader2 } from 'lucide-react';
import AdminNotificationsPanel from '../components/AdminNotificationsPanel';
import { useAuth } from '../context/AuthContext';

const AdminNotificationsPage = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const canReadOrders = Boolean(
    userInfo?.isAdmin ||
      userInfo?.permissions?.includes('orders:read') ||
      userInfo?.permissions?.includes('*')
  );

  useEffect(() => {
    if (!userInfo?.token) {
      navigate('/login?redirect=/admin/notifications');
      return;
    }

    if (!canReadOrders) {
      navigate('/profile');
    }
  }, [canReadOrders, navigate, userInfo?.token]);

  if (!userInfo?.token || !canReadOrders) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status">
        <Loader2 size={30} className="animate-spin text-brand-primary" />
        <span className="sr-only">Checking notification access...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-6 sm:py-10">
      <div className="container mx-auto max-w-6xl px-4">
        <Link
          to="/admin"
          className="inline-flex min-h-10 items-center text-sm font-semibold text-brand-primary transition-colors hover:text-brand-dark"
        >
          <ArrowLeft size={16} className="mr-2" aria-hidden="true" />
          Back to Admin Dashboard
        </Link>

        <header className="my-5 flex flex-col gap-4 rounded-lg bg-brand-dark px-5 py-6 text-white shadow-sm sm:my-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-accent">
              Order Activity
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold">Admin Notifications</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
              Review order alerts, open the related order, and keep unread activity organized.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-3 rounded-md border border-white/15 bg-white/5 px-4 py-3">
            <BellRing size={20} className="text-brand-accent" aria-hidden="true" />
            <span className="text-sm font-semibold">
              {unreadCount} unread
            </span>
          </div>
        </header>

        <AdminNotificationsPanel
          token={userInfo.token}
          unreadCount={unreadCount}
          onUnreadCountChange={setUnreadCount}
          displayMode="page"
        />
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
