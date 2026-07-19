# Admin Notifications Phase 2

> Historical note: Phase 3 removed the temporary sample endpoint and **Create Sample** button. This document now describes only the Phase 2 history API foundation.

Phase 2 adds MongoDB-backed notification history for authenticated admin and staff users with `orders:read`. It does not create notifications from the order flow and does not send real order Web Push messages.

## API

All routes require a bearer token and `orders:read`.

```text
GET   /api/admin/notifications?limit=10&cursor=<opaque cursor>
GET   /api/admin/notifications/unread-count
PATCH /api/admin/notifications/:id/read
PATCH /api/admin/notifications/read-all
```

The list is ordered by `createdAt` and `_id`, newest first. Cursors are opaque and should be returned unchanged by clients. Every query is scoped to the authenticated user, so unread state and history remain separate across admin devices and accounts.

## Not included

- Order-controller or payment-controller notification hooks
- Real order Web Push delivery
- QStash, retries, queues, or an outbox
- Email, Telegram, Firebase, or other fallback channels
