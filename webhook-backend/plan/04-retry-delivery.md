# Phase 4 — Delivery Attempts with Retry Backoff (Backend)

## Overview

When an event is ingested, the system immediately attempts to deliver it to the subscription's `callbackUrl` via HTTP POST. If delivery fails, retries are scheduled with exponential backoff. A background cron job polls for pending retries.

## DeliveryAttempt Model

```prisma
model DeliveryAttempt {
  id                  String         @id @default(uuid())
  attemptNumber       Int
  status              DeliveryStatus (SUCCESS | FAILED)
  httpStatus          Int?
  responseBodySnippet String?        (first 500 chars)
  errorMessage        String?
  nextRetryAt         DateTime?
  createdAt           DateTime       @default(now())

  eventId String
  event   WebhookEvent @relation(...)
}
```

## Delivery Flow

```
Event Ingested
    │
    ▼
Immediate Delivery Attempt
    │
    ├── SUCCESS → status=DELIVERED, record attempt
    │
    └── FAILED → record attempt, schedule retry
                    │
                    ▼
              Cron (every 30s)
                    │
                    ▼
              Retry Delivery
                    │
                    ├── SUCCESS → status=DELIVERED
                    └── FAILED → schedule next retry (or mark FAILED if max attempts reached)
```

## Backoff Schedule

| Attempt | Delay     | nextRetryAt      |
|---------|-----------|------------------|
| 1       | 1 minute  | now + 60s        |
| 2       | 5 minutes | now + 300s       |
| 3       | 15 minutes| now + 900s       |
| 4       | 1 hour    | now + 3600s      |
| 5       | —         | FAILED (no more) |

**Max attempts:** 5

## Idempotency

- **Cron guard:** A `running` flag prevents concurrent cron executions.
- **nextRetryAt clearing:** Before processing a retry, the `nextRetryAt` is set to `null` to prevent double-processing.
- **Event ID deduplication:** The cron processes each event ID only once per cycle.
- **Status flags:** Only events with `status=PROCESSING` are eligible for retry. Once `DELIVERED` or `FAILED`, no more retries.

## Delivery Request

```http
POST <callbackUrl>
Content-Type: application/json
X-Webhook-Event-Id: <event-id>
X-Webhook-Subscription-Id: <subscription-id>
X-Webhook-Event-Type: <eventType>   (if present)
X-Webhook-Secret: <secret>          (if present)

<event payload JSON>
```

- **Timeout:** 10 seconds per delivery attempt.
- **Success:** HTTP 2xx response.
- **Failure:** Non-2xx response, network error, or timeout.

## Background Worker

- Uses `@nestjs/schedule` with `@Cron(EVERY_30_SECONDS)`.
- Polls `DeliveryAttempt` table for rows where:
  - `status = FAILED`
  - `nextRetryAt <= now`
  - Related event has `status = PROCESSING`
- Processes up to 10 retries per cron cycle.

## Observability

The `GET /events/:id` endpoint already includes delivery attempts:

```json
{
  "id": "event-uuid",
  "status": "PROCESSING",
  "attempts": 2,
  "lastError": "ECONNREFUSED",
  "deliveryAttempts": [
    {
      "attemptNumber": 1,
      "status": "FAILED",
      "errorMessage": "ECONNREFUSED",
      "createdAt": "..."
    },
    {
      "attemptNumber": 2,
      "status": "FAILED",
      "httpStatus": 500,
      "errorMessage": "HTTP 500",
      "nextRetryAt": "2026-02-27T17:00:00Z",
      "createdAt": "..."
    }
  ]
}
```

## Files

| File | Purpose |
|------|---------|
| `src/delivery/delivery.service.ts` | Core delivery + retry logic |
| `src/delivery/delivery.cron.ts` | Background cron job |
| `src/delivery/delivery.module.ts` | Module definition |

## How to Test

```bash
# 1. Create a subscription pointing to a callback that will fail
# 2. Send an event
curl -X POST http://localhost:3000/webhooks/$SUB_ID/receive \
  -H "Content-Type: application/json" \
  -d '{"payload":{"test":true}}'

# 3. Check event — should show PROCESSING with delivery attempts
curl http://localhost:3000/events/$EVENT_ID \
  -H "Authorization: Bearer $TOKEN"

# 4. Wait for retries (cron runs every 30s)
# 5. Start a callback server, watch it receive the retry
# 6. Check event — should show DELIVERED
```
