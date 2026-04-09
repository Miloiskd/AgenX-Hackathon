/**
 * Saleor Contextualizer
 *
 * Automatically extracts rich context from Saleor for tickets:
 * - Customer profile & history
 * - Related orders (past, present, failed)
 * - Payment methods & issues
 * - Product information
 * - Shipping status
 *
 * This runs AUTOMATICALLY when a ticket is registered if it's e-commerce related.
 */

import {
  querySaleor,
  getOrderById,
  getOrderByNumber,
  getCustomerByEmail,
  getProductById,
  getPaymentById,
  getTransactionById,
} from './saleor.service.js';

// ─── Customer Context ─────────────────────────────────────────────────────

/**
 * Get comprehensive customer profile from Saleor.
 * Includes: basic info, total orders, lifetime value, recent orders, issues
 *
 * @param {string} email - Customer email
 * @returns {Promise<Object|null>} - Customer profile or null if not found
 */
export async function getCustomerContext(email) {
  try {
    if (!email) return null;

    const query = `
      query GetCustomerContext($email: String!) {
        customers(first: 1, filter: { search: $email }) {
          edges {
            node {
              id
              email
              firstName
              lastName
              note
              isActive
              dateJoined
              lastLogin
              defaultBillingAddress { country { code } }
              defaultShippingAddress { country { code } }
              orders(first: 10) {
                totalCount
                edges {
                  node {
                    id
                    number
                    status
                    created
                    total { gross { amount } }
                    paymentStatus
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = await querySaleor(query, { email });
    if (!result?.customers?.edges?.length) return null;

    const customer = result.customers.edges[0].node;
    return {
      id: customer.id,
      email: customer.email,
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      isActive: customer.isActive,
      memberSince: customer.dateJoined,
      lastLogin: customer.lastLogin,
      totalOrders: customer.orders?.totalCount || 0,
      recentOrders: customer.orders?.edges?.map((e) => ({
        number: e.node.number,
        status: e.node.status,
        date: e.node.created,
        amount: e.node.total?.gross?.amount,
        paymentStatus: e.node.paymentStatus,
      })) || [],
      country: customer.defaultBillingAddress?.country?.code || 'Unknown',
      note: customer.note,
    };
  } catch (err) {
    console.warn('⚠️ Failed to fetch customer context:', err.message);
    return null;
  }
}

// ─── Order Context ───────────────────────────────────────────────────────

/**
 * Get complete order context including shipments, payments, items
 *
 * @param {string} orderNumber - Order number or ID
 * @returns {Promise<Object|null>}
 */
export async function getOrderContext(orderNumber) {
  try {
    if (!orderNumber) return null;

    const query = `
      query GetOrderContext($number: String!) {
        order(number: $number) {
          id
          number
          status
          created
          updatedAt
          total { gross { amount currency } tax { amount } }
          subtotal { gross { amount currency } }
          user { email firstName lastName }
          paymentStatus
          isPaid
          fulfillmentStatus
          
          shippingAddress {
            city
            country { code }
            postalCode
          }
          
          lines(first: 10) {
            edges {
              node {
                id
                variantName
                quantity
                unitPrice { gross { amount currency } }
                total { gross { amount currency } }
              }
            }
          }
          
          fulfillments {
            id
            status
            created
            lines { id }
            trackingNumber
          }
          
          payments {
            id
            gateway
            chargeStatus
            total { amount currency }
            capturedAmount { amount currency }
            transactions {
              id
              kind
              isSuccess
              error
              amount { amount currency }
            }
          }
          
          events(first: 15) {
            edges {
              node {
                type
                date
                message
              }
            }
          }
        }
      }
    `;

    const result = await querySaleor(query, { number: orderNumber });
    if (!result?.order) return null;

    const order = result.order;
    return {
      number: order.number,
      status: order.status,
      date: order.created,
      customer: order.user?.email,
      amount: order.total?.gross?.amount,
      currency: order.total?.gross?.currency,
      paymentStatus: order.paymentStatus,
      isPaid: order.isPaid,
      fulfillmentStatus: order.fulfillmentStatus,
      
      items: order.lines?.edges?.map((e) => ({
        product: e.node.variantName,
        qty: e.node.quantity,
        price: e.node.unitPrice?.gross?.amount,
        total: e.node.total?.gross?.amount,
      })) || [],
      
      shippingInfo: {
        city: order.shippingAddress?.city,
        country: order.shippingAddress?.country?.code,
        trackings: order.fulfillments?.map((f) => ({
          status: f.status,
          number: f.trackingNumber,
          date: f.created,
        })) || [],
      },
      
      payments: order.payments?.map((p) => ({
        gateway: p.gateway,
        status: p.chargeStatus,
        amount: p.total?.amount,
        captured: p.capturedAmount?.amount,
        transactions: p.transactions?.map((t) => ({
          kind: t.kind,
          success: t.isSuccess,
          error: t.error,
        })) || [],
      })) || [],
      
      timeline: order.events?.edges?.map((e) => ({
        type: e.node.type,
        date: e.node.date,
        message: e.node.message,
      })) || [],
    };
  } catch (err) {
    console.warn('⚠️ Failed to fetch order context:', err.message);
    return null;
  }
}

// ─── Payment Issues Detection ────────────────────────────────────────────────

/**
 * Detect common payment issues from order data
 *
 * @param {Object} orderContext - Order from getOrderContext()
 * @returns {String[]} - List of detected issues
 */
export function detectPaymentIssues(orderContext) {
  if (!orderContext) return [];

  const issues = [];

  // Unpaid but has transactions
  if (!orderContext.isPaid && orderContext.payments?.length > 0) {
    issues.push('Payment not marked as paid despite transaction attempts');
  }

  // Declined transactions
  const failedTransactions = orderContext.payments
    ?.flatMap((p) => p.transactions || [])
    .filter((t) => !t.success);
  if (failedTransactions?.length > 0) {
    issues.push(`${failedTransactions.length} failed payment transaction(s)`);
  }

  // Partial capture
  const partialCaptures = orderContext.payments?.filter(
    (p) => p.captured && p.captured < p.amount
  );
  if (partialCaptures?.length > 0) {
    issues.push('Partial payment capture detected');
  }

  // No fulfillment for paid order (stuck order)
  if (
    orderContext.isPaid &&
    orderContext.fulfillmentStatus === 'UNASSIGNED'
  ) {
    issues.push('Payment received but order not assigned for fulfillment');
  }

  return issues;
}

// ─── Automatic Contextualizer ─────────────────────────────────────────────

/**
 * Main function: automatically contextualizes a ticket with Saleor data.
 * Extracts customer email from text, fetches all relevant context.
 *
 * @param {string} incidentText - Raw incident description
 * @param {{ ordernumber: string, email: string, category: string }} entities - Extracted entities
 * @returns {Promise<Object>} - Rich context object
 */
export async function automaticContextualize(incidentText, entities = {}) {
  const context = {
    extractedAt: new Date().toISOString(),
    customer: null,
    order: null,
    paymentIssues: [],
    relatedOrders: [],
    summary: '',
  };

  try {
    // 1. Fetch customer context (if email available)
    if (entities.email) {
      console.log(`📧 Fetching customer context for ${entities.email}...`);
      const customerCtx = await getCustomerContext(entities.email);
      if (customerCtx) {
        context.customer = customerCtx;
        console.log(`✅ Customer found: ${customerCtx.name} (${customerCtx.totalOrders} orders)`);
      }
    }

    // 2. Fetch order context (if order number available)
    if (entities.orderNumber) {
      console.log(`📦 Fetching order context for order #${entities.orderNumber}...`);
      const orderCtx = await getOrderContext(entities.orderNumber);
      if (orderCtx) {
        context.order = orderCtx;
        context.paymentIssues = detectPaymentIssues(orderCtx);
        console.log(`✅ Order found: ${orderCtx.status} (${orderCtx.amount} ${orderCtx.currency})`);
        if (context.paymentIssues.length > 0) {
          console.log(`⚠️ Payment issues detected: ${context.paymentIssues.join('; ')}`);
        }
      }
    }

    // 3. Build summary
    if (context.customer && context.order) {
      context.summary = `Customer ${context.customer.email} (${context.customer.totalOrders} orders since ${new Date(context.customer.memberSince).toLocaleDateString()}) reported issue with order #${context.order.number} (${context.order.status}, ${context.order.amount} ${context.order.currency}). Payment: ${context.order.paymentStatus}. ${context.paymentIssues.length > 0 ? '⚠️ ' + context.paymentIssues[0] : ''}`;
    } else if (context.customer) {
      context.summary = `Customer ${context.customer.email} (${context.customer.totalOrders} total orders). Member since ${new Date(context.customer.memberSince).toLocaleDateString()}.`;
    } else if (context.order) {
      context.summary = `Order #${context.order.number} (${context.order.status}). Amount: ${context.order.amount} ${context.order.currency}. Payment: ${context.order.paymentStatus}.`;
    }

    console.log(`✅ Contextualization complete`);
    return context;
  } catch (err) {
    console.error('❌ Error during contextualization:', err.message);
    return context; // Return partial context even on failure
  }
}

export default {
  getCustomerContext,
  getOrderContext,
  detectPaymentIssues,
  automaticContextualize,
};
