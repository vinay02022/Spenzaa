#!/usr/bin/env node

/**
 * Webhook Simulator
 *
 * Sends sample webhook events to the ingestion endpoint.
 *
 * Usage:
 *   node scripts/webhook-simulator.js --subscription-id <id> [options]
 *
 * Options:
 *   --subscription-id, -s   Subscription ID to send events to (required)
 *   --count, -n             Number of events to send (default: 5)
 *   --delay, -d             Delay in ms between events (default: 1000)
 *   --base-url, -u          Base URL of the backend (default: http://localhost:3000)
 *   --help, -h              Show this help message
 */

const SAMPLE_PAYLOADS = [
  {
    eventType: 'order.created',
    source: 'shop-api',
    payload: {
      orderId: 'ORD-1001',
      customer: { id: 'cust-42', email: 'alice@example.com' },
      items: [{ sku: 'WIDGET-A', qty: 2, price: 19.99 }],
      total: 39.98,
      currency: 'USD',
    },
  },
  {
    eventType: 'payment.completed',
    source: 'payment-gateway',
    payload: {
      transactionId: 'txn-abc-123',
      orderId: 'ORD-1001',
      amount: 39.98,
      currency: 'USD',
      method: 'credit_card',
      last4: '4242',
    },
  },
  {
    eventType: 'user.signup',
    source: 'auth-service',
    payload: {
      userId: 'usr-99',
      email: 'bob@example.com',
      plan: 'free',
      signupSource: 'organic',
    },
  },
  {
    eventType: 'inventory.low',
    source: 'warehouse',
    payload: {
      sku: 'WIDGET-A',
      warehouse: 'WH-EAST',
      currentStock: 3,
      reorderThreshold: 10,
    },
  },
  {
    eventType: 'deployment.finished',
    source: 'ci-cd',
    payload: {
      service: 'api-server',
      version: '2.4.1',
      environment: 'production',
      commitSha: 'a1b2c3d',
      duration: 127,
    },
  },
  {
    eventType: 'alert.triggered',
    source: 'monitoring',
    payload: {
      alertId: 'alert-500',
      severity: 'critical',
      metric: 'error_rate',
      value: 12.5,
      threshold: 5.0,
      service: 'checkout',
    },
  },
  {
    eventType: 'comment.added',
    source: 'support-app',
    payload: {
      ticketId: 'TICKET-789',
      author: 'support-agent-3',
      body: 'Issue has been escalated to engineering.',
      isInternal: false,
    },
  },
  {
    eventType: 'subscription.renewed',
    source: 'billing',
    payload: {
      customerId: 'cust-42',
      plan: 'pro',
      amount: 49.00,
      nextBillingDate: '2026-03-27',
    },
  },
];

function parseArgs(argv) {
  const args = {
    subscriptionId: null,
    count: 5,
    delay: 1000,
    baseUrl: 'http://localhost:3000',
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--subscription-id':
      case '-s':
        args.subscriptionId = next;
        i++;
        break;
      case '--count':
      case '-n':
        args.count = parseInt(next, 10);
        i++;
        break;
      case '--delay':
      case '-d':
        args.delay = parseInt(next, 10);
        i++;
        break;
      case '--base-url':
      case '-u':
        args.baseUrl = next;
        i++;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

function showHelp() {
  console.log(`
Webhook Simulator — sends sample events to the ingestion endpoint.

Usage:
  node scripts/webhook-simulator.js --subscription-id <id> [options]

Options:
  --subscription-id, -s   Subscription ID to send events to (required)
  --count, -n             Number of events to send (default: 5)
  --delay, -d             Delay in ms between events (default: 1000)
  --base-url, -u          Base URL of the backend (default: http://localhost:3000)
  --help, -h              Show this help message

Examples:
  node scripts/webhook-simulator.js -s abc-123
  node scripts/webhook-simulator.js -s abc-123 -n 10 -d 500
  node scripts/webhook-simulator.js -s abc-123 -u http://localhost:4000
`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendEvent(baseUrl, subscriptionId, eventData, index) {
  const url = `${baseUrl}/webhooks/${subscriptionId}/receive`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });

  const body = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }

  if (res.ok) {
    console.log(
      `[${index + 1}] ✓ ${eventData.eventType} → ${res.status} (eventId: ${parsed.id ?? 'unknown'})`,
    );
  } else {
    console.error(
      `[${index + 1}] ✗ ${eventData.eventType} → ${res.status}: ${parsed.message ?? body}`,
    );
  }

  return { ok: res.ok, status: res.status };
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (!args.subscriptionId) {
    console.error('Error: --subscription-id is required.\n');
    showHelp();
    process.exit(1);
  }

  if (isNaN(args.count) || args.count < 1) {
    console.error('Error: --count must be a positive integer.');
    process.exit(1);
  }

  console.log(`\nWebhook Simulator`);
  console.log(`─────────────────`);
  console.log(`  Target:       ${args.baseUrl}/webhooks/${args.subscriptionId}/receive`);
  console.log(`  Events:       ${args.count}`);
  console.log(`  Delay:        ${args.delay}ms`);
  console.log();

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < args.count; i++) {
    const sample = SAMPLE_PAYLOADS[i % SAMPLE_PAYLOADS.length];

    // Add a unique timestamp to each payload
    const eventData = {
      eventType: sample.eventType,
      source: sample.source,
      payload: {
        ...sample.payload,
        _simulatedAt: new Date().toISOString(),
        _sequenceNumber: i + 1,
      },
    };

    const result = await sendEvent(args.baseUrl, args.subscriptionId, eventData, i);
    if (result.ok) succeeded++;
    else failed++;

    if (i < args.count - 1) {
      await sleep(args.delay);
    }
  }

  console.log();
  console.log(`Done. ${succeeded} succeeded, ${failed} failed.`);
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
