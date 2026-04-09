import React, { useState } from 'react';
import { AgentMarshallPipeline } from '../components/AgentMarshallPipeline';
import './ResolutionWorkflow.css';

export function ResolutionWorkflow({ ticket, onClose }) {
  const [isResolving, setIsResolving] = useState(false);
  const [resolution, setResolution] = useState(null);

  const handleStartResolution = async () => {
    setIsResolving(true);
    
    try {
      // Call backend to resolve the ticket with Saleor context
      const response = await fetch(`/api/tickets/${ticket.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeContext: true
        })
      });

      const data = await response.json();
      
      // Simulate agent working time (the actual pipeline handles the timing)
      setTimeout(() => {
        setResolution(data);
      }, 12600); // 7 stages × 1800ms
      
    } catch (err) {
      console.error('Resolution error:', err);
      setIsResolving(false);
    }
  };

  return (
    <div className="resolution-workflow">
      <div className="workflow-header">
        <h2>🤖 AI-Assisted Resolution</h2>
        <p>Agent Marshall will analyze and resolve your ticket with Saleor code context</p>
      </div>

      <div className="workflow-ticket-info">
        <div className="ticket-summary">
          <h3>{ticket.summary}</h3>
          <p className="ticket-category">
            <span className="badge-category">{ticket.category}</span>
            <span className="badge-priority">{ticket.priority}</span>
          </p>
        </div>

        {ticket.saleorCodeContext && (
          <div className="saleor-info">
            <span className="info-item">
              🛒 <strong>{ticket.saleorCodeContext.codeSnippets?.length || 0}</strong> code snippets
            </span>
            <span className="info-item">
              📦 <strong>{new Set(ticket.saleorCodeContext.codeSnippets?.map(s => s.file.split('/')[2])).size}</strong> modules
            </span>
          </div>
        )}
      </div>

      {!isResolving && !resolution && (
        <div className="workflow-action">
          <button className="btn-resolve" onClick={handleStartResolution}>
            🚀 Let Agent Marshall Resolve This
          </button>
          <p className="action-hint">
            The agent will analyze your issue using the actual Saleor codebase as reference
          </p>
        </div>
      )}

      {isResolving && (
        <AgentMarshallPipeline 
          saleorContext={ticket.saleorCodeContext}
          analysis={{
            category: ticket.category,
            priority: ticket.priority,
            root_cause: ticket.root_cause,
            solution: ticket.solution
          }}
        />
      )}

      {resolution && (
        <div className="resolution-result">
          <div className="result-header">
            <h3>✅ Resolution Complete</h3>
            <p>Agent Marshall has prepared the following resolution</p>
          </div>

          <div className="result-sections">
            {resolution.root_cause && (
              <div className="result-section">
                <h4>🔍 Root Cause Identified</h4>
                <p>{resolution.root_cause}</p>
              </div>
            )}

            {resolution.affected_component && (
              <div className="result-section">
                <h4>📦 Affected Component</h4>
                <p>{resolution.affected_component}</p>
              </div>
            )}

            {resolution.solution && (
              <div className="result-section">
                <h4>⚡ Solution</h4>
                <p>{resolution.solution}</p>
              </div>
            )}

            {resolution.action && (
              <div className="result-section">
                <h4>🎯 Recommended Action</h4>
                <p>{resolution.action}</p>
              </div>
            )}
          </div>

          <div className="result-actions">
            <button className="btn-secondary" onClick={onClose}>
              Back to Dashboard
            </button>
            <button className="btn-primary" onClick={() => {
              // Here you could implement the actual auto-fix
              console.log('Applying fix...');
              onClose();
            }}>
              ✅ Apply Resolution
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
