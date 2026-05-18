import { ChevronLeft, Clock } from 'lucide-react'

function Avatar({ nombre }) {
  return (
    <div style={{
      width: '44px', height: '44px', borderRadius: '50%',
      background: 'rgba(var(--accent-rgb),0.12)', border: '1px solid rgba(var(--accent-rgb),0.25)',
      color: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem',
      flexShrink: 0
    }}>
      {nombre.charAt(0).toUpperCase()}
    </div>
  )
}

export default function PasoEstilista({ estilistas, onSeleccionar, onVolver }) {
  return (
    <div>
      <button onClick={onVolver} style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px', padding: 0 }}>
        <ChevronLeft size={15} />
        <span style={{ fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif' }}>Volver</span>
      </button>

      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: '#F5F5F5', marginBottom: '6px' }}>
        Elige tu estilista
      </h2>
      <p style={{ color: '#888888', fontSize: '0.875rem', marginBottom: '24px' }}>
        ¿Con quién quieres tu turno?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Primero disponible */}
        <div
          style={{
            background: 'rgba(var(--accent-rgb),0.04)', border: '1px solid rgba(var(--accent-rgb),0.2)',
            borderRadius: '14px', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '14px',
            cursor: 'pointer', transition: 'border-color 0.2s ease, background 0.2s ease',
            backdropFilter: 'blur(10px)',
          }}
          onClick={() => estilistas.length > 0 && onSeleccionar(estilistas[0])}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.5)'
            e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.07)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),0.2)'
            e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.04)'
          }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Clock size={20} color="var(--accent)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'var(--accent)', fontWeight: 700, margin: '0 0 4px', fontSize: '0.95rem' }}>
              El primero disponible
            </p>
            <p style={{ color: '#666666', fontSize: '0.78rem', margin: 0 }}>
              Te asignamos al barbero con cupo más próximo
            </p>
          </div>
          <button
            style={{
              background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)',
              border: '1px solid rgba(var(--accent-rgb),0.25)', borderRadius: '8px',
              padding: '8px 18px', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.85rem',
              fontFamily: 'DM Sans, sans-serif',
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
          >
            Elegir
          </button>
        </div>

        {/* Lista de estilistas */}
        {estilistas.map(est => (
          <div
            key={est.id}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: '14px',
              backdropFilter: 'blur(10px)',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            }}
          >
            <Avatar nombre={est.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#F5F5F5', fontWeight: 600, margin: '0 0 6px', fontSize: '0.95rem' }}>
                {est.name}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(est.specialties || []).map(sp => (
                  <span key={sp} style={{
                    background: 'rgba(255,255,255,0.06)', color: '#888888',
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {sp}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => onSeleccionar(est)}
              style={{
                background: 'var(--accent)', color: '#050505',
                border: 'none', borderRadius: '8px',
                padding: '8px 18px', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.85rem',
                fontFamily: 'DM Sans, sans-serif',
                whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(var(--accent-rgb),0.35)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Elegir
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

