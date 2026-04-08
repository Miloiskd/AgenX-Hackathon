import { useState } from 'react';
import { submitTicket } from '../services/api';

export function UploadPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await submitTicket(text);
      setResponse(result);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
