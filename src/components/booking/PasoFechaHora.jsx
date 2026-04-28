import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

// Retorna tipo de promoción según la hora
function tipoPromo(tiempo) {
  const h = parseInt(tiempo.split(':')[0])
  if (h >= 9 && h <= 10)  return 'mañana'   // Madrugón
  if (h >= 12 && h <= 13) return 'mediodia'  // Mediodía
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
    const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1); manana.setHours(0,0,0,0)
    if (f < manana) return false
    return diasDisp.includes(f.getDay())
  }

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
          {DIAS.map(d => (
            <div key={d} style={{ textAlign: 'center', color: '#444444', fontSize: '0.65rem', fontWeight: 600, padding: '4px 0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>

        {/* Días del mes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {dias.map((dia, i) => {
            if (!dia) return <div key={`e${i}`} />
            const f = fechaStr(dia)
            const disp = esDiaDisponible(dia)
            const sel  = fechaSel === f
            return (
              <button key={dia} onClick={() => disp && setFechaSel(f)} disabled={!disp}
                style={{
                  background: sel ? '#3DFFA8' : 'transparent',
                  color: sel ? '#0A0A0A' : disp ? '#F5F5F5' : '#2A2A2A',
                  border: sel ? 'none' : 'none',
                  borderRadius: '8px', padding: '9px 4px',
                  cursor: disp ? 'pointer' : 'default',
                  fontSize: '0.875rem', fontWeight: sel ? 700 : 400,
                  transition: 'all 0.15s ease',
                  fontFamily: 'DM Sans, sans-serif',
                  boxShadow: sel ? '0 0 16px rgba(61,255,168,0.35)' : 'none'
                }}
                onMouseEnter={e => { if (disp && !sel) e.currentTarget.style.background = '#1E1E1E' }}
                onMouseLeave={e => { if (disp && !sel) e.currentTarget.style.background = 'transparent' }}
              >
                {dia}
              </button>
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
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3DFFA8' }} />
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

                // Colores según estado
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
                      e.currentTarget.style.borderColor = '#3DFFA8'
                      e.currentTarget.style.color = '#3DFFA8'
                      e.currentTarget.style.boxShadow = '0 0 16px rgba(61,255,168,0.15)'
                    }}
                    onMouseLeave={e => {
                      if (!slot.disponible) return
                      e.currentTarget.style.borderColor = borderColor
                      e.currentTarget.style.color = textColor
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {/* Hora */}
                    <span style={{
                      fontSize: '0.9rem', fontWeight: 600,
                      textDecoration: slot.disponible ? 'none' : 'line-through'
                    }}>
                      {formatHora(slot.tiempo)}
                    </span>
                    {/* Badge promo */}
                    {cfg && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700,
                        color: cfg.color, letterSpacing: '0.03em'
                      }}>
                        {cfg.label}
                      </span>
                    )}
                    {/* Indicador ocupado */}
                    {!slot.disponible && (
                      <span style={{ fontSize: '0.6rem', color: '#2A2A2A' }}>Ocupado</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
