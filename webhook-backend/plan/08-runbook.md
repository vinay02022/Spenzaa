# Phase 8 — Hardening & Production Readiness

## Overview

Tighten validation, standardize error responses, add security defaults, and write documentation so a new developer can run locally from the README alone.

## Changes

### 1. Centralized Error Filter

**File:** `src/common/filters/http-exception.filter.ts`

A global `@Catch()` exception filter that normalizes all errors to a consistent JSON shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "sourceUrl must be a URL address",
  "timestamp": "2026-02-27T10:00:00.000Z",
  "path": "/webhooks/subscribe"
}
```

- Handles both NestJS `HttpException` subclasses and unexpected errors.
- Unexpected exceptions return 500 with generic message; stack trace is logged server-side only.
- Registered globally in `main.ts` via `app.useGlobalFilters()`.

### 2. Input Validation Tightening

**UUID pipe** (`src/common/pipes/parse-uuid.pipe.ts`):
- All `:id` and `:subscriptionId` path params validated as UUID format.
- Returns 400 with clear message on invalid IDs.

**Existing validation unchanged** — DTOs already validated via `class-validator` with `whitelist: true` and `forbidNonWhitelisted: true`.

### 3. Rate Limiting

**Package:** `@nestjs/throttler`

**Global defaults** (in `AppModule`):
- Short burst: 20 requests per second
- Medium window: 100 requests per minute

**Per-endpoint overrides:**

| Endpoint                       | Short (1s) | Medium (60s) | Reason                    |
|-------------------------------|------------|--------------|---------------------------|
| `POST /auth/signup`            | 3          | 10           | Prevent account spam      |
| `POST /auth/login`             | 5          | 15           | Brute-force protection    |
| `POST /webhooks/:id/receive`   | 10         | 60           | Public ingestion endpoint |
| `GET /events/stream` (SSE)     | Skipped    | Skipped      | Long-lived connection     |

### 4. Request Size Limit

`main.ts` — `app.useBodyParser('json', { limit: '256kb' })`.

Prevents oversized payloads from consuming memory. 256 KB is generous for webhook payloads while rejecting abuse.

### 5. READMEs

**`webhook-backend/README.md`:**
- Prerequisites, setup steps, env vars table, scripts, API endpoint reference, architecture overview, security summary.

**`webhook-frontend/README.md`:**
- Prerequisites, setup, env vars, scripts, pages, features, project structure.

**`webhook-frontend/.env.example`** — created.

### 6. Frontend UX Polish

- **Error banners** — visible red banners on Events and Subscriptions pages when API calls fail (replaced silent `console.error`).
- **Detail error** — shown when event detail fetch fails.
- **Loading text** — improved from "Loading..." to "Loading events..." / "Loading subscriptions...".
- **Empty state** — only shown when there is no error (prevents confusing "No data" + error simultaneously).

## Files Changed

| File | Change |
|------|--------|
| `src/main.ts` | Body parser limit, global exception filter |
| `src/app.module.ts` | ThrottlerModule import |
| `src/common/filters/http-exception.filter.ts` | New — global error filter |
| `src/common/pipes/parse-uuid.pipe.ts` | New — UUID param validation |
| `src/auth/auth.controller.ts` | @Throttle on signup/login |
| `src/events/events.controller.ts` | @Throttle on receive, @SkipThrottle on SSE, ParseUUIDPipe on params |
| `src/webhooks/webhooks.controller.ts` | ParseUUIDPipe on :id params |
| `README.md` | Full rewrite |
| `plan/08-runbook.md` | This document |
| `frontend/README.md` | Full rewrite |
| `frontend/.env.example` | New |
| `frontend/src/pages/Events.tsx` | Error banners, loading text |
| `frontend/src/pages/Subscriptions.tsx` | Error banner for list fetch |
