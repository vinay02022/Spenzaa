# Phase 3 — Webhook Event Ingestion + Persistence (Backend)

## Overview

External services send events to the webhook receiver endpoint. Events are stored in the database and associated with the subscription they belong to. Authenticated users can then query their events.

## Mapping Strategy

**Approach: Subscription ID in URL path**

```
POST /webhooks/:subscriptionId/receive
```

The `subscriptionId` is embedded in the receive URL. When a user creates a subscription, the system generates a unique callback-style URL like:

```
https://your-server.com/webhooks/<subscription-uuid>/receive
```

This is the URL that external sources post events to. This approach was chosen because:
- Simple and explicit — no ambiguity about which subscription an event belongs to
- No need for header parsing or body-field extraction
- The UUID in the URL acts as a semi-secret token (hard to guess)
- The optional `secret` field can be used for HMAC signature verification in the future

## Model

```prisma
model WebhookEvent {
  id        String      @id @default(uuid())
  payload   Json
  headers   Json?
  eventType String?
  source    String?
  status    EventStatus @default(RECEIVED)
  attempts  Int         @default(0)
  lastError String?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  subscriptionId String
  subscription   WebhookSubscription @relation(...)
  deliveryAttempts DeliveryAttempt[]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `payload` | Json | The event body (required, must be a JSON object) |
| `headers` | Json? | HTTP headers from the incoming request |
| `eventType` | String? | Optional event type (e.g., "push", "issue") |
| `source` | String? | Optional source identifier |
| `status` | EventStatus | RECEIVED → PROCESSING → DELIVERED / FAILED |

## Endpoints

### POST /webhooks/:subscriptionId/receive (Public)

Receives an incoming webhook event from an external source.

**Request:**
```json
{
  "payload": { "action": "push", "repo": "my-repo" },
  "eventType": "push",
  "source": "github"
}
```

**Validation:**
- `payload` — required, must be a JSON object
- `eventType` — optional string
- `source` — optional string

**Success Response (201):**
```json
{
  "id": "event-uuid",
  "subscriptionId": "sub-uuid",
  "payload": { "action": "push", "repo": "my-repo" },
  "eventType": "push",
  "source": "github",
  "headers": { ... },
  "status": "RECEIVED",
  "attempts": 0,
  "createdAt": "..."
}
```

**Error Responses:**
- `400` — Missing/invalid payload, or subscription is CANCELLED
- `404` — Subscription not found

### GET /events (JWT Protected)

Lists events for the authenticated user (across all their subscriptions).

**Query Parameters:**
- `subscriptionId` (optional) — filter events by subscription

**Success Response (200):** Array of events with subscription info, ordered newest first, max 100.

### GET /events/:id (JWT Protected)

Returns a single event with full details including delivery attempts.

**Error:** `404` if event doesn't exist or belongs to another user.

## Files

| File | Purpose |
|------|---------|
| `src/events/events.module.ts` | Module definition |
| `src/events/events.controller.ts` | Route handlers |
| `src/events/events.service.ts` | Business logic |
| `src/events/dto/receive-event.dto.ts` | Validation DTO |

## How to Test

```bash
# 1. Create a subscription and note the ID
SUB_ID="<subscription-id>"

# 2. Send an event (public endpoint, no token needed)
curl -X POST http://localhost:3000/webhooks/$SUB_ID/receive \
  -H "Content-Type: application/json" \
  -d '{"payload":{"action":"push","repo":"test"},"eventType":"push"}'

# 3. List events (requires token)
curl http://localhost:3000/events \
  -H "Authorization: Bearer $TOKEN"

# 4. Get event detail
curl http://localhost:3000/events/<event-id> \
  -H "Authorization: Bearer $TOKEN"
```
