import { useState, useEffect } from 'react';
import { getTickets } from '../services/api';

export function DashboardPage() {
  const [metrics, setMetrics] = useState({
    total: 0,
    open: 0,
    closed: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getTickets();
        const ticketList = Array.isArray(data) ? data : [];

        const isOpen = (t) => {
          if (t.resolutionStatus === 'RESOLVED') return false;
          const s = t.status?.toLowerCase() || '';
          return !['done', 'closed', 'resolved'].includes(s);
        };
        const isClosed = (t) => {
          if (t.resolutionStatus === 'RESOLVED') return true;
          const s = t.status?.toLowerCase() || '';
          return ['done', 'closed', 'resolved'].includes(s);
        };
        const isHigh = (p) => {
          const prio = p?.toLowerCase() || '';
          return ['highest', 'high', 'critical', 'blocker'].includes(prio);
        };
        const isMedium = (p) => {
          const prio = p?.toLowerCase() || '';
          return ['medium', 'major', 'normal', 'default'].includes(prio);
        };
        const isLow = (p) => {
          const prio = p?.toLowerCase() || '';
          return ['low', 'lowest', 'minor', 'trivial'].includes(prio);
        };

        const newMetrics = {
          total: ticketList.length,
          open: ticketList.filter((t) => isOpen(t)).length,
          closed: ticketList.filter((t) => isClosed(t)).length,
          high: ticketList.filter((t) => isHigh(t.priority)).length,
          medium: ticketList.filter((t) => isMedium(t.priority)).length,
          low: ticketList.filter((t) => isLow(t.priority)).length,
        };

        setMetrics(newMetrics);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return <div className="page-container"><p>Loading dashboard...</p></div>;
  }

  return (
    <div className="page-container">
      <h2>Dashboard</h2>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Tickets</h3>
          <div className="metric-value">{metrics.total}</div>
        </div>

        <div className="metric-card">
          <h3>Open</h3>
          <div className="metric-value open">{metrics.open}</div>
        </div>

        <div className="metric-card">
          <h3>Closed</h3>
          <div className="metric-value closed">{metrics.closed}</div>
        </div>

        <div className="metric-card">
          <h3>High Priority</h3>
          <div className="metric-value high">{metrics.high}</div>
        </div>

        <div className="metric-card">
          <h3>Medium Priority</h3>
          <div className="metric-value medium">{metrics.medium}</div>
        </div>

        <div className="metric-card">
          <h3>Low Priority</h3>
          <div className="metric-value low">{metrics.low}</div>
        </div>
      </div>

      <div className="dashboard-summary">
        <p>
          You have <strong>{metrics.open}</strong> open tickets and <strong>{metrics.closed}</strong> closed tickets.
        </p>
        <p>
          Priority breakdown: <strong>{metrics.high}</strong> high, <strong>{metrics.medium}</strong> medium, <strong>{metrics.low}</strong> low.
        </p>
      </div>
    </div>
  );
}
