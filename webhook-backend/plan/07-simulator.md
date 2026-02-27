# Webhook Simulator Script

## Overview

A Node.js script that sends sample webhook events to the ingestion endpoint for testing the full pipeline: ingestion → delivery → retry → real-time SSE updates.

## File

`scripts/webhook-simulator.js`

## Usage

```bash
# Send 5 events (default) with 1s delay
node scripts/webhook-simulator.js --subscription-id <id>

# Send 10 events with 500ms delay
node scripts/webhook-simulator.js -s <id> -n 10 -d 500

# Target a different host
node scripts/webhook-simulator.js -s <id> -u http://localhost:4000
```

## Options

| Flag                      | Short | Default                  | Description                        |
|---------------------------|-------|--------------------------|------------------------------------|
| `--subscription-id`       | `-s`  | *(required)*             | Subscription ID to send events to  |
| `--count`                 | `-n`  | `5`                      | Number of events to send           |
| `--delay`                 | `-d`  | `1000`                   | Delay in milliseconds between events |
| `--base-url`              | `-u`  | `http://localhost:3000`  | Base URL of the backend server     |
| `--help`                  | `-h`  | —                        | Show help message                  |

## Sample Payloads

The script cycles through 8 distinct event types:

1. `order.created` — e-commerce order with items and totals
2. `payment.completed` — payment transaction confirmation
3. `user.signup` — new user registration
4. `inventory.low` — low stock warehouse alert
5. `deployment.finished` — CI/CD deployment completion
6. `alert.triggered` — monitoring alert with severity
7. `comment.added` — support ticket comment
8. `subscription.renewed` — billing renewal

Each payload is augmented with `_simulatedAt` (ISO timestamp) and `_sequenceNumber` for traceability.

## Prerequisites

- Backend server must be running (`npm run start:dev`)
- An **ACTIVE** subscription must exist (create one via the UI or API)
- Node.js 18+ (uses native `fetch`)

## End-to-End Verification

1. Start the backend: `npm run start:dev`
2. Start the frontend: `npm run dev` (from webhook-frontend)
3. Sign up / log in via the UI
4. Create a subscription (any source URL, callback URL can be `https://httpbin.org/post`)
5. Copy the subscription ID from the table
6. Run the simulator:
   ```bash
   node scripts/webhook-simulator.js -s <subscription-id>
   ```
7. Observe:
   - Terminal output shows each event sent with status
   - Events page in UI updates in real time via SSE
   - Event status progresses: RECEIVED → PROCESSING/DELIVERED/FAILED
