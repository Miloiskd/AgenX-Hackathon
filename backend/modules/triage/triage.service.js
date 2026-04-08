import { runTriageChain } from './triage.chain.js';
import { createTicket } from '../tickets/tickets.service.js';
import { notifyReporterTicketCreated, notifyTeamNewTicket } from '../gmail/index.js';

/**
 * Process user input through triage and create a ticket
 * Sends email notifications to reporter and team
 * @param {string} userInput - The user's support request text
 * @param {string|Object} emailOrAdditionalData - Reporter email OR object with file metadata
 * @returns {Promise<Object>} - Created ticket object
 */
export async function triageAndCreateTicket(userInput, emailOrAdditionalData = {}) {
  try {
    // Step 1: Run the AI triage chain to classify the input
    console.log('🔍 Triaging input...');
    const triageResult = await runTriageChain(userInput);
    console.log('✅ Triage complete:', triageResult);

    // Step 2: Build ticket description with file info
    let description = userInput;
    const isEmail = typeof emailOrAdditionalData === 'string';
    const reporterEmail = isEmail ? emailOrAdditionalData : emailOrAdditionalData?.reporterEmail;
    const additionalData = !isEmail ? emailOrAdditionalData : {};

    if (additionalData.hasPhoto || additionalData.hasLogs) {
      description += '\n\n---\n**Attachments:**\n';
      if (additionalData.hasPhoto) {
        description += `- 📸 Photo (${additionalData.photoMime}, ${(additionalData.photoSize / 1024).toFixed(2)} KB)\n`;
      }
      if (additionalData.hasLogs) {
        description += `- 📄 Log file (${additionalData.logsMime}, ${(additionalData.logsSize / 1024).toFixed(2)} KB)\n`;
      }
    }

    // Step 3: Create a ticket with the triage results
    console.log('📝 Creating ticket...');
    const ticket = await createTicket({
      input: userInput,
      description: description,
      category: triageResult.category,
      priority: triageResult.priority,
      summary: triageResult.summary,
    });
    console.log('✅ Ticket created:', ticket.jiraKey);

    // Step 4: Send email notifications (non-blocking — failures don't break the flow)
    if (reporterEmail) {
      notifyReporterTicketCreated({ ticket, reporterEmail })
        .then(() => console.log(`📧 Confirmation email sent to reporter: ${reporterEmail}`))
        .catch((err) => console.error('⚠️  Failed to send reporter confirmation:', err.message));
    }

    notifyTeamNewTicket({ ticket, reporterEmail: reporterEmail || 'anonymous' })
      .then(() => console.log('📧 Alert email sent to SRE team'))
      .catch((err) => console.error('⚠️  Failed to send team alert:', err.message));

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
