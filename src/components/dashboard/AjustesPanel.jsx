import { useState, useRef } from 'react'
import { Palette, GripVertical, LayoutDashboard, Calendar, BarChart2 } from 'lucide-react'
import { BUSINESS_TYPE_LIST } from '../../config/businessTypes'

const ACCENT_PRESETS = [
  { color: '#00FF88', label: 'Verde eléctrico (TURNO)' },
  { color: '#FF6B9D', label: 'Rosa (salón de belleza)' },
  { color: '#C084FC', label: 'Morado (nail studio)' },
  { color: '#34D399', label: 'Esmeralda (spa)' },
  { color: '#FB923C', label: 'Naranja (tatuajes)' },
]

const WIDGET_META = {
  kpis:     { label: 'KPI Cards',         icon: LayoutDashboard },
  agenda:   { label: 'Agenda y semana',   icon: Calendar        },
  graficos: { label: 'Gráficos rápidos',  icon: BarChart2       },
}

export default function AjustesPanel({ accentColor, onAccentChange, widgetOrder, onWidgetOrderChange }) {
  const [customColor, setCustomColor]     = useState(accentColor)
  const [dragging, setDragging]           = useState(null)
  const [dragOver, setDragOver]           = useState(null)
  const dragItem                          = useRef(null)
  const dragOverItem                      = useRef(null)

  function applyAccent(color) {
    document.documentElement.style.setProperty('--accent', color)
    onAccentChange(color)
  }

  // HTML5 Drag & Drop para los widgets
  function handleDragStart(e, idx) {
    dragItem.current = idx
    setDragging(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnter(e, idx) {
    e.preventDefault()
    dragOverItem.current = idx
    setDragOver(idx)
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) {
      setDragging(null); setDragOver(null); return
    }
    const order = [...widgetOrder]
    const [moved] = order.splice(dragItem.current, 1)
    order.splice(dragOverItem.current, 0, moved)
    onWidgetOrderChange(order)
    dragItem.current = null
    dragOverItem.current = null
    setDragging(null)
    setDragOver(null)
  }

  return (
    <div style={{ maxWidth: 580 }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: '#F5F5F5', marginBottom: '4px' }}>
        Personalizar
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '28px' }}>
        Ajusta colores y layout a tu gusto — los cambios se guardan automáticamente
      </p>

      {/* ── Color de acento ── */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Palette size={16} color="var(--accent)" />
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.95rem', color: '#F5F5F5' }}>
            Color de acento
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {ACCENT_PRESETS.map(({ color, label }) => (
            <button
              key={color}
              title={label}
              onClick={() => { setCustomColor(color); applyAccent(color) }}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: color,
                border: accentColor === color
                  ? `3px solid #fff`
                  : '3px solid transparent',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                boxShadow: accentColor === color
                  ? `0 0 12px ${color}80`
                  : 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            />
          ))}

          {/* Color custom */}
          <label title="Color personalizado" style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: '2px dashed rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden', position: 'relative',
          }}>
            <input
              type="color"
              value={customColor}
              onChange={e => { setCustomColor(e.target.value); applyAccent(e.target.value) }}
              style={{
                position: 'absolute', inset: 0,
                opacity: 0, cursor: 'pointer', width: '100%', height: '100%',
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', pointerEvents: 'none' }}>+</span>
          </label>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
          Color actual: <span style={{ color: accentColor, fontWeight: 600 }}>{accentColor}</span>
        </p>
      </section>

      {/* ── Orden de widgets ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <GripVertical size={16} color="var(--accent)" />
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.95rem', color: '#F5F5F5' }}>
            Orden de widgets
          </h3>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', marginBottom: '14px' }}>
          Arrastra para reorganizar la pantalla de inicio
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {widgetOrder.map((id, idx) => {
            const meta = WIDGET_META[id]
            if (!meta) return null
            const Icon = meta.icon
            const isDrag = dragging === idx
            const isOver = dragOver === idx

            return (
              <div
                key={id}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragEnter={e => handleDragEnter(e, idx)}
                onDragOver={e => e.preventDefault()}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px',
                  background: isDrag
                    ? 'rgba(0,255,136,0.08)'
                    : isOver
                    ? 'rgba(255,255,255,0.07)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isDrag ? 'rgba(0,255,136,0.3)' : isOver ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '10px',
                  cursor: 'grab',
                  transition: 'all 0.15s ease',
                  opacity: isDrag ? 0.7 : 1,
                  transform: isDrag ? 'scale(0.98)' : 'scale(1)',
                  userSelect: 'none',
                }}
              >
                <GripVertical size={16} color="rgba(255,255,255,0.25)" />
                <Icon size={16} color="var(--accent)" />
                <span style={{ color: '#F5F5F5', fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif' }}>
                  {meta.label}
                </span>
                <span style={{
                  marginLeft: 'auto', color: 'rgba(255,255,255,0.25)',
                  fontSize: '0.72rem', fontFamily: 'DM Sans, sans-serif',
                }}>
                  #{idx + 1}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
