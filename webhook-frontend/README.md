# Webhook Frontend

React frontend for the Webhook Subscription & Event Handling system. Provides UI for authentication, managing subscriptions, viewing events, and real-time event streaming.

## Prerequisites

- **Node.js** 18+
- **npm** 9+

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and configure
cp .env.example .env
# Edit .env with your backend URL (see Environment Variables below)

# 3. Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Environment Variables

| Variable       | Required | Default                  | Description           |
|----------------|----------|--------------------------|-----------------------|
| `VITE_API_URL` | No       | `http://localhost:3000`  | Backend API base URL  |

Example `.env`:

```env
VITE_API_URL=http://localhost:3000
```

## Scripts

| Command            | Description                       |
|--------------------|-----------------------------------|
| `npm run dev`      | Start Vite dev server with HMR    |
| `npm run build`    | Type-check and build for production |
| `npm run preview`  | Preview production build locally  |
| `npm run lint`     | Run ESLint                        |

## Pages

| Path              | Auth Required | Description                          |
|-------------------|---------------|--------------------------------------|
| `/login`          | No            | Login form                           |
| `/signup`         | No            | Registration form                    |
| `/subscriptions`  | Yes           | Create and manage webhook subscriptions |
| `/events`         | Yes           | View events with real-time SSE updates  |

## Features

- **JWT auth** — login/signup with token stored in localStorage
- **Protected routes** — redirect to login when unauthenticated
- **Subscription management** — create, list, cancel webhooks
- **Event viewer** — filterable table with detail modal showing delivery attempts
- **Real-time updates** — SSE stream auto-updates event statuses live
- **Connection indicator** — green/red dot shows SSE stream health
- **Error handling** — visible error banners on all pages, loading states

## Project Structure

```
src/
  context/       AuthContext (JWT state management)
  components/    ProtectedRoute
  pages/         Login, Signup, Subscriptions, Events
  lib/           API client (fetch wrapper with JWT header)
  App.tsx        Router + layout + navigation
```
