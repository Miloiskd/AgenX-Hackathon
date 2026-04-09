import { useState } from 'react';
import { submitTicket } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ProcessingPipeline } from '../components/ProcessingPipeline';

export function UploadPage() {
  const { user } = useAuth();
  const [text, setText]   = useState('');
  const [photo, setPhoto] = useState(null);
  const [logs, setLogs]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError]       = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const result = await submitTicket(text, photo, logs);
      setResponse(result);
      setText('');
      setPhoto(null);
      setLogs(null);
      const photoInput = document.getElementById('photo-input');
      const logsInput  = document.getElementById('logs-input');
      if (photoInput) photoInput.value = '';
      if (logsInput)  logsInput.value  = '';
      
      // Call onTicketSubmitted to show timeline (commented for now)
      // if (onTicketSubmitted && result.id) {
      //   onTicketSubmitted(result.id);
      // }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2>Upload Ticket</h2>

      {/* Reporter info banner */}
      <div className="reporter-banner">
        <span>📬 Confirmation and resolution emails will be sent to <strong>{user?.email}</strong></span>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label htmlFor="ticket-text">Describe your issue:</label>
          <textarea
            id="ticket-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Example: The "Confirm Payment" button in checkout doesn't respond. Users click it and wait 15 seconds then get a timeout error. Affects ~45 orders in the last hour, mainly international customers.

Include:
• What exactly isn't working (payment, inventory, products, etc.)
• When it started
• How many users/orders are affected
• Any error messages you see`}
            rows="10"
            disabled={loading}
          />
          <small style={{color: '#666', marginTop: '8px', display: 'block'}}>
            💡 Tip: Be specific about affected Saleor modules (payment, checkout, warehouse, products, orders, etc.) 
            so our AI can extract the right code context and provide faster fixes.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="photo-input">📸 Photo (Optional):</label>
          <input
            id="photo-input"
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && setPhoto(e.target.files[0])}
            disabled={loading}
            className="file-input"
          />
          {photo && <p className="file-name">✓ {photo.name}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="logs-input">📄 Logs or File (Optional):</label>
          <input
            id="logs-input"
            type="file"
            accept=".txt,.log,.json,.csv,.pdf"
            onChange={(e) => e.target.files?.[0] && setLogs(e.target.files[0])}
            disabled={loading}
            className="file-input"
          />
          {logs && <p className="file-name">✓ {logs.name}</p>}
        </div>

        <button type="submit" disabled={loading || !text.trim()} className="submit-button">
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {/* Show pipeline while loading */}
      {loading && <ProcessingPipeline />}

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div className="alert alert-success">
          <strong>Success!</strong> Ticket submitted successfully.
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
