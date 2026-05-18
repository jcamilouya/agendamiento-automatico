import { useState } from 'react'
import { CalendarX, Clock } from 'lucide-react'
import CitaItem from './CitaItem'

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const HORA_INICIO = 8   // 8am
const HORA_FIN    = 21  // 9pm
const TOTAL_MIN   = (HORA_FIN - HORA_INICIO) * 60

function formatFechaCorta(d) {
  return `${d.getDate()} de ${MESES[d.getMonth()]}`
}

function timeToMin(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function formatHora(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

// Color y glow de cada estado
function slotStyle(status, esProxima) {
  if (esProxima) return { bg: '#F59E0B', glow: 'rgba(245,158,11,0.5)', pulse: true }
  if (status === 'confirmed')  return { bg: '#00FF88', glow: 'rgba(var(--accent-rgb),0.4)', pulse: false }
  if (status === 'completed')  return { bg: '#444444', glow: 'transparent', pulse: false }
  if (status === 'cancelled')  return { bg: '#FF4D4D', glow: 'rgba(255,77,77,0.3)', pulse: false }
  return { bg: '#F59E0B', glow: 'rgba(245,158,11,0.35)', pulse: false } // pending
}

function TimelineBar({ citas }) {
  const [tooltip, setTooltip] = useState(null)
  const now      = new Date()
  const nowMin   = now.getHours() * 60 + now.getMinutes()
  const nowPct   = Math.max(0, Math.min(100, (nowMin - HORA_INICIO * 60) / TOTAL_MIN * 100))
  const showNow  = nowMin >= HORA_INICIO * 60 && nowMin <= HORA_FIN * 60

  // Etiquetas de hora para el eje
  const horas = []
  for (let h = HORA_INICIO; h <= HORA_FIN; h += 2) {
    horas.push(h)
  }

  return (
    <div style={{ padding: '20px 24px 16px', position: 'relative' }}>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Línea del día — 8am a 9pm
      </p>

      {/* Barra principal */}
      <div style={{
        position: 'relative',
        height: '40px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '10px',
        overflow: 'visible',
      }}>
        {/* Línea de hora actual */}
        {showNow && (
          <div style={{
            position: 'absolute',
            left: `${nowPct}%`,
            top: '-6px',
            bottom: '-6px',
            width: '2px',
            background: 'var(--accent)',
            boxShadow: '0 0 8px rgba(var(--accent-rgb),0.8)',
            zIndex: 10,
            borderRadius: '2px',
          }}>
            <div style={{
              position: 'absolute',
              top: '-4px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 10px rgba(var(--accent-rgb),0.9)',
            }} />
          </div>
        )}

        {/* Bloques de citas */}
        {citas.map(cita => {
          const startMin = timeToMin(cita.start_time) - HORA_INICIO * 60
          const endMin   = timeToMin(cita.end_time)   - HORA_INICIO * 60
          const left     = Math.max(0, startMin / TOTAL_MIN * 100)
          const width    = Math.max(1, (endMin - startMin) / TOTAL_MIN * 100)

          const minutosRestantes = timeToMin(cita.start_time) - nowMin
          const esProxima = minutosRestantes > 0 && minutosRestantes <= 30

          const { bg, glow, pulse } = slotStyle(cita.status, esProxima)

          return (
            <div
              key={cita.id}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.parentElement.getBoundingClientRect()
                setTooltip({ cita, x: e.currentTarget.getBoundingClientRect().left - rect.left + 10 })
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${width}%`,
                top: '4px',
                bottom: '4px',
                background: bg,
                borderRadius: '6px',
                opacity: cita.status === 'completed' ? 0.5 : 0.85,
                boxShadow: glow !== 'transparent' ? `0 0 10px ${glow}` : 'none',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                animation: pulse ? 'accentPulse 2s ease-in-out infinite' : 'none',
              }}
            />
          )
        })}

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: Math.min(tooltip.x, 60) + '%',
            top: '48px',
            background: 'rgba(15,15,15,0.96)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            padding: '8px 12px',
            zIndex: 20,
            minWidth: '160px',
            pointerEvents: 'none',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            <p style={{ color: '#F5F5F5', fontWeight: 600, fontSize: '0.8rem', margin: '0 0 2px' }}>
              {tooltip.cita.client_name}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', margin: 0 }}>
              {formatHora(tooltip.cita.start_time)} · {tooltip.cita.services?.name}
            </p>
          </div>
        )}
      </div>

      {/* Eje de horas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {horas.map(h => (
          <span key={h} style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem' }}>
            {h > 12 ? `${h-12}pm` : h === 12 ? '12pm' : `${h}am`}
          </span>
        ))}
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: '14px', marginTop: '10px', flexWrap: 'wrap' }}>
        {[
          { color: '#F59E0B', label: 'Pendiente' },
          { color: 'var(--accent)', label: 'Confirmada' },
          { color: '#444444', label: 'Completada' },
          { color: '#FF4D4D', label: 'Cancelada' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: color }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px' }}>
      <CalendarX size={44} color="#282828" style={{ margin: '0 auto 14px', display: 'block' }} />
      <p style={{ color: '#444', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>
        Sin citas hoy
      </p>
      <p style={{ color: '#333', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif' }}>
        Disfruta el día libre o revisa la agenda de la semana
      </p>
    </div>
  )
}

export default function AgendaHoy({ citas, loading, negocioName, onStatusChange }) {
  const hoy = new Date()

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, overflow: 'hidden',
      backdropFilter: 'blur(20px)',
      position: 'relative',
    }}>
      {/* Brillo superior */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--accent)" />
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#F5F5F5' }}>
            Agenda de hoy
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '999px', padding: '3px 10px',
            color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem',
          }}>
            {formatFechaCorta(hoy)}
          </span>
          {!loading && (
            <span style={{
              background: 'rgba(var(--accent-rgb),0.08)',
              border: '1px solid rgba(var(--accent-rgb),0.2)',
              borderRadius: '999px', padding: '3px 10px',
              color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 600,
            }}>
              {citas.length} {citas.length === 1 ? 'cita' : 'citas'}
            </span>
          )}
        </div>
      </div>

      {/* Timeline visual */}
      {!loading && citas.length > 0 && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <TimelineBar citas={citas} />
        </div>
      )}

      {/* Lista de citas */}
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

