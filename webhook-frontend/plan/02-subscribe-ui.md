# Phase 2 — Subscribe Form (Frontend)

## Overview

A form on the Subscriptions page that lets authenticated users create new webhook subscriptions by providing a source URL and callback URL.

## UI

The form is rendered at the top of the `/subscriptions` page inside a bordered section:

- **Source URL** — `<input type="url">` with placeholder, required
- **Callback URL** — `<input type="url">` with placeholder, required
- **Subscribe button** — disabled while submitting, shows "Subscribing..."
- **Error display** — red text below inputs if the API returns an error

## Behavior

1. User fills in both URL fields.
2. Browser-level `type="url"` enforces basic URL format.
3. On submit, calls `POST /webhooks/subscribe` with `{ sourceUrl, callbackUrl }`.
4. On success: clears the form, refreshes the subscriptions list below.
5. On error: displays the server error message (e.g., "sourceUrl must be a valid HTTP/HTTPS URL").

## Validation

- Client-side: HTML5 `type="url"` + `required` attributes.
- Server-side: class-validator `@IsUrl` with HTTP/HTTPS protocol enforcement — error messages are displayed inline.

## File

`src/pages/Subscriptions.tsx` — contains both the form and the list (single page component).
