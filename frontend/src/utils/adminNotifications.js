const mergeAdminNotifications = (current = [], incoming = []) => {
  const byId = new Map();

  [...current, ...incoming].forEach((notification) => {
    if (notification?.id) {
      byId.set(String(notification.id), notification);
    }
  });

  return [...byId.values()].sort((left, right) => {
    const timeDifference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return timeDifference || String(right.id).localeCompare(String(left.id));
  });
};

const getSafeAdminNotificationUrl = (notification = {}) => {
  const adminUrl = String(notification.adminUrl || '').trim();
  const orderId = String(notification.orderId || '').trim();

  if (/^\/admin\/orders\/[a-f\d]{24}$/i.test(adminUrl)) {
    return adminUrl;
  }

  if (/^[a-f\d]{24}$/i.test(orderId)) {
    return `/admin/orders/${orderId}`;
  }

  return '/admin';
};

const formatAdminNotificationTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export {
  formatAdminNotificationTime,
  getSafeAdminNotificationUrl,
  mergeAdminNotifications,
};
