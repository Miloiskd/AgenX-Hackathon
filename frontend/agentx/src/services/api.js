const API_BASE_URL = 'http://localhost:3000';

// Upload/Ingest data
export const submitTicket = async (text) => {
  try {
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

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch tickets: ${error.message}`);
  }
};
