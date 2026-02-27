# Phase 2 — Subscriptions List (Frontend)

## Overview

A table on the `/subscriptions` page that displays all webhook subscriptions for the currently logged-in user.

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

## Behavior

- On page mount, fetches `GET /webhooks` with JWT header.
- List is re-fetched after creating or cancelling a subscription.
- **Cancel** button calls `DELETE /webhooks/:id`. On success, list refreshes. On error, shows alert.

## Ownership

Only the authenticated user's subscriptions are returned by the API (server enforces `userId` filter).

## File

`src/pages/Subscriptions.tsx` — shared component with the subscribe form.
