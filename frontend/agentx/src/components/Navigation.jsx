export function Navigation({ currentPage, setCurrentPage }) {
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
        </ul>
      </div>
    </nav>
  );
}
