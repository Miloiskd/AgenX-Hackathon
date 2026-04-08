/**
 * Saleor Incident Enrichment
 *
 * Responsibilities:
 *  1. Detect whether an incident is e-commerce related.
 *  2. Extract entities (orderId, email, productId, transactionId) from free text.
 *  3. Query Saleor for each extracted entity.
 *  4. Build an enriched analysis object with possible cause, impact, and recommendations.
 *
 * Constraint: data is obtained exclusively from Saleor's GraphQL API.
 * No hardcoded or invented values are used when real data is unavailable.
 */

import {
  getOrderById,
  getOrderByNumber,
  getCustomerByEmail,
  getProductById,
  getTransactionById,
} from './saleor.service.js';

import {
  GET_ORDER_BY_ID,
  GET_ORDER_BY_NUMBER,
  GET_CUSTOMER_BY_EMAIL,
  GET_PRODUCT_BY_ID,
  GET_TRANSACTION_BY_ID,
} from './saleor.queries.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const ECOMMERCE_CATEGORIES = new Set(['payment', 'shipping', 'order', 'product']);

const ECOMMERCE_KEYWORDS = [
  'order', 'purchase', 'checkout', 'cart', 'payment', 'transaction',
  'invoice', 'shipping', 'delivery', 'tracking', 'refund', 'return',
  'product', 'sku', 'stock', 'inventory', 'fulfillment', 'dispatch',
  'customer', 'billing', 'charged', 'declined', 'gateway', 'saleor',
];

// ─── Entity Extraction ───────────────────────────────────────────────────────

/**
 * Extract structured entities from raw incident text.
 * Uses regex patterns only — no LLM calls here to keep latency low.
 *
 * @param {string} text
 * @returns {{ orderId: string|null, orderNumber: string|null, email: string|null,
 *             productId: string|null, transactionId: string|null, paymentId: string|null }}
 */
