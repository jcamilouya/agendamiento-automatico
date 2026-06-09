import { useState, useRef } from 'react'
import { CalendarX, Clock, Plus, X, Loader2, Search, UserCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
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

function relTime(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 30) return `Hace ${days} días`
  const months = Math.floor(days / 30)
  if (months < 12) return `Hace ${months} mes${months > 1 ? 'es' : ''}`
  return `Hace ${Math.floor(months / 12)} año${Math.floor(months / 12) > 1 ? 's' : ''}`
}

// Color y glow de cada estado
function slotStyle(status, esProxima) {
  if (esProxima) return { bg: '#F59E0B', glow: 'rgba(245,158,11,0.5)', pulse: true }
  if (status === 'confirmed')  return { bg: 'var(--accent)', glow: 'rgba(var(--accent-rgb),0.4)', pulse: false }
  if (status === 'completed')  return { bg: '#444444', glow: 'transparent', pulse: false }
  if (status === 'cancelled')  return { bg: '#FF4D4D', glow: 'rgba(255,77,77,0.3)', pulse: false }
  return { bg: '#F59E0B', glow: 'rgba(245,158,11,0.35)', pulse: false } // pending
}

function pctDe(h) {
  return (h - HORA_INICIO) * 60 / TOTAL_MIN * 100
}
function labelHora(h) {
  if (h === 12) return '12pm'
  if (h === 0 || h === 24) return '12am'
  return h > 12 ? `${h-12}pm` : `${h}am`
}
const HORAS_ALL = (() => {
  const arr = []
  for (let h = HORA_INICIO; h <= HORA_FIN; h++) arr.push(h)
  return arr
})()

// Iniciales para fallback cuando no hay foto
function inicialesDe(nombre = '') {
  return nombre.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'
}

// ── Una fila por barbero: avatar + nombre a la izquierda, barra a la derecha ──
function TimelineRow({ stylist, citas, nowMin }) {
  const [tooltip, setTooltip] = useState(null)
  const nowPct  = Math.max(0, Math.min(100, (nowMin - HORA_INICIO * 60) / TOTAL_MIN * 100))
  const showNow = nowMin >= HORA_INICIO * 60 && nowMin <= HORA_FIN * 60

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '130px 1fr',
      alignItems: 'center', gap: 12,
    }}>
      {/* Identificación del barbero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
        {stylist.photo_url ? (
          <img
            src={stylist.photo_url}
            alt={stylist.name}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
              border: '1px solid rgba(var(--accent-rgb),0.25)',
            }}
          />
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(var(--accent-rgb),0.12)',
            border: '1px solid rgba(var(--accent-rgb),0.25)',
            color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.72rem',
            flexShrink: 0,
          }}>
            {inicialesDe(stylist.name)}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{
            color: '#F5F5F5', fontWeight: 600, fontSize: '0.78rem',
            fontFamily: 'DM Sans, sans-serif',
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {stylist.name}
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.35)', fontSize: '0.66rem',
            fontFamily: 'DM Sans, sans-serif',
            margin: '1px 0 0',
          }}>
            {citas.length} {citas.length === 1 ? 'cita' : 'citas'}
          </p>
        </div>
      </div>

      {/* Barra del día */}
      <div className="timeline-track" style={{
        position: 'relative',
        height: '34px',
        borderRadius: '8px',
        overflow: 'visible',
      }}>
        {/* Ticks horarios verticales */}
        {HORAS_ALL.map(h => {
          if (h === HORA_INICIO || h === HORA_FIN) return null
          const esMediodia = h === 12
          return (
            <div
              key={`tick-${h}`}
              className={`timeline-tick${esMediodia ? ' is-noon' : ''}`}
              style={{
                position: 'absolute',
                left: `${pctDe(h)}%`,
                top: 0, bottom: 0,
                width: '1px',
                pointerEvents: 'none',
              }}
            />
          )
        })}

        {/* Línea de hora actual */}
        {showNow && (
          <div style={{
            position: 'absolute',
            left: `${nowPct}%`,
            top: '-4px',
            bottom: '-4px',
            width: '2px',
            background: 'var(--accent)',
            boxShadow: '0 0 8px rgba(var(--accent-rgb),0.7)',
            zIndex: 10,
            borderRadius: '2px',
            pointerEvents: 'none',
          }} />
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
                top: '3px',
                bottom: '3px',
                background: bg,
                borderRadius: '5px',
                opacity: cita.status === 'completed' ? 0.5 : 0.85,
                boxShadow: glow !== 'transparent' ? `0 0 10px ${glow}` : 'none',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                animation: pulse ? 'accentPulse 2s ease-in-out infinite' : 'none',
                zIndex: 5,
              }}
            />
          )
        })}

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: Math.min(tooltip.x, 60) + '%',
            top: '40px',
            background: 'rgba(15,15,15,0.96)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            padding: '8px 12px',
            zIndex: 30,
            minWidth: '160px',
            pointerEvents: 'none',
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
    </div>
  )
}

