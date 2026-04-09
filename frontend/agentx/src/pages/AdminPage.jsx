import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser,
  getAdminEngineers, createAdminEngineer, updateAdminEngineer, deleteAdminEngineer,
} from '../services/api';

// ─── Shared modal shell ───────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-section">{children}</div>
      </div>
    </div>
  );
}

// ─── Tab: Accounts ────────────────────────────────────────────────────────────
function AccountsTab({ token }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [modal, setModal]       = useState(null); // null | 'create' | 'edit'
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState({ name: '', email: '', password: '' });
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true); setError(null);
    try { setUsers(await getAdminUsers(token)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({ name: '', email: '', password: '' });
    setFormError(null); setModal('create');
  };
  const openEdit = (u) => {
    setSelected(u);
    setForm({ name: u.name, email: u.email, password: '' });
    setFormError(null); setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); setFormError(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { setFormError('Name and email are required'); return; }
    if (modal === 'create' && form.password.length < 6) { setFormError('Password must be at least 6 characters'); return; }
    setSaving(true); setFormError(null);
    try {
      if (modal === 'create') await createAdminUser(token, form);
      else await updateAdminUser(token, selected.id, { name: form.name, email: form.email });
      closeModal(); fetchUsers();
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try { await deleteAdminUser(token, id); fetchUsers(); }
    catch (err) { setError(err.message); }
    finally { setDeleting(null); }
  };

  if (loading) return <p style={{ padding: '16px', color: 'var(--text)' }}>Loading accounts…</p>;

  return (
    <>
      <div className="admin-tab-header">
        <p className="admin-tab-desc">Login accounts — who can access the app.</p>
        <button className="submit-button admin-add-btn" onClick={openCreate}>+ Add Account</button>
      </div>

      {error && <div className="alert alert-error"><strong>Error:</strong> {error}</div>}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.length === 0
              ? <tr><td colSpan={5} className="admin-empty">No accounts found.</td></tr>
              : users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td style={{ color: 'var(--accent)' }}>{u.email}</td>
                  <td><span className={`role-badge role-${u.role}`}>{u.role === 'admin' ? '👑 Admin' : '👤 User'}</span></td>
                  <td className="admin-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="admin-actions">
                      <button className="admin-btn admin-btn--edit" onClick={() => openEdit(u)} disabled={u.role === 'admin'}>Edit</button>
                      <button className="admin-btn admin-btn--delete" onClick={() => handleDelete(u.id)} disabled={u.role === 'admin' || deleting === u.id}>{deleting === u.id ? '…' : 'Delete'}</button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'create' ? 'Add Account' : 'Edit Account'} onClose={closeModal}>
          <form onSubmit={handleSave} className="auth-form" style={{ marginTop: 0 }}>
            <div className="form-group">
              <label>Full name</label>
              <input className="auth-input" type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Kevin Rodríguez" disabled={saving} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="auth-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" disabled={saving} required />
            </div>
            {modal === 'create' && (
              <div className="form-group">
                <label>Password</label>
                <input className="auth-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" disabled={saving} required />
              </div>
            )}
            {formError && <div className="alert alert-error">{formError}</div>}
            <div className="admin-modal-actions">
              <button type="submit" className="submit-button" style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving…' : modal === 'create' ? 'Create' : 'Save'}</button>
              <button type="button" className="admin-btn admin-btn--cancel" style={{ flex: 1 }} onClick={closeModal} disabled={saving}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── Tab: Engineers ───────────────────────────────────────────────────────────
const ROLES = ['Backend Engineer', 'Frontend Engineer', 'DevOps Engineer', 'Fullstack Engineer', 'Site Reliability Engineer'];

function EngineersTab({ token }) {
  const [engineers, setEngineers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [modal, setModal]           = useState(null);
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState({ name: '', email: '', role: ROLES[0], experience_years: 0 });
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState(null);
  const [deleting, setDeleting]     = useState(null);

  useEffect(() => { fetchEngineers(); }, []);

  const fetchEngineers = async () => {
    setLoading(true); setError(null);
    try {
      const data = await getAdminEngineers(token);
      setEngineers(data.engineers);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({ name: '', email: '', role: ROLES[0], experience_years: 0 });
    setFormError(null); setModal('create');
  };
  const openEdit = (eng) => {
    setSelected(eng);
    setForm({ name: eng.name, email: eng.email, role: eng.role, experience_years: eng.experience_years });
    setFormError(null); setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); setFormError(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.role) { setFormError('Name, email and role are required'); return; }
    setSaving(true); setFormError(null);
    try {
      if (modal === 'create') await createAdminEngineer(token, form);
      else await updateAdminEngineer(token, selected.id, form);
      closeModal(); fetchEngineers();
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try { await deleteAdminEngineer(token, id); fetchEngineers(); }
    catch (err) { setError(err.message); }
    finally { setDeleting(null); }
  };

  if (loading) return <p style={{ padding: '16px', color: 'var(--text)' }}>Loading engineers…</p>;

  return (
    <>
      <div className="admin-tab-header">
        <p className="admin-tab-desc">SRE engineering team — used for automatic ticket assignment.</p>
        <button className="submit-button admin-add-btn" onClick={openCreate}>+ Add Engineer</button>
      </div>

      {error && <div className="alert alert-error"><strong>Error:</strong> {error}</div>}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Experience</th><th>Skills</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {engineers.length === 0
              ? <tr><td colSpan={6} className="admin-empty">No engineers found.</td></tr>
              : engineers.map(eng => (
                <tr key={eng.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-h)' }}>{eng.name}</td>
                  <td style={{ color: 'var(--accent)' }}>{eng.email}</td>
                  <td className="admin-muted">{eng.role}</td>
                  <td className="admin-muted">{eng.experience_years} yr{eng.experience_years !== 1 ? 's' : ''}</td>
                  <td>
                    <div className="engineer-skills">
                      {eng.skills.length === 0
                        ? <span className="admin-muted">—</span>
                        : eng.skills.map((s, i) => (
                          <span key={i} className="skill-chip">
                            {s.name} <span className="skill-level">{'★'.repeat(s.level)}{'☆'.repeat(5 - s.level)}</span>
                          </span>
                        ))
                      }
                    </div>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button className="admin-btn admin-btn--edit" onClick={() => openEdit(eng)}>Edit</button>
                      <button className="admin-btn admin-btn--delete" onClick={() => handleDelete(eng.id)} disabled={deleting === eng.id}>{deleting === eng.id ? '…' : 'Delete'}</button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'create' ? 'Add Engineer' : 'Edit Engineer'} onClose={closeModal}>
          <form onSubmit={handleSave} className="auth-form" style={{ marginTop: 0 }}>
            <div className="form-group">
              <label>Full name</label>
              <input className="auth-input" type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ana García" disabled={saving} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="auth-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ana@agenx.dev" disabled={saving} required />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select className="auth-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} disabled={saving}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Experience (years)</label>
              <input className="auth-input" type="number" min="0" max="40" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: Number(e.target.value) }))} disabled={saving} />
            </div>
            {formError && <div className="alert alert-error">{formError}</div>}
            <div className="admin-modal-actions">
              <button type="submit" className="submit-button" style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving…' : modal === 'create' ? 'Create' : 'Save'}</button>
              <button type="button" className="admin-btn admin-btn--cancel" style={{ flex: 1 }} onClick={closeModal} disabled={saving}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────
export function AdminPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState('accounts'); // 'accounts' | 'engineers'

  return (
    <div className="page-container">
      <h2>Admin Panel</h2>

      <div className="admin-tabs">
        <button className={`admin-tab-btn ${tab === 'accounts' ? 'active' : ''}`} onClick={() => setTab('accounts')}>
          👤 Accounts
        </button>
        <button className={`admin-tab-btn ${tab === 'engineers' ? 'active' : ''}`} onClick={() => setTab('engineers')}>
          🛠️ Engineers
        </button>
      </div>

      <div className="admin-tab-content">
        {tab === 'accounts'  && <AccountsTab  token={token} />}
        {tab === 'engineers' && <EngineersTab token={token} />}
      </div>
    </div>
  );
}
