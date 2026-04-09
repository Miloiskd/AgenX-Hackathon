import { useState } from 'react'
import './App.css'
import { useAuth } from './context/AuthContext'
import { Navigation } from './components/Navigation'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { UploadPage } from './pages/UploadPage'
import { TicketsPage } from './pages/TicketsPage'
import { DashboardPage } from './pages/DashboardPage'
import { AssignmentPage } from './pages/AssignmentPage'
import { AdminPage } from './pages/AdminPage'

function App() {
  const { isAuthenticated, user } = useAuth()
  const [authView, setAuthView] = useState('login')   // 'login' | 'register'
  const [currentPage, setCurrentPage] = useState('upload')

  // ── Not logged in → show auth screens ────────────────────────────────────
  if (!isAuthenticated) {
    return authView === 'login'
      ? <LoginPage    onGoRegister={() => setAuthView('register')} />
      : <RegisterPage onGoLogin={()    => setAuthView('login')}    />
  }

  // ── Logged in → full app ──────────────────────────────────────────────────
  const renderPage = () => {
    // Guard: non-admins can't reach admin page
    if (currentPage === 'admin' && user?.role !== 'admin') {
      return <UploadPage />
    }
    switch (currentPage) {
      case 'upload':     return <UploadPage />
      case 'tickets':    return <TicketsPage />
      case 'dashboard':  return <DashboardPage />
      case 'assignment': return <AssignmentPage />
      case 'admin':      return <AdminPage />
      default:           return <UploadPage />
    }
  }

  return (
    <div className="app">
      <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="main-content">
        {renderPage()}
      </main>
      <footer className="app-footer">
        <p>&copy; 2026 AgenX Ticketing System. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
