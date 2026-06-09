import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { isSuperAdmin, SUPER_ADMIN_EMAIL } from '../config/admin'

export default function LoginPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState(null)
  const [focusEmail, setFocusEmail] = useState(false)
  const [focusPass, setFocusPass]   = useState(false)

  if (!loading && session) {
    return <Navigate to={isSuperAdmin(session) ? '/admin' : '/dashboard'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      navigate(email === SUPER_ADMIN_EMAIL ? '/admin' : '/dashboard')
    } catch (err) {
      const msg = err.message ?? ''
      setError(
        msg === 'Invalid login credentials'                      ? 'Email o contraseña incorrectos' :
        msg.includes('fetch') || msg.includes('NetworkError')   ? 'Sin conexión. Verifica tu internet e intenta de nuevo.' :
        msg === 'Email not confirmed'                            ? 'Confirma tu email antes de entrar.' :
        'Algo salió mal. Intenta de nuevo.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = (focused, hasError) => ({
    width: '100%',
    background: '#0A0A0A',
    border: `1px solid ${hasError ? '#FF4D4D' : focused ? 'var(--accent)' : '#1E1E1E'}`,
    borderRadius: 8,
    padding: '13px 16px',
    color: '#F5F5F5',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  })

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0A0A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: '20px',
    }}>
      {/* Orbs de fondo */}
      <div style={{
        position: 'absolute', width: 500, height: 500,
        borderRadius: '50%', background: 'var(--accent)',
        filter: 'blur(100px)', opacity: 0.05,
        top: '-100px', left: '-150px',
        animation: 'float 9s ease-in-out infinite alternate',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400,
        borderRadius: '50%', background: 'var(--accent)',
        filter: 'blur(100px)', opacity: 0.04,
        bottom: '-80px', right: '-100px',
        animation: 'float 11s ease-in-out infinite alternate-reverse',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 400,
        background: '#111111',
        border: '1px solid #1E1E1E',
        borderRadius: 16, padding: '40px 36px',
        position: 'relative', zIndex: 1,
        animation: 'fadeInUp 0.4s ease forwards',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800,
              fontSize: '2rem', color: '#F5F5F5', letterSpacing: '-0.5px',
            }}>
              TURNOTT
            </span>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--accent)', display: 'inline-block',
              animation: 'pulse-dot 2s ease-in-out infinite',
              boxShadow: '0 0 10px rgba(var(--accent-rgb),0.5)',
            }} />
          </div>
          <p style={{ color: '#888888', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif' }}>
            Panel del dueño
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(255,77,77,0.08)',
            border: '1px solid rgba(255,77,77,0.25)',
            borderRadius: 8, padding: '10px 14px',
            color: '#FF4D4D', fontSize: '0.85rem',
            fontFamily: 'DM Sans, sans-serif',
            marginBottom: 20, textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{
              display: 'block', color: '#888888',
              fontSize: '0.78rem', marginBottom: 6,
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocusEmail(true)}
              onBlur={() => setFocusEmail(false)}
              placeholder="tu@email.com"
              required
              style={inputStyle(focusEmail, !!error)}
            />
          </div>

          <div>
            <label style={{
              display: 'block', color: '#888888',
              fontSize: '0.78rem', marginBottom: 6,
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
            }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocusPass(true)}
              onBlur={() => setFocusPass(false)}
              placeholder="••••••••"
              required
              style={inputStyle(focusPass, !!error)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 8,
              background: submitting ? '#0D3320' : 'var(--accent)',
              color: '#0A0A0A', fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.95rem',
              border: 'none', borderRadius: 8,
              padding: '14px', cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease, opacity 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {submitting && (
              <span style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid rgba(0,0,0,0.2)',
                borderTopColor: '#0A0A0A',
                display: 'inline-block',
                animation: 'spin 0.6s linear infinite',
              }} />
            )}
            {submitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: 24,
          color: '#555555', fontSize: '0.78rem',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          ¿Eres cliente?{' '}
          <a href="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Agenda tu cita aquí
          </a>
        </p>
      </div>
    </div>
  )
}

