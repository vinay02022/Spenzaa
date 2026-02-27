# Subscriptions List (Frontend)

## Overview

A table on the `/subscriptions` page that displays all webhook subscriptions for the currently logged-in user, with the ability to cancel active subscriptions.

## UI

A table with the following columns:

| Column      | Content |
|-------------|---------|
| Source URL   | The webhook source, word-break for long URLs |
| Callback URL | The callback endpoint |
| Status       | Badge: green "ACTIVE" or red "CANCELLED" |
| Created      | Formatted date via `toLocaleString()` |
| Actions      | "Cancel" button (only for ACTIVE subscriptions) |

### States

- **Loading** — shows "Loading..." text while fetching.
- **Empty** — shows "No subscriptions yet." when list is empty.
- **Populated** — renders the table.

## Cancel Behavior

- **Cancel** button only appears for subscriptions with status `ACTIVE`.
- Clicking Cancel shows a **confirmation dialog**: "Are you sure you want to cancel this subscription? Pending deliveries will be stopped."
- On confirm, calls `DELETE /webhooks/:id` with JWT header.
- On success, list refreshes — subscription now shows red "CANCELLED" badge.
- On error, shows alert with error message.
- Already-cancelled subscriptions show no action button.

## What Happens on Cancel

- Subscription status changes to CANCELLED
- All pending events (RECEIVED/PROCESSING) are marked FAILED
- No further events can be ingested for this subscription
- No further delivery attempts will be made

## Ownership

Only the authenticated user's subscriptions are returned by the API (server enforces `userId` filter).

## File

`src/pages/Subscriptions.tsx` — shared component with the subscribe form.
