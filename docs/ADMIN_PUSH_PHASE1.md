# Admin Web Push Phase 1

Phase 1 registers authenticated admin browsers for standard Web Push and provides a test-delivery action. It does not send notifications from the order-creation flow yet.

## Environment variables

Backend Vercel project:

```text
VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:info@apexspices.lk
```

Frontend Vercel project:

```text
VITE_VAPID_PUBLIC_KEY=<same public key>
```

The private key must never be added to the frontend project, browser code, source control, screenshots, or logs. Redeploy the backend and frontend after changing these values.

## Protected API

All endpoints require a valid bearer token and the existing `orders:read` permission.

```text
GET    /api/admin/push/subscriptions
POST   /api/admin/push/subscriptions
DELETE /api/admin/push/subscriptions/:id
POST   /api/admin/push/test
```

Admin subscriptions use the existing `PushSubscription` collection with the `admin-orders` purpose. Each browser endpoint is stored separately, allowing one admin account to register multiple devices. Test delivery does not create notification-history records.

## Production test

1. Deploy the backend first, followed by the frontend.
2. Sign in as an admin or staff user with `orders:read`.
3. Open the Admin Dashboard over HTTPS.
4. Select **Enable Order Notifications** and approve the browser permission prompt.
5. Confirm the dashboard reports that notifications are enabled for the current browser.
6. Select **Send Test** and confirm the device receives the Apex Spices test notification.
7. Select the notification and confirm it opens or focuses `/admin`.
8. Repeat on another browser or device and confirm both records appear as active `admin-orders` subscriptions in MongoDB.
9. Select **Disable** and confirm test delivery is no longer available for that device.

On iPhone and iPad, install the PWA to the Home Screen before enabling notifications. Permission prompts must always be initiated by the Enable button. Private/incognito browsing and browser-level notification blocking can prevent subscriptions from persisting.

## Local test

Add the same variables to ignored local environment files, run the backend and frontend, and use `localhost`, which browsers treat as a secure context for service workers. Never commit either local environment file.

## Not included in Phase 1

- Automatic order-created delivery
- QStash, queues, retries, or an outbox
- Notification history or unread counts
- Email or Telegram fallback
- Admin-only manifest changes
