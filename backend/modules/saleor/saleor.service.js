/**
 * SaleorService
 *
 * Handles all communication with the Saleor GraphQL API.
 * Saleor is treated as a fully external service — no imports from its source code,
 * no direct database access. All data is fetched through its public GraphQL endpoint.
 */

import axios from 'axios';
import {
  GET_ORDER_BY_ID,
  GET_ORDER_BY_NUMBER,
  GET_CUSTOMER_BY_EMAIL,
  GET_PRODUCT_BY_ID,
  GET_PAYMENT_BY_ID,
  GET_TRANSACTION_BY_ID,
} from './saleor.queries.js';

const SALEOR_API_URL = process.env.SALEOR_API_URL || 'http://localhost:8000/graphql/';
const SALEOR_AUTH_TOKEN = process.env.SALEOR_AUTH_TOKEN || '';

// Axios client configured for Saleor's GraphQL endpoint
const saleorClient = axios.create({
  baseURL: SALEOR_API_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(SALEOR_AUTH_TOKEN && { Authorization: `Bearer ${SALEOR_AUTH_TOKEN}` }),
  },
  timeout: 10_000,
});

/**
 * Execute an arbitrary GraphQL query against Saleor.
 * @param {string} query   - GraphQL query string
 * @param {Object} variables - Query variables
 * @returns {Promise<Object>} - `data` field from the GraphQL response
 * @throws {Error} on HTTP failure or GraphQL-level errors
 */
export async function querySaleor(query, variables = {}) {
  try {
    const response = await saleorClient.post('', { query, variables });

    const { data, errors } = response.data;

    if (errors && errors.length > 0) {
      const messages = errors.map((e) => e.message).join('; ');
      throw new Error(`Saleor GraphQL errors: ${messages}`);
    }

    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(
        `Saleor HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
      );
    }
    throw new Error(`Saleor request failed: ${error.message}`);
  }
}

/**
 * Fetch a Saleor order by its internal ID (base64-encoded global ID).
 * @param {string} orderId - e.g. "T3JkZXI6MQ=="
 * @returns {Promise<Object|null>}
 */
export async function getOrderById(orderId) {
  const data = await querySaleor(GET_ORDER_BY_ID, { id: orderId });
  return data?.order ?? null;
}

/**
 * Fetch a Saleor order by its human-readable number (e.g. "1042").
 * @param {string} orderNumber
 * @returns {Promise<Object|null>}
 */
export async function getOrderByNumber(orderNumber) {
  const data = await querySaleor(GET_ORDER_BY_NUMBER, { number: String(orderNumber) });
  return data?.orders?.edges?.[0]?.node ?? null;
}

/**
 * Fetch a Saleor customer by email address.
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export async function getCustomerByEmail(email) {
  const data = await querySaleor(GET_CUSTOMER_BY_EMAIL, { email });
  return data?.customers?.edges?.[0]?.node ?? null;
}

/**
 * Fetch a Saleor product by its internal ID.
 * @param {string} productId
 * @returns {Promise<Object|null>}
 */
export async function getProductById(productId) {
  const data = await querySaleor(GET_PRODUCT_BY_ID, { id: productId });
  return data?.product ?? null;
}

/**
 * Fetch a Saleor payment record by ID.
 * @param {string} paymentId
 * @returns {Promise<Object|null>}
 */
export async function getPaymentById(paymentId) {
  const data = await querySaleor(GET_PAYMENT_BY_ID, { id: paymentId });
  return data?.payment ?? null;
}

/**
 * Fetch a Saleor transaction by ID (Saleor 3.x+ Transaction object).
 * @param {string} transactionId
 * @returns {Promise<Object|null>}
 */
export async function getTransactionById(transactionId) {
  const data = await querySaleor(GET_TRANSACTION_BY_ID, { id: transactionId });
  return data?.transaction ?? null;
}
