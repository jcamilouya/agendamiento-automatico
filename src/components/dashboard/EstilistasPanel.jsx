import { useState, useEffect } from 'react'
import { Plus, X, Pencil, Users, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const AVATAR_COLORS = [
  { bg: '#1A5C3A', text: '#3DFFA8' },
  { bg: '#1C1500', text: '#F59E0B' },
  { bg: '#1A0D2E', text: '#A855F7' },
  { bg: '#0D2040', text: '#60A5FA' },
  { bg: '#2A0D0D', text: '#F87171' },
]

function toYMD(d) { return d.toISOString().split('T')[0] }

function formatCOP(v) {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000)     return '$' + Math.round(v / 1_000) + 'k'
  return '$' + Math.round(v)
}

function initForm() {
  return { name: '', specialties: '', photo_url: '' }
}

export default function EstilistasPanel({ businessId }) {
  const [stylists,  setStylists]  = useState([])
  const [stats,     setStats]     = useState({})   // { [stylistId]: { total, completed, ingresos } }
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(initForm)
  const [saving,    setSaving]    = useState(false)
  const [toggling,  setToggling]  = useState(null)
  const [error,     setError]     = useState('')

  useEffect(() => {
    if (businessId) load()
  }, [businessId])

  async function load() {
    setLoading(true)
    const since30 = toYMD(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))

    const [stylistsRes, apptRes] = await Promise.all([
      supabase
        .from('stylists')
        .select('*')
        .eq('business_id', businessId)
        .order('name'),

      supabase
        .from('appointments')
        .select('stylist_id, status, services(price)')
        .eq('business_id', businessId)
        .gte('date', since30),
    ])

    setStylists(stylistsRes.data ?? [])

    // Build stats map per stylist
    const map = {}
    ;(apptRes.data ?? []).forEach(a => {
      const key = a.stylist_id
      if (!map[key]) map[key] = { total: 0, completed: 0, ingresos: 0, cancelled: 0 }
      map[key].total++
      if (a.status === 'completed') {
        map[key].completed++
        map[key].ingresos += Number(a.services?.price ?? 0)
      }
      if (a.status === 'cancelled') map[key].cancelled++
    })
    setStats(map)
    setLoading(false)
  }

  function openCreate() {
    setEditing(null); setForm(initForm()); setError(''); setModal(true)
  }

  function openEdit(s) {
    setEditing(s)
    setForm({ name: s.name, specialties: (s.specialties ?? []).join(', '), photo_url: s.photo_url ?? '' })
    setError(''); setModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError('')
    const payload = {
      name:        form.name.trim(),
      specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
      photo_url:   form.photo_url.trim() || null,
    }
    if (editing) {
      const { data, error: err } = await supabase
        .from('stylists').update(payload).eq('id', editing.id).select().single()
      if (err) { setError('Error al guardar'); setSaving(false); return }
      setStylists(prev => prev.map(s => s.id === editing.id ? data : s))
    } else {
      const { data, error: err } = await supabase
        .from('stylists').insert({ ...payload, business_id: businessId }).select().single()
      if (err) { setError('Error al guardar'); setSaving(false); return }
      setStylists(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setSaving(false); setModal(false)
  }

  async function handleToggle(s) {
    setToggling(s.id)
    const { data, error: err } = await supabase
      .from('stylists').update({ is_active: !s.is_active }).eq('id', s.id).select().single()
    if (!err) setStylists(prev => prev.map(x => x.id === s.id ? data : x))
    setToggling(null)
  }

  return (
    <div style={{ animation: 'fadeInUp 0.3s ease forwards', opacity: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#F5F5F5' }}>
            Equipo
          </h2>
          {!loading && (
            <p style={{ color: '#555555', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', marginTop: 3 }}>
              {stylists.filter(s => s.is_active).length} activos · {stylists.length} en total · estadísticas últimos 30 días
            </p>
          )}
        </div>
        <button className="btn-mint" onClick={openCreate}>
          <Plus size={15} /> Nuevo integrante
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="estilistas-grid">
          {[0,1,2].map(i => <div key={i} className="dash-skeleton" style={{ height: 300 }} />)}
        </div>
      ) : stylists.length === 0 ? (
        <EmptyEstilistas onAdd={openCreate} />
      ) : (
        <div className="estilistas-grid">
          {stylists.map((s, i) => (
            <StylistCard
              key={s.id}
              stylist={s}
              index={i}
              stats={stats[s.id] ?? { total: 0, completed: 0, ingresos: 0, cancelled: 0 }}
              toggling={toggling === s.id}
              onEdit={() => openEdit(s)}
              onToggle={() => handleToggle(s)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="dash-modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="dash-modal">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#F5F5F5' }}>
                {editing ? 'Editar integrante' : 'Nuevo integrante'}
              </h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: '#555555', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormGroup label="Nombre *">
                <input
                  className="dash-input"
                  placeholder="Ej: Carlos Mendez"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  autoFocus
                />
              </FormGroup>
              <FormGroup label="Especialidades" hint="separadas por coma">
                <input
                  className="dash-input"
                  placeholder="Barba, Corte clásico, Degradados"
                  value={form.specialties}
                  onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))}
                />
              </FormGroup>
              <FormGroup label="URL de foto" hint="opcional">
                <input
                  className="dash-input"
                  placeholder="https://..."
                  value={form.photo_url}
                  onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))}
                />
              </FormGroup>
            </div>

            {error && (
              <p style={{ color: '#FF4D4D', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', marginTop: 12 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModal(false)}
                style={{
                  background: 'none', border: '1px solid #252525', borderRadius: 8,
                  padding: '10px 20px', color: '#666666', fontSize: '0.85rem',
                  fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3A3A3A'; e.currentTarget.style.color = '#F5F5F5' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#666666' }}
              >
                Cancelar
              </button>
              <button className="btn-mint" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear integrante')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── StylistCard ───────────────────────────────────────────────────────────────

function StylistCard({ stylist, index, stats, toggling, onEdit, onToggle }) {
  const colorIdx  = stylist.name.charCodeAt(0) % AVATAR_COLORS.length
  const color     = AVATAR_COLORS[colorIdx]
  const tasaCompl = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  const tasaCanc  = stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0

  return (
    <div
      className="estilista-card"
      style={{ animation: `fadeInUp 0.35s ease ${index * 60}ms forwards`, opacity: 0 }}
    >
      {/* Avatar */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: color.bg, color: color.text,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem',
        margin: '0 auto 12px', flexShrink: 0,
        border: `2px solid ${stylist.is_active ? color.text + '33' : '#1E1E1E'}`,
      }}>
        {stylist.name[0].toUpperCase()}
      </div>

      {/* Nombre */}
      <p style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 700,
        fontSize: '0.95rem', color: stylist.is_active ? '#F5F5F5' : '#444444',
        textAlign: 'center', marginBottom: 8,
      }}>
        {stylist.name}
      </p>

      {/* Especialidades */}
      {stylist.specialties?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginBottom: 14 }}>
          {stylist.specialties.map(sp => (
            <span key={sp} style={{
              background: '#1A1A1A', border: '1px solid #252525',
              borderRadius: 999, padding: '2px 9px',
              color: '#666666', fontSize: '0.68rem',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              {sp}
            </span>
          ))}
        </div>
      )}

      {/* ── Bloque de estadísticas ── */}
      <div style={{
        background: '#0F0F0F', border: '1px solid #1A1A1A',
        borderRadius: 10, padding: '12px 14px', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          <TrendingUp size={11} color="#3DFFA8" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.65rem', color: '#3DFFA8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Últimos 30 días
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <StatMini
            value={stats.total}
            label="citas"
            color="#F5F5F5"
          />
          <StatMini
            value={formatCOP(stats.ingresos)}
            label="ingresos"
            color="#3DFFA8"
          />
          <StatMini
            value={`${tasaCompl}%`}
            label="completadas"
            color={tasaCompl >= 70 ? '#3DFFA8' : tasaCompl >= 40 ? '#F59E0B' : '#FF4D4D'}
          />
        </div>

        {/* Barra visual completadas vs canceladas */}
        {stats.total > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', height: 4, borderRadius: 999, overflow: 'hidden', background: '#1A1A1A', gap: 1 }}>
              <BarSegment pct={tasaCompl}  color="#3DFFA8" />
              <BarSegment pct={tasaCanc}   color="#FF4D4D" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.6rem', color: '#3DFFA8' }}>
                {stats.completed} completadas
              </span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.6rem', color: '#444' }}>
                {stats.cancelled > 0 ? `${stats.cancelled} canceladas` : ''}
              </span>
            </div>
          </div>
        )}

        {stats.total === 0 && (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.68rem', color: '#333', textAlign: 'center', marginTop: 4 }}>
            Sin citas en este período
          </p>
        )}
      </div>

      {/* Estado badge */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <span className={`status-badge ${stylist.is_active ? 'confirmed' : 'cancelled'}`}>
          {stylist.is_active ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onEdit}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'none', border: '1px solid #252525', borderRadius: 8, padding: '8px 12px',
            color: '#888888', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#3DFFA8'; e.currentTarget.style.color = '#3DFFA8' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#888888' }}
        >
          <Pencil size={13} /> Editar
        </button>
        <button
          onClick={onToggle}
          disabled={toggling}
          style={{
            flex: 1, background: 'none',
            border: `1px solid ${stylist.is_active ? 'rgba(255,77,77,0.25)' : 'rgba(61,255,168,0.25)'}`,
            borderRadius: 8, padding: '8px 12px',
            color: stylist.is_active ? '#FF4D4D' : '#3DFFA8',
            fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif',
            cursor: toggling ? 'not-allowed' : 'pointer',
            opacity: toggling ? 0.5 : 1, transition: 'opacity 0.2s',
          }}
        >
          {toggling ? '…' : (stylist.is_active ? 'Desactivar' : 'Activar')}
        </button>
      </div>
    </div>
  )
}

// ── Mini helpers ──────────────────────────────────────────────────────────────

function StatMini({ value, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.05rem', color, lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.6rem', color: '#444', marginTop: 2 }}>
        {label}
      </p>
    </div>
  )
}

function BarSegment({ pct, color }) {
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(pct), 200); return () => clearTimeout(t) }, [pct])
  return (
    <div style={{
      width: `${w}%`, background: color, height: '100%',
      transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
    }} />
  )
}

// ── Otros sub-componentes ─────────────────────────────────────────────────────

function FormGroup({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 7 }}>
        <label style={{ color: '#888888', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
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

function EmptyEstilistas({ onAdd }) {
  return (
    <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: 12, padding: '56px 24px', textAlign: 'center' }}>
      <Users size={44} color="#282828" style={{ margin: '0 auto 16px', display: 'block' }} />
      <p style={{ color: '#444444', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>
        Sin integrantes registrados
      </p>
      <p style={{ color: '#333333', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 20 }}>
        Agrega tu equipo para que los clientes puedan agendar
      </p>
      <button className="btn-mint" onClick={onAdd}>
        <Plus size={15} /> Agregar integrante
      </button>
    </div>
  )
}
