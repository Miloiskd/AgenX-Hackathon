import axios from 'axios';

// Configuration from environment
const JIRA_URL = process.env.JIRA_URL || 'https://ag3nt-x.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'AG3NTX';

// Create axios instance with Jira config
const jiraClient = axios.create({
  baseURL: `${JIRA_URL}/rest/api/3`,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  auth: {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN,
  },
});

/**
 * Create a ticket in Jira
 * @param {Object} ticketData
 * @param {string} ticketData.summary - Brief title
 * @param {string} ticketData.description - Full description
 * @param {string} ticketData.category - Category (for custom field)
 * @param {string} ticketData.priority - Priority (highest, high, medium, low, lowest)
 * @returns {Promise<Object>} - Created Jira issue
 */
export async function createJiraTicket(ticketData) {
  try {
    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      throw new Error('Jira credentials not configured in .env');
    }

    // Map priorities to Jira format
    const priorityMap = {
      'high': 'Highest',
      'medium': 'Medium',
      'low': 'Lowest',
    };

    const jiraPriority = priorityMap[ticketData.priority?.toLowerCase()] || 'Medium';

    // Build Jira request (using fields that exist in KAN project)
    const issueData = {
      fields: {
        project: {
          key: JIRA_PROJECT_KEY,
        },
        summary: ticketData.summary,
        description: {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ticketData.description || ticketData.input || 'No description provided',
                },
              ],
            },
          ],
        },
        issuetype: {
          name: 'Task',
        },
        labels: [ticketData.category?.toLowerCase() || 'other'],
      },
    };

    // Add priority if it's valid
    if (jiraPriority) {
      issueData.fields.priority = {
        name: jiraPriority,
      };
    }

    console.log(`📤 Creating Jira ticket: "${ticketData.summary.substring(0, 50)}..."`);

    const response = await jiraClient.post('/issue', issueData);

    const createdIssue = response.data;

    console.log(`✅ Jira ticket created: ${createdIssue.key}`);

    return {
      jiraKey: createdIssue.key,
      jiraId: createdIssue.id,
      jiraUrl: `${JIRA_URL}/browse/${createdIssue.key}`,
      summary: ticketData.summary,
      description: ticketData.description || ticketData.input,
      category: ticketData.category,
      priority: ticketData.priority,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error.response) {
      console.error('Jira API Error:', error.response.status, error.response.data);
      throw new Error(`Jira error: ${error.response.data?.errorMessages?.[0] || error.message}`);
    }
    console.error('Error creating Jira ticket:', error.message);
    throw new Error(`Failed to create Jira ticket: ${error.message}`);
  }
}

/**
 * Get a ticket from Jira
 * @param {string} issueKey - Jira issue key (e.g., 'AG3NTX-123')
 * @returns {Promise<Object>} - Jira issue details
 */
export async function getJiraTicket(issueKey) {
  try {
    const response = await jiraClient.get(`/issue/${issueKey}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Jira ticket:', error.message);
    throw new Error(`Failed to fetch Jira ticket: ${error.message}`);
  }
}

/**
 * Update ticket status in Jira
 * @param {string} issueKey - Jira issue key
 * @param {string} newStatus - New status (e.g., 'In Progress', 'Done')
 * @returns {Promise<Object>} - Updated issue
 */
export async function updateJiraTicketStatus(issueKey, newStatus) {
  try {
    const response = await jiraClient.post(`/issue/${issueKey}/transitions`, {
      transition: {
        name: newStatus,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error updating Jira ticket status:', error.message);
    throw new Error(`Failed to update Jira ticket: ${error.message}`);
  }
}

/**
 * Search for tickets in Jira
 * @param {string} jql - Jira Query Language string
 * @returns {Promise<Array>} - Array of matching issues
 */
export async function searchJiraTickets(jql) {
  try {
    const response = await jiraClient.get('/search', {
      params: {
        jql: jql || `project = ${JIRA_PROJECT_KEY}`,
        maxResults: 100,
      },
    });
    return response.data.issues;
  } catch (error) {
    console.error('Error searching Jira tickets:', error.message);
    throw new Error(`Failed to search Jira tickets: ${error.message}`);
  }
}

/**
 * Get all tickets from Jira for this project
 * @returns {Promise<Array>} - All project tickets
 */
export async function getAllJiraTickets() {
  try {
    return await searchJiraTickets(`project = ${JIRA_PROJECT_KEY}`);
  } catch (error) {
    console.error('Error fetching all Jira tickets:', error.message);
    throw new Error(`Failed to fetch Jira tickets: ${error.message}`);
  }
}
