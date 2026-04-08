import { useState } from 'react';
import { submitTicket } from '../services/api';

export function UploadPage() {
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null);
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

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
      // Reset file inputs
      const photoInput = document.getElementById('photo-input');
      const logsInput = document.getElementById('logs-input');
      if (photoInput) photoInput.value = '';
      if (logsInput) logsInput.value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleLogsChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLogs(e.target.files[0]);
    }
  };

  return (
    <div className="page-container">
      <h2>Upload Ticket</h2>
      
      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label htmlFor="ticket-text">Describe your issue:</label>
          <textarea
            id="ticket-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter ticket description here..."
            rows="8"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="photo-input">📸 Photo (Optional):</label>
          <input
            id="photo-input"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
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
            onChange={handleLogsChange}
            disabled={loading}
            className="file-input"
          />
          {logs && <p className="file-name">✓ {logs.name}</p>}
        </div>

        <button type="submit" disabled={loading || !text.trim()} className="submit-button">
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </form>

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
