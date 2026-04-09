import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginApi } from '../services/api';

export function LoginPage({ onGoRegister, onGoLanding }) {
  const { saveSession } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await loginApi(email, password);
      saveSession(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-top-actions">
          <button type="button" className="auth-back-button" onClick={onGoLanding}>
            {'<'} Back to landing
          </button>
        </div>

        <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">AgenX</h1>
          <p className="auth-subtitle">SRE Incident Intake System</p>
        </div>

        <h2 className="auth-title">Sign in</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              className="auth-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="auth-input"
            />
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="submit-button auth-submit"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button className="auth-link-btn" onClick={onGoRegister}>
            Register
          </button>
        </p>
        </div>
      </div>
    </div>
  );
}
