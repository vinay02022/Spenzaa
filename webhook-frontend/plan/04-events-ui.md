# Phase 3 & 4 — Events UI (Frontend)

## Overview

The Events page displays all incoming webhook events for the authenticated user, with filtering, detail modals, and delivery attempt history.

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

Clicking "Details" fetches `GET /events/:id` (which includes delivery attempts) and opens a modal showing:

- Event ID, type, source, status (color-coded badge), attempt count
- Last error message (if any, shown in red)
- Subscription source URL and callback URL
- Received timestamp
- Full JSON payload in a formatted `<pre>` block

### Delivery Attempts Table (Phase 4)

Below the payload, a table shows all delivery attempts:

| Column | Content |
|--------|---------|
| #      | Attempt number |
| Status | SUCCESS (green) / FAILED (red) badge |
| HTTP   | HTTP status code or "—" |
| Error  | Error message (truncated, red text) or "—" |
| Time   | Formatted timestamp |

Shows "No delivery attempts yet." if empty.

## File

`src/pages/Events.tsx`

## How to Test

1. Login at `/login`
2. Navigate to `/events`
3. Events from the user's subscriptions appear in the table
4. Click "Details" on any event to see full payload + delivery attempts
5. Events with failed deliveries show attempt history with error messages
6. Use the filter input to narrow by subscription ID
