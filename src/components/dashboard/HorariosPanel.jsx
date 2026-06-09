import { useState, useEffect } from 'react'
import { Clock, CalendarOff, Tag, Plus, X, Trash2, Save, Check, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import TimePicker from '../TimePicker'

const DIAS = [
  { idx: 1, label: 'Lunes' },
  { idx: 2, label: 'Martes' },
  { idx: 3, label: 'Miércoles' },
  { idx: 4, label: 'Jueves' },
  { idx: 5, label: 'Viernes' },
  { idx: 6, label: 'Sábado' },
  { idx: 0, label: 'Domingo' },
]

const PROMO_COLORS = ['#F59E0B', '#A855F7', '#60A5FA', '#FF4D4D', '#00FF88', '#EC4899']

function defaultHorario() {
  return DIAS.map(d => ({
    day_of_week: d.idx,
    start_time:  '09:00',
    end_time:    '18:00',
    is_active:   d.idx !== 0,
  }))
}

function toYMD(d) { return d.toISOString().split('T')[0] }

export default function HorariosPanel({ businessId }) {
  const [tab, setTab] = useState('semana')

  return (
    <div style={{ animation: 'fadeInUp 0.3s ease forwards', opacity: 0 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#F5F5F5' }}>
          Horarios y promociones
        </h2>
        <p style={{ color: '#555555', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', marginTop: 3 }}>
          Controla los días, horas y descuentos de tu negocio
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #1A1A1A' }}>
        {[
          { id: 'semana',   label: 'Semana',      Icon: Clock },
          { id: 'bloqueos', label: 'Bloqueos',    Icon: CalendarOff },
          { id: 'promos',   label: 'Promociones', Icon: Tag },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none',
              padding: '10px 14px', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', fontWeight: 600,
              color: tab === id ? 'var(--accent)' : '#555',
              borderBottom: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1, transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'semana'   && <TabSemana businessId={businessId} />}
      {tab === 'bloqueos' && <TabBloqueos businessId={businessId} />}
      {tab === 'promos'   && <TabPromos businessId={businessId} />}
    </div>
  )
}

// ── TAB 1: Horario semanal ────────────────────────────────────────────────────

function TabSemana({ businessId }) {
  const [rows,     setRows]     = useState(defaultHorario())
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!businessId) return
    load()
  }, [businessId])

  async function load() {
    setLoading(true)
    // Tomamos el horario del primer estilista activo como representativo
    // (horarios son globales — todos los estilistas deberían tener lo mismo).
    const { data: stylists } = await supabase
      .from('stylists').select('id')
      .eq('business_id', businessId).eq('is_active', true)
      .limit(1)
    if (!stylists?.[0]) { setLoading(false); return }

    const { data } = await supabase
      .from('availability').select('*')
      .eq('stylist_id', stylists[0].id)

    if (data && data.length > 0) {
      const map = {}
      data.forEach(d => { map[d.day_of_week] = d })
      setRows(DIAS.map(d => {
        const r = map[d.idx]
        return r
          ? { day_of_week: d.idx, start_time: r.start_time.slice(0,5), end_time: r.end_time.slice(0,5), is_active: r.is_active }
          : { day_of_week: d.idx, start_time: '09:00', end_time: '18:00', is_active: false }
      }))
    }
    setLoading(false)
  }

  function updateRow(idx, patch) {
    setRows(r => r.map(row => row.day_of_week === idx ? { ...row, ...patch } : row))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      // Validación
      for (const r of rows) {
        if (r.is_active && r.start_time >= r.end_time) {
          throw new Error(`En ${DIAS.find(d => d.idx === r.day_of_week).label} la hora de cierre debe ser después de la apertura`)
        }
      }

      // Aplicar a TODOS los estilistas activos del negocio
      const { data: stylists, error: e1 } = await supabase
        .from('stylists').select('id')
        .eq('business_id', businessId).eq('is_active', true)
      if (e1) throw e1
      if (!stylists?.length) throw new Error('No hay estilistas activos. Crea uno antes de configurar horarios.')

      for (const s of stylists) {
        await supabase.from('availability').delete().eq('stylist_id', s.id)
        const insertRows = rows.map(r => ({
          stylist_id:  s.id,
          day_of_week: r.day_of_week,
          start_time:  r.start_time,
          end_time:    r.end_time,
          is_active:   r.is_active,
        }))
        const { error: e2 } = await supabase.from('availability').insert(insertRows)
        if (e2) throw e2
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="dash-skeleton" style={{ height: 380 }} />
  }

  return (
    <div style={{
      background: '#111111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(r => {
          const dia = DIAS.find(d => d.idx === r.day_of_week)
          return (
            <div
              key={r.day_of_week}
              className="horario-dia-row"
              style={{
                padding: '12px 14px', borderRadius: 8,
                background: r.is_active ? '#0F0F0F' : 'transparent',
                border: `1px solid ${r.is_active ? '#1E1E1E' : '#141414'}`,
                opacity: r.is_active ? 1 : 0.55,
                transition: 'opacity 0.2s, background 0.2s',
              }}
            >
              <div className="horario-dia-top">
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                  color: r.is_active ? '#F5F5F5' : '#666',
                  fontSize: '0.88rem',
                }}>
                  {dia.label}
                </span>
                <ToggleSwitch
                  checked={r.is_active}
                  onChange={v => updateRow(r.day_of_week, { is_active: v })}
                />
              </div>
              {r.is_active && (
                <div className="horario-dia-times">
                  <TimeInput
                    label="Abre"
                    value={r.start_time}
                    disabled={false}
                    onChange={v => updateRow(r.day_of_week, { start_time: v })}
                  />
                  <TimeInput
                    label="Cierra"
                    value={r.end_time}
                    disabled={false}
                    onChange={v => updateRow(r.day_of_week, { end_time: v })}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div style={{
          marginTop: 16, padding: '10px 14px',
          background: '#2A0D0D', border: '1px solid #5A1818',
          borderRadius: 8, color: '#FF4D4D',
          fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 20, paddingTop: 16, borderTop: '1px solid #1A1A1A',
      }}>
        <p style={{ color: '#444', fontSize: '0.74rem', fontFamily: 'DM Sans, sans-serif' }}>
          Estos horarios aplican a todos los miembros del equipo
        </p>
        <button
          className="btn-mint"
          onClick={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saved ? <><Check size={14} /> Guardado</> : <><Save size={14} /> {saving ? 'Guardando…' : 'Guardar horarios'}</>}
        </button>
      </div>
    </div>
  )
}

// ── TAB 2: Bloqueos puntuales ─────────────────────────────────────────────────

function TabBloqueos({ businessId }) {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState({ date: toYMD(new Date()), start_time: '12:00', end_time: '13:00', reason: '' })
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!businessId) return
    load()
  }, [businessId])

  async function load() {
    setLoading(true)
    const today = toYMD(new Date())
    const { data: stylists } = await supabase
      .from('stylists').select('id')
      .eq('business_id', businessId).eq('is_active', true)
    const ids = (stylists ?? []).map(s => s.id)
    if (ids.length === 0) { setItems([]); setLoading(false); return }

    const { data } = await supabase
      .from('time_blocks').select('*')
      .in('stylist_id', ids)
      .gte('date', today)
      .order('date').order('start_time')

    // Agrupar por (date,start,end,reason) — se replican por estilista
    const seen = new Set()
    const grouped = []
    ;(data ?? []).forEach(b => {
      const key = `${b.date}|${b.start_time}|${b.end_time}|${b.reason ?? ''}`
      if (!seen.has(key)) {
        seen.add(key)
        grouped.push(b)
      }
    })
    setItems(grouped)
    setLoading(false)
  }

  async function handleAdd() {
    setSaving(true); setError('')
    try {
      if (form.start_time >= form.end_time) throw new Error('La hora final debe ser después de la inicial')

      const { data: stylists } = await supabase
        .from('stylists').select('id')
        .eq('business_id', businessId).eq('is_active', true)
      if (!stylists?.length) throw new Error('No hay estilistas activos')

      const inserts = stylists.map(s => ({
        stylist_id: s.id,
        date:       form.date,
        start_time: form.start_time,
        end_time:   form.end_time,
        reason:     form.reason || null,
      }))
      const { error: e1 } = await supabase.from('time_blocks').insert(inserts)
      if (e1) throw e1

      setForm({ date: toYMD(new Date()), start_time: '12:00', end_time: '13:00', reason: '' })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    if (!confirm('¿Eliminar este bloqueo?')) return
    const { data: stylists } = await supabase
      .from('stylists').select('id')
      .eq('business_id', businessId).eq('is_active', true)
    const ids = (stylists ?? []).map(s => s.id)
    await supabase.from('time_blocks').delete()
      .in('stylist_id', ids)
      .eq('date', item.date)
      .eq('start_time', item.start_time)
      .eq('end_time', item.end_time)
    load()
  }

  return (
    <div className="horarios-bloqueos-grid">
      {/* Form */}
      <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.92rem', color: '#F5F5F5', marginBottom: 14 }}>
          Nuevo bloqueo
        </h3>
        <p style={{ color: '#555', fontSize: '0.74rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 16 }}>
          Bloquea un rango horario específico (almuerzo, vacaciones, evento personal)
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Fecha">
            <input
              type="date" className="dash-input"
              value={form.date}
              min={toYMD(new Date())}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Desde">
              <TimePicker
                value={form.start_time}
                onChange={v => setForm(f => ({ ...f, start_time: v }))}
              />
            </FormField>
            <FormField label="Hasta">
              <TimePicker
                value={form.end_time}
                onChange={v => setForm(f => ({ ...f, end_time: v }))}
              />
            </FormField>
          </div>

          <FormField label="Motivo" hint="opcional">
            <input
              className="dash-input"
              placeholder="Ej: Almuerzo, Cita médica"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            />
          </FormField>

          {error && (
            <p style={{ color: '#FF4D4D', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif' }}>{error}</p>
          )}

          <button
            className="btn-mint"
            onClick={handleAdd}
            disabled={saving}
            style={{ marginTop: 4, opacity: saving ? 0.6 : 1 }}
          >
            <Plus size={14} /> {saving ? 'Agregando…' : 'Agregar bloqueo'}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.92rem', color: '#F5F5F5', marginBottom: 14 }}>
          Próximos bloqueos
        </h3>

        {loading ? (
          <div className="dash-skeleton" style={{ height: 200 }} />
        ) : items.length === 0 ? (
          <p style={{ color: '#444', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif', textAlign: 'center', padding: '32px 0' }}>
            Sin bloqueos programados
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
            {items.map(b => (
              <div
                key={b.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8,
                  background: '#0F0F0F', border: '1px solid #1A1A1A',
                }}
              >
                <div>
                  <p style={{ color: '#F5F5F5', fontWeight: 600, fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                    {new Date(b.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p style={{ color: '#666', fontSize: '0.74rem', fontFamily: 'DM Sans, sans-serif', margin: '2px 0 0' }}>
                    {b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}{b.reason ? ` · ${b.reason}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(b)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#555', padding: 6, borderRadius: 6,
                    transition: 'color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#FF4D4D'; e.currentTarget.style.background = 'rgba(255,77,77,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'none' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── TAB 3: Promociones ────────────────────────────────────────────────────────

function TabPromos({ businessId }) {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(initPromoForm())
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!businessId) return
    load()
  }, [businessId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('promotions').select('*')
      .eq('business_id', businessId)
      .order('start_time')
    setItems(data ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null); setForm(initPromoForm()); setError(''); setModal(true)
  }
  function openEdit(p) {
    setEditing(p)
    setForm({
      day_of_week:       p.day_of_week ?? '',
      start_time:        p.start_time.slice(0,5),
      end_time:          p.end_time.slice(0,5),
      discount_percent:  p.discount_percent,
      label:             p.label,
      color:             p.color || '#F59E0B',
      is_active:         p.is_active,
    })
    setError(''); setModal(true)
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      if (!form.label.trim()) throw new Error('El nombre de la promo es obligatorio')
      if (form.start_time >= form.end_time) throw new Error('La hora final debe ser después de la inicial')
      const pct = Number(form.discount_percent)
      if (isNaN(pct) || pct <= 0 || pct > 100) throw new Error('El descuento debe estar entre 1 y 100')

      const payload = {
        business_id:       businessId,
        day_of_week:       form.day_of_week === '' ? null : Number(form.day_of_week),
        start_time:        form.start_time,
        end_time:          form.end_time,
        discount_percent:  pct,
        label:             form.label.trim(),
        color:             form.color,
        is_active:         form.is_active,
      }

      if (editing) {
        const { error: e1 } = await supabase.from('promotions').update(payload).eq('id', editing.id)
        if (e1) throw e1
      } else {
        const { error: e1 } = await supabase.from('promotions').insert(payload)
        if (e1) throw e1
      }
      setModal(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(p) {
    await supabase.from('promotions').update({ is_active: !p.is_active }).eq('id', p.id)
    load()
  }

  async function handleDelete(p) {
    if (!confirm(`¿Eliminar la promo "${p.label}"?`)) return
    await supabase.from('promotions').delete().eq('id', p.id)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: '#555', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif' }}>
          Aplica descuentos automáticos en ciertos rangos horarios
        </p>
        <button className="btn-mint" onClick={openCreate}>
          <Plus size={14} /> Nueva promoción
        </button>
      </div>

      {loading ? (
        <div className="dash-skeleton" style={{ height: 220 }} />
      ) : items.length === 0 ? (
        <div style={{
          background: '#111111', border: '1px solid #1E1E1E', borderRadius: 12,
          padding: '56px 24px', textAlign: 'center',
        }}>
          <Tag size={44} color="#282828" style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ color: '#444', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>
            Sin promociones activas
          </p>
          <p style={{ color: '#333', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif' }}>
            Crea promos para llenar horas valle (mañanas, mediodía…)
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {items.map(p => (
            <PromoCard
              key={p.id}
              promo={p}
              onEdit={() => openEdit(p)}
              onToggle={() => handleToggle(p)}
              onDelete={() => handleDelete(p)}
            />
          ))}
        </div>
      )}

      {modal && (
        <div
          className="dash-modal-overlay"
          onClick={e => e.target === e.currentTarget && setModal(false)}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="dash-modal">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#F5F5F5' }}>
                {editing ? 'Editar promoción' : 'Nueva promoción'}
              </h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="Nombre *">
                <input
                  className="dash-input"
                  placeholder="Ej: Mañana feliz"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  autoFocus
                />
              </FormField>

              <FormField label="Día de la semana">
                <select
                  className="dash-input"
                  value={form.day_of_week}
                  onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}
                >
                  <option value="">Todos los días</option>
                  {DIAS.map(d => (
                    <option key={d.idx} value={d.idx}>{d.label}</option>
                  ))}
                </select>
              </FormField>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Desde">
                  <TimePicker
                    value={form.start_time}
                    onChange={v => setForm(f => ({ ...f, start_time: v }))}
                  />
                </FormField>
                <FormField label="Hasta">
                  <TimePicker
                    value={form.end_time}
                    onChange={v => setForm(f => ({ ...f, end_time: v }))}
                  />
                </FormField>
              </div>

              <FormField label="Descuento (%)" hint="1 a 100">
                <input
                  type="number" min="1" max="100" className="dash-input"
                  value={form.discount_percent}
                  onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                />
              </FormField>

              <FormField label="Color">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PROMO_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: c, cursor: 'pointer',
                        border: form.color === c ? '2px solid #F5F5F5' : '2px solid transparent',
                        transition: 'border-color 0.2s',
                      }}
                    />
                  ))}
                </div>
              </FormField>
            </div>

            {error && (
              <p style={{ color: '#FF4D4D', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', marginTop: 12 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModal(false)}
                style={{
                  background: 'none', border: '1px solid #252525', borderRadius: 8,
                  padding: '10px 20px', color: '#666', fontSize: '0.85rem',
                  fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button className="btn-mint" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear promoción')}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}

function initPromoForm() {
  return {
    day_of_week:      '',
    start_time:       '09:00',
    end_time:         '10:00',
    discount_percent: 20,
    label:            '',
    color:            '#F59E0B',
    is_active:        true,
  }
}

function PromoCard({ promo, onEdit, onToggle, onDelete }) {
  const dia = promo.day_of_week === null
    ? 'Todos los días'
    : DIAS.find(d => d.idx === promo.day_of_week)?.label
  return (
    <div
      style={{
        background: '#111111',
        border: `1px solid ${promo.is_active ? promo.color + '44' : '#1E1E1E'}`,
        borderRadius: 12, padding: 16,
        opacity: promo.is_active ? 1 : 0.55,
        transition: 'opacity 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: promo.color + '22',
          border: `1px solid ${promo.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Tag size={16} color={promo.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.92rem', color: '#F5F5F5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {promo.label}
          </p>
          <p style={{ color: promo.color, fontSize: '0.74rem', fontFamily: 'DM Sans, sans-serif', margin: '2px 0 0', fontWeight: 600 }}>
            -{Number(promo.discount_percent)}%
          </p>
        </div>
      </div>

      <div style={{ background: '#0A0A0A', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
        <p style={{ color: '#888', fontSize: '0.72rem', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
          {dia}
        </p>
        <p style={{ color: '#F5F5F5', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', margin: '2px 0 0', fontWeight: 600 }}>
          {promo.start_time.slice(0,5)} – {promo.end_time.slice(0,5)}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onEdit}
          style={{
            flex: 1, background: 'none', border: '1px solid #252525',
            borderRadius: 8, padding: '7px', color: '#888',
            fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#888' }}
        >
          Editar
        </button>
        <button
          onClick={onToggle}
          style={{
            flex: 1, background: 'none',
            border: `1px solid ${promo.is_active ? '#252525' : 'rgba(var(--accent-rgb),0.25)'}`,
            borderRadius: 8, padding: '7px',
            color: promo.is_active ? '#888' : 'var(--accent)',
            fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer',
          }}
        >
          {promo.is_active ? 'Pausar' : 'Activar'}
        </button>
        <button
          onClick={onDelete}
          style={{
            background: 'none', border: '1px solid #252525',
            borderRadius: 8, padding: '7px 9px', color: '#555',
            cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#FF4D4D'; e.currentTarget.style.borderColor = '#5A1818' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#252525' }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Utils UI ──────────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 999,
        background: checked ? 'var(--accent)' : '#2A2A2A',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s ease', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: '#FFF', transition: 'left 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

function TimeInput({ label, value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <span style={{ color: '#444', fontSize: '0.66rem', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <TimePicker value={value} onChange={onChange} />
    </div>
  )
}

function FormField({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 6 }}>
        <label style={{ color: '#888', fontSize: '0.74rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
          {label}
        </label>
        {hint && (
          <span style={{ color: '#3A3A3A', fontSize: '0.68rem', fontFamily: 'DM Sans, sans-serif' }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
