import { ChevronLeft } from 'lucide-react'

function Avatar({ nombre }) {
  return (
    <div style={{
      width: '44px', height: '44px', borderRadius: '50%',
      background: '#1A5C3A', color: '#3DFFA8',
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
        {estilistas.map(est => (
          <div
            key={est.id}
            style={{
              background: '#111111', border: '1px solid #1E1E1E',
              borderRadius: '12px', padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: '14px'
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
                    background: '#1E1E1E', color: '#888888',
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: '999px'
                  }}>
                    {sp}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => onSeleccionar(est)}
              style={{
                background: '#3DFFA8', color: '#0A0A0A',
                border: 'none', borderRadius: '8px',
                padding: '8px 18px', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.85rem',
                fontFamily: 'DM Sans, sans-serif',
                whiteSpace: 'nowrap', flexShrink: 0
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
