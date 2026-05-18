import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { whatsAppLink, msgRecordatorio } from '../../lib/whatsapp'

const AVATAR_COLORS = [
  { bg: '#0D3320', text: 'var(--accent)' },
  { bg: '#1C1500', text: '#F59E0B' },
  { bg: '#1A0D2E', text: '#A855F7' },
  { bg: '#0D2040', text: '#60A5FA' },
  { bg: '#2A0D0D', text: '#F87171' },
]

const STATUS_LABELS = {
  pending:   'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

function formatHora(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

const actionBtnBase = {
  border: 'none', borderRadius: 6, padding: '4px 10px',
  fontSize: '0.72rem', cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
  transition: 'opacity 0.15s ease',
}

export default function CitaItem({ cita, index, negocioName, onStatusChange }) {
  const [updating, setUpdating] = useState(false)

  const color   = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const stylist = cita.stylists
  const service = cita.services

  function handleRecordar() {
    const msg = msgRecordatorio({
      clientName:  cita.client_name,
      negocioName: negocioName ?? 'el negocio',
      fecha:       cita.date,
      hora:        cita.start_time,
      servicio:    service?.name ?? 'tu servicio',
      estilista:   stylist?.name ?? '',
    })
    window.open(whatsAppLink(cita.client_phone, msg), '_blank')
  }

  async function handleAction(newStatus) {
    setUpdating(true)
    await onStatusChange(cita.id, newStatus)
    setUpdating(false)
  }

  return (
    <div
      className="agenda-item"
      style={{ animation: `fadeInUp 0.35s ease ${index * 60}ms forwards`, opacity: 0 }}
    >
      {/* Hora */}
      <div style={{ width: 68, flexShrink: 0 }}>
        <p style={{
          color: 'var(--accent)', fontWeight: 700,
          fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif',
          lineHeight: 1.2,
        }}>
          {formatHora(cita.start_time)}
        </p>
        <p style={{ color: '#444444', fontSize: '0.72rem', fontFamily: 'DM Sans, sans-serif' }}>
          {formatHora(cita.end_time)}
        </p>
      </div>

      {/* Avatar del estilista */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: color.bg, color: color.text,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, sans-serif', fontWeight: 700,
        fontSize: '0.8rem', flexShrink: 0,
      }}>
        {(stylist?.name ?? 'S')[0].toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: '#F5F5F5', fontWeight: 600,
          fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {cita.client_name}
        </p>
        <p style={{
          color: '#666666', fontSize: '0.76rem',
          fontFamily: 'DM Sans, sans-serif',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {service?.name ?? 'Servicio'} · {service?.duration_minutes ?? '?'} min
          {stylist?.name ? ` · ${stylist.name}` : ''}
        </p>
      </div>

      {/* Badge de estado */}
      <span className={`status-badge ${cita.status}`}>
        {STATUS_LABELS[cita.status] ?? cita.status}
      </span>

      {/* Acciones (visibles al hacer hover) */}
      {cita.status !== 'completed' && cita.status !== 'cancelled' && (
        <div className="agenda-item-actions">
          {/* Recordatorio WhatsApp — siempre disponible si hay teléfono */}
          {cita.client_phone && (
            <button
              onClick={handleRecordar}
              title="Enviar recordatorio por WhatsApp"
              style={{
                ...actionBtnBase,
                background: 'rgba(37,211,102,0.08)',
                color: '#25D366',
                border: '1px solid rgba(37,211,102,0.25)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <MessageCircle size={12} /> Recordar
            </button>
          )}
          {cita.status === 'pending' && (
            <button
              disabled={updating}
              onClick={() => handleAction('confirmed')}
              style={{
                ...actionBtnBase,
                background: 'rgba(var(--accent-rgb),0.1)',
                color: 'var(--accent)',
                border: '1px solid rgba(var(--accent-rgb),0.3)',
              }}
            >
              Confirmar
            </button>
          )}
          {cita.status === 'confirmed' && (
            <button
              disabled={updating}
              onClick={() => handleAction('completed')}
              style={{
                ...actionBtnBase,
                background: 'rgba(136,136,136,0.1)',
                color: '#AAAAAA',
                border: '1px solid rgba(136,136,136,0.3)',
              }}
            >
              Completar
            </button>
          )}
          <button
            disabled={updating}
            onClick={() => handleAction('cancelled')}
            style={{
              ...actionBtnBase,
              background: 'rgba(255,77,77,0.08)',
              color: '#FF4D4D',
              border: '1px solid rgba(255,77,77,0.25)',
            }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

