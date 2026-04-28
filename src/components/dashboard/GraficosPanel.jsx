import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { supabase } from '../../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toYMD(d) {
  return d.toISOString().split('T')[0]
}

function formatCOP(v) {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000)     return '$' + Math.round(v / 1_000) + 'k'
  return '$' + Math.round(v).toLocaleString('es-CO')
}

function formatCOPFull(v) {
  return '$' + Math.round(v).toLocaleString('es-CO')
}

const tooltipStyle = {
  contentStyle: {
    background: '#1A1A1A', border: '1px solid #2A2A2A',
    borderRadius: 8, fontFamily: 'DM Sans, sans-serif', fontSize: 13,
  },
  labelStyle: { color: '#F5F5F5', fontWeight: 600 },
  cursor: { fill: 'rgba(61,255,168,0.04)' },
}

// ── Date range ────────────────────────────────────────────────────────────────

function getDateRange(period) {
  const today = new Date()
  const endDate = toYMD(today)
  let startDate

  if (period === 'week') {
    const diff = today.getDay() === 0 ? -6 : 1 - today.getDay()
    const mon = new Date(today)
    mon.setDate(today.getDate() + diff)
    startDate = toYMD(mon)
  } else if (period === 'month') {
    const d = new Date(today)
    d.setDate(d.getDate() - 29)
    startDate = toYMD(d)
  } else {
    const d = new Date(today)
    d.setDate(d.getDate() - 89)
    startDate = toYMD(d)
  }

  return { startDate, endDate }
}

// ── Data builders ─────────────────────────────────────────────────────────────

function buildKPIs(data) {
  const total     = data.length
  const completed = data.filter(a => a.status === 'completed')
  const cancelled = data.filter(a => a.status === 'cancelled').length
  const ingresos  = completed.reduce((s, a) => s + Number(a.services?.price ?? 0), 0)
  const ticket    = completed.length > 0 ? ingresos / completed.length : 0
  const cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0
  return { ingresos, total, ticket, cancelRate, completedCount: completed.length }
}

function buildTrend(data, period) {
  if (period === 'week') {
    const labels = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
    const map = {}
    labels.forEach(l => { map[l] = { label: l, citas: 0, ingresos: 0 } })
    data.forEach(a => {
      if (a.status === 'cancelled') return
      const d   = new Date(a.date + 'T12:00:00')
      const key = labels[d.getDay() === 0 ? 6 : d.getDay() - 1]
      map[key].citas++
      if (a.status === 'completed') map[key].ingresos += Number(a.services?.price ?? 0)
    })
    return labels.map(l => map[l])
  }

  if (period === 'month') {
    const today = new Date()
    const days  = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      days.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, ymd: toYMD(d), citas: 0, ingresos: 0 })
    }
    data.forEach(a => {
      if (a.status === 'cancelled') return
      const entry = days.find(r => r.ymd === a.date)
      if (entry) {
        entry.citas++
        if (a.status === 'completed') entry.ingresos += Number(a.services?.price ?? 0)
      }
    })
    return days.map(({ label, citas, ingresos }) => ({ label, citas, ingresos }))
  }

  // quarter — group by week
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 89)
  const weeks = []
  for (let w = 0; w < 13; w++) {
    const ws = new Date(start); ws.setDate(start.getDate() + w * 7)
    const we = new Date(ws);    we.setDate(ws.getDate() + 6)
    weeks.push({ label: `S${w + 1}`, startYmd: toYMD(ws), endYmd: toYMD(we), citas: 0, ingresos: 0 })
  }
  data.forEach(a => {
    if (a.status === 'cancelled') return
    const week = weeks.find(w => a.date >= w.startYmd && a.date <= w.endYmd)
    if (week) {
      week.citas++
      if (a.status === 'completed') week.ingresos += Number(a.services?.price ?? 0)
    }
  })
  return weeks.map(({ label, citas, ingresos }) => ({ label, citas, ingresos }))
}

function buildServiciosData(data) {
  const map = {}
  data.forEach(a => {
    if (a.status === 'cancelled') return
    const name = a.services?.name ?? 'Sin servicio'
    if (!map[name]) map[name] = { nombre: name, citas: 0, ingresos: 0 }
    map[name].citas++
    if (a.status === 'completed') map[name].ingresos += Number(a.services?.price ?? 0)
  })
  return Object.values(map).sort((a, b) => b.citas - a.citas).slice(0, 6)
}

