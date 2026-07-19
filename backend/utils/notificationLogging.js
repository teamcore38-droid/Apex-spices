const sanitizeNotificationLogMessage = (value, fallback = 'Notification operation failed') =>
  String(value || fallback)
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/https?:\/\/[^\s]+/gi, '[url]')
    .slice(0, 300);

const logNotificationError = ({ scope, action = '', outboxId = '', error }) => {
  const entry = {
    scope: String(scope || 'admin-notifications'),
    ...(action ? { action: String(action) } : {}),
    ...(outboxId ? { outboxId: String(outboxId) } : {}),
    errorName: String(error?.name || 'Error'),
    errorCode: String(error?.code || ''),
    statusCode: Number(error?.statusCode || error?.status || 0) || null,
    message: sanitizeNotificationLogMessage(error?.message),
  };

  console.error('[adminNotifications]', JSON.stringify(entry));
};

export { logNotificationError, sanitizeNotificationLogMessage };
