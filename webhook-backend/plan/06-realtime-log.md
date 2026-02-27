# Real-time Event Log Streaming (Backend)

## Overview

Server-Sent Events (SSE) endpoint that pushes webhook event lifecycle updates to authenticated frontend clients in real time.

## Architecture

- **EventBusService** (`events/event-bus.service.ts`) — RxJS `Subject<SseEvent>` acting as an in-process pub/sub bus.
  - `emit(event)` — publish from any service.
  - `streamForUser(userId)` — returns a filtered `Observable<SseEvent>` scoped to one user.
- **EventsModule** is `@Global()` so the bus is injectable everywhere without re-importing.

## Event Types Emitted

| Type               | When                                     | Emitter            |
|--------------------|------------------------------------------|--------------------|
| `event.received`   | Webhook event stored in DB               | EventsService      |
| `event.delivered`  | Delivery HTTP POST returned 2xx          | DeliveryService    |
| `event.processing` | Delivery failed, retry scheduled         | DeliveryService    |
| `event.failed`     | All retry attempts exhausted             | DeliveryService    |

## SSE Endpoint

`GET /events/stream?token=<JWT>`

- Marked `@Public()` — bypasses the global `JwtAuthGuard`.
- JWT is verified manually via `JwtService.verify()` (EventSource API cannot set headers).
- Returns `text/event-stream` with named events (the `event:` field matches the type above).
- Each message `data:` is a JSON object with: `eventId`, `subscriptionId`, `eventType`, `source`, `status`, `attempts`, `lastError`, `timestamp`.

## Auth for SSE

Since the browser `EventSource` constructor does not support custom headers, the JWT is passed as a `?token=` query parameter. The controller verifies it manually rather than relying on Passport.

## Files Changed

- `events/event-bus.service.ts` — new (RxJS bus)
- `events/events.module.ts` — made @Global, imports AuthModule, exports EventBusService
- `events/events.controller.ts` — added `GET /events/stream` SSE endpoint
- `events/events.service.ts` — emits `event.received`
- `delivery/delivery.service.ts` — emits `event.delivered`, `event.processing`, `event.failed`
- `auth/auth.module.ts` — exports JwtModule
