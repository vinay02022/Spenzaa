# Phase 3 & 4 — Events UI (Frontend)

## Overview

The Events page displays all incoming webhook events for the authenticated user, with filtering, detail modals, and delivery attempt visibility.

## Events List (`/events`)

### Table Columns

| Column   | Content |
|----------|---------|
| Type     | `eventType` or "—" if none |
| Source   | `source` field or subscription's sourceUrl as fallback |
| Status   | Color-coded badge (RECEIVED=blue, PROCESSING=yellow, DELIVERED=green, FAILED=red) |
| Attempts | Number of delivery attempts |
| Received | Formatted timestamp |
| Actions  | "Details" button to open modal |

### Features

- **Filter by subscription ID** — text input at the top, passes `?subscriptionId=...` to API
- **Refresh button** — manually re-fetches the events list
- **Loading/empty states** — shows "Loading..." or "No events received yet."
- Limited to 100 most recent events (server-side)

## Event Detail Modal

Clicking "Details" opens a full-screen overlay modal showing:
- Event ID, type, source, status, attempt count
- Last error message (if any, shown in red)
- Subscription source URL and callback URL
- Received timestamp
- Full JSON payload in a formatted `<pre>` block

## Delivery Attempts (Phase 4 addition)

The detail modal will show delivery attempt history after Phase 4:
- Attempt number, status (SUCCESS/FAILED), HTTP status code
- Error message and response snippet
- Timestamp per attempt

## File

`src/pages/Events.tsx`

## How to Test

1. Login at `/login`
2. Navigate to `/events`
3. Events from the user's subscriptions appear in the table
4. Click "Details" on any event to see full payload
5. Use the filter input to narrow by subscription ID
