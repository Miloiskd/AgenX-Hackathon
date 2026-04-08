import { runTriageChain } from './triage.chain.js';
import { createTicket } from '../tickets/tickets.service.js';

/**
 * Process user input through triage and create a ticket
 * @param {string} userInput - The user's support request text
 * @returns {Promise<Object>} - Created ticket object
 */
export async function triageAndCreateTicket(userInput) {
  try {
    // Step 1: Run the triage chain to classify the input
    console.log('🔍 Triaging input...');
    const triageResult = await runTriageChain(userInput);
    console.log('✅ Triage complete:', triageResult);

    // Step 2: Create a ticket with the triage results
    console.log('📝 Creating ticket...');
    const ticket = await createTicket({
      input: userInput,
      category: triageResult.category,
      priority: triageResult.priority,
      summary: triageResult.summary,
    });
    console.log('✅ Ticket created:', ticket);

    return ticket;
  } catch (error) {
    console.error('Error in triage process:', error.message);
    throw new Error(`Failed to process ticket: ${error.message}`);
  }
}

/**
 * Get triage classification without creating a ticket
 * This is useful for testing or preview mode
 * @param {string} userInput - The user's support request text
 * @returns {Promise<Object>} - Triage classification result
 */
export async function getTriageClassification(userInput) {
  try {
    return await runTriageChain(userInput);
  } catch (error) {
    console.error('Error getting triage classification:', error.message);
    throw new Error(`Classification failed: ${error.message}`);
  }
}
