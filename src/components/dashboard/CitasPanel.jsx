import { useState, useEffect, useMemo } from 'react'
import { CalendarX, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { sendWhatsApp, whatsAppLink, msgRecordatorio, normalizePhone } from '../../lib/whatsapp'

const STATUS_OPTIONS = [
  { value: 'all',       label: 'Todos los estados' },
  { value: 'pending',   label: 'Pendientes'        },
  { value: 'confirmed', label: 'Confirmadas'       },
  { value: 'completed', label: 'Completadas'       },
  { value: 'cancelled', label: 'Canceladas'        },
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

export default function CitasPanel({ businessId, stylists = [], negocioName }) {
  const [tabActiva,   setTabActiva]   = useState('pendientes')
  const [citas,       setCitas]       = useState([])
  const [cargando,    setCargando]    = useState(true)
  const [updatingId,  setUpdatingId]  = useState(null)

  // Filtros (solo se usan en la tab "todas")
  const [dateFrom,      setDateFrom]      = useState(getDefaultFrom)
  const [dateTo,        setDateTo]        = useState(getDefaultTo)
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [stylistFilter, setStylistFilter] = useState('all')

  useEffect(() => {
    if (!businessId) return
    let cancelled = false

    const cargar = async () => {
      const { data } = await supabase
        .from('appointments')
        .select('*, services(name), stylists(name)')
        .eq('business_id', businessId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
      if (!cancelled) {
        setCitas(data || [])
        setCargando(false)
      }
    }
    cargar()

    const channel = supabase
      .channel(`citas-realtime-${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `business_id=eq.${businessId}`,
      }, () => cargar())
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [businessId])

  const hoy = toYMD(new Date())

  const citasPendientes = useMemo(() =>
    citas
      .filter(c => c.status === 'pending' && c.date >= hoy)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? '')),
    [citas, hoy]
  )

  const citasHoy = useMemo(() =>
    citas
      .filter(c => c.date === hoy)
      .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
    [citas, hoy]
  )

  const citasTodas = useMemo(() => {
    return citas.filter(c => {
      if (c.date < dateFrom || c.date > dateTo) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (stylistFilter !== 'all' && (c.stylist_id ?? c.stylists?.id) !== stylistFilter) return false
      return true
    })
  }, [citas, dateFrom, dateTo, statusFilter, stylistFilter])

  const citasActivas =
    tabActiva === 'pendientes' ? citasPendientes :
    tabActiva === 'hoy'        ? citasHoy        :
                                 citasTodas

  async function actualizarEstado(citaId, newStatus) {
    setUpdatingId(citaId)
    await supabase.from('appointments').update({ status: newStatus }).eq('id', citaId)
    setCitas(prev => prev.map(c => c.id === citaId ? { ...c, status: newStatus } : c))

    if (newStatus === 'cancelled') {
      const cita = citas.find(c => c.id === citaId)
      if (cita) {
        supabase.functions.invoke('send-waitlist-notify', {
          body: {
            businessId:  cita.business_id,
            stylistId:   cita.stylist_id,
            date:        cita.date,
            startTime:   cita.start_time,
            serviceName: cita.services?.name ?? 'el servicio',
          }
        }).catch(() => {})
      }
    }

    // Trigger de fidelización al completar
    if (newStatus === 'completed') {
      const cita = citas.find(c => c.id === citaId)
      if (cita?.business_id && cita?.client_phone) {
        try {
          const { data: neg } = await supabase
            .from('businesses')
            .select('loyalty_enabled, loyalty_visits, slug')
            .eq('id', cita.business_id)
            .maybeSingle()

          if (neg?.loyalty_enabled) {
            const { data: cliente } = await supabase
              .from('clients')
              .select('visit_count, name, phone')
              .eq('business_id', cita.business_id)
              .eq('phone', cita.client_phone)
              .maybeSingle()

            const visitas = cliente?.visit_count ?? 0
            if (visitas === neg.loyalty_visits - 1) {
              const nombre = (cliente?.name ?? cita.client_name ?? 'cliente').split(' ')[0]
              const msg =
                `🎉 *¡${nombre}, tu próxima cita es GRATIS!*\n\n` +
                `Llevas ${visitas} visitas con nosotros. 🙌\n\n` +
                `Tu cita #${neg.loyalty_visits} no te cuesta nada.\n` +
                `Agéndala aquí 👉 turnott.com/${neg.slug}\n\n` +
                `_¡Gracias por tu fidelidad!_ ❤️`
              sendWhatsApp(normalizePhone(cita.client_phone), msg)
            }
          }
        } catch (_) { /* fire-and-forget */ }
      }
    }

    setUpdatingId(null)
  }

  const handleConfirmar = (id) => actualizarEstado(id, 'confirmed')
  const handleCancelar  = (id) => actualizarEstado(id, 'cancelled')
  const handleCompletar = (id) => actualizarEstado(id, 'completed')

  function handleRecordar(cita) {
    const msg = msgRecordatorio({
      clientName:  cita.client_name,
      negocioName: negocioName ?? 'el negocio',
      fecha:       cita.date,
      hora:        cita.start_time,
      servicio:    cita.services?.name ?? 'tu servicio',
      estilista:   cita.stylists?.name ?? '',
    })
    sendWhatsApp(normalizePhone(cita.client_phone), msg)
    window.open(whatsAppLink(cita.client_phone, msg), '_blank')
  }

  const hasActiveFilters = statusFilter !== 'all' || stylistFilter !== 'all'

  return (
    <div style={{ animation: 'fadeInUp 0.3s ease forwards', opacity: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#F5F5F5' }}>
          Todas las citas
        </h2>
      </div>

      {/* Tabs */}
      <div className="citas-tabs" style={{
        display: 'flex', gap: '8px', marginBottom: '20px',
        borderBottom: '1px solid #1E1E1E', paddingBottom: '0',
      }}>
        {[
          { id: 'pendientes', label: 'Pendientes', count: citasPendientes.length, accent: citasPendientes.length > 0 },
          { id: 'hoy',        label: 'Hoy',        count: citasHoy.length,        accent: false },
          { id: 'todas',      label: 'Todas',      count: citas.length,           accent: false },
        ].map(tab => {
          const isPendientesActivos = tab.id === 'pendientes' && tab.count > 0
          return (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              style={{
                padding: '10px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
                color: tabActiva === tab.id ? '#F5F5F5' : '#555',
                borderBottom: tabActiva === tab.id
                  ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'color 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  background: isPendientesActivos ? '#FF4D4D22' : '#1a1a1a',
                  color:      isPendientesActivos ? '#FF4D4D'   : '#888',
                  border: `1px solid ${isPendientesActivos ? '#FF4D4D44' : '#1E1E1E'}`,
                  borderRadius: '999px', fontSize: '11px',
                  fontWeight: 600, padding: '2px 8px',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Filtros solo en tab "Todas" */}
      {tabActiva === 'todas' && (
        <div style={{
          background: '#111111', border: '1px solid #1E1E1E',
          borderRadius: 12, padding: '16px 20px',
          marginBottom: 20, display: 'flex', gap: 16,
          flexWrap: 'wrap', alignItems: 'flex-end',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>DESDE</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>HASTA</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
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
              }}
            >
              <X size={13} /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0,1,2,3].map(i => (
            <div key={i} className="dash-skeleton" style={{ height: 92, borderRadius: 12 }} />
          ))}
        </div>
      ) : citasActivas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#444', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>
          {tabActiva === 'pendientes' && '✅ Sin citas pendientes — todo al día'}
          {tabActiva === 'hoy'        && '📅 Sin citas para hoy'}
          {tabActiva === 'todas'      && (
            <>
              <CalendarX size={44} color="#282828" style={{ margin: '0 auto 16px', display: 'block' }} />
              Aún no hay citas registradas
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {citasActivas.map(cita => (
            <CitaCard
              key={cita.id}
              cita={cita}
              updating={updatingId === cita.id}
              onConfirmar={handleConfirmar}
              onCancelar={handleCancelar}
              onCompletar={handleCompletar}
              onRecordar={handleRecordar}
              mostrarAcciones={tabActiva === 'pendientes' || tabActiva === 'hoy'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CitaCard({ cita, updating, onConfirmar, onCancelar, onCompletar, onRecordar, mostrarAcciones }) {
  const hoy   = new Date().toISOString().split('T')[0]
  const esHoy = cita.date === hoy

  const colorEstado = {
    pending:   '#F59E0B',
    confirmed: '#00FF88',
    completed: '#555',
    cancelled: '#FF4D4D',
  }[cita.status] ?? '#555'

  const labelEstado = {
    pending:   'Pendiente',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
  }[cita.status] ?? cita.status

  return (
    <div style={{
      background: '#111111',
      border: `1px solid ${cita.status === 'pending' ? '#F59E0B33' : '#1E1E1E'}`,
      borderRadius: '12px',
      padding: '16px',
      transition: 'border-color 0.2s',
      opacity: updating ? 0.5 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: '#050505',
              fontFamily: 'Syne, sans-serif', flexShrink: 0,
            }}>
              {cita.client_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#F5F5F5', margin: 0, fontFamily: 'DM Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cita.client_name}
              </p>
              <p style={{ fontSize: '12px', color: '#555', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
                {cita.client_phone}
              </p>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0', fontFamily: 'DM Sans, sans-serif' }}>
            {cita.services?.name ?? 'Servicio'} · {cita.stylists?.name ?? '—'}
          </p>
        </div>

        <span style={{
          background: `${colorEstado}22`,
          color: colorEstado,
          border: `1px solid ${colorEstado}44`,
          borderRadius: '6px', fontSize: '11px',
          fontWeight: 600, padding: '3px 8px', flexShrink: 0,
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {labelEstado}
        </span>
      </div>

      <div style={{
        display: 'flex', gap: '16px',
        fontSize: '13px', color: '#888', marginBottom: '12px',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <span>📅 {esHoy ? 'Hoy' : cita.date}</span>
        <span>🕐 {formatHora(cita.start_time)}</span>
      </div>

      {mostrarAcciones && cita.status === 'pending' && (
        <div className="cita-card-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            disabled={updating}
            onClick={() => onConfirmar(cita.id)}
            style={{
              flex: 1, padding: '9px',
              background: '#0D3320',
              border: '1px solid var(--accent)',
              borderRadius: '8px', color: 'var(--accent)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            ✅ Confirmar
          </button>
          <button
            disabled={updating}
            onClick={() => onCancelar(cita.id)}
            style={{
              flex: 1, padding: '9px',
              background: '#2a0a0a',
              border: '1px solid #FF4D4D44',
              borderRadius: '8px', color: '#FF4D4D',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            ❌ Cancelar
          </button>
        </div>
      )}

      {mostrarAcciones && cita.status === 'confirmed' && esHoy && (
        <div className="cita-card-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            disabled={updating}
            onClick={() => onCompletar(cita.id)}
            style={{
              flex: 1, padding: '9px',
              background: '#1a1a1a', border: '1px solid #1E1E1E',
              borderRadius: '8px', color: '#888',
              fontSize: '13px', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Completar
          </button>
          <button
            disabled={updating}
            onClick={() => onRecordar(cita)}
            style={{
              flex: 1, padding: '9px',
              background: '#0D3320', border: '1px solid var(--accent)',
              borderRadius: '8px', color: 'var(--accent)',
              fontSize: '13px', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            💬 Recordar
          </button>
        </div>
      )}
    </div>
  )
}
