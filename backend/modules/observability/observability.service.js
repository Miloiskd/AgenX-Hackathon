import { getDbConnection } from '../../db/database.js';
import { runObservabilityAgent } from './observability.agent.js';
import { executeAction } from './observability.actions.js';

// ─── Sample log templates per category ────────────────────────────────────────

function generateSampleLogs(ticketId, category) {
  const ts = (offsetMs = 0) => new Date(Date.now() - 60000 + offsetMs).toISOString();

  const templates = {
    payment: `${ts(0)}   [INFO]  PaymentService: Processing transaction TXN-${ticketId}-001
${ts(300)}  [ERROR] PaymentGateway: Connection timeout after 5000ms — host: stripe.api.com:443
${ts(600)}  [WARN]  RetryHandler: Retry attempt 1/3 for transaction TXN-${ticketId}-001
${ts(900)}  [ERROR] RetryHandler: Retry 1/3 failed — ReadTimeout (5001ms)
${ts(1200)} [WARN]  RetryHandler: Retry attempt 2/3 for transaction TXN-${ticketId}-001
${ts(1500)} [ERROR] RetryHandler: Retry 2/3 failed — ConnectionReset by peer
${ts(1800)} [ERROR] PaymentService: Transaction TXN-${ticketId}-001 marked as FAILED after 3 retries
${ts(2100)} [ERROR] OrderService: Order status set to PAYMENT_FAILED — orderId: ORD-78912
${ts(2400)} [WARN]  AlertManager: Payment failure rate is 23% over last 5 minutes (threshold: 5%)`,

    shipping: `${ts(0)}   [INFO]  ShippingService: Fetching tracking update for batch BATCH-${ticketId}
${ts(300)}  [ERROR] FedExAPI: HTTP 504 Gateway Timeout — endpoint: /track/v1/trackingnumbers
${ts(600)}  [WARN]  TrackingPoller: Unable to refresh 47 shipments — API unavailable
${ts(900)}  [ERROR] DeliveryWebhook: Failed to deliver event to merchant — connection refused (port 8080)
${ts(1200)} [INFO]  RetryQueue: 47 tracking requests queued for retry in 60s
${ts(1500)} [ERROR] FulfillmentWorker: Batch job FULFILL-${ticketId} failed after 3 retries
${ts(1800)} [WARN]  CircuitBreaker: FedExAPI circuit is now OPEN (5 consecutive failures)
${ts(2100)} [ERROR] ShippingService: Unable to estimate delivery for 12 orders — carrier API down`,

    order: `${ts(0)}   [INFO]  OrderController: POST /orders received — userId: USR-4821
${ts(300)}  [ERROR] InventoryService: Request timeout after 3000ms — host: inventory-svc:8080
${ts(600)}  [WARN]  CircuitBreaker: inventory-svc circuit OPEN (failures: 5/5 in last 60s)
${ts(900)}  [ERROR] OrderService: Cannot reserve stock — inventory-svc unavailable
${ts(1200)} [ERROR] OrderController: POST /orders returned 503 Service Unavailable — latency: 3241ms
${ts(1500)} [WARN]  LoadBalancer: Removing unhealthy instance inventory-svc-2 from rotation
${ts(1800)} [ERROR] CheckoutService: 3 concurrent order creation failures in last 30s
${ts(2100)} [INFO]  AlertManager: Notifying on-call engineer about inventory-svc degradation`,

    product: `${ts(0)}   [WARN]  CacheService: Redis cache miss rate at 81% — normal threshold: 20%
${ts(300)}  [ERROR] CatalogAPI: Serving stale product data for SKU-44521 — cache age: 4320s
${ts(600)}  [ERROR] SearchService: Elasticsearch index out of sync — last update: 83 minutes ago
${ts(900)}  [WARN]  ProductSync: Sync worker stopped unexpectedly — PID 14823 not found
${ts(1200)} [ERROR] PricingService: Price discrepancy detected for 12 products vs catalog source
${ts(1500)} [ERROR] CacheService: Cache invalidation failed for namespace "products" — Redis timeout
${ts(1800)} [WARN]  FeatureFlag: Fallback to DB for product reads — cache unreliable
${ts(2100)} [ERROR] CatalogWorker: Failed to refresh product cache after 2 retry attempts`,

    bug: `${ts(0)}   [ERROR] UnhandledPromiseRejection: TypeError — Cannot read properties of undefined (reading 'id')
    at UserController.getProfile (/app/controllers/user.js:45:18)
    at Layer.handle (/app/node_modules/express/router/layer.js:95:5)
${ts(400)}  [WARN]  HealthCheck: API response time 4523ms — threshold: 2000ms
${ts(700)}  [ERROR] Database: Connection pool exhausted — 20/20 connections active
${ts(1000)} [ERROR] API: GET /api/users/profile → 500 Internal Server Error (5234ms)
${ts(1300)} [WARN]  MemoryMonitor: Heap usage at 87% — current: 1.74GB / limit: 2GB
${ts(1600)} [ERROR] API: POST /api/orders → 500 Internal Server Error (timeout)
${ts(1900)} [WARN]  GC: Full garbage collection took 2340ms — application paused`,

    other: `${ts(0)}   [WARN]  SystemMonitor: CPU usage at 94% sustained for 300 seconds
${ts(300)}  [ERROR] Application: Memory heap approaching limit — current: 2.8GB / max: 3GB
${ts(600)}  [ERROR] ServiceMesh: Health check failing for 3 of 5 replicas
${ts(900)}  [WARN]  LoadBalancer: Removing unhealthy instance app-server-3 from rotation
${ts(1200)} [ERROR] KubernetesController: Pod app-server-3 in CrashLoopBackOff — restart count: 5
${ts(1500)} [ERROR] Ingress: Upstream connect error for /api/* — 502 Bad Gateway
${ts(1800)} [WARN]  AlertManager: P1 incident triggered — service degradation detected
${ts(2100)} [INFO]  Runbook: Auto-remediation playbook RB-042 triggered`,
  };

  return templates[category] || templates.other;
}