export function extractEntities(text) {
  if (!text || typeof text !== 'string') {
    return { orderId: null, orderNumber: null, email: null, productId: null, transactionId: null, paymentId: null };
  }

  const normalized = text.toLowerCase();

  // Saleor global IDs are base64-encoded strings like "T3JkZXI6MQ=="
  // Human-readable order numbers: "order #1042", "order number 1042", "#1042"
  const orderNumberMatch =
    normalized.match(/order\s*(?:number|num|#|no\.?)?\s*:?\s*#?(\d{1,10})/i) ||
    normalized.match(/#(\d{1,10})\b/);
  const orderNumber = orderNumberMatch ? orderNumberMatch[1] : null;

  // Email addresses
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : null;

  // Typed entity hints with explicit labels
  const orderIdMatch =
    text.match(/order\s*id\s*[:\-=]?\s*([A-Za-z0-9+/=]{8,})/i) ||
    text.match(/orderId\s*[:\-=]?\s*([A-Za-z0-9+/=]{8,})/i);

  const productIdMatch =
    text.match(/product\s*id\s*[:\-=]?\s*([A-Za-z0-9+/=]{8,})/i) ||
    text.match(/productId\s*[:\-=]?\s*([A-Za-z0-9+/=]{8,})/i);

  const transactionIdMatch =
    text.match(/transaction\s*id\s*[:\-=]?\s*([A-Za-z0-9+/=_\-]{6,})/i) ||
    text.match(/transactionId\s*[:\-=]?\s*([A-Za-z0-9+/=_\-]{6,})/i) ||
    text.match(/txn?\s*[:\-#=]?\s*([A-Za-z0-9_\-]{6,})/i);

  const paymentIdMatch =
    text.match(/payment\s*id\s*[:\-=]?\s*([A-Za-z0-9+/=]{8,})/i) ||
    text.match(/paymentId\s*[:\-=]?\s*([A-Za-z0-9+/=]{8,})/i);

  return {
    orderId: orderIdMatch ? orderIdMatch[1] : null,
    orderNumber,
    email,
    productId: productIdMatch ? productIdMatch[1] : null,
    transactionId: transactionIdMatch ? transactionIdMatch[1] : null,
    paymentId: paymentIdMatch ? paymentIdMatch[1] : null,
  };
}

// ─── E-commerce Detection ────────────────────────────────────────────────────

/**
 * Determine whether an incident is e-commerce related based on its triage
 * category or by scanning for e-commerce keywords in the original text.
 *
 * @param {{ category: string }} triageResult
 * @param {string} incidentText
 * @returns {boolean}
 */
export function isEcommerceRelated(triageResult, incidentText = '') {
  if (triageResult?.category && ECOMMERCE_CATEGORIES.has(triageResult.category.toLowerCase())) {
    return true;
  }
  const lower = incidentText.toLowerCase();
  return ECOMMERCE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Saleor Data Fetching ────────────────────────────────────────────────────

/**
 * Fetch all available Saleor data for the extracted entities.
 * Each fetch is attempted independently; failures return null without
 * throwing so that partial data is still useful.
 *
 * @param {{ orderId, orderNumber, email, productId, transactionId, paymentId }} entities
 * @returns {Promise<{ order, customer, product, transaction, queriesUsed }>}
 */
export async function fetchSaleorData(entities) {
  const { orderId, orderNumber, email, productId, transactionId } = entities;
  const queriesUsed = [];

  const safeCall = async (label, query, variables, fn) => {
    try {
      const result = await fn();
      if (result) queriesUsed.push({ label, query, variables });
      return result;
    } catch (err) {
      console.warn(`⚠️  Saleor fetch [${label}] failed:`, err.message);
      return null;
    }
  };

  // Prefer explicit ID over number search
  const order = orderId
    ? await safeCall('order by ID', GET_ORDER_BY_ID, { id: orderId }, () => getOrderById(orderId))
    : orderNumber
    ? await safeCall('order by number', GET_ORDER_BY_NUMBER, { number: orderNumber }, () => getOrderByNumber(orderNumber))
    : null;

  const customer = email
    ? await safeCall('customer by email', GET_CUSTOMER_BY_EMAIL, { email }, () => getCustomerByEmail(email))
    : null;

  const product = productId
    ? await safeCall('product by ID', GET_PRODUCT_BY_ID, { id: productId }, () => getProductById(productId))
    : null;

  const transaction = transactionId
    ? await safeCall('transaction by ID', GET_TRANSACTION_BY_ID, { id: transactionId }, () => getTransactionById(transactionId))
    : null;

  return { order, customer, product, transaction, queriesUsed };
}

// ─── Analysis Builder ────────────────────────────────────────────────────────

/**
 * Generate a structured technical analysis from Saleor data and triage result.
 *
 * @param {Object} triageResult   - { category, priority, summary }
 * @param {Object} entities       - extracted entities
 * @param {Object} saleorData     - { order, customer, product, transaction }
 * @returns {{ possibleCause: string, impact: string, recommendedAction: string }}
 */
export function buildAnalysis(triageResult, entities, saleorData) {
  const { order, customer, transaction } = saleorData;
  const { category, priority } = triageResult;

  let possibleCause = 'Unable to determine — insufficient data from Saleor API.';
  let impact = 'Unknown impact — no Saleor data retrieved.';
  let recommendedAction = 'Verify SALEOR_API_URL and SALEOR_AUTH_TOKEN in .env, then retry.';

  // ── Order-based analysis ────────────────────────────────────────────────
  if (order) {
    const orderStatus = order.status;
    const paymentStatus = order.paymentStatus;
    const fulfillments = order.fulfillments ?? [];
    const isPaid = order.isPaid;
    const failedFulfillments = fulfillments.filter((f) => f.status === 'CANCELED');

    if (category === 'payment') {
      if (!isPaid) {
        possibleCause = `Order #${order.number} has paymentStatus="${paymentStatus}" and is not marked as paid. Possible gateway rejection or incomplete transaction.`;
        impact = `Customer ${order.userEmail || entities.email} may have been charged without order confirmation, or blocked from completing purchase.`;
        recommendedAction = `1. Review payment transactions for order #${order.number} in Saleor dashboard.\n2. Check gateway logs for decline reason.\n3. If payment was captured but order not updated, trigger a manual status sync via Saleor API mutation.`;
      } else {
        possibleCause = `Order #${order.number} is paid (${paymentStatus}) but a payment-related complaint was raised. Possible duplicate charge or refund dispute.`;
        impact = 'Customer billing trust at risk. Potential chargeback if not addressed.';
        recommendedAction = `1. Confirm captured amount matches order total.\n2. Check for duplicate payment transactions.\n3. Issue refund mutation if overcharged: orderRefund(id, amount).`;
      }
    } else if (category === 'shipping') {
      const unfulfilled = order.lines?.filter(
        (l) => l.quantity > (l.quantityFulfilled ?? 0)
      ) ?? [];

      if (failedFulfillments.length > 0) {
        possibleCause = `Order #${order.number} has ${failedFulfillments.length} canceled fulfillment(s). Shipping may have failed mid-dispatch.`;
      } else if (unfulfilled.length > 0) {
        possibleCause = `Order #${order.number} has ${unfulfilled.length} line(s) not yet fulfilled (orderStatus=${orderStatus}).`;
      } else {
        possibleCause = `Order #${order.number} is in status="${orderStatus}". All lines appear fulfilled but shipping complaint received.`;
      }
      impact = `Customer ${order.userEmail || entities.email} has not received goods. SLA breach risk.`;
      recommendedAction = `1. Verify tracking numbers in fulfillments.\n2. Contact carrier for last-mile status.\n3. If stock issue, check warehouse availability via Saleor product stock query.`;
    } else {
      possibleCause = `Order #${order.number} status="${orderStatus}", paymentStatus="${paymentStatus}". Anomaly detected in context of category="${category}".`;
      impact = `Affects customer ${order.userEmail || entities.email} with order value ${order.total?.gross?.amount} ${order.total?.gross?.currency}.`;
      recommendedAction = `Review full order timeline in Saleor events and correlate with application logs.`;
    }
  }

  // ── Transaction-based analysis overlay ────────────────────────────────
  if (transaction) {
    const failedEvents = (transaction.events ?? []).filter((e) =>
      ['CHARGE_FAILURE', 'AUTHORIZATION_FAILURE', 'REFUND_FAILURE'].includes(e.type)
    );
    if (failedEvents.length > 0) {
      possibleCause = `Transaction ${transaction.id} has ${failedEvents.length} failure event(s): ${failedEvents.map((e) => e.type).join(', ')}. ${possibleCause}`;
      recommendedAction = `1. Check gateway error in transaction events.\n2. ${recommendedAction}`;
    }
  }

  // ── Customer-based impact enrichment ──────────────────────────────────
  if (customer) {
    const totalOrders = customer.orders?.totalCount ?? '?';
    impact += ` Customer has ${totalOrders} total order(s) on record — potential churn risk if high-value.`;
  }

  // ── Priority severity note ─────────────────────────────────────────────
  if (priority === 'high') {
    recommendedAction = `[HIGH PRIORITY] ${recommendedAction}`;
  }

  return { possibleCause, impact, recommendedAction };
}

// ─── Main Enrichment Entry Point ─────────────────────────────────────────────

/**
 * Full enrichment pipeline:
 *  1. Extract entities from incident text
 *  2. Detect if e-commerce related
 *  3. Fetch Saleor data
 *  4. Build structured analysis
 *
 * @param {string} incidentText   - Raw incident description
 * @param {Object} triageResult   - { category, priority, summary } from triage chain
 * @returns {Promise<Object>}     - Full enrichment result in the expected output format
 */
export async function enrichIncident(incidentText, triageResult) {
  const entities = extractEntities(incidentText);
  const ecommerceRelated = isEcommerceRelated(triageResult, incidentText);

  const baseResult = {
    incident: {
      category: triageResult.category,
      priority: triageResult.priority,
      summary: triageResult.summary,
    },
    extractedEntities: {
      orderId: entities.orderId,
      orderNumber: entities.orderNumber,
      email: entities.email,
      productId: entities.productId,
      transactionId: entities.transactionId,
    },
    ecommerceRelated,
    saleorQueries: [],
    saleorData: {
      order: null,
      customer: null,
      product: null,
      transaction: null,
    },
    analysis: {
      possibleCause: 'Incident is not e-commerce related — Saleor enrichment skipped.',
      impact: 'N/A',
      recommendedAction: 'Route to appropriate engineering team based on category.',
    },
    backendIntegrationSuggestions: [
      'Create SaleorService module to handle all GraphQL queries (done — see modules/saleor/).',
      'Integrate enrichIncident() into the triage pipeline in triage.service.js.',
      'Add SALEOR_API_URL and SALEOR_AUTH_TOKEN to .env file.',
      'Add POST /saleor/enrich endpoint for on-demand incident enrichment.',
      'Validate extracted entities before querying Saleor to avoid unnecessary API calls.',
      'Store saleorData as JSON in the SQLite tickets table for audit purposes.',
    ],
  };

  if (!ecommerceRelated) {
    return baseResult;
  }

  console.log('🛒 E-commerce incident detected — querying Saleor...');

  const { order, customer, product, transaction, queriesUsed } = await fetchSaleorData(entities);

  baseResult.saleorQueries = queriesUsed.map((q) => ({
    label: q.label,
    variables: q.variables,
    query: q.query,
  }));

  baseResult.saleorData = { order, customer, product, transaction };

  baseResult.analysis = buildAnalysis(triageResult, entities, { order, customer, product, transaction });

  return baseResult;
}
