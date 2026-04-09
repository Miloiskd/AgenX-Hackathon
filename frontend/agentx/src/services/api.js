const API_BASE_URL = 'http://localhost:3000';

// ─── Helper ───────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('agenx_token');
}

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${getToken()}`,
    ...extra,
  };
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || `Error ${res.status}`);
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginApi = async (email, password) => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
};

export const registerApi = async (name, email, password) => {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(res);
};

// ─── Tickets ──────────────────────────────────────────────────────────────────

export const submitTicket = async (text, photo = null, logs = null) => {
  if (photo || logs) {
    const formData = new FormData();
    formData.append('text', text);
    if (photo) formData.append('photo', photo);
    if (logs)  formData.append('logs', logs);

    const res = await fetch(`${API_BASE_URL}/ingest`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    return handleResponse(res);
  }

  const res = await fetch(`${API_BASE_URL}/ingest`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text }),
  });
  return handleResponse(res);
};

export const getTickets = async () => {
  const res = await fetch(`${API_BASE_URL}/tickets`, {
    headers: authHeaders({ 'Content-Type': 'application/json' }),
  });
  const data = await handleResponse(res);
  return data.tickets || [];
};

export const generateDiagramApi = async (category, priority, summary, possible_cause) => {
  const res = await fetch(`${API_BASE_URL}/diagram`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ category, priority, summary, possible_cause }),
  });
  return handleResponse(res);
};

export const assignTeamApi = async (ticketId, category, priority, summary) => {
  const res = await fetch(`${API_BASE_URL}/assign`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ticketId, category, priority, summary }),
  });
  return handleResponse(res);
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const getAdminUsers = async (token) => {
  const res = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await handleResponse(res);
  return data.users || [];
};

export const createAdminUser = async (token, { name, email, password }) => {
  const res = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(res);
};

export const updateAdminUser = async (token, id, { name, email }) => {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email }),
  });
  return handleResponse(res);
};

export const deleteAdminUser = async (token, id) => {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return handleResponse(res);
};

// ─── Admin: Engineers ─────────────────────────────────────────────────────────

export const getAdminEngineers = async (token) => {
  const res = await fetch(`${API_BASE_URL}/admin/engineers`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await handleResponse(res);
  return { engineers: data.engineers || [], availableSkills: data.availableSkills || [] };
};

export const createAdminEngineer = async (token, body) => {
  const res = await fetch(`${API_BASE_URL}/admin/engineers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
};

export const updateAdminEngineer = async (token, id, body) => {
  const res = await fetch(`${API_BASE_URL}/admin/engineers/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
};

export const deleteAdminEngineer = async (token, id) => {
  const res = await fetch(`${API_BASE_URL}/admin/engineers/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return handleResponse(res);
};

// ─── Saleor Enrichment ────────────────────────────────────────────────────────

export const saleorEnrichApi = async (incidentText, category, priority, summary) => {
  const res = await fetch(`${API_BASE_URL}/saleor/enrich`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ incidentText, category, priority, summary }),
  });
  return handleResponse(res);
};