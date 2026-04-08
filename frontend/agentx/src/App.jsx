import { useState } from 'react'
import './App.css'
import { Navigation } from './components/Navigation'
import { UploadPage } from './pages/UploadPage'
import { TicketsPage } from './pages/TicketsPage'
import { DashboardPage } from './pages/DashboardPage'

function App() {
  const [currentPage, setCurrentPage] = useState('upload')

  const renderPage = () => {
    switch (currentPage) {
      case 'upload':
        return <UploadPage />
      case 'tickets':
        return <TicketsPage />
      case 'dashboard':
        return <DashboardPage />
      default:
        return <UploadPage />
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
