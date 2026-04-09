/**
 * Controlled action executor — only predefined safe actions allowed.
 * All actions are simulated (no real system calls).
 */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ACTION_HANDLERS = {
  restart_service: async (ticketId) => {
    console.log(`[ACTION] restart_service — Ticket ${ticketId}`);
    console.log(`[ACTION] Sending SIGTERM to service process...`);
    await delay(800);
    console.log(`[ACTION] Waiting for graceful shutdown...`);
    await delay(400);
    console.log(`[ACTION] Service restarted successfully.`);
    return {
      action: 'restart_service',
      status: 'executed',
      message: 'Service restarted successfully (simulated)',
    };
  },

  retry_request: async (ticketId) => {
    console.log(`[ACTION] retry_request — Ticket ${ticketId}`);
    console.log(`[ACTION] Retrying failed request with exponential backoff (attempt 1)...`);
    await delay(400);
    console.log(`[ACTION] Retrying failed request (attempt 2)...`);
    await delay(300);
    console.log(`[ACTION] Request completed successfully on retry.`);
    return {
      action: 'retry_request',
      status: 'executed',
      message: 'Request retried successfully (simulated)',
    };
  },

  clear_cache: async (ticketId) => {
    console.log(`[ACTION] clear_cache — Ticket ${ticketId}`);
    console.log(`[ACTION] Flushing stale cache entries from Redis...`);
    await delay(500);
    console.log(`[ACTION] Cache cleared. Warming up fresh data...`);
    await delay(300);
    console.log(`[ACTION] Cache warm-up complete.`);
    return {
      action: 'clear_cache',
      status: 'executed',
      message: 'Cache cleared and warmed up successfully (simulated)',
    };
  },

  none: async (ticketId) => {
    console.log(`[ACTION] none — Ticket ${ticketId} requires manual intervention.`);
    return {
      action: 'none',
      status: 'skipped',
      message: 'No automated action taken — manual intervention required',
    };
  },
};

/**
 * Execute a controlled action for a ticket.
 * Only runs if auto_fix is true.
 * @param {string} action - One of the predefined actions
 * @param {string} ticketId - Ticket identifier
 * @param {boolean} autoFix - Whether the AI determined auto-fix is possible
 */
export async function executeAction(action, ticketId, autoFix) {
  if (!autoFix || action === 'none') {
    return ACTION_HANDLERS.none(ticketId);
  }
  const handler = ACTION_HANDLERS[action] || ACTION_HANDLERS.none;
  return handler(ticketId);
}
