# Webhook Backend

NestJS backend for the Webhook Subscription & Event Handling system. Receives webhook events, stores them, delivers to callback URLs with retry logic, and streams real-time updates via SSE.

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 15+
- **npm** 9+

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and configure
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# 3. Generate Prisma client
npx prisma generate

# 4. Run database migrations
npx prisma migrate deploy

# 5. Start in development mode
npm run start:dev
```

## Environment Variables

| Variable       | Required | Default | Description                        |
|----------------|----------|---------|------------------------------------|
| `DATABASE_URL` | Yes      | —       | PostgreSQL connection string       |
| `PORT`         | No       | `3000`  | HTTP server port                   |
| `JWT_SECRET`   | Yes      | —       | Secret key for signing JWT tokens  |

Example `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/webhook_db?schema=public"
PORT=3000
JWT_SECRET="a-long-random-secret-for-production"
```

## Scripts

| Command              | Description                    |
|----------------------|--------------------------------|
| `npm run start:dev`  | Start with hot-reload (dev)    |
| `npm run start`      | Start without watch            |
| `npm run start:prod` | Start compiled production build|
| `npm run build`      | Compile TypeScript to `dist/`  |
| `npm run test`       | Run unit tests                 |
| `npm run test:e2e`   | Run end-to-end tests           |

## Database Migrations

```bash
# Create a new migration after changing prisma/schema.prisma
npx prisma migrate dev --name <migration-name>

# Apply pending migrations (production)
npx prisma migrate deploy

# Reset database (destructive — drops all data)
npx prisma migrate reset
```

## API Endpoints

### Auth (public)

| Method | Path            | Description         | Rate Limit         |
|--------|-----------------|---------------------|--------------------|
| POST   | `/auth/signup`  | Register new user   | 3/sec, 10/min      |
| POST   | `/auth/login`   | Login, get JWT      | 5/sec, 15/min      |

### Webhooks (JWT required)

| Method | Path                    | Description               |
|--------|-------------------------|---------------------------|
| POST   | `/webhooks/subscribe`   | Create subscription       |
| GET    | `/webhooks`             | List user's subscriptions |
| POST   | `/webhooks/:id/cancel`  | Cancel subscription       |
| DELETE | `/webhooks/:id`         | Cancel subscription       |

### Events

| Method | Path                                  | Auth      | Description                   | Rate Limit         |
|--------|---------------------------------------|-----------|-------------------------------|-------------------|
| POST   | `/webhooks/:subscriptionId/receive`   | Public    | Ingest webhook event          | 10/sec, 60/min    |
| GET    | `/events`                             | JWT       | List user's events            | —                 |
| GET    | `/events/:id`                         | JWT       | Event detail + delivery log   | —                 |
| GET    | `/events/stream?token=<JWT>`          | Token QS  | SSE real-time stream          | —                 |

### Health

| Method | Path      | Auth   | Description   |
|--------|-----------|--------|---------------|
| GET    | `/health` | Public | Health check  |

## Webhook Simulator

Send sample events to test the full pipeline:

```bash
node scripts/webhook-simulator.js --subscription-id <id>
node scripts/webhook-simulator.js -s <id> -n 10 -d 500
```

See `plan/07-simulator.md` for full documentation.

## Architecture

```
src/
  auth/          JWT authentication (signup, login, guards)
  webhooks/      Subscription CRUD
  events/        Event ingestion, listing, SSE streaming
  delivery/      HTTP delivery with retry + cron
  prisma/        Database service (Prisma 7 + pg adapter)
  common/        Shared filters and pipes
  health/        Health check endpoint
```

## Security

- **JWT authentication** with 24h token expiry
- **Global validation pipe** — whitelist mode, rejects unknown properties
- **Rate limiting** via `@nestjs/throttler` on public endpoints
- **Request body limit** — 256 KB max
- **UUID validation** on all path parameters
- **Centralized error filter** — consistent JSON error format
- **Password hashing** — bcrypt with salt rounds 10
- **Webhook secrets** — 32-byte random hex per subscription
