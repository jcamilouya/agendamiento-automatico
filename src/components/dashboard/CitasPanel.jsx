import { useState, useEffect } from 'react'
import { CalendarX, X, MessageCircle } from 'lucide-react'
import { whatsAppLink, msgRecordatorio } from '../../lib/whatsapp'
import { supabase } from '../../lib/supabase'

const STATUS_OPTIONS = [
  { value: 'all',       label: 'Todos los estados' },
  { value: 'pending',   label: 'Pendientes'        },
  { value: 'confirmed', label: 'Confirmadas'       },
  { value: 'completed', label: 'Completadas'       },
  { value: 'cancelled', label: 'Canceladas'        },
]

const STATUS_LABELS = {
  pending:   'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

const AVATAR_COLORS = [
  { bg: '#0D3320', text: 'var(--accent)' },
  { bg: '#1C1500', text: '#F59E0B' },
  { bg: '#1A0D2E', text: '#A855F7' },
  { bg: '#0D2040', text: '#60A5FA' },
  { bg: '#2A0D0D', text: '#F87171' },
]

function toYMD(d) {
  return d.toISOString().split('T')[0]
}

function getDefaultFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return toYMD(d)
}

function getDefaultTo() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return toYMD(d)
}

function formatFecha(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatHora(timeStr) {
  if (!timeStr) return '—'
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const labelStyle = {
  color: '#3A3A3A', fontSize: '0.65rem',
  fontFamily: 'DM Sans, sans-serif', fontWeight: 700,
  letterSpacing: '0.06em',
}

const inputStyle = {
  background: '#0A0A0A', border: '1px solid #1E1E1E',
  borderRadius: 8, padding: '7px 12px',
  color: '#F5F5F5', fontSize: '0.82rem',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none', cursor: 'pointer',
  colorScheme: 'dark',
}

export default function CitasPanel({ citas, loading, stylists, negocioName, onLoad, onStatusChange }) {
  const [dateFrom,      setDateFrom]      = useState(getDefaultFrom)
  const [dateTo,        setDateTo]        = useState(getDefaultTo)
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [stylistFilter, setStylistFilter] = useState('all')
  const [updatingId,    setUpdatingId]    = useState(null)

  useEffect(() => {
    onLoad({ dateFrom, dateTo, status: statusFilter, stylistId: stylistFilter })
  // onLoad changes only when negocio loads — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, statusFilter, stylistFilter])

  async function handleAction(id, newStatus) {
    setUpdatingId(id)
    await onStatusChange(id, newStatus)

    // Si se canceló, notificar al primero en lista de espera
    if (newStatus === 'cancelled') {
      const cita = citas.find(c => c.id === id)
      if (cita) {
        supabase.functions.invoke('send-waitlist-notify', {
          body: {
            businessId:  cita.business_id,
            stylistId:   cita.stylist_id,
            date:        cita.date,
            startTime:   cita.start_time,
            serviceName: cita.services?.name ?? 'el servicio',
          }
        }).catch(() => {}) // fire-and-forget
      }
    }

    setUpdatingId(null)
  }

  const hasActiveFilters = statusFilter !== 'all' || stylistFilter !== 'all'

  const pending   = citas.filter(c => c.status === 'pending').length
  const confirmed = citas.filter(c => c.status === 'confirmed').length

  return (
    <div style={{ animation: 'fadeInUp 0.3s ease forwards', opacity: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#F5F5F5' }}>
            Todas las citas
          </h2>
          {!loading && (
            <p style={{ color: '#555555', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', marginTop: 3 }}>
              {citas.length} {citas.length === 1 ? 'resultado' : 'resultados'}
            </p>
          )}
        </div>
        {!loading && (pending > 0 || confirmed > 0) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {pending > 0 && (
              <span className="status-badge pending">{pending} pendiente{pending > 1 ? 's' : ''}</span>
            )}
            {confirmed > 0 && (
              <span className="status-badge confirmed">{confirmed} confirmada{confirmed > 1 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div style={{
        background: '#111111', border: '1px solid #1E1E1E',
        borderRadius: 12, padding: '16px 20px',
        marginBottom: 20, display: 'flex', gap: 16,
        flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>DESDE</span>
          <input
            type="date" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>HASTA</span>
          <input
            type="date" value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={labelStyle}>ESTADO</span>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {stylists.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>ESTILISTA</span>
            <select value={stylistFilter} onChange={e => setStylistFilter(e.target.value)} style={inputStyle}>
              <option value="all">Todos los estilistas</option>
              {stylists.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {hasActiveFilters && (
          <button
            onClick={() => { setStatusFilter('all'); setStylistFilter('all') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid #252525',
              borderRadius: 8, padding: '7px 12px',
              color: '#555555', fontSize: '0.8rem',
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F5F5F5'; e.currentTarget.style.borderColor = '#3A3A3A' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555555'; e.currentTarget.style.borderColor = '#252525' }}
          >
            <X size={13} /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} className="dash-skeleton" style={{ height: 52 }} />
            ))}
          </div>
        ) : citas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 24px' }}>
            <CalendarX size={44} color="#282828" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p style={{
              color: '#444444', fontFamily: 'Syne, sans-serif',
              fontWeight: 700, fontSize: '0.95rem', marginBottom: 6,
            }}>
              Sin citas en este rango
            </p>
            <p style={{ color: '#333333', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif' }}>
              Ajusta los filtros para ver más resultados
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {/* Cabecera */}
            <div className="citas-grid-row" style={{ borderBottom: '1px solid #1A1A1A' }}>
              {['FECHA','HORA','CLIENTE','SERVICIO','ESTILISTA','ESTADO',''].map((h, i) => (
                <span key={i} style={labelStyle}>{h}</span>
              ))}
            </div>

            {/* Filas */}
            {citas.map((cita, i) => (
              <CitaRow
                key={cita.id}
                cita={cita}
                index={i}
                negocioName={negocioName}
                updating={updatingId === cita.id}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CitaRow({ cita, index, negocioName, updating, onAction }) {
  const stylist  = cita.stylists
  const service  = cita.services
  const colorIdx = (stylist?.name ?? 'X').charCodeAt(0) % AVATAR_COLORS.length
  const color    = AVATAR_COLORS[colorIdx]
  const canAct   = cita.status === 'pending' || cita.status === 'confirmed'

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

  return (
    <div
      className="citas-grid-row citas-data-row"
      style={{ animation: `fadeInUp 0.3s ease ${index * 35}ms forwards`, opacity: 0 }}
    >
      {/* Fecha */}
      <span style={{ color: '#666666', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif' }}>
        {formatFecha(cita.date)}
      </span>

      {/* Hora */}
      <span style={{ color: 'var(--accent)', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 700 }}>
        {formatHora(cita.start_time)}
      </span>

      {/* Cliente */}
      <div style={{ minWidth: 0 }}>
        <p style={{
          color: '#F5F5F5', fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {cita.client_name}
        </p>
        {cita.client_phone && (
          <p style={{ color: '#444444', fontSize: '0.72rem', fontFamily: 'DM Sans, sans-serif' }}>
            {cita.client_phone}
          </p>
        )}
      </div>

      {/* Servicio */}
      <span style={{
        color: '#888888', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {service?.name ?? '—'}
      </span>

      {/* Estilista */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: color.bg, color: color.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.7rem',
          flexShrink: 0,
        }}>
          {(stylist?.name ?? 'S')[0].toUpperCase()}
        </div>
        <span style={{
          color: '#888888', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {stylist?.name ?? '—'}
        </span>
      </div>

      {/* Estado */}
      <span className={`status-badge ${cita.status}`}>
        {STATUS_LABELS[cita.status] ?? cita.status}
      </span>

      {/* Acciones */}
      <div className="citas-row-actions" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {updating ? (
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid transparent', borderTopColor: 'var(--accent)',
            animation: 'spin 0.7s linear infinite',
          }} />
        ) : (
          <>
            {cita.client_phone && (
              <ActionBtn
                label={<><MessageCircle size={11} /> Recordar</>}
                color="#25D366" bg="rgba(37,211,102,0.08)" border="rgba(37,211,102,0.25)"
                onClick={handleRecordar}
              />
            )}
            {cita.status === 'pending' && (
              <ActionBtn label="Confirmar" color="var(--accent)" bg="rgba(var(--accent-rgb),0.1)" border="rgba(var(--accent-rgb),0.3)" onClick={() => onAction(cita.id, 'confirmed')} />
            )}
            {cita.status === 'confirmed' && (
              <ActionBtn label="Completar" color="#AAAAAA" bg="rgba(136,136,136,0.1)" border="rgba(136,136,136,0.3)" onClick={() => onAction(cita.id, 'completed')} />
            )}
            {canAct && (
              <ActionBtn label="Cancelar" color="#FF4D4D" bg="rgba(255,77,77,0.08)" border="rgba(255,77,77,0.25)" onClick={() => onAction(cita.id, 'cancelled')} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ label, color, bg, border, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        border: `1px solid ${border}`, borderRadius: 6,
        padding: '4px 10px', fontSize: '0.72rem',
        cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        fontWeight: 600, background: bg, color,
        transition: 'opacity 0.15s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {label}
    </button>
  )
}

