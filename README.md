# Webhook Management Platform

A full-stack webhook management system built as part of the Spenza code assessment. Users can subscribe to webhooks, receive and inspect events, track delivery attempts with automatic retries, and monitor everything in real time.

**Author:** Vinay Pandey ([vinay.work25@gmail.com](mailto:vinay.work25@gmail.com))

---

## Tech Stack

| Layer     | Technology                                                       |
|-----------|------------------------------------------------------------------|
| Backend   | Node.js, NestJS 11, TypeScript (ESM), Prisma 7, PostgreSQL      |
| Frontend  | React 19, TypeScript, Vite 7, React Router 7                    |
| Auth      | JWT (Passport), bcrypt                                           |
| Realtime  | Server-Sent Events (SSE) via RxJS                                |
| Scheduler | `@nestjs/schedule` (cron-based retry)                            |

---

## Project Structure

```
├── webhook-backend/
│   ├── prisma/schema.prisma        # Database schema
│   ├── scripts/webhook-simulator.js # CLI event simulator
│   └── src/
│       ├── auth/                   # Signup, login, JWT guard
│       ├── webhooks/               # Subscription CRUD
│       ├── events/                 # Event ingestion, listing, SSE stream
│       ├── delivery/               # Delivery attempts, retry cron
│       ├── health/                 # Liveness probe
│       ├── common/                 # Exception filter, UUID pipe
│       └── prisma/                 # Prisma service
│
└── webhook-frontend/
    └── src/
        ├── pages/                  # Login, Signup, Subscriptions, Events
        ├── components/             # ProtectedRoute
        ├── context/                # AuthContext (token persistence)
        └── lib/                    # API fetch wrapper
```

---

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** running locally (or a remote connection string)
- **npm**

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/vinay02022/Spenzaa.git
cd Spenzaa
```

### 2. Backend setup

```bash
cd webhook-backend
npm install
```

Create a `.env` file (or copy the example):

```bash
cp .env.example .env
```

Required environment variables:

| Variable       | Description                          | Example                                                             |
|----------------|--------------------------------------|---------------------------------------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string         | `postgresql://postgres:postgres@localhost:5432/webhook_db?schema=public` |
| `PORT`         | Server port                          | `3000`                                                              |
| `JWT_SECRET`   | Secret key for signing JWTs          | `change-me-in-production`                                           |

Run database migrations and start the server:

```bash
npx prisma migrate deploy
npm run start:dev
```

The backend will be available at `http://localhost:3000`.

### 3. Frontend setup

```bash
cd webhook-frontend
npm install
```

Create a `.env` file:

```bash
cp .env.example .env
```

| Variable       | Description         | Example                  |
|----------------|---------------------|--------------------------|
| `VITE_API_URL` | Backend base URL    | `http://localhost:3000`  |

Start the dev server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## API Endpoints

### Auth (Public)

| Method | Path             | Description                         |
|--------|------------------|-------------------------------------|
| POST   | `/auth/signup`   | Register a new user                 |
| POST   | `/auth/login`    | Authenticate and receive a JWT      |

### Health (Public)

| Method | Path      | Description       |
|--------|-----------|-------------------|
| GET    | `/health` | Liveness probe    |

### Webhook Subscriptions (JWT Required)

| Method | Path                    | Description                                      |
|--------|-------------------------|--------------------------------------------------|
| POST   | `/webhooks/subscribe`   | Create a subscription (sourceUrl, callbackUrl, optional eventTypes[]) |
| GET    | `/webhooks`             | List all subscriptions for the authenticated user |
| POST   | `/webhooks/:id/cancel`  | Cancel a subscription                            |
| DELETE | `/webhooks/:id`         | Cancel a subscription (REST alias)               |

### Events (Mixed Auth)

| Method | Path                                 | Auth   | Description                                         |
|--------|--------------------------------------|--------|-----------------------------------------------------|
| POST   | `/webhooks/:subscriptionId/receive`  | Public | Ingest an incoming webhook event                    |
| GET    | `/events`                            | JWT    | List events (optional `?subscriptionId=` filter)    |
| GET    | `/events/:id`                        | JWT    | Get event details with delivery attempts            |
| GET    | `/events/stream`                     | JWT*   | SSE stream of real-time event updates               |

*SSE uses `?token=<JWT>` query parameter since `EventSource` cannot set custom headers.

---

## Database Schema

Four models managed by Prisma:

- **User** — `id`, `email` (unique), `passwordHash`, timestamps
- **WebhookSubscription** — `sourceUrl`, `callbackUrl`, `secret`, `status` (ACTIVE/CANCELLED), `eventTypes[]`, linked to User
- **WebhookEvent** — `payload` (JSON), `eventType`, `source`, `status` (RECEIVED/PROCESSING/DELIVERED/FAILED), `attempts`, linked to Subscription
- **DeliveryAttempt** — `attemptNumber`, `status` (SUCCESS/FAILED), `httpStatus`, `responseBodySnippet`, `errorMessage`, `nextRetryAt`, linked to Event

---

## Key Features

### Authentication
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 24 hours
- Global JWT guard applied to all routes; public routes opt out with `@Public()` decorator
- Rate limiting on auth endpoints (signup: 3/s, login: 5/s)

### Webhook Subscriptions
- Each subscription gets an auto-generated 64-char hex secret
- Optional `eventTypes[]` filter — if set, only matching event types are accepted on ingestion; if empty, all events pass through
- Cancelling a subscription marks all pending/in-progress events as FAILED

### Event Ingestion & Delivery
- Events received via `POST /webhooks/:subscriptionId/receive` (public, rate-limited to 10/s)
- Immediate fire-and-forget delivery attempt on receipt
- Delivery POST to the subscription's `callbackUrl` with headers: `X-Webhook-Event-Id`, `X-Webhook-Subscription-Id`, `X-Webhook-Event-Type`, `X-Webhook-Secret`
- 10-second timeout per delivery attempt

### Retry Mechanism
- Exponential backoff with up to 5 attempts:

| Attempt | Retry delay  |
|---------|-------------|
| 1       | 1 minute    |
| 2       | 5 minutes   |
| 3       | 15 minutes  |
| 4       | 1 hour      |
| 5       | Final (no retry) |

- Cron job runs every 30 seconds, picks up due retries (max 10 per run)
- Guard against concurrent processing via in-process flag

### Real-Time Updates (SSE)
- In-process event bus built on RxJS `Subject`
- SSE events: `event.received`, `event.delivered`, `event.processing`, `event.failed`
- Frontend auto-reconnects on disconnect; green/red connection indicator in UI

### Validation & Error Handling
- Global `ValidationPipe` with whitelist mode (strips unknown fields, rejects extra properties)
- Global exception filter normalizes all errors to `{ statusCode, error, message, timestamp, path }`
- UUID params validated with `ParseUUIDPipe`
- Request body limit: 256 KB

---

## Webhook Simulator

A standalone Node.js script to generate test events:

```bash
cd webhook-backend
node scripts/webhook-simulator.js --subscription-id <UUID> [options]
```

| Flag                | Short | Default                 | Description                  |
|---------------------|-------|-------------------------|------------------------------|
| `--subscription-id` | `-s`  | (required)              | Target subscription UUID     |
| `--count`           | `-n`  | `5`                     | Number of events to send     |
| `--delay`           | `-d`  | `1000` ms               | Delay between events         |
| `--base-url`        | `-u`  | `http://localhost:3000` | Backend base URL             |

Sample event types: `order.created`, `payment.completed`, `user.signup`, `inventory.low`, `deployment.finished`, `alert.triggered`, `comment.added`, `subscription.renewed`.

---

## Frontend Pages

| Page              | Features                                                                |
|-------------------|-------------------------------------------------------------------------|
| **Login**         | Email/password form, error display, link to signup                      |
| **Signup**        | Registration form (min 6-char password), auto-login on success          |
| **Subscriptions** | Create subscription form, table with status badges, cancel action       |
| **Events**        | Filter by subscription, live SSE updates, detail modal with delivery attempts |

---

## Design Decisions

1. **NestJS over plain Express** — provides modular architecture, dependency injection, built-in support for guards/pipes/filters, and first-class TypeScript support. Still runs on Express under the hood (satisfying the Express.js requirement).

2. **Prisma 7 with PostgreSQL** — type-safe ORM with migration management. The schema is the single source of truth for the database.

3. **Fire-and-forget + cron for delivery** — immediate delivery attempt on event receipt for low latency, with a cron-based retry loop for reliability. This avoids the complexity of a message broker while still providing guaranteed delivery (up to 5 attempts).

4. **SSE over WebSockets** — simpler protocol for one-way server-to-client updates. Native browser `EventSource` handles reconnection automatically. JWT passed via query parameter since `EventSource` doesn't support custom headers.

5. **Global JWT guard with `@Public()` opt-out** — secure by default. New endpoints are automatically protected unless explicitly marked public.

6. **In-process event bus** — suitable for single-instance deployment. For horizontal scaling, this would be replaced with Redis Pub/Sub or a message broker.
