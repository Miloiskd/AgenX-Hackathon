import { useState, useEffect } from 'react';
import { getTickets, assignTeamApi } from '../services/api';

export function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigning, setAssigning] = useState({});

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getTickets();
        setTickets(Array.isArray(data.tickets) ? data.tickets : [data.tickets]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getTickets();
      setTickets(Array.isArray(data.tickets) ? data.tickets : [data.tickets]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeam = async (ticket) => {
    setAssigning((prev) => ({ ...prev, [ticket.id]: true }));
    setError(null);
    try {
      await assignTeamApi(ticket.id, ticket.category, ticket.priority, ticket.summary);
      await handleRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigning((prev) => ({ ...prev, [ticket.id]: false }));
    }
  };

  if (loading) {
    return <div className="page-container"><p>Loading tickets...</p></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Tickets</h2>
        <button onClick={handleRefresh} className="refresh-button">
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {tickets.length === 0 ? (
        <p className="no-data">No tickets found.</p>
      ) : (
        <div className="tickets-list">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="ticket-card">
              <div className="ticket-header">
                <h3>Ticket #{ticket.id}</h3>
                <span className={`status-badge status-${ticket.status?.toLowerCase() || 'unknown'}`}>
                  {ticket.status || 'Unknown'}
                </span>
              </div>
              <div className="ticket-body">
                <p><strong>Category:</strong> {ticket.category || 'N/A'}</p>
                <p><strong>Priority:</strong> {ticket.priority || 'N/A'}</p>
                <p><strong>Status:</strong> {ticket.status || 'N/A'}</p>
                {ticket.description && (
                  <p><strong>Description:</strong> {ticket.description}</p>
                )}
                {ticket.assignedTeam && (
                  <p><strong>Assigned Team:</strong> {Array.isArray(ticket.assignedTeam) ? ticket.assignedTeam.join(', ') : ticket.assignedTeam}</p>
                )}
              </div>
              <div className="ticket-actions" style={{ marginTop: '1rem' }}>
                <button
                  onClick={() => handleAssignTeam(ticket)}
                  disabled={assigning[ticket.id]}
                  className="assign-button"
                  style={{ padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: assigning[ticket.id] ? 'not-allowed' : 'pointer' }}
                >
                  {assigning[ticket.id] ? 'Assigning...' : 'Assign Team'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
