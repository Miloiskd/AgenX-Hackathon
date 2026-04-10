import { useState, useEffect } from 'react';
import { getTickets, assignTeamApi } from '../services/api';

export function AssignmentPage() {
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoadingTickets(true);
      try {
        const data = await getTickets();
        setTickets(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingTickets(false);
      }
    };
    fetchTickets();
  }, []);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  const handleAssign = async () => {
    if (!selectedTicket) return;
    setAssigning(true);
    setResult(null);
    setError(null);
    try {
      const data = await assignTeamApi(
        selectedTicket.id,
        selectedTicket.category,
        selectedTicket.priority,
        selectedTicket.summary
      );
      setResult(data);
      // Refresh ticket list so assignedTeam is updated
      const updated = await getTickets();
      setTickets(Array.isArray(updated) ? updated : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const priorityClass = (p) => {
    if (!p) return '';
    return `priority-${p.toLowerCase()}`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Team Assignment</h2>
      </div>

      <p className="assignment-subtitle">
        Select a ticket and let the AI agent automatically assign the most suitable team based on category, priority, and available skills.
      </p>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="assignment-layout">
        {/* Ticket selector */}
        <div className="assignment-selector-card">
          <h3>Select Ticket</h3>

          {loadingTickets ? (
            <p className="no-data">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="no-data">No tickets available.</p>
          ) : (
            <div className="form-group">
              <label htmlFor="ticket-select">Error ticket</label>
              <select
                id="ticket-select"
                className="ticket-select"
                value={selectedTicketId}
                onChange={(e) => {
                  setSelectedTicketId(e.target.value);
                  setResult(null);
                  setError(null);
                }}
              >
                <option value="">-- Select a ticket --</option>
                {tickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} · {t.category || 'N/A'} · {t.priority || 'N/A'} · {t.summary || t.description?.slice(0, 50) || 'No description'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selected ticket detail */}
          {selectedTicket && (
            <div className="selected-ticket-detail">
              <div className="detail-row">
                <span className="detail-label">ID</span>
                <span className="detail-value">{selectedTicket.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Category</span>
                <span className="detail-value">{selectedTicket.category || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Priority</span>
                <span className={`priority-badge ${priorityClass(selectedTicket.priority)}`}>
                  {selectedTicket.priority || 'N/A'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className={`status-badge status-${selectedTicket.status?.toLowerCase() || 'unknown'}`}>
                  {selectedTicket.status || 'Unknown'}
                </span>
              </div>
              {selectedTicket.summary && (
                <div className="detail-row detail-row--block">
                  <span className="detail-label">Summary</span>
                  <span className="detail-value">{selectedTicket.summary}</span>
                </div>
              )}
              {selectedTicket.description && (
                <div className="detail-row detail-row--block">
                  <span className="detail-label">Description</span>
                  <span className="detail-value detail-description">{selectedTicket.description}</span>
                </div>
              )}
              {selectedTicket.assignedTeam && (
                <div className="detail-row detail-row--block">
                  <span className="detail-label">Current team</span>
                  <span className="detail-value">
                    {Array.isArray(selectedTicket.assignedTeam)
                      ? selectedTicket.assignedTeam.join(', ')
                      : selectedTicket.assignedTeam}
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            className="assign-action-button"
            onClick={handleAssign}
            disabled={!selectedTicket || assigning}
          >
            {assigning ? (
              <span className="button-loading">
                <span className="spinner" /> Running agent...
              </span>
            ) : (
              'Assign Team with AI Agent'
            )}
          </button>
        </div>

        {/* Result panel */}
        <div className="assignment-result-card">
          <h3>Agent Result</h3>

          {!result && !assigning && (
            <div className="result-placeholder">
              <div className="result-placeholder-icon">🤖</div>
              <p>The agent will analyze team skills and select the most suitable people to resolve the incident.</p>
            </div>
          )}

          {assigning && (
            <div className="result-loading">
              <div className="agent-thinking">
                <div className="pulse-dot" />
                <div className="pulse-dot" />
                <div className="pulse-dot" />
              </div>
              <p>The agent is evaluating candidates...</p>
            </div>
          )}

          {result && (
            <div className="result-content">
              <div className="result-team-section">
                <h4>Assigned Team</h4>
                <ul className="team-list">
                  {(result.team || []).map((member, i) => (
                    <li key={i} className="team-member">
                      <span className="member-avatar">{member.charAt(0).toUpperCase()}</span>
                      <span className="member-name">{member}</span>
                    </li>
                  ))}
                </ul>
                <div className="result-meta">
                  <span className="result-meta-item">
                    <strong>Team size:</strong> {result.teamSize || result.team?.length}
                  </span>
                  {result.candidatesEvaluated !== undefined && (
                    <span className="result-meta-item">
                      <strong>Evaluated candidates:</strong> {result.candidatesEvaluated}
                    </span>
                  )}
                </div>
              </div>

              {result.reason && (
                <div className="result-reason">
                  <h4>Agent Reasoning</h4>
                  <p>{result.reason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
