import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LandingPage   from './pages/LandingPage'
import BookingPage   from './pages/BookingPage'
import LoginPage     from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0A0A0A'
      }}>
        <span style={{
          width: 24, height: 24, borderRadius: '50%',
          border: '2px solid #1E1E1E', borderTopColor: '#3DFFA8',
          display: 'inline-block', animation: 'spin 0.7s linear infinite'
        }} />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/demo"      element={<BookingPage />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
