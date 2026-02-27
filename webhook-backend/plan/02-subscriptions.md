# Phase 2 — Webhook Subscriptions (Backend)

## Overview

CRUD endpoints for webhook subscriptions, scoped to the authenticated user. All endpoints require a valid JWT.

## Model

```prisma
model WebhookSubscription {
  id          String             @id @default(uuid())
  sourceUrl   String
  callbackUrl String
  secret      String?
  status      SubscriptionStatus @default(ACTIVE)
  eventTypes  String[]           @default([])
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  userId String
  user   User @relation(...)
  events WebhookEvent[]
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
}
```

### Fields

| Field       | Type   | Description |
|-------------|--------|-------------|
| `id`        | UUID   | Primary key |
| `sourceUrl` | String | The external service URL to subscribe to |
| `callbackUrl` | String | URL where incoming events will be forwarded |
| `secret`    | String? | Auto-generated HMAC secret for signature verification |
| `status`    | Enum   | ACTIVE or CANCELLED |
| `eventTypes` | String[] | Optional filter for event types (future use) |
| `userId`    | UUID   | Owner of the subscription |

## Endpoints

### POST /webhooks/subscribe

Creates a new subscription for the authenticated user.

**Request:**
```json
{
  "sourceUrl": "https://github.com/webhooks",
  "callbackUrl": "https://myapp.com/callback",
  "eventTypes": ["push", "pull_request"]
}
```

**Validation:**
- `sourceUrl` — required, must be valid HTTP/HTTPS URL
- `callbackUrl` — required, must be valid HTTP/HTTPS URL
- `eventTypes` — optional array of strings

**Success Response (201):**
```json
{
  "id": "uuid",
  "sourceUrl": "https://github.com/webhooks",
  "callbackUrl": "https://myapp.com/callback",
  "secret": "hex-string",
  "status": "ACTIVE",
  "eventTypes": ["push", "pull_request"],
  "userId": "user-uuid",
  "createdAt": "2026-02-27T...",
  "updatedAt": "2026-02-27T..."
}
```

**Error Responses:**
- `400` — Validation error (invalid URLs)
  ```json
  {
    "message": ["sourceUrl must be a valid HTTP/HTTPS URL"],
    "error": "Bad Request",
    "statusCode": 400
  }
  ```
- `401` — Missing or invalid JWT

### GET /webhooks

Lists all subscriptions for the authenticated user, ordered by newest first.

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "sourceUrl": "https://github.com/webhooks",
    "callbackUrl": "https://myapp.com/callback",
    "secret": "hex-string",
    "status": "ACTIVE",
    "eventTypes": ["push"],
    "userId": "user-uuid",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### DELETE /webhooks/:id

Cancels a subscription (sets status to CANCELLED). Only the owning user can cancel.

**Success Response (200):** Returns the updated subscription with `"status": "CANCELLED"`.

**Error Responses:**
- `404` — Subscription not found or belongs to another user
- `401` — Missing or invalid JWT

## Security

- All endpoints require JWT authentication (global guard).
- User can only see/modify their own subscriptions (enforced by `userId` filter in queries).
- A `secret` is auto-generated per subscription (32 random bytes, hex-encoded) for future HMAC signature verification.

## Files

| File | Purpose |
|------|---------|
| `src/webhooks/webhooks.module.ts` | Module definition |
| `src/webhooks/webhooks.controller.ts` | Route handlers |
| `src/webhooks/webhooks.service.ts` | Business logic |
| `src/webhooks/dto/create-subscription.dto.ts` | Validation DTO |

## How to Test

```bash
# Get a token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.access_token')

# Create subscription
curl -X POST http://localhost:3000/webhooks/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sourceUrl":"https://github.com/webhooks","callbackUrl":"https://myapp.com/cb"}'

# List subscriptions
curl http://localhost:3000/webhooks \
  -H "Authorization: Bearer $TOKEN"

# Cancel subscription
curl -X DELETE http://localhost:3000/webhooks/<subscription-id> \
  -H "Authorization: Bearer $TOKEN"
```
