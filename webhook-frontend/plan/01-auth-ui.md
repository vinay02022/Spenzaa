# Phase 1 — Authentication (Frontend)

## Overview

React-based auth UI with signup/login forms, JWT storage, API client with auto-attached tokens, and protected routes.

## Pages

### Login (`/login`)
- Email + password form.
- Calls `POST /auth/login` via API client.
- On success: stores token, redirects to `/subscriptions`.
- On error: displays error message inline.

### Signup (`/signup`)
- Email + password form (min 6 chars enforced client-side).
- Calls `POST /auth/signup` via API client.
- On success: stores token, redirects to `/subscriptions`.
- On error: displays error message inline (e.g., "Email already registered").

## Auth Token Storage

**Approach:** `localStorage`

| Approach | Pros | Cons |
|----------|------|------|
| `localStorage` (chosen) | Persists across tabs/refreshes, simple to implement | Vulnerable to XSS |
| `httpOnly cookie` | XSS-safe | Requires backend cookie setup, CSRF handling |
| In-memory only | XSS-safe | Lost on refresh, requires silent refresh flow |

**Why localStorage:** For this project scope, localStorage provides the best balance of simplicity and usability. In a production app handling sensitive data, httpOnly cookies with CSRF protection would be preferred.

The token is stored under the key `token` and the user object under `user`.

## API Client (`src/lib/api.ts`)

- Wraps `fetch` with auto JSON headers.
- Reads token from `localStorage` and attaches `Authorization: Bearer <token>`.
- Base URL from `VITE_API_URL` env var (defaults to `http://localhost:3000`).
- On non-OK responses, throws an Error with the server's message.

## Auth Context (`src/context/AuthContext.tsx`)

Provides:
- `user` — current user object or null.
- `token` — JWT string or null.
- `login(email, password)` — calls API, stores token.
- `signup(email, password)` — calls API, stores token.
- `logout()` — clears token and user from state + localStorage.

Initializes from localStorage on mount (persists login across refreshes).

## Protected Routes (`src/components/ProtectedRoute.tsx`)

- Wraps route content.
- Checks `token` from auth context.
- Redirects to `/login` if no token.
- Applied to `/subscriptions` and `/events` routes.

## Navigation

- **Unauthenticated:** Shows Login + Signup links.
- **Authenticated:** Shows Subscriptions + Events links, user email, and Logout button.

## Files

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | API client with JWT header |
| `src/context/AuthContext.tsx` | Auth state management |
| `src/components/ProtectedRoute.tsx` | Route guard |
| `src/pages/Login.tsx` | Login form |
| `src/pages/Signup.tsx` | Signup form |
| `src/App.tsx` | Router + layout + auth provider |

## How to Run

```bash
npm run dev
# Visit http://localhost:5173
# Try navigating to /subscriptions — should redirect to /login
```