function buildStylistsData(data) {
  const map = {}
  data.forEach(a => {
    if (a.status === 'cancelled') return
    const name = a.stylists?.name ?? 'Sin estilista'
    if (!map[name]) map[name] = { nombre: name, citas: 0, ingresos: 0 }
    map[name].citas++
    if (a.status === 'completed') map[name].ingresos += Number(a.services?.price ?? 0)
  })
  return Object.values(map).sort((a, b) => b.citas - a.citas)
}

function buildHorasPico(data) {
  const hours = {}
  for (let h = 8; h <= 19; h++) {
    hours[h] = { hora: h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`, citas: 0 }
  }
  data.forEach(a => {
    if (!a.start_time || a.status === 'cancelled') return
    const h = parseInt(a.start_time.split(':')[0])
    if (hours[h]) hours[h].citas++
  })
  return Object.values(hours)
}

function buildEstadoData(data) {
  return {
    total:    data.length,
    statuses: [
      { label: 'Pendientes',  value: data.filter(a => a.status === 'pending').length,   color: '#F59E0B' },
      { label: 'Confirmadas', value: data.filter(a => a.status === 'confirmed').length,  color: '#3DFFA8' },
      { label: 'Completadas', value: data.filter(a => a.status === 'completed').length,  color: '#888888' },
      { label: 'Canceladas',  value: data.filter(a => a.status === 'cancelled').length,  color: '#FF4D4D' },
    ],
  }
}

function buildRetencion(data) {
  const phoneCount = {}
  data.forEach(a => {
    if (!a.client_phone || a.status === 'cancelled') return
    phoneCount[a.client_phone] = (phoneCount[a.client_phone] ?? 0) + 1
  })
  const total      = Object.keys(phoneCount).length
  const recurrentes = Object.values(phoneCount).filter(c => c > 1).length
  return { total, nuevos: total - recurrentes, recurrentes }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MiniKPI({ label, value, sub, color }) {
  return (
    <div style={{
      background: '#111111', border: '1px solid #1E1E1E',
      borderRadius: 12, padding: '16px 20px',
    }}>
      <p style={{ color: '#555555', fontSize: '0.72rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 6 }}>
        {label}
      </p>
      <p style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800,
        fontSize: '1.45rem', color: color ?? '#F5F5F5', lineHeight: 1.1,
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ color: '#444444', fontSize: '0.68rem', fontFamily: 'DM Sans, sans-serif', marginTop: 4 }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function BarraHoriz({ label, value, max, color, delay, sub }) {
  const [width, setWidth] = useState(0)
  const pct = max > 0 ? Math.round((value / max) * 100) : 0

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay)
    return () => clearTimeout(t)
  }, [pct, delay])

  return (
    <div style={{ marginBottom: sub ? 18 : 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: '#888888', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
        <span style={{ color: '#F5F5F5', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>{value}</span>
      </div>
      <div style={{ background: '#1A1A1A', borderRadius: 999, height: 6, overflow: 'hidden' }}>
        <div style={{
          width: `${width}%`, background: color, height: '100%',
          borderRadius: 999, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 6px ${color}44`,
        }} />
      </div>
      {sub && (
        <p style={{ color: '#444', fontSize: '0.68rem', fontFamily: 'DM Sans, sans-serif', textAlign: 'right', marginTop: 4 }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function BarraEstado({ label, value, total, color, delay }) {
  const [width, setWidth] = useState(0)
  const pct = total > 0 ? Math.round((value / total) * 100) : 0

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay)
    return () => clearTimeout(t)
  }, [pct, delay])

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: '#888888', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
        <span style={{ color: '#F5F5F5', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
          {value} <span style={{ color: '#444', fontWeight: 400 }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ background: '#1A1A1A', borderRadius: 999, height: 6, overflow: 'hidden' }}>
        <div style={{
          width: `${width}%`, background: color, height: '100%',
          borderRadius: 999, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 6px ${color}44`,
        }} />
      </div>
    </div>
  )
}

// ── Period options ─────────────────────────────────────────────────────────────

const PERIODS = [
  { key: 'week',    label: 'Esta semana' },
  { key: 'month',   label: 'Últimos 30 días' },
  { key: 'quarter', label: 'Últimos 90 días' },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function GraficosPanel({ businessId }) {
  const [period,     setPeriod]     = useState('week')
  const [reportData, setReportData] = useState([])
  const [loading,    setLoading]    = useState(true)

  const loadData = useCallback(async (p) => {
    if (!businessId) return
    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange(p)
      const { data, error } = await supabase
        .from('appointments')
        .select('date, start_time, status, client_phone, stylists(id, name), services(id, name, price)')
        .eq('business_id', businessId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
      if (error) throw error
      setReportData(data ?? [])
    } catch (err) {
      console.error('Error cargando reportes:', err)
      setReportData([])
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { loadData(period) }, [loadData, period])

  // Derived data
  const kpis        = buildKPIs(reportData)
  const trendData   = buildTrend(reportData, period)
  const servicios   = buildServiciosData(reportData)
  const estilistas  = buildStylistsData(reportData)
  const horasPico   = buildHorasPico(reportData)
  const estadoData  = buildEstadoData(reportData)
  const retencion   = buildRetencion(reportData)

  const todayIdx    = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()
  const maxHora     = Math.max(...horasPico.map(h => h.citas), 1)
  const maxServicio = Math.max(...servicios.map(s => s.citas), 1)
  const maxEstilista = Math.max(...estilistas.map(s => s.citas), 1)
  const periodLabel = PERIODS.find(p => p.key === period)?.label ?? ''

  const xAxisInterval = period === 'month' ? 6 : period === 'quarter' ? 2 : 0

  if (!businessId || loading) {
    return (
      <div style={{ paddingBottom: 32 }}>
        <div className="dash-skeleton" style={{ height: 44, width: 320, borderRadius: 8, marginBottom: 24 }} />
        <div className="report-kpi-grid" style={{ marginBottom: 24 }}>
          {[0,1,2,3].map(i => <div key={i} className="dash-skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
        <div className="graficos-grid">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="dash-skeleton" style={{ height: 260, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* Header + period selector */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '1.4rem', color: '#F5F5F5', marginBottom: 4,
          }}>
            Reportes
          </h2>
          <p style={{ color: '#555555', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif' }}>
            {reportData.length} citas · {periodLabel}
          </p>
        </div>

        <div style={{
          display: 'flex', gap: 4,
          background: '#111111', border: '1px solid #1E1E1E',
          borderRadius: 10, padding: 4,
        }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '6px 14px', borderRadius: 7, border: 'none',
                background: period === p.key ? '#3DFFA8' : 'transparent',
                color: period === p.key ? '#0A0A0A' : '#888888',
                fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem',
                fontWeight: period === p.key ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI mini-cards */}
      <div className="report-kpi-grid" style={{ marginBottom: 24 }}>
        <MiniKPI label="Ingresos del período"   value={formatCOP(kpis.ingresos)}      color="#3DFFA8" />
        <MiniKPI label="Ticket promedio"         value={formatCOP(kpis.ticket)}        sub={`${kpis.completedCount} completadas`} />
        <MiniKPI label="Total citas"             value={String(kpis.total)} />
        <MiniKPI
          label="Tasa de cancelación"
          value={`${kpis.cancelRate}%`}
          color={kpis.cancelRate > 20 ? '#FF4D4D' : '#F5F5F5'}
        />
      </div>

      {/* Row 1: Tendencia citas + Tendencia ingresos */}
      <div className="graficos-grid">
        <div className="grafico-card" style={{ animationDelay: '0ms' }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#F5F5F5', marginBottom: 4 }}>
            Citas
          </p>
          <p style={{ color: '#555555', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 20 }}>
            {periodLabel} · sin canceladas
          </p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={trendData} barCategoryGap="35%">
              <XAxis
                dataKey="label"
                tick={{ fill: '#555555', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                axisLine={false} tickLine={false}
                interval={xAxisInterval}
              />
              <YAxis hide />
              <Tooltip
                {...tooltipStyle}
                formatter={v => [v + ' citas', '']}
                itemStyle={{ color: '#3DFFA8' }}
              />
              <Bar dataKey="citas" radius={[5,5,0,0]} maxBarSize={32} animationDuration={900} animationEasing="ease-out">
                {trendData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={period === 'week' && i === todayIdx ? '#3DFFA8' : '#1E2A22'}
                    stroke={period === 'week' && i === todayIdx ? '#3DFFA8' : 'transparent'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grafico-card" style={{ animationDelay: '120ms' }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#F5F5F5', marginBottom: 4 }}>
            Ingresos
          </p>
          <p style={{ color: '#555555', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 20 }}>
            Solo completadas · {periodLabel}
          </p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={trendData} barCategoryGap="35%">
              <XAxis
                dataKey="label"
                tick={{ fill: '#555555', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                axisLine={false} tickLine={false}
                interval={xAxisInterval}
              />
              <YAxis hide />
              <Tooltip
                {...tooltipStyle}
                formatter={v => [formatCOPFull(v), '']}
                itemStyle={{ color: '#F59E0B' }}
              />
              <Bar dataKey="ingresos" radius={[5,5,0,0]} maxBarSize={32} animationDuration={900} animationEasing="ease-out">
                {trendData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={period === 'week' && i === todayIdx ? '#F59E0B' : '#2A2000'}
                    stroke={period === 'week' && i === todayIdx ? '#F59E0B' : 'transparent'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Servicios + Estilistas */}
      <div className="graficos-grid">
        <div className="grafico-card" style={{ animationDelay: '240ms' }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#F5F5F5', marginBottom: 4 }}>
            Servicios más solicitados
          </p>
          <p style={{ color: '#555555', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 20 }}>
            Por número de citas
          </p>
          {servicios.length === 0 ? (
            <p style={{ color: '#333', fontSize: '0.85rem', textAlign: 'center', padding: '32px 0', fontFamily: 'DM Sans, sans-serif' }}>
              Sin datos en este período
            </p>
          ) : (
            servicios.map((s, i) => (
              <BarraHoriz
                key={s.nombre}
                label={s.nombre}
                value={s.citas}
                max={maxServicio}
                color="#3DFFA8"
                delay={300 + i * 80}
                sub={formatCOP(s.ingresos) + ' generados'}
              />
            ))
          )}
        </div>

        <div className="grafico-card" style={{ animationDelay: '360ms' }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#F5F5F5', marginBottom: 4 }}>
            Rendimiento por estilista
          </p>
          <p style={{ color: '#555555', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 20 }}>
            Citas atendidas
          </p>
          {estilistas.length === 0 ? (
            <p style={{ color: '#333', fontSize: '0.85rem', textAlign: 'center', padding: '32px 0', fontFamily: 'DM Sans, sans-serif' }}>
              Sin datos en este período
            </p>
          ) : (
            estilistas.map((s, i) => (
              <BarraHoriz
                key={s.nombre}
                label={s.nombre}
                value={s.citas}
                max={maxEstilista}
                color="#F59E0B"
                delay={400 + i * 80}
                sub={formatCOP(s.ingresos) + ' generados'}
              />
            ))
          )}
        </div>
      </div>

      {/* Row 3: Horas pico + Estado & Retención */}
      <div className="graficos-grid">
        <div className="grafico-card" style={{ animationDelay: '480ms' }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#F5F5F5', marginBottom: 4 }}>
            Horas pico
          </p>
          <p style={{ color: '#555555', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 20 }}>
            Distribución por hora de inicio
          </p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={horasPico} barCategoryGap="20%">
              <XAxis
                dataKey="hora"
                tick={{ fill: '#555555', fontSize: 10, fontFamily: 'DM Sans, sans-serif' }}
                axisLine={false} tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                {...tooltipStyle}
                formatter={v => [v + ' citas', '']}
                itemStyle={{ color: '#3DFFA8' }}
              />
              <Bar dataKey="citas" radius={[4,4,0,0]} maxBarSize={22} animationDuration={900} animationEasing="ease-out">
                {horasPico.map((h, i) => {
                  const isMax = h.citas === maxHora && h.citas > 0
                  return (
                    <Cell
                      key={i}
                      fill={isMax ? '#3DFFA8' : '#1E2A22'}
                      stroke={isMax ? '#3DFFA8' : 'transparent'}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grafico-card" style={{ animationDelay: '600ms' }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#F5F5F5', marginBottom: 4 }}>
            Estado de citas
          </p>
          <p style={{ color: '#555555', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 16 }}>
            {estadoData.total} total · {periodLabel}
          </p>

          {estadoData.total === 0 ? (
            <p style={{ color: '#333', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0', fontFamily: 'DM Sans, sans-serif' }}>
              Sin citas en este período
            </p>
          ) : (
            estadoData.statuses.map((s, i) => (
              <BarraEstado
                key={s.label}
                label={s.label}
                value={s.value}
                total={estadoData.total}
                color={s.color}
                delay={650 + i * 100}
              />
            ))
          )}

          {/* Retención */}
          <div style={{
            marginTop: 20, paddingTop: 16, borderTop: '1px solid #1A1A1A',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
          }}>
            <div>
              <p style={{ color: '#555555', fontSize: '0.68rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 4 }}>
                Clientes únicos
              </p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#F5F5F5' }}>
                {retencion.total}
              </p>
            </div>
            <div>
              <p style={{ color: '#555555', fontSize: '0.68rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 4 }}>
                Nuevos
              </p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#3DFFA8' }}>
                {retencion.nuevos}
              </p>
            </div>
            <div>
              <p style={{ color: '#555555', fontSize: '0.68rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 4 }}>
                Recurrentes
              </p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#F59E0B' }}>
                {retencion.recurrentes}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
