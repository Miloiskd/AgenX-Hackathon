import { useState } from 'react'
import './App.css'
import { useAuth } from './context/AuthContext'
import { Navigation } from './components/Navigation'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { UploadPage } from './pages/UploadPage'
import { TicketsPage } from './pages/TicketsPage'
import { DashboardPage } from './pages/DashboardPage'
import { AssignmentPage } from './pages/AssignmentPage'
import { AdminPage } from './pages/AdminPage'
import { TicketResolutionPage } from './pages/TicketResolutionPage'

function App() {
  const { isAuthenticated, user } = useAuth()
  const [authView, setAuthView] = useState('landing') // 'landing' | 'login' | 'register'
  const [currentPage, setCurrentPage] = useState('upload')
  const [viewingTicketId, setViewingTicketId] = useState(null)

  if (!isAuthenticated) {
    if (authView === 'landing') {
      return (
        <LandingPage
          onGoLogin={() => setAuthView('login')}
          onGoRegister={() => setAuthView('register')}
        />
      )
    }
    if (authView === 'login') {
      return (
        <LoginPage
          onGoRegister={() => setAuthView('register')}
          onGoLanding={() => setAuthView('landing')}
        />
      )
    }
    return (
      <RegisterPage
        onGoLogin={() => setAuthView('login')}
        onGoLanding={() => setAuthView('landing')}
      />
    )
  }

  const renderPage = () => {
    if (viewingTicketId) {
      return (
        <TicketResolutionPage
          ticketId={viewingTicketId}
          onClose={() => { setViewingTicketId(null); setCurrentPage('upload'); }}
        />
      )
    }
    if (currentPage === 'admin' && user?.role !== 'admin') {
      return <UploadPage onTicketSubmitted={(id) => setViewingTicketId(id)} />
    }
    switch (currentPage) {
      case 'upload':     return <UploadPage onTicketSubmitted={(id) => setViewingTicketId(id)} />
      case 'tickets':    return <TicketsPage onViewTicket={(id) => setViewingTicketId(id)} />
      case 'dashboard':  return <DashboardPage />
      case 'assignment': return <AssignmentPage />
      case 'admin':      return <AdminPage />
      default:           return <UploadPage onTicketSubmitted={(id) => setViewingTicketId(id)} />
    }
  }

  return (
    <div className="app">
      <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="main-content">{renderPage()}</main>
      <footer className="app-footer">
        <p>&copy; 2026 AgentX_SYNCRO. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App