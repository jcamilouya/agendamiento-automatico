import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#050505',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px', fontFamily: 'DM Sans, sans-serif',
      textAlign: 'center',
    }}>
      {/* Card glass */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '48px 40px',
        maxWidth: '480px', width: '100%',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
        }} />

        <p style={{ fontSize: '3rem', marginBottom: '16px' }}>🤔</p>

        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '1.6rem', color: '#F5F5F5', marginBottom: '10px',
        }}>
          Esta página no existe
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '28px' }}>
          El link que seguiste no es válido o este negocio ya no está disponible en TURNO.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '100%', padding: '14px',
              background: '#00FF88', color: '#050505',
              borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem',
              cursor: 'pointer', boxSizing: 'border-box',
            }}>
              ¿Eres dueño de un negocio? Regístrate gratis →
            </div>
          </Link>

          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '100%', padding: '14px',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', fontWeight: 500, fontSize: '0.88rem',
              cursor: 'pointer', boxSizing: 'border-box',
            }}>
              Volver al inicio
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