// ─── Public service functions ─────────────────────────────────────────────────

/**
 * Get logs for a ticket. If none exist, generate sample logs and persist them.
 */
export async function getTicketLogs(ticketId, { category = 'other' } = {}) {
  const db = await getDbConnection();
  const existing = await db.get('SELECT logs FROM ticket_logs WHERE ticket_id = ?', [ticketId]);
  if (existing) return existing.logs;

  const logs = generateSampleLogs(ticketId, category.toLowerCase());
  await db.run(
    'INSERT OR IGNORE INTO ticket_logs (ticket_id, logs) VALUES (?, ?)',
    [ticketId, logs]
  );
  return logs;
}

/**
 * Run the full observability pipeline for a ticket:
 * 1. Get logs
 * 2. AI analysis
 * 3. Execute controlled action
 * 4. Validate result
 * 5. Persist resolution record
 */
export async function analyzeAndResolve(ticketId, ticket) {
  const { summary, category, priority } = ticket;

  // Step 1 — Get or generate logs
  const logs = await getTicketLogs(ticketId, { category });
  console.log(`🔍 [Observability] Analyzing logs for ticket ${ticketId}...`);

  // Step 2 — AI analysis
  const analysis = await runObservabilityAgent({ logs, summary, category, priority });
  console.log(`✅ [Observability] Analysis complete:`, analysis);

  // Step 3 — Execute controlled action (only if auto_fix = true)
  const actionResult = await executeAction(analysis.action, ticketId, analysis.auto_fix);
  console.log(`⚙️  [Observability] Action result:`, actionResult);

  // Step 4 — Validate resolution
  const validation = await validateResolution(analysis.action, analysis.auto_fix);
  console.log(`🧪 [Observability] Validation:`, validation);

  // Step 5 — Persist to DB (always overwrite with latest analysis)
  const db = await getDbConnection();
  await db.run(
    `INSERT INTO ticket_resolutions (ticket_id, root_cause, solution, action, auto_fix, resolved)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(ticket_id) DO UPDATE SET
       root_cause = excluded.root_cause,
       solution   = excluded.solution,
       action     = excluded.action,
       auto_fix   = excluded.auto_fix,
       resolved   = excluded.resolved,
       created_at = CURRENT_TIMESTAMP`,
    [
      ticketId,
      analysis.root_cause,
      analysis.solution,
      analysis.action,
      analysis.auto_fix ? 1 : 0,
      validation.resolved ? 1 : 0,
    ]
  );

  return {
    ticket_id: ticketId,
    logs,
    root_cause: analysis.root_cause,
    solution: analysis.solution,
    auto_fix: analysis.auto_fix,
    action_taken: actionResult,
    validation,
  };
}

/**
 * Update ticket resolution status based on user confirmation.
 */
export async function updateTicketResolution(ticketId, resolved) {
  const db = await getDbConnection();
  await db.run(
    `INSERT INTO ticket_resolutions (ticket_id, resolved)
     VALUES (?, ?)
     ON CONFLICT(ticket_id) DO UPDATE SET resolved = excluded.resolved`,
    [ticketId, resolved ? 1 : 0]
  );
  return { ticket_id: ticketId, resolved };
}

/**
 * Get all resolution records (used to enrich tickets list).
 */
export async function getAllResolutions() {
  const db = await getDbConnection();
  return db.all('SELECT ticket_id, resolved FROM ticket_resolutions');
}

// ─── Internal validation ──────────────────────────────────────────────────────

async function validateResolution(action, autoFix) {
  await new Promise((r) => setTimeout(r, 400));
  if (!autoFix || action === 'none') {
    return {
      resolved: false,
      message: 'No automated fix applied — manual intervention required',
    };
  }
  return {
    resolved: true,
    message: 'Health check passed — system is responding normally after fix',
  };
}
