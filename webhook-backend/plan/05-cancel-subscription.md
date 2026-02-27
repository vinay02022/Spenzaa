# Phase 5 — Cancel Webhook Subscription (Backend)

## Overview

Authenticated users can cancel their own webhook subscriptions. Cancelling sets the status to CANCELLED, stops all pending deliveries, and prevents future event ingestion.

## Endpoints

Both routes do the same thing — two methods for client convenience:

### POST /webhooks/:id/cancel (JWT Protected)
### DELETE /webhooks/:id (JWT Protected)

**Success Response (200):**
```json
{
  "id": "uuid",
  "sourceUrl": "https://...",
  "callbackUrl": "https://...",
  "status": "CANCELLED",
  ...
}
```

**Error Responses:**
- `401` — Missing or invalid JWT
- `404` — Subscription not found or belongs to another user

## Cancellation Behavior

When a subscription is cancelled:

1. **Status set to CANCELLED** — `WebhookSubscription.status = 'CANCELLED'`
2. **Pending events marked FAILED** — All events with status `RECEIVED` or `PROCESSING` are updated to `FAILED` with `lastError: 'Subscription cancelled'`
3. **Future ingestion blocked** — `POST /webhooks/:id/receive` returns `400 Bad Request` for cancelled subscriptions
4. **Delivery skipped** — `DeliveryService.deliverEvent()` returns early if subscription is not ACTIVE
5. **Idempotent** — Cancelling an already-cancelled subscription returns the existing record without error

## Security

- Only the subscription owner can cancel (checked via `userId` match)
- Returns 404 (not 403) for other users' subscriptions to avoid information leakage

## Files

| File | Purpose |
|------|---------|
| `src/webhooks/webhooks.controller.ts` | POST /:id/cancel and DELETE /:id routes |
| `src/webhooks/webhooks.service.ts` | Cancel logic with pending event cleanup |

## How to Test

```bash
TOKEN="<jwt-token>"
SUB_ID="<subscription-id>"

# Cancel via POST
curl -X POST http://localhost:3000/webhooks/$SUB_ID/cancel \
  -H "Authorization: Bearer $TOKEN"

# Or cancel via DELETE
curl -X DELETE http://localhost:3000/webhooks/$SUB_ID \
  -H "Authorization: Bearer $TOKEN"

# Verify ingestion is blocked
curl -X POST http://localhost:3000/webhooks/$SUB_ID/receive \
  -H "Content-Type: application/json" \
  -d '{"payload":{"test":true}}'
# Should return 400: "Subscription is not active"
```
