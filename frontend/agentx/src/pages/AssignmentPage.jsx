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
        const list = Array.isArray(data.tickets) ? data.tickets : [data.tickets];
        setTickets(list);
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
      setTickets(Array.isArray(updated.tickets) ? updated.tickets : [updated.tickets]);
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
        <h2>Asignación de Equipos</h2>
      </div>

      <p className="assignment-subtitle">
        Selecciona un ticket y deja que el agente de IA asigne automáticamente el equipo más adecuado según la categoría, prioridad y habilidades disponibles.
      </p>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="assignment-layout">
        {/* Ticket selector */}
        <div className="assignment-selector-card">
          <h3>Seleccionar Ticket</h3>

          {loadingTickets ? (
            <p className="no-data">Cargando tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="no-data">No hay tickets disponibles.</p>
          ) : (
            <div className="form-group">
              <label htmlFor="ticket-select">Ticket de error</label>
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
                <option value="">-- Selecciona un ticket --</option>
                {tickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} · {t.category || 'N/A'} · {t.priority || 'N/A'} · {t.summary || t.description?.slice(0, 50) || 'Sin descripción'}
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
                <span className="detail-label">Categoría</span>
                <span className="detail-value">{selectedTicket.category || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Prioridad</span>
                <span className={`priority-badge ${priorityClass(selectedTicket.priority)}`}>
                  {selectedTicket.priority || 'N/A'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Estado</span>
                <span className={`status-badge status-${selectedTicket.status?.toLowerCase() || 'unknown'}`}>
                  {selectedTicket.status || 'Unknown'}
                </span>
              </div>
              {selectedTicket.summary && (
                <div className="detail-row detail-row--block">
                  <span className="detail-label">Resumen</span>
                  <span className="detail-value">{selectedTicket.summary}</span>
                </div>
              )}
              {selectedTicket.description && (
                <div className="detail-row detail-row--block">
                  <span className="detail-label">Descripción</span>
                  <span className="detail-value detail-description">{selectedTicket.description}</span>
                </div>
              )}
              {selectedTicket.assignedTeam && (
                <div className="detail-row detail-row--block">
                  <span className="detail-label">Equipo actual</span>
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
                <span className="spinner" /> Ejecutando agente...
              </span>
            ) : (
              'Asignar Equipo con Agente IA'
            )}
          </button>
        </div>

        {/* Result panel */}
        <div className="assignment-result-card">
          <h3>Resultado del Agente</h3>

          {!result && !assigning && (
            <div className="result-placeholder">
              <div className="result-placeholder-icon">🤖</div>
              <p>El agente analizará las habilidades del equipo y seleccionará las personas más adecuadas para resolver el incidente.</p>
            </div>
          )}

          {assigning && (
            <div className="result-loading">
              <div className="agent-thinking">
                <div className="pulse-dot" />
                <div className="pulse-dot" />
                <div className="pulse-dot" />
              </div>
              <p>El agente está evaluando candidatos...</p>
            </div>
          )}

          {result && (
            <div className="result-content">
              <div className="result-team-section">
                <h4>Equipo Asignado</h4>
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
                    <strong>Tamaño del equipo:</strong> {result.teamSize || result.team?.length}
                  </span>
                  {result.candidatesEvaluated !== undefined && (
                    <span className="result-meta-item">
                      <strong>Candidatos evaluados:</strong> {result.candidatesEvaluated}
                    </span>
                  )}
                </div>
              </div>

              {result.reason && (
                <div className="result-reason">
                  <h4>Razonamiento del Agente</h4>
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
