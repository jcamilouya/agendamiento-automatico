import { CalendarX } from 'lucide-react'
import CitaItem from './CitaItem'

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function formatFechaCorta(d) {
  return `${d.getDate()} de ${MESES[d.getMonth()]}`
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '52px 24px' }}>
      <CalendarX size={48} color="#282828" style={{ margin: '0 auto 16px', display: 'block' }} />
      <p style={{
        color: '#444444', fontFamily: 'Syne, sans-serif',
        fontWeight: 700, fontSize: '1rem', marginBottom: 6,
      }}>
        Sin citas hoy
      </p>
      <p style={{ color: '#333333', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif' }}>
        Disfruta el día libre o revisa la agenda de la semana
      </p>
    </div>
  )
}

export default function AgendaHoy({ citas, loading, negocioName, onStatusChange }) {
  const hoy = new Date()

  return (
    <div style={{
      background: '#111111',
      border: '1px solid #1E1E1E',
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px', borderBottom: '1px solid #1E1E1E',
      }}>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: '1rem', color: '#F5F5F5',
        }}>
          Agenda de hoy
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            background: '#1A1A1A', border: '1px solid #252525',
            borderRadius: '999px', padding: '3px 10px',
            color: '#666666', fontSize: '0.72rem',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            {formatFechaCorta(hoy)}
          </span>
          {!loading && (
            <span style={{
              background: 'rgba(61,255,168,0.1)',
              border: '1px solid rgba(61,255,168,0.2)',
              borderRadius: '999px', padding: '3px 10px',
              color: '#3DFFA8', fontSize: '0.72rem',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            }}>
              {citas.length} {citas.length === 1 ? 'cita' : 'citas'}
            </span>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: '0 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0' }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="dash-skeleton" style={{ height: 68 }} />
            ))}
          </div>
        ) : citas.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="agenda-timeline">
            {citas.map((cita, i) => (
              <CitaItem
                key={cita.id}
                cita={cita}
                index={i}
                negocioName={negocioName}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
