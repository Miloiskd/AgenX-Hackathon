import { useState, useEffect } from 'react';
import { getTickets, assignTeamApi, generateDiagramApi } from '../services/api';
import { DiagramViewer } from '../components/DiagramViewer';

export function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigning, setAssigning] = useState({});

  // Modal state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [possibleCause, setPossibleCause] = useState('');
  const [diagramData, setDiagramData] = useState(null);
  const [generatingDiagram, setGeneratingDiagram] = useState(false);
  const [diagramError, setDiagramError] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeam = async (e, ticket) => {
    e.stopPropagation();
    setAssigning((prev) => ({ ...prev, [ticket.id]: true }));
    setError(null);
    try {
      await assignTeamApi(ticket.id, ticket.category, ticket.priority, ticket.summary);
      await fetchTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigning((prev) => ({ ...prev, [ticket.id]: false }));
    }
  };

  const handleOpenModal = (ticket) => {
    setSelectedTicket(ticket);
    setPossibleCause(ticket.description || ticket.summary || '');
    setDiagramData(null);
    setDiagramError(null);
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
    setDiagramData(null);
    setDiagramError(null);
  };

  const handleGenerateDiagram = async () => {
    if (!selectedTicket) return;
    setGeneratingDiagram(true);
    setDiagramError(null);
    setDiagramData(null);
    try {
      const result = await generateDiagramApi(
        selectedTicket.category,
        selectedTicket.priority,
        selectedTicket.summary,
        possibleCause.trim() || selectedTicket.summary
      );
      setDiagramData(result);
    } catch (err) {
      setDiagramError(err.message);
    } finally {
      setGeneratingDiagram(false);
    }
  };

  if (loading) {
    return <div className="page-container"><p>Loading tickets...</p></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Tickets</h2>
        <button onClick={fetchTickets} className="refresh-button">Refresh</button>
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
            <div
              key={ticket.id}
              className="ticket-card ticket-card--clickable"
              onClick={() => handleOpenModal(ticket)}
            >
              <div className="ticket-header">
                <h3>{ticket.summary || `Ticket ${ticket.id}`}</h3>
                <span className={`status-badge status-${ticket.status?.toLowerCase() || 'unknown'}`}>
                  {ticket.status || 'Unknown'}
                </span>
              </div>
              <div className="ticket-body">
                <p><strong>ID:</strong> {ticket.id}</p>
                <p><strong>Category:</strong> {ticket.category || 'N/A'}</p>
                <p>
                  <strong>Priority:</strong>{' '}
                  <span className={`priority-badge priority-${ticket.priority?.toLowerCase() || 'low'}`}>
                    {ticket.priority || 'N/A'}
                  </span>
                </p>
                {ticket.assignedTeam && (
                  <p>
                    <strong>Assigned Team:</strong>{' '}
                    {Array.isArray(ticket.assignedTeam)
                      ? ticket.assignedTeam.join(', ')
                      : ticket.assignedTeam}
                  </p>
                )}
              </div>
              <div className="ticket-card-footer">
                <button
                  className="assign-button"
                  onClick={(e) => handleAssignTeam(e, ticket)}
                  disabled={assigning[ticket.id]}
                >
                  {assigning[ticket.id] ? (
                    <span className="button-loading">
                      <span className="spinner" /> Assigning...
                    </span>
                  ) : (
                    'Assign Team'
                  )}
                </button>
                <span className="ticket-click-hint">Click to view details &amp; diagram</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <h3 className="modal-title">{selectedTicket.summary || `Ticket ${selectedTicket.id}`}</h3>
              <button className="modal-close-btn" onClick={handleCloseModal} aria-label="Close">✕</button>
            </div>

            {/* Ticket Characteristics */}
            <div className="modal-section">
              <h4 className="modal-section-title">Ticket Details</h4>
              <div className="selected-ticket-detail">
                <div className="detail-row">
                  <span className="detail-label">ID</span>
                  <span className="detail-value">{selectedTicket.id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className={`status-badge status-${selectedTicket.status?.toLowerCase() || 'unknown'}`}>
                    {selectedTicket.status || 'Unknown'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{selectedTicket.category || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Priority</span>
                  <span className={`priority-badge priority-${selectedTicket.priority?.toLowerCase() || 'low'}`}>
                    {selectedTicket.priority || 'N/A'}
                  </span>
                </div>
                {selectedTicket.assignedTeam && (
                  <div className="detail-row">
                    <span className="detail-label">Team</span>
                    <span className="detail-value">
                      {Array.isArray(selectedTicket.assignedTeam)
                        ? selectedTicket.assignedTeam.join(', ')
                        : selectedTicket.assignedTeam}
                    </span>
                  </div>
                )}
                {selectedTicket.description && (
                  <div className="detail-row detail-row--block">
                    <span className="detail-label">Description</span>
                    <span className="detail-description">{selectedTicket.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Diagram Generation */}
            <div className="modal-section">
              <h4 className="modal-section-title">System Diagram</h4>
              <div className="form-group">
                <label>Possible Cause</label>
                <textarea
                  rows={3}
                  value={possibleCause}
                  onChange={(e) => setPossibleCause(e.target.value)}
                  placeholder="Describe the possible cause (e.g. External API not responding)"
                  disabled={generatingDiagram}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid var(--border)',
                    borderRadius: '6px',
                    fontFamily: 'var(--sans)',
                    fontSize: '14px',
                    color: 'var(--text-h)',
                    background: 'var(--bg)',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                className="diagram-generate-btn"
                onClick={handleGenerateDiagram}
                disabled={generatingDiagram || !possibleCause.trim()}
              >
                {generatingDiagram ? (
                  <span className="button-loading">
                    <span className="spinner" /> Generating diagram...
                  </span>
                ) : (
                  'Generate System Diagram'
                )}
              </button>

              {diagramError && (
                <div className="alert alert-error" style={{ marginTop: '12px' }}>
                  <strong>Error:</strong> {diagramError}
                </div>
              )}

              {diagramData && (
                <div className="diagram-result">
                  <p className="diagram-description-text">{diagramData.diagram_description}</p>
                  <div className="diagram-svg-wrapper">
                    <DiagramViewer
                      category={selectedTicket.category}
                      diagramDescription={diagramData.diagram_description}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
