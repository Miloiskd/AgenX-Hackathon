const API_BASE_URL = 'http://localhost:3000';

// Upload/Ingest data with optional files
export const submitTicket = async (text, photo = null, logs = null) => {
  try {
    // If we have files, use FormData; otherwise use JSON
    if (photo || logs) {
      const formData = new FormData();
      formData.append('text', text);
      if (photo) {
        formData.append('photo', photo);
      }
      if (logs) {
        formData.append('logs', logs);
      }

      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it correctly for multipart/form-data
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      return await response.json();
    } else {
      // Use JSON for text-only requests
      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      return await response.json();
    }
  } catch (error) {
    throw new Error(`Failed to submit ticket: ${error.message}`);
  }
};

// Get all tickets
export const getTickets = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    // Backend returns { success, count, tickets: [...] }
    return data.tickets || [];
  } catch (error) {
    throw new Error(`Failed to fetch tickets: ${error.message}`);
  }
};

// Generate system diagram prompt for an incident
export const generateDiagramApi = async (category, priority, summary, possible_cause) => {
  try {
    const response = await fetch(`${API_BASE_URL}/diagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, priority, summary, possible_cause }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to generate diagram: ${error.message}`);
  }
};

// Assign team to a ticket
export const assignTeamApi = async (ticketId, category, priority, summary) => {
  try {
    const response = await fetch(`${API_BASE_URL}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticketId, category, priority, summary }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to assign team: ${error.message}`);
  }
};
