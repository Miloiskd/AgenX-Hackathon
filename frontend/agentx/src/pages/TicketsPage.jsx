import { useState, useEffect } from 'react';
import {
  getTickets,
  assignTeamApi,
  generateDiagramApi,
  getTicketLogsApi,
  resolveTicketAiApi,
  updateTicketStatusApi,
} from '../services/api';
import { DiagramViewer } from '../components/DiagramViewer';
import { AgentMarshallPipeline } from '../components/AgentMarshallPipeline';

export function TicketsPage({ onViewTicket = null, onResolveTicket = null }) {
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

  // Observability state
  const [logsData, setLogsData] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [resolveData, setResolveData] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState(null);
  const [confirmedStatus, setConfirmedStatus] = useState(null); // 'resolved' | 'unresolved' | null
  const [showAgentMarshall, setShowAgentMarshall] = useState(false); // Show Agent Marshall pipeline

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

  const handleOpenModal = async (ticket) => {
    setSelectedTicket(ticket);
    setPossibleCause(ticket.description || ticket.summary || '');
    setDiagramData(null);
    setDiagramError(null);
    setResolveData(null);
    setResolveError(null);
    setConfirmedStatus(ticket.resolutionStatus === 'RESOLVED' ? 'resolved' : ticket.resolutionStatus === 'UNRESOLVED' ? 'unresolved' : null);

    // Auto-load logs
    setLogsData(null);
    setLogsLoading(true);
    try {
      const data = await getTicketLogsApi(ticket.id);
      setLogsData(data.logs);
    } catch {
      setLogsData(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
    setDiagramData(null);
    setDiagramError(null);
    setLogsData(null);
    setResolveData(null);
    setResolveError(null);
    setConfirmedStatus(null);
    setShowAgentMarshall(false);
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

  const handleResolve = async () => {
    if (!selectedTicket) return;
    setShowAgentMarshall(true);
    setResolving(true);
    setResolveError(null);
    setResolveData(null);
    try {
      const result = await resolveTicketAiApi(selectedTicket.id);
      setResolveData(result);
    } catch (err) {
      setResolveError(err.message);
    } finally {
      setResolving(false);
    }
  };

  const handleConfirmStatus = async (resolved) => {
    if (!selectedTicket) return;
    try {
      await updateTicketStatusApi(selectedTicket.id, resolved);
      const status = resolved ? 'resolved' : 'unresolved';
      setConfirmedStatus(status);
      // Update the ticket in the list without refetching
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? { ...t, resolutionStatus: resolved ? 'RESOLVED' : 'UNRESOLVED' }
            : t
        )
      );
    } catch (err) {
      setResolveError(err.message);
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
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {ticket.resolutionStatus === 'RESOLVED' && (
                    <span className="resolution-badge resolution-badge--resolved">Resolved</span>
                  )}
                  {ticket.resolutionStatus === 'UNRESOLVED' && (
                    <span className="resolution-badge resolution-badge--unresolved">Unresolved</span>
                  )}
                  <span className={`status-badge status-${ticket.status?.toLowerCase() || 'unknown'}`}>
                    {ticket.status || 'Unknown'}
                  </span>
                </div>
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

            {/* ── Observability: Logs ── */}
            <div className="modal-section">
              <h4 className="modal-section-title">System Logs</h4>
              {logsLoading ? (
                <div className="obs-loading">
                  <span className="spinner" /> Loading logs...
                </div>
              ) : logsData ? (
                <pre className="obs-logs">{logsData}</pre>
              ) : (
                <p className="obs-empty">No logs available for this ticket.</p>
              )}
            </div>

            {/* ── Observability: Resolve ── */}
            <div className="modal-section">
              <h4 className="modal-section-title">AI-Assisted Resolution</h4>

              {confirmedStatus === 'resolved' && (
                <div className="obs-status-banner obs-status-banner--resolved">
                  Ticket marked as <strong>RESOLVED</strong>
                </div>
              )}
              {confirmedStatus === 'unresolved' && (
                <div className="obs-status-banner obs-status-banner--unresolved">
                  Ticket marked as <strong>NOT RESOLVED</strong> — escalation recommended
                </div>
              )}

              {!confirmedStatus && (
                <button
                  className="obs-resolve-btn"
                  onClick={handleResolve}
                  disabled={resolving}
                >
                  {resolving ? (
                    <span className="button-loading">
                      <span className="spinner" /> Analyzing &amp; resolving...
                    </span>
                  ) : (
                    'Resolve issue'
                  )}
                </button>
              )}

              {resolveError && (
                <div className="alert alert-error" style={{ marginTop: '12px' }}>
                  <strong>Error:</strong> {resolveError}
                </div>
              )}

              {showAgentMarshall && (
                <AgentMarshallPipeline
                  saleorContext={selectedTicket.saleorCodeContext}
                  analysis={{
                    category: selectedTicket.category,
                    priority: selectedTicket.priority,
                    root_cause: resolveData?.root_cause,
                    solution: resolveData?.solution
                  }}
                  onComplete={() => setShowAgentMarshall(false)}
                />
              )}

              {resolveData && !confirmedStatus && !showAgentMarshall && (
                <div className="obs-result">
                  {/* Root cause */}
                  <div className="obs-result-card">
                    <p className="obs-result-label">Root Cause</p>
                    <p className="obs-result-text">{resolveData.root_cause}</p>
                  </div>

                  {/* Solution */}
                  <div className="obs-result-card">
                    <p className="obs-result-label">Proposed Solution</p>
                    <p className="obs-result-text">{resolveData.solution}</p>
                  </div>

                  {/* Action taken */}
                  <div className="obs-result-card">
                    <p className="obs-result-label">Action Executed</p>
                    <div className="obs-action-row">
                      <span className={`obs-action-badge obs-action-badge--${resolveData.action_taken?.action || 'none'}`}>
                        {resolveData.action_taken?.action || 'none'}
                      </span>
                      <span className="obs-action-message">{resolveData.action_taken?.message}</span>
                    </div>
                  </div>

                  {/* Validation */}
                  <div className={`obs-validation ${resolveData.validation?.resolved ? 'obs-validation--pass' : 'obs-validation--fail'}`}>
                    <span className="obs-validation-icon">
                      {resolveData.validation?.resolved ? '✓' : '✗'}
                    </span>
                    <span>{resolveData.validation?.message}</span>
                  </div>

                  {/* User confirmation */}
                  <div className="obs-confirm">
                    <p className="obs-confirm-label">Was the issue resolved?</p>
                    <div className="obs-confirm-actions">
                      <button
                        className="obs-confirm-btn obs-confirm-btn--yes"
                        onClick={() => handleConfirmStatus(true)}
                      >
                        Yes, it's resolved
                      </button>
                      <button
                        className="obs-confirm-btn obs-confirm-btn--no"
                        onClick={() => handleConfirmStatus(false)}
                      >
                        No, escalate
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
