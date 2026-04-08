import { createJiraTicket, getAllJiraTickets } from '../jira/jira.service.js';

/**
 * Extract text from Atlassian Document Format description
 * @param {Object} description - Jira description object
 * @returns {string} - Extracted text
 */
function extractDescription(description) {
  if (!description) return 'No description';
  
  // If it's Atlassian Document Format
  if (description.type === 'doc' && description.content) {
    try {
      const text = description.content
        .filter(block => block.type === 'paragraph')
        .map(block => {
          if (block.content && Array.isArray(block.content)) {
            return block.content
              .map(item => item.text || '')
              .join('');
          }
          return '';
        })
        .join('\n');
      return text || 'No description';
    } catch (e) {
      return 'No description';
    }
  }
  
  // If it's plain string
  if (typeof description === 'string') {
    return description;
  }
  
  return 'No description';
}

/**
 * Create a new ticket in Jira
 * @param {Object} ticketData - Ticket data from triage
 * @param {string} ticketData.input - Original user input
 * @param {string} ticketData.category - Ticket category
 * @param {string} ticketData.priority - Ticket priority
 * @param {string} ticketData.summary - Ticket summary
 * @returns {Promise<Object>} - Created ticket object
 */
export async function createTicket(ticketData) {
  try {
    // Create ticket in Jira
    const jiraTicket = await createJiraTicket({
      summary: ticketData.summary,
      description: ticketData.input,
      category: ticketData.category,
      priority: ticketData.priority,
    });

    console.log(`✅ Ticket created in Jira with key: ${jiraTicket.jiraKey}`);
    return jiraTicket;
  } catch (error) {
    console.error('Error creating ticket:', error.message);
    throw new Error(`Failed to create ticket: ${error.message}`);
  }
}

/**
 * Get all tickets
 * @returns {Promise<Array>} - Array of all tickets from Jira
 */
export async function getAllTickets() {
  try {
    const jiraTickets = await getAllJiraTickets();
    
    console.log(`📋 Fetching ${jiraTickets?.length || 0} tickets from Jira`);
    
    // Transform Jira issues to our format
    return jiraTickets.map(issue => ({
      id: issue.key,
      jiraId: issue.id,
      summary: issue.fields.summary || 'No title',
      description: extractDescription(issue.fields.description),
      category: issue.fields.labels?.[0] || 'other',
      priority: issue.fields.priority?.name || 'Medium',
      status: issue.fields.status?.name || 'unknown',
      createdAt: issue.fields.created,
      updatedAt: issue.fields.updated,
      url: `https://ag3nt-x.atlassian.net/browse/${issue.key}`,
    }));
  } catch (error) {
    console.error('Error fetching tickets:', error.message);
    throw new Error(`Failed to fetch tickets: ${error.message}`);
  }
}
/**
 * Get statistics about tickets from Jira
 * @returns {Promise<Object>} - Ticket statistics
 */
export async function getTicketStats() {
  try {
    const tickets = await getAllTickets();
    
    const stats = {
      total: tickets.length,
      byStatus: {},
      byCategory: {},
      byPriority: {},
    };

    for (const ticket of tickets) {
      // Count by status
      stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1;
      // Count by category
      stats.byCategory[ticket.category] = (stats.byCategory[ticket.category] || 0) + 1;
      // Count by priority
      stats.byPriority[ticket.priority] = (stats.byPriority[ticket.priority] || 0) + 1;
    }

    return stats;
  } catch (error) {
    console.error('Error getting ticket stats:', error.message);
    throw new Error(`Failed to get stats: ${error.message}`);
  }
}

