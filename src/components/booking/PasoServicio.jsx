import { Clock, Scissors, Zap, Wind, Star, ChevronRight } from 'lucide-react'

const ICONO_CATEGORIA = {
  'Cortes': Scissors,
  'Combos': Zap,
  'Barba':  Wind,
}

const COLOR_CATEGORIA = {
  'Cortes':  { bg: '#0D2B1A', text: '#3DFFA8', border: '#1A5C3A' },
  'Combos':  { bg: '#1A1A0D', text: '#FFD700', border: '#4A4A00' },
  'Barba':   { bg: '#1A0D1A', text: '#C084FC', border: '#4C1D95' },
}

function IconoCategoria({ categoria }) {
  const Icono = ICONO_CATEGORIA[categoria] || Star
  const col = COLOR_CATEGORIA[categoria] || { bg: '#1A1A1A', text: '#888888', border: '#2A2A2A' }
  return (
    <div style={{
      width: '40px', height: '40px', borderRadius: '10px',
      background: col.bg, border: `1px solid ${col.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0
    }}>
      <Icono size={18} color={col.text} />
    </div>
  )
}

export default function PasoServicio({ servicios, onSeleccionar }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: '#F5F5F5', marginBottom: '4px' }}>
        ¿Qué te hacemos hoy?
      </h2>
      <p style={{ color: '#888888', fontSize: '0.875rem', marginBottom: '24px' }}>
        Selecciona el servicio que quieres
      </p>

      <div className="servicios-grid">
        {servicios.map(srv => {
          const col = COLOR_CATEGORIA[srv.category] || { bg: '#1A1A1A', text: '#3DFFA8', border: '#2A2A2A' }
          return (
            <button
              key={srv.id}
              onClick={() => onSeleccionar(srv)}
              className="servicio-card"
            >
              {/* Fila superior: icono + badge + flecha */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IconoCategoria categoria={srv.category} />
                  {srv.category && (
                    <span style={{
                      background: col.bg, color: col.text,
                      fontSize: '0.65rem', fontWeight: 700,
                      padding: '3px 8px', borderRadius: '999px',
                      border: `1px solid ${col.border}`,
                      letterSpacing: '0.05em', textTransform: 'uppercase'
                    }}>
                      {srv.category}
                    </span>
                  )}
                </div>
                <ChevronRight size={16} color="#3DFFA8" style={{ opacity: 0.6 }} />
              </div>

              {/* Nombre */}
              <p style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '1.05rem', color: '#F5F5F5',
                margin: '0 0 6px'
              }}>
                {srv.name}
              </p>

              {/* Descripción */}
              {srv.description && (
                <p style={{ color: '#666666', fontSize: '0.78rem', margin: '0 0 16px', lineHeight: 1.5 }}>
                  {srv.description}
                </p>
              )}

              {/* Fila inferior: duración + precio */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid #1E1E1E', paddingTop: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#666666', fontSize: '0.78rem' }}>
                  <Clock size={13} />
                  <span>{srv.duration_minutes} min</span>
                </div>
                <span style={{ color: '#3DFFA8', fontWeight: 800, fontSize: '1.1rem', fontFamily: 'Syne, sans-serif' }}>
                  ${Number(srv.price).toLocaleString('es-CO')}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
