# Admin Notifications Phase 2

Phase 2 adds MongoDB-backed notification history for authenticated admin and staff users with `orders:read`. It does not create notifications from the order flow and does not send real order Web Push messages.

## API

All routes require a bearer token and `orders:read`.

```text
GET   /api/admin/notifications?limit=10&cursor=<opaque cursor>
GET   /api/admin/notifications/unread-count
PATCH /api/admin/notifications/:id/read
PATCH /api/admin/notifications/read-all
POST  /api/admin/notifications/test
```

The list is ordered by `createdAt` and `_id`, newest first. Cursors are opaque and should be returned unchanged by clients. Every query is scoped to the authenticated user, so unread state and history remain separate across admin devices and accounts.

## Sample notification test

The temporary `POST /api/admin/notifications/test` endpoint creates one unread sample for the authenticated admin using the most recently created order. It never sends Web Push and never modifies the order.

1. Ensure at least one order exists.
2. Sign in to `/admin` as an admin or staff user with `orders:read`.
3. Select **Create Sample** in the Admin Notifications panel.
4. Confirm the unread badge increments using the backend unread-count response.
5. Select the sample and confirm it is marked read before `/admin/orders/:id` opens.
6. Return to `/admin`, create multiple samples, and verify **Mark All Read** resets the database-backed count.
7. Create more than ten samples and verify **Load More** retrieves the next cursor page without duplicates.

Remove the sample endpoint and button when Phase 3 automatic order events are enabled.

## Not included

- Order-controller or payment-controller notification hooks
- Real order Web Push delivery
- QStash, retries, queues, or an outbox
- Email, Telegram, Firebase, or other fallback channels
