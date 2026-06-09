import { useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function toYMD(d) {
  return d.toISOString().split('T')[0]
}

export default function ReporteSemanal({ businessId }) {
  const [reporte,           setReporte]           = useState(null)
  const [generandoReporte,  setGenerandoReporte]  = useState(false)

  async function generarReporte() {
    if (!businessId) return
    setGenerandoReporte(true)

    const hoy = new Date()
    // Lunes de esta semana
    const lunesEstaSemana = new Date(hoy)
    lunesEstaSemana.setDate(hoy.getDate() - hoy.getDay() + 1)

    // Lunes y domingo de la semana ANTERIOR
    const lunesSemanaAnterior = new Date(lunesEstaSemana)
    lunesSemanaAnterior.setDate(lunesEstaSemana.getDate() - 7)
    const domingoSemanaAnterior = new Date(lunesEstaSemana)
    domingoSemanaAnterior.setDate(lunesEstaSemana.getDate() - 1)

    const desde = toYMD(lunesSemanaAnterior)
    const hasta = toYMD(domingoSemanaAnterior)

    const { data: citasSemana } = await supabase
      .from('appointments')
      .select('*, services(price)')
      .eq('business_id', businessId)
      .gte('date', desde)
      .lte('date', hasta)

    const desdeAnterior = new Date(lunesSemanaAnterior)
    desdeAnterior.setDate(desdeAnterior.getDate() - 7)
    const hastaAnterior = new Date(lunesSemanaAnterior)
    hastaAnterior.setDate(hastaAnterior.getDate() - 1)

    const { data: citasAnteriores } = await supabase
      .from('appointments')
      .select('id')
      .eq('business_id', businessId)
      .gte('date', toYMD(desdeAnterior))
      .lte('date', toYMD(hastaAnterior))
      .eq('status', 'completed')

    if (!citasSemana) { setGenerandoReporte(false); return }

    const completadas = citasSemana.filter(c => c.status === 'completed')
    const canceladas  = citasSemana.filter(c => c.status === 'cancelled')
    const ingresos    = completadas.reduce((sum, c) => sum + (Number(c.final_price ?? c.services?.price) || 0), 0)
    const ingresosFormato = new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(ingresos)

    const porDia = {}
    completadas.forEach(c => { porDia[c.date] = (porDia[c.date] || 0) + 1 })
    const mejorDia = Object.entries(porDia).sort((a, b) => b[1] - a[1])[0]
    const nombresDias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
    const mejorDiaNombre = mejorDia
      ? nombresDias[new Date(mejorDia[0] + 'T12:00:00').getDay()]
      : null

    const variacion = citasAnteriores?.length
      ? Math.round(((completadas.length - citasAnteriores.length) / citasAnteriores.length) * 100)
      : null

    setReporte({
      desde, hasta,
      completadas:   completadas.length,
      canceladas:    canceladas.length,
      ingresos:      ingresosFormato,
      mejorDia:      mejorDiaNombre,
      mejorDiaCitas: mejorDia?.[1],
      variacion,
    })
    setGenerandoReporte(false)
  }

  return (
    <div style={{
      background: '#111111', border: '1px solid #1E1E1E',
      borderRadius: '16px', padding: '20px', marginBottom: 24,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: reporte ? '16px' : '0',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart2 size={18} color="var(--accent)" />
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', margin: 0, color: '#F5F5F5', fontWeight: 700 }}>
            Reporte semanal
          </h3>
        </div>
        <button
          onClick={generarReporte}
          disabled={generandoReporte || !businessId}
          style={{
            padding: '7px 14px', background: '#0D3320',
            border: '1px solid var(--accent)', borderRadius: '8px',
            color: 'var(--accent)', fontSize: '12px', fontWeight: 600,
            cursor: generandoReporte ? 'wait' : 'pointer',
            fontFamily: 'DM Sans, sans-serif', opacity: generandoReporte ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {generandoReporte ? 'Generando…' : '📊 Generar reporte'}
        </button>
      </div>

      {reporte && (
        <div>
          <p style={{ fontSize: '11px', color: '#555', marginBottom: '14px', fontFamily: 'DM Sans, sans-serif' }}>
            Semana del {reporte.desde} al {reporte.hasta}
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px', marginBottom: '14px',
          }}>
            {[
              { label: 'Citas completadas', value: reporte.completadas, icon: '✅' },
              { label: 'Ingresos',          value: reporte.ingresos,    icon: '💰' },
              { label: 'Cancelaciones',     value: reporte.canceladas,  icon: '❌' },
              { label: 'Mejor día',         value: reporte.mejorDia ? `${reporte.mejorDia} (${reporte.mejorDiaCitas})` : '—', icon: '🏆' },
            ].map(item => (
              <div key={item.label} style={{
                background: '#1a1a1a', borderRadius: '10px', padding: '12px',
              }}>
                <p style={{ fontSize: '11px', color: '#555', margin: '0 0 4px', fontFamily: 'DM Sans, sans-serif' }}>
                  {item.icon} {item.label}
                </p>
                <p style={{ fontSize: '18px', fontFamily: 'Syne, sans-serif', fontWeight: 700, margin: 0, color: '#F5F5F5' }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {reporte.variacion !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: reporte.variacion >= 0 ? '#0D3320' : '#2a0a0a',
              borderRadius: '8px', padding: '10px 14px',
              border: `1px solid ${reporte.variacion >= 0 ? 'rgba(0,255,136,0.2)' : 'rgba(255,77,77,0.2)'}`,
            }}>
              <span style={{ fontSize: '16px' }}>
                {reporte.variacion >= 0 ? '📈' : '📉'}
              </span>
              <span style={{
                fontSize: '13px', fontWeight: 600,
                color: reporte.variacion >= 0 ? 'var(--accent)' : '#FF4D4D',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                {reporte.variacion >= 0 ? '+' : ''}{reporte.variacion}% vs semana anterior
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
