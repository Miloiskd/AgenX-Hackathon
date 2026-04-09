import { useAuth } from '../context/AuthContext';

export function Navigation({ currentPage, setCurrentPage }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <nav className="navbar">
      <div className="nav-container">
        <h1 className="nav-title">AgenX Ticketing System</h1>

        <ul className="nav-links">
          <li>
            <button
              className={`nav-button ${currentPage === 'upload' ? 'active' : ''}`}
              onClick={() => setCurrentPage('upload')}
            >
              Upload
            </button>
          </li>
          <li>
            <button
              className={`nav-button ${currentPage === 'tickets' ? 'active' : ''}`}
              onClick={() => setCurrentPage('tickets')}
            >
              Tickets
            </button>
          </li>
          <li>
            <button
              className={`nav-button ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
            >
              Dashboard
            </button>
          </li>
          <li>
            <button
              className={`nav-button ${currentPage === 'assignment' ? 'active' : ''}`}
              onClick={() => setCurrentPage('assignment')}
            >
              Asignación de Equipos
            </button>
          </li>
          {isAdmin && (
            <li>
              <button
                className={`nav-button ${currentPage === 'admin' ? 'active' : ''}`}
                onClick={() => setCurrentPage('admin')}
              >
                Users
              </button>
            </li>
          )}
        </ul>

        <div className="nav-user">
          <span className="nav-user-info">
            <span className="nav-user-role">{isAdmin ? 'Admin' : 'User'}</span>
            <span className="nav-user-name">{user?.name}</span>
          </span>
          <button className="nav-logout-btn" onClick={logout} title="Sign out">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
