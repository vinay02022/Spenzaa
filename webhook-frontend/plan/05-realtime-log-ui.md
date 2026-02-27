# Real-time Event Log (Frontend)

## Overview

The Events page connects to `GET /events/stream?token=<JWT>` via `EventSource` and updates the event table in real time as webhook lifecycle events arrive.

## Behavior

1. On mount, an `EventSource` is opened with the user's JWT as a query parameter.
2. Four named event listeners are registered: `event.received`, `event.delivered`, `event.processing`, `event.failed`.
3. When an update arrives for an **existing** event (matched by `eventId`), the row is updated in place (status, attempts, lastError).
4. When a **new** event is received (not in current list), a full refetch is triggered to get the complete event data (subscription info, etc.).
5. A green/red dot next to the Refresh button indicates stream connection status.

## Reconnect

`EventSource` auto-reconnects on network errors by default. The status dot turns red on error and green when the connection re-opens.

## Cleanup

The `EventSource` is closed on component unmount via the `useEffect` cleanup function.

## File

`src/pages/Events.tsx`
