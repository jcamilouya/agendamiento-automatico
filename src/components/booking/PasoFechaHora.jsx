import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const DIAS  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function minToTime(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
function timeToMin(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function formatHora(t) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

function tipoPromo(tiempo) {
  const h = parseInt(tiempo.split(':')[0])
  if (h >= 9 && h <= 10)  return 'mañana'
  if (h >= 12 && h <= 13) return 'mediodia'
  return null
}

const PROMO_CONFIG = {
  mañana:   { label: '⭐ Mañana',   color: '#F59E0B', bg: '#1C1500', border: '#78350F' },
  mediodia: { label: '🌅 Mediodía', color: '#A855F7', bg: '#1A0A2E', border: '#4C1D95' },
}

function generarSlots(disp, citas, bloques, duracion) {
  const ini = timeToMin(disp.start_time)
  const fin = timeToMin(disp.end_time)
  const slots = []
  let t = ini
  while (t + duracion <= fin) {
    const tFin = t + duracion
    const ocupado = [...citas, ...bloques].some(x =>
      t < timeToMin(x.end_time) && tFin > timeToMin(x.start_time)
    )
    slots.push({ tiempo: minToTime(t), disponible: !ocupado })
    t += duracion
  }
  return slots
}

export default function PasoFechaHora({ seleccion, onSeleccionar, onVolver }) {
  const hoy = new Date()
  const [mes, setMes]           = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  const [fechaSel, setFechaSel] = useState(null)
  const [slots, setSlots]       = useState([])
  const [diasDisp, setDiasDisp] = useState([])
  const [cargando, setCargando] = useState(false)
  const [hoveredDayIdx, setHoveredDayIdx] = useState(null)

  // Lista de espera
  const [mostrarWaitlist, setMostrarWaitlist] = useState(false)
  const [waitNombre, setWaitNombre]           = useState('')
  const [waitTelefono, setWaitTelefono]       = useState('')
  const [waitGuardando, setWaitGuardando]     = useState(false)
  const [waitOk, setWaitOk]                   = useState(false)

  const { servicio, estilista } = seleccion

  useEffect(() => {
    supabase.from('availability').select('day_of_week')
      .eq('stylist_id', estilista.id).eq('is_active', true)
      .then(({ data }) => data && setDiasDisp(data.map(d => d.day_of_week)))
  }, [estilista.id])

  useEffect(() => {
    if (fechaSel) cargarSlots(fechaSel)
  }, [fechaSel])

  async function cargarSlots(fecha) {
    setCargando(true); setSlots([])
    try {
      const diaSemana = new Date(fecha + 'T12:00:00').getDay()
      const { data: disp } = await supabase.from('availability').select('start_time, end_time')
        .eq('stylist_id', estilista.id).eq('day_of_week', diaSemana).eq('is_active', true).single()
      if (!disp) return
      const { data: citas }  = await supabase.from('appointments').select('start_time, end_time')
        .eq('stylist_id', estilista.id).eq('date', fecha).in('status', ['pending', 'confirmed'])
      const { data: bloques } = await supabase.from('time_blocks').select('start_time, end_time')
        .eq('stylist_id', estilista.id).eq('date', fecha)
      setSlots(generarSlots(disp, citas || [], bloques || [], servicio.duration_minutes))
    } finally { setCargando(false) }
  }

  function diasDelMes() {
    const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1).getDay()
    const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
    const dias = []
    for (let i = 0; i < primerDia; i++) dias.push(null)
    for (let d = 1; d <= ultimoDia; d++) dias.push(d)
    return dias
  }

  function fechaStr(dia) {
    return `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  function esDiaDisponible(dia) {
    if (!dia) return false
    const f = new Date(mes.getFullYear(), mes.getMonth(), dia)
    const hoyInicio = new Date(hoy); hoyInicio.setHours(0, 0, 0, 0)
    if (f < hoyInicio) return false
    return diasDisp.includes(f.getDay())
  }

  async function unirseAListaEspera() {
    if (!waitNombre.trim() || !waitTelefono.trim()) return
    setWaitGuardando(true)
    try {
      await supabase.from('waitlist').insert({
        business_id:         seleccion.estilista?.business_id ?? null,
        stylist_id:          seleccion.estilista?.id ?? null,
        service_id:          seleccion.servicio?.id ?? null,
        client_name:         waitNombre.trim(),
        client_phone:        waitTelefono.trim(),
        preferred_date:      fechaSel,
        status:              'waiting',
      })
      setWaitOk(true)
    } catch (err) {
      console.warn('[Waitlist]', err)
    } finally {
      setWaitGuardando(false)
    }
  }

  const slotsOcupados = slots.length > 0 && slots.every(s => !s.disponible)
  const dias = diasDelMes()

  return (
    <div>
      <button onClick={onVolver} style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px', padding: 0 }}>
        <ChevronLeft size={15} />
        <span style={{ fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif' }}>Volver</span>
      </button>

      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: '#F5F5F5', marginBottom: '4px' }}>
        Elige fecha y hora
      </h2>
      <p style={{ color: '#888888', fontSize: '0.875rem', marginBottom: '24px' }}>
        {estilista.name} · {servicio.name} · {servicio.duration_minutes} min
      </p>

      {/* Calendario */}
      <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
        {/* Nav mes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <button onClick={() => { setMes(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)); setFechaSel(null) }}
            style={{ background: '#1E1E1E', border: 'none', borderRadius: '8px', color: '#888888', cursor: 'pointer', padding: '6px 8px', lineHeight: 0, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
            onMouseLeave={e => e.currentTarget.style.background = '#1E1E1E'}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ color: '#F5F5F5', fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '0.95rem' }}>
            {MESES[mes.getMonth()]} {mes.getFullYear()}
          </span>
          <button onClick={() => { setMes(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)); setFechaSel(null) }}
            style={{ background: '#1E1E1E', border: 'none', borderRadius: '8px', color: '#888888', cursor: 'pointer', padding: '6px 8px', lineHeight: 0, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
            onMouseLeave={e => e.currentTarget.style.background = '#1E1E1E'}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Cabecera días */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
          {DIAS.map((d, i) => (
            <div key={d} style={{
              textAlign: 'center', padding: '4px 0',
              color: i === 0 ? '#553333' : '#444444',
              fontSize: '0.65rem', fontWeight: 600,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {dias.map((dia, i) => {
            if (!dia) return <div key={`e${i}`} />

            const f         = fechaStr(dia)
            const disp      = esDiaDisponible(dia)
            const sel       = fechaSel === f
            const isSunday  = new Date(mes.getFullYear(), mes.getMonth(), dia).getDay() === 0
            const showTooltip = isSunday && !disp && hoveredDayIdx === i

            return (
              <div key={dia} style={{ position: 'relative' }}>
                <button
                  onClick={() => disp && setFechaSel(f)}
                  disabled={!disp}
                  style={{
                    width: '100%',
                    background: sel ? '#00FF88' : 'transparent',
                    color: sel ? '#0A0A0A' : disp ? '#F5F5F5' : '#444444',
                    border: 'none',
                    borderRadius: '8px', padding: '9px 4px',
                    cursor: disp ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem', fontWeight: sel ? 700 : 400,
                    transition: 'all 0.15s ease',
                    fontFamily: 'DM Sans, sans-serif',
                    boxShadow: sel ? '0 0 16px rgba(61,255,168,0.35)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (disp && !sel) e.currentTarget.style.background = '#1E1E1E'
                    setHoveredDayIdx(i)
                  }}
                  onMouseLeave={e => {
                    if (disp && !sel) e.currentTarget.style.background = 'transparent'
                    setHoveredDayIdx(null)
                  }}
                >
                  {dia}
                </button>

                {/* Tooltip "Cerrado" para domingos */}
                {showTooltip && (
                  <div style={{
                    position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1E1E1E', border: '1px solid #333',
                    color: '#888888', fontSize: '0.62rem',
                    padding: '3px 8px', borderRadius: 4,
                    whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 20,
                  }}>
                    Cerrado
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Leyenda de promos */}
      {fechaSel && !cargando && slots.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {Object.entries(PROMO_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.color }} />
              <span style={{ color: '#666666', fontSize: '0.72rem' }}>{cfg.label} — Tarifa especial</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00FF88' }} />
            <span style={{ color: '#666666', fontSize: '0.72rem' }}>Disponible</span>
          </div>
        </div>
      )}

      {/* Slots de hora */}
      {fechaSel && (
        <div>
          {cargando ? (
            <p style={{ color: '#555555', fontSize: '0.875rem' }}>Cargando horarios...</p>
          ) : slots.length === 0 ? (
            <p style={{ color: '#555555', fontSize: '0.875rem' }}>Sin horarios disponibles para este día.</p>
          ) : (
            <div className="slots-grid">
              {slots.map(slot => {
                const promo = slot.disponible ? tipoPromo(slot.tiempo) : null
                const cfg   = promo ? PROMO_CONFIG[promo] : null

                let borderColor = '#1E1E1E'
                let bgColor     = '#111111'
                let textColor   = '#F5F5F5'

                if (!slot.disponible) {
                  borderColor = '#111111'; bgColor = '#0D0D0D'; textColor = '#2A2A2A'
                } else if (cfg) {
                  borderColor = cfg.border; bgColor = cfg.bg
                }

                return (
                  <button
                    key={slot.tiempo}
                    className="slot-btn"
                    onClick={() => slot.disponible && onSeleccionar(fechaSel, slot.tiempo)}
                    disabled={!slot.disponible}
                    style={{ background: bgColor, border: `1px solid ${borderColor}`, color: textColor }}
                    onMouseEnter={e => {
                      if (!slot.disponible) return
                      e.currentTarget.style.borderColor = '#00FF88'
                      e.currentTarget.style.color = '#00FF88'
                      e.currentTarget.style.boxShadow = '0 0 16px rgba(0,255,136,0.15)'
                    }}
                    onMouseLeave={e => {
                      if (!slot.disponible) return
                      e.currentTarget.style.borderColor = borderColor
                      e.currentTarget.style.color = textColor
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <span style={{
                      fontSize: '0.9rem', fontWeight: 600,
                      textDecoration: slot.disponible ? 'none' : 'line-through'
                    }}>
                      {formatHora(slot.tiempo)}
                    </span>
                    {cfg && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700,
                        color: cfg.color, letterSpacing: '0.03em'
                      }}>
                        {cfg.label}
                      </span>
                    )}
                    {!slot.disponible && (
                      <span style={{ fontSize: '0.6rem', color: '#2A2A2A' }}>Ocupado</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Botón lista de espera cuando todos los slots están ocupados */}
          {slotsOcupados && !mostrarWaitlist && !waitOk && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ color: '#666666', fontSize: '0.82rem', marginBottom: '12px' }}>
                Todo el día está lleno 😔
              </p>
              <button
                onClick={() => setMostrarWaitlist(true)}
                style={{
                  background: 'rgba(0,255,136,0.08)', color: '#00FF88',
                  border: '1px solid rgba(0,255,136,0.25)', borderRadius: '10px',
                  padding: '10px 20px', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.85rem',
                  fontFamily: 'DM Sans, sans-serif',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Clock size={15} /> Unirme a lista de espera
              </button>
            </div>
          )}

          {/* Formulario de lista de espera */}
          {mostrarWaitlist && !waitOk && (
            <div style={{
              marginTop: '20px',
              background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)',
              borderRadius: '12px', padding: '20px',
              animation: 'fadeSlideIn 0.25s ease',
            }}>
              <p style={{ color: '#00FF88', fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
                Lista de espera
              </p>
              <p style={{ color: '#666666', fontSize: '0.78rem', marginBottom: '16px' }}>
                Te avisamos por WhatsApp si se libera un cupo para este día
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  className="dash-input"
                  placeholder="Tu nombre"
                  value={waitNombre}
                  onChange={e => setWaitNombre(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <input
                  className="dash-input"
                  placeholder="WhatsApp (3001234567)"
                  value={waitTelefono}
                  onChange={e => setWaitTelefono(e.target.value)}
                  type="tel"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={unirseAListaEspera}
                    disabled={waitGuardando || !waitNombre || !waitTelefono}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '8px',
                      background: '#00FF88', color: '#050505',
                      border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.88rem',
                      fontFamily: 'DM Sans, sans-serif',
                      opacity: waitGuardando ? 0.7 : 1,
                    }}
                  >
                    {waitGuardando ? 'Guardando...' : 'Apuntarme'}
                  </button>
                  <button
                    onClick={() => setMostrarWaitlist(false)}
                    style={{
                      padding: '12px 16px', borderRadius: '8px',
                      background: 'none', color: '#666666',
                      border: '1px solid #1E1E1E', cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirmación de lista de espera */}
          {waitOk && (
            <div style={{
              marginTop: '20px', textAlign: 'center',
              background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)',
              borderRadius: '12px', padding: '20px',
              animation: 'fadeSlideIn 0.25s ease',
            }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🎉</p>
              <p style={{ color: '#00FF88', fontWeight: 700, marginBottom: '4px' }}>
                ¡Listo! Ya estás en la lista
              </p>
              <p style={{ color: '#666666', fontSize: '0.8rem' }}>
                Te mandamos un WhatsApp si se libera un cupo
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