// ── Contenedor: agrupa citas por estilista y comparte eje + leyenda ──
function TimelineBar({ citas }) {
  const now      = new Date()
  const nowMin   = now.getHours() * 60 + now.getMinutes()

  // Agrupar por estilista
  const grupos = {}
  citas.forEach(c => {
    const id = c.stylists?.id ?? c.stylist_id ?? 'sin-estilista'
    if (!grupos[id]) {
      grupos[id] = {
        id,
        name:      c.stylists?.name ?? 'Sin asignar',
        photo_url: c.stylists?.photo_url ?? null,
        citas:     [],
      }
    }
    grupos[id].citas.push(c)
  })
  const filas = Object.values(grupos).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div style={{ padding: '20px 24px 16px', position: 'relative' }}>
      <p className="timeline-section-title" style={{ fontSize: '0.72rem', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Línea del día por barbero — {labelHora(HORA_INICIO)} a {labelHora(HORA_FIN)}
      </p>

      {/* Filas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filas.map(g => (
          <TimelineRow
            key={g.id}
            stylist={{ name: g.name, photo_url: g.photo_url }}
            citas={g.citas}
            nowMin={nowMin}
          />
        ))}
      </div>

      {/* Eje de horas compartido — alineado con el inicio de las barras */}
      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, marginTop: 10 }}>
        <div />
        <div style={{ position: 'relative', height: '14px' }}>
          {HORAS_ALL.map(h => (
            <span
              key={h}
              className={`timeline-hour-label${h === 12 ? ' is-noon' : ''}`}
              style={{
                position: 'absolute',
                left: `${pctDe(h)}%`,
                transform: h === HORA_INICIO ? 'translateX(0)' :
                           h === HORA_FIN    ? 'translateX(-100%)' :
                                               'translateX(-50%)',
                fontSize: '0.62rem',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: h === 12 ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {labelHora(h)}
            </span>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: '14px', marginTop: '12px', flexWrap: 'wrap' }}>
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

const FORM_VACIO = { nombre: '', telefono: '', stylist_id: '', service_id: '' }

function WalkinModal({ stylists, services, businessId, onClose, onSubmit }) {
  const [busqueda,       setBusqueda]       = useState('')
  const [resultados,     setResultados]     = useState([])
  const [buscando,       setBuscando]       = useState(false)
  const [clienteElegido, setClienteElegido] = useState(null)
  const [form,           setForm]           = useState(FORM_VACIO)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState('')
  const timerRef = useRef(null)

  // Debounce 400ms para buscar clientes por nombre o teléfono
  useState(() => {
    return () => clearTimeout(timerRef.current)
  })

  function handleBusqueda(val) {
    setBusqueda(val)
    const q = val.trim()
    if (q.length < 2 || !businessId) { setResultados([]); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await supabase
          .from('clients')
          .select('id, name, phone, visit_count, last_visit_at')
          .eq('business_id', businessId)
          .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
          .order('last_visit_at', { ascending: false })
          .limit(5)
        setResultados(data ?? [])
      } catch { setResultados([]) }
      finally { setBuscando(false) }
    }, 400)
  }

  function seleccionarCliente(c) {
    setClienteElegido(c)
    setForm(f => ({ ...f, nombre: c.name || '', telefono: c.phone || '' }))
    setBusqueda('')
    setResultados([])
  }

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.stylist_id)    { setError('Selecciona un barbero'); return }
    if (!form.service_id)    { setError('Selecciona un servicio'); return }
    setSaving(true)
    setError('')
    try {
      await onSubmit(form)
      onClose()
    } catch (err) {
      setError(err?.message || err?.details || 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const inp = {
    width: '100%', boxSizing: 'border-box',
    background: '#0A0A0A', border: '1px solid #1E1E1E',
    borderRadius: 8, padding: '10px 12px',
    color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.875rem', outline: 'none',
  }
  const lbl = {
    display: 'block', color: 'rgba(255,255,255,0.45)',
    fontSize: '0.72rem', fontWeight: 600, marginBottom: 5,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    fontFamily: 'DM Sans, sans-serif',
  }

  const svcSeleccionado = services.find(s => s.id === form.service_id)
  const showResultados  = resultados.length > 0 || buscando

  return (
    <div className="dash-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dash-modal" style={{ maxWidth: 420, width: '100%' }}>
        {/* Header modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: '#F5F5F5', margin: 0 }}>
              Registrar walk-in
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', margin: '3px 0 0', fontFamily: 'DM Sans, sans-serif' }}>
              Cliente presencial · se registra como confirmada
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Búsqueda de cliente recurrente */}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Buscar cliente recurrente</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
            <input
              autoFocus
              placeholder="Nombre o teléfono…"
              value={busqueda}
              onChange={e => handleBusqueda(e.target.value)}
              style={{ ...inp, paddingLeft: 32 }}
            />
          </div>

          {showResultados && (
            <div style={{ marginTop: 4, background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 8, overflow: 'hidden' }}>
              {buscando ? (
                <p style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                  Buscando…
                </p>
              ) : resultados.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => seleccionarCliente(c)}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    padding: '10px 12px',
                    borderBottom: i < resultados.length - 1 ? '1px solid #1A1A1A' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <div>
                    <p style={{ color: '#F5F5F5', fontWeight: 600, fontSize: '0.82rem', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
                      {c.name}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', margin: '2px 0 0', fontFamily: 'DM Sans, sans-serif' }}>
                      {c.phone} · {relTime(c.last_visit_at)}
                    </p>
                  </div>
                  {c.visit_count > 0 && (
                    <span style={{
                      background: 'rgba(var(--accent-rgb),0.1)',
                      border: '1px solid rgba(var(--accent-rgb),0.2)',
                      color: 'var(--accent)', borderRadius: '999px',
                      padding: '2px 8px', fontSize: '0.68rem',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {c.visit_count} visitas
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Banner cliente seleccionado */}
        {clienteElegido && (
          <div style={{
            background: '#0D3320', border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            animation: 'fadeSlideIn 0.2s ease forwards',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck size={14} color="#00FF88" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ color: '#00FF88', fontWeight: 600, fontSize: '0.82rem', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
                  {clienteElegido.name}
                </p>
                {clienteElegido.visit_count > 0 && (
                  <p style={{ color: 'rgba(0,255,136,0.55)', fontSize: '0.72rem', margin: '1px 0 0', fontFamily: 'DM Sans, sans-serif' }}>
                    {clienteElegido.visit_count} visita{clienteElegido.visit_count !== 1 ? 's' : ''} · {relTime(clienteElegido.last_visit_at)}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setClienteElegido(null); setForm(FORM_VACIO) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,255,136,0.4)', padding: 2, flexShrink: 0 }}
              title="Limpiar selección"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nombre */}
          <div>
            <label style={lbl}>Nombre del cliente *</label>
            <input
              className="dash-input"
              placeholder="Ej: Juan García"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              style={inp}
            />
          </div>

          {/* Teléfono */}
          <div>
            <label style={lbl}>WhatsApp / Celular</label>
            <input
              className="dash-input"
              type="tel"
              placeholder="3001234567"
              value={form.telefono}
              onChange={e => set('telefono', e.target.value)}
              style={inp}
            />
          </div>

          {/* Barbero */}
          <div>
            <label style={lbl}>Barbero *</label>
            <select
              value={form.stylist_id}
              onChange={e => set('stylist_id', e.target.value)}
              style={{ ...inp, cursor: 'pointer' }}
            >
              <option value="">— Selecciona barbero —</option>
              {stylists.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Servicio */}
          <div>
            <label style={lbl}>Servicio *</label>
            <select
              value={form.service_id}
              onChange={e => set('service_id', e.target.value)}
              style={{ ...inp, cursor: 'pointer' }}
            >
              <option value="">— Selecciona servicio —</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.price ? ` · $${Number(s.price).toLocaleString('es-CO')}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Resumen precio */}
          {svcSeleccionado?.price && (
            <div style={{
              background: 'rgba(var(--accent-rgb),0.06)',
              border: '1px solid rgba(var(--accent-rgb),0.15)',
              borderRadius: 8, padding: '8px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif' }}>
                Ingreso a registrar
              </span>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'Syne, sans-serif' }}>
                ${Number(svcSeleccionado.price).toLocaleString('es-CO')}
              </span>
            </div>
          )}

          {error && (
            <p style={{ color: '#FF4D4D', fontSize: '0.8rem', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-mint"
            style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {saving
              ? <><Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> Guardando...</>
              : <><Plus size={15} /> Registrar venta</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AgendaHoy({ citas, loading, negocioName, onStatusChange, stylists = [], services = [], businessId, onAddWalkin }) {
  const hoy = new Date()
  const [showWalkin, setShowWalkin] = useState(false)

  return (
    <>
      {showWalkin && (
        <WalkinModal
          stylists={stylists}
          services={services}
          businessId={businessId}
          onClose={() => setShowWalkin(false)}
          onSubmit={onAddWalkin}
        />
      )}

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, overflow: 'hidden',
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
            {onAddWalkin && (
              <button
                onClick={() => setShowWalkin(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'var(--accent)', color: '#000',
                  border: 'none', borderRadius: 8,
                  padding: '5px 12px', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 700,
                  fontSize: '0.75rem',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03) translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--accent-glow)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <Plus size={13} /> Walk-in
              </button>
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
    </>
  )
}
