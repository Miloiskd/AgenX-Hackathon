import { useState, useEffect } from 'react';
import { getTickets } from '../services/api';

export function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getTickets();
        setTickets(Array.isArray(data) ? data : [data]);
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
      setTickets(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
