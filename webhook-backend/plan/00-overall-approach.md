# Webhook Backend — Overall Approach

## Architecture

The backend is a **NestJS** application running on the **Express** adapter. It follows a modular architecture where each domain concern (auth, webhooks, events) lives in its own NestJS module with dedicated controllers, services, and DTOs.

```
Client (React) ──► NestJS API ──► PostgreSQL
                      │
                      ├── Auth Module      (signup, login, JWT)
                      ├── Webhook Module   (subscribe, list, cancel)
                      ├── Event Module     (receive, list, deliver)
                      └── Prisma Module    (DB access, global)
```

Request flow:
1. JWT guard protects all endpoints except auth and the webhook receiver.
2. Controllers validate input via `class-validator` DTOs.
3. Services contain business logic and interact with DB through Prisma.

## Database & ORM

- **Database:** PostgreSQL
- **ORM:** Prisma (type-safe, auto-generated client, migration support)

### Entities

| Entity                | Purpose                                      |
|-----------------------|----------------------------------------------|
| `User`                | Stores registered users with hashed passwords |
| `WebhookSubscription` | A user's subscription (source URL, callback URL, active flag) |
| `WebhookEvent`        | An incoming event tied to a subscription, with delivery status |

### Enum: `EventStatus`

`RECEIVED` → `PROCESSING` → `DELIVERED` | `FAILED`

## Authentication

- JWT-based (access token returned on login/signup).
- Passwords hashed with **bcrypt**.
- A global `JwtAuthGuard` protects routes; public routes opt out with a `@Public()` decorator.

## Retry Approach

When an event is received and needs to be forwarded to the callback URL:

1. Attempt immediate delivery via HTTP POST to the callback URL.
2. On failure, mark event as `PROCESSING` and schedule retries.
3. Use **exponential backoff**: retry at 5s, 15s, 45s, 135s (up to 4 retries).
4. After all retries exhausted, mark event as `FAILED` and store the last error.
5. Retries are handled via a simple in-process queue using `setTimeout` (no external message broker needed for this scope).

## Real-time Event Log

- **Server-Sent Events (SSE)** via NestJS's built-in `@Sse()` decorator.
- When a new webhook event is received or its status changes, an SSE message is pushed to connected clients.
- The frontend opens an `EventSource` connection to `/events/stream`.
- SSE was chosen over WebSocket because:
  - Simpler to implement (no handshake protocol).
  - Unidirectional (server → client) is sufficient for a log.
  - Native browser support via `EventSource`.

## API Endpoints (Planned)

| Method | Path                          | Auth     | Purpose                    |
|--------|-------------------------------|----------|----------------------------|
| GET    | `/health`                     | Public   | Health check               |
| POST   | `/auth/signup`                | Public   | Register a new user        |
| POST   | `/auth/login`                 | Public   | Login, receive JWT         |
| POST   | `/webhooks/subscribe`         | JWT      | Create a subscription      |
| GET    | `/webhooks`                   | JWT      | List user's subscriptions  |
| DELETE | `/webhooks/:id`               | JWT      | Cancel a subscription      |
| POST   | `/webhooks/:id/receive`       | Public   | Receive an incoming event  |
| GET    | `/events`                     | JWT      | List events for user       |
| GET    | `/events/stream`              | JWT      | SSE stream of events       |

## Environment Variables

| Variable       | Description                  |
|----------------|------------------------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT`         | Server port (default 3000)   |
| `JWT_SECRET`   | Secret for signing JWTs      |

## How to Run

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations (after DB is running)
npx prisma migrate dev

# Start in dev mode
npm run start:dev
```
