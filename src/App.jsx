import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LandingPage   from './pages/LandingPage'
import BookingPage   from './pages/BookingPage'
import LoginPage     from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RegisterPage  from './pages/RegisterPage'
import NotFoundPage  from './pages/NotFoundPage'

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
          border: '2px solid #1E1E1E', borderTopColor: '#00FF88',
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
        <Route path="/register"  element={<RegisterPage />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/404"        element={<NotFoundPage />} />
        <Route path="/:shopSlug"  element={<BookingPage />} />
        <Route path="*"           element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
