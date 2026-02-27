# Webhook Frontend — Overall Approach

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **React Router** for client-side routing

## Page Structure

| Route             | Page           | Purpose                                      |
|-------------------|----------------|----------------------------------------------|
| `/login`          | Login          | Email + password login form                  |
| `/signup`         | Signup         | Registration form                            |
| `/subscriptions`  | Subscriptions  | List, create, and cancel webhook subscriptions |
| `/events`         | Events         | View event details + real-time event log     |

### Navigation

- A top-level `Layout` component provides a nav bar and wraps all routes.
- Unauthenticated users are redirected to `/login`.
- Authenticated users see the full nav with Subscriptions and Events links.

## Authentication & Token Storage

- JWT token received from backend on login/signup.
- Stored in `localStorage` under the key `token`.
- An `api` utility attaches the `Authorization: Bearer <token>` header to every request.
- A simple auth context (`AuthContext`) tracks login state and provides `login`, `signup`, and `logout` helpers.
- Protected routes check auth state and redirect to `/login` if unauthenticated.

## API Communication

- A shared `api.ts` module using `fetch` (no external HTTP library needed).
- Base URL configurable via `VITE_API_URL` environment variable (defaults to `http://localhost:3000`).

## Real-time Event Log

- Uses the browser's native `EventSource` API to connect to the backend's SSE endpoint (`/events/stream`).
- Events are appended to a scrollable list in real time on the Events page.
- Connection is opened when the Events page mounts and closed on unmount.

## Folder Structure

```
src/
  pages/        — Page components (Login, Signup, Subscriptions, Events)
  App.tsx       — Router + Layout
  main.tsx      — Entry point
```

Future phases will add: `context/` (auth), `lib/` (api utility), and component refinements.

## How to Run

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` by default.
