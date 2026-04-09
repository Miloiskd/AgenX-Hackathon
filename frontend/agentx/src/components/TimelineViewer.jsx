import React, { useState, useEffect } from 'react';
import './TimelineViewer.css';

export function TimelineViewer({ ticketId }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Poll ticket status every 2 seconds
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await fetch(`/api/tickets/${ticketId}`);
        if (!response.ok) throw new Error('Failed to fetch ticket');
        const data = await response.json();
        setTicket(data.ticket);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
    const interval = setInterval(fetchTicket, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [ticketId]);

  if (loading && !ticket) return <div className="timeline-loading">Loading ticket...</div>;
  if (error) return <div className="timeline-error">Error: {error}</div>;
  if (!ticket) return <div className="timeline-error">Ticket not found</div>;

  // Calculate phases based on ticket data
  const phases = [
    {
      id: 1,
      stage: 'Ticket Created',
      icon: '📝',
      status: 'completed',
      timestamp: ticket.created_at,
      description: `Issue reported: "${ticket.summary.substring(0, 50)}..."`,
      details: {
        'Reported By': ticket.reporter || 'Anonymous',
        'Category': ticket.category || 'Pending',
        'Priority': ticket.priority || 'Normal',
      },
    },
    {
      id: 2,
      stage: 'Saleor Context Extracted',
      icon: '🔍',
      status: ticket.saleorCodeContext ? 'completed' : 'pending',
      timestamp: ticket.triage_started_at,
      description: ticket.saleorCodeContext
        ? `Found ${ticket.saleorCodeContext.codeSnippets?.length || 0} code snippets`
        : 'Searching Saleor repository...',
      details: ticket.saleorCodeContext && {
        'Code Snippets': ticket.saleorCodeContext.codeSnippets?.length,
        'Components': ticket.saleorCodeContext.relevantComponents?.join(', '),
        'Modules': ticket.saleorCodeContext.codeSnippets?.map(s => s.file.split('/')[2]).filter(Boolean).join(', '),
      },
    },
    {
      id: 3,
      stage: 'Triage Analysis',
      icon: '🧠',
      status: ticket.category ? 'completed' : 'pending',
      timestamp: ticket.triage_completed_at,
      description: `Classified as: ${ticket.category || 'analyzing...'}`,
      details: {
        'Classification': ticket.category || 'In Progress',
        'Affected Component': ticket.affected_component || 'Unknown',
      },
    },
    {
      id: 4,
      stage: 'Logs Analyzed',
      icon: '📊',
      status: ticket.root_cause ? 'completed' : ticket.status === 'analyzing' ? 'in-progress' : 'pending',
      timestamp: ticket.analysis_started_at,
      description: ticket.root_cause
        ? `Root cause: "${ticket.root_cause.substring(0, 50)}..."`
        : ticket.status === 'analyzing'
        ? 'Analyzing logs with Saleor code context...'
        : 'Waiting for logs...',
      details: ticket.root_cause && {
        'Root Cause': ticket.root_cause,
        'Affected Component': ticket.affected_component,
        'Confidence': ticket.confidence ? `${(ticket.confidence * 100).toFixed(0)}%` : 'N/A',
      },
    },
    {
      id: 5,
      stage: 'Fix Suggested',
      icon: '💡',
      status: ticket.solution ? 'completed' : 'pending',
      timestamp: ticket.solution_timestamp,
      description: ticket.solution
        ? `Solution: "${ticket.solution.substring(0, 50)}..."`
        : 'Generating solution...',
      details: ticket.solution && {
        'Solution': ticket.solution,
        'Action': ticket.action,
        'Auto-Fix Available': ticket.auto_fix ? 'Yes ✓' : 'No',
      },
    },
    {
      id: 6,
      stage: 'Auto-Fix',
      icon: ticket.auto_fix ? '⚡' : '👤',
      status: ticket.auto_fix ? 'completed' : ticket.action === 'none' ? 'skipped' : 'pending',
      timestamp: ticket.fixed_at,
      description: ticket.auto_fix
        ? `${ticket.action} executed (${ticket.affected_count || '?'} items)`
        : ticket.action === 'none'
        ? 'Manual fix required'
        : 'Waiting for execution...',
      progress: ticket.fix_progress,
      details: ticket.auto_fix && {
        'Action Type': ticket.action,
        'Items Affected': ticket.affected_count,
        'Success Rate': ticket.success_rate ? `${(ticket.success_rate * 100).toFixed(0)}%` : 'N/A',
      },
    },
    {
      id: 7,
      stage: 'Resolved',
      icon: ticket.status === 'resolved' ? '✅' : '⏳',
      status: ticket.status === 'resolved' ? 'completed' : 'pending',
      timestamp: ticket.resolved_at,
      description: ticket.status === 'resolved' ? 'Ticket closed ✓' : 'Waiting for verification...',
      details: ticket.status === 'resolved' && {
        'Resolution Time': calculateTimeDiff(ticket.created_at, ticket.resolved_at),
        'Resolution': 'Auto-resolved',
        'Status': 'Closed',
      },
    },
  ];

  const completedPhases = phases.filter(p => p.status === 'completed').length;
  const totalPhases = phases.length;

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div className="header-left">
          <h2>🎯 Ticket Resolution Timeline</h2>
          <p className="timeline-id">Ticket: {ticketId}</p>
        </div>
        <div className="header-right">
          <div className={`status-badge ${ticket.status}`}>
            {ticket.status?.toUpperCase() || 'PROCESSING'}
          </div>
          <div className="progress-mini">
            {completedPhases}/{totalPhases} Complete
          </div>
        </div>
      </div>

      <div className="timeline-progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${(completedPhases / totalPhases) * 100}%` }}
        ></div>
      </div>

      <div className="phases-container">
        {phases.map((phase, idx) => (
          <div key={phase.id} className={`phase-wrapper`}>
            <div className={`phase ${phase.status}`}>
              <div className="phase-marker">
                <div className="phase-icon">{phase.icon}</div>
                {idx < phases.length - 1 && (
                  <div className={`phase-connector ${phase.status}`}></div>
                )}
              </div>

              <div className="phase-content">
                <div className="phase-header">
                  <h3>{phase.stage}</h3>
                  <span className={`phase-status-badge ${phase.status}`}>
                    {phase.status === 'completed' && '✓ Completed'}
                    {phase.status === 'in-progress' && '⏳ In Progress'}
                    {phase.status === 'pending' && '◦ Pending'}
                    {phase.status === 'skipped' && '⊘ Skipped'}
                  </span>
                </div>

                <p className="phase-description">{phase.description}</p>

                {phase.progress && (
                  <div className="phase-progress">
                    <div className="progress-bar-small">
                      <div 
                        className="progress-fill-small" 
                        style={{ width: `${phase.progress}%` }}
                      ></div>
                    </div>
                    <span className="progress-percent">{phase.progress}%</span>
                  </div>
                )}

                {phase.timestamp && (
                  <span className="phase-timestamp">
                    {new Date(phase.timestamp).toLocaleTimeString()}
                  </span>
                )}

                {phase.details && Object.keys(phase.details).length > 0 && (
                  <div className="phase-details">
                    {Object.entries(phase.details).map(([key, value]) =>
                      value ? (
                        <div key={key} className="detail-row">
                          <span className="detail-key">{key}:</span>
                          <span className="detail-value">{value}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {ticket.status === 'resolved' && (
        <div className="timeline-summary">
          <div className="summary-title">📊 Resolution Summary</div>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total Time:</span>
              <span className="summary-value">
                {calculateTimeDiff(ticket.created_at, ticket.resolved_at)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Agents Used:</span>
              <span className="summary-value">
                {(ticket.saleorCodeContext ? 1 : 0) +
                  (ticket.category ? 1 : 0) +
                  (ticket.root_cause ? 1 : 0)} / 3
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Auto-Fixed:</span>
              <span className="summary-value">{ticket.auto_fix ? 'Yes ⚡' : 'No'}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Success Rate:</span>
              <span className="summary-value">
                {ticket.success_rate ? `${(ticket.success_rate * 100).toFixed(0)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {ticket.status !== 'resolved' && (
        <div className="timeline-status-info">
          <span className="info-icon">ℹ️</span>
          <span>Updating in real-time... Ticket will be resolved soon.</span>
        </div>
      )}
    </div>
  );
}

function calculateTimeDiff(startTime, endTime) {
  if (!startTime || !endTime) return 'N/A';
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diff = Math.floor((end - start) / 1000);

  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default TimelineViewer;
