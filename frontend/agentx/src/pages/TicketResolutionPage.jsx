import React from 'react';
import { TimelineViewer } from '../components/TimelineViewer';
import './TicketResolutionPage.css';

export function TicketResolutionPage({ ticketId, onClose }) {
  return (
    <div className="ticket-resolution-page">
      <div className="resolution-container">
        <div className="resolution-nav">
          <button className="nav-back" onClick={onClose}>
            ← Back Home
          </button>
        </div>

        <TimelineViewer ticketId={ticketId} />

        <div className="resolution-footer">
          <div className="footer-content">
            <h3>🎯 What Happened Here?</h3>
            <ul>
              <li>
                <strong>Triage Agent</strong> - Automatically extracted Saleor code context from your issue description
              </li>
              <li>
                <strong>Observability Agent</strong> - Analyzed system logs using the actual code as reference
              </li>
              <li>
                <strong>Auto-Fix System</strong> - Executed the recommended fix automatically when possible
              </li>
              <li>
                <strong>Timeline View</strong> - Shows you exactly what the system did, step by step
              </li>
            </ul>

            <h3>📝 How to Write Better Issues</h3>
            <p>
              The system extracted Saleor code because you mentioned specific keywords like "payment", "timeout", 
              "checkout". Be specific about:
            </p>
            <ul>
              <li>What Saleor module is affected (payment, inventory, products, orders, etc.)</li>
              <li>What error you're seeing</li>
              <li>When it started</li>
              <li>How many users/orders are impacted</li>
            </ul>

            <div className="footer-actions">
              <button className="action-button secondary" onClick={onClose}>
                Report Another Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketResolutionPage;
