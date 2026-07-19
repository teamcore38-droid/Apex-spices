# Admin Notifications Phase 3

Phase 3 uses a transactional-outbox-style MongoDB record plus Upstash QStash delivery. Checkout and PayHere persist an idempotent local event, then start QStash publishing without waiting for network notification delivery.

## Backend environment

```env
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
BACKEND_PUBLIC_URL=https://api.apexspices.lk
```

The four `QSTASH_*` values are required. `BACKEND_PUBLIC_URL` is strongly recommended. On Vercel, the trusted `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` is used as a fallback. Other production deployments fail closed when no trusted backend URL is configured; request host headers are used only during local development.

`QSTASH_WORKER_URL` is optional. When set, it must be the complete public HTTPS URL:

```env
QSTASH_WORKER_URL=https://api.apexspices.lk/api/workers/admin-notifications
```

Keep all QStash values backend-only. Redeploy the backend after changing them.

## Worker endpoints

- `POST /api/workers/admin-notifications`
- `POST /api/workers/admin-notifications/reconcile`

Both endpoints reject requests without a valid `Upstash-Signature`. They are not authenticated with admin browser tokens.

## Reconciliation schedule

Create a QStash schedule in the Upstash console that sends a JSON `POST` request to:

```text
https://api.apexspices.lk/api/workers/admin-notifications/reconcile
```

Use a schedule of every 2 to 5 minutes and body:

```json
{"limit":50}
```

QStash signs scheduled deliveries automatically. Reconciliation publishes pending and publish-failed records, while process-failed or stale-published records are processed directly under the same MongoDB lease and per-device delivery protections. This avoids QStash suppressing recovery messages because deduplication IDs are retained for 90 days. QStash delivery retries remain the first line of recovery.

## Production verification

1. Confirm the four QStash variables and `BACKEND_PUBLIC_URL` exist in the backend Production environment.
2. Deploy the backend and frontend.
3. Keep Phase 1 Web Push enabled for at least one authenticated admin browser.
4. Place a PayHere order and confirm an `order.created:<orderId>` outbox record appears.
5. Confirm the admin receives **New order received** and the MongoDB notification panel updates.
6. Complete PayHere payment and confirm one `order.paid:<orderId>` record and **Order payment confirmed** notification.
7. Repeat the PayHere callback and verify no extra outbox or admin-history records are created.
8. Inspect `deviceDeliveries` on the outbox record for sent, expired, failed, or unknown outcomes.

The Phase 1 **Send Test** control remains available for direct VAPID diagnostics. The Phase 2 sample-history endpoint and button have been removed.
