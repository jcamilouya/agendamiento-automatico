import { useState, useEffect, useRef } from 'react'
import { Plus, X, Pencil, Scissors, Upload, ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function initForm() {
  return { name: '', category: '', description: '', duration_minutes: '', price: '', photo_url: '' }
}

function resizeToBase64(file, maxPx = 320, quality = 0.82) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function formatCOP(n) {
  return '$' + Math.round(n).toLocaleString('es-CO')
}

function formatMin(m) {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h}h` : `${h}h ${r}min`
}

export default function ServiciosPanel({ businessId }) {
  const [services, setServices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(initForm)
  const [saving,   setSaving]   = useState(false)
  const fileInputRef              = useRef(null)
  const nameInputRef              = useRef(null)
  const [toggling, setToggling] = useState(null)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (businessId) load()
  }, [businessId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .order('category')
      .order('name')
    setServices(data ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm(initForm())
    setError('')
    setModal(true)
  }

  function openEdit(s) {
    setEditing(s)
    setForm({
      name:             s.name,
      category:         s.category ?? '',
      description:      s.description ?? '',
      duration_minutes: String(s.duration_minutes),
      price:            String(s.price),
      photo_url:        s.photo_url ?? '',
    })
    setError('')
    setModal(true)
  }

  async function handleSave() {
    if (!form.name.trim())          { setError('El nombre es obligatorio'); nameInputRef.current?.focus(); nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return }
    if (!form.duration_minutes)     { setError('La duración es obligatoria'); return }
    if (!form.price)                { setError('El precio es obligatorio'); return }
    const dur = parseInt(form.duration_minutes)
    const prc = parseFloat(form.price)
    if (isNaN(dur) || dur < 1)     { setError('Duración inválida'); return }
    if (isNaN(prc) || prc < 0)     { setError('Precio inválido'); return }

    setSaving(true)
    setError('')
    const payload = {
      name:             form.name.trim(),
      category:         form.category.trim() || null,
      description:      form.description.trim() || null,
      photo_url:        form.photo_url || null,
      duration_minutes: dur,
      price:            prc,
    }
    if (editing) {
      const { data, error: err } = await supabase
        .from('services').update(payload).eq('id', editing.id).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      setServices(prev => prev.map(s => s.id === editing.id ? data : s))
    } else {
      const { data, error: err } = await supabase
        .from('services').insert({ ...payload, business_id: businessId }).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      setServices(prev => [...prev, data].sort((a, b) =>
        (a.category ?? '').localeCompare(b.category ?? '') || a.name.localeCompare(b.name)
      ))
    }
    setSaving(false)
    setModal(false)
  }

  async function handleToggle(s) {
    setToggling(s.id)
    const { data, error: err } = await supabase
      .from('services').update({ is_active: !s.is_active }).eq('id', s.id).select().single()
    if (!err) setServices(prev => prev.map(x => x.id === s.id ? data : x))
    setToggling(null)
  }

  const activeCount = services.filter(s => s.is_active).length

  return (
    <div style={{ animation: 'fadeInUp 0.3s ease forwards', opacity: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#F5F5F5' }}>
            Servicios
          </h2>
          {!loading && (
            <p style={{ color: '#555555', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', marginTop: 3 }}>
              {activeCount} activos · {services.length} en total
            </p>
          )}
        </div>
        <button className="btn-mint" onClick={openCreate}>
          <Plus size={15} /> Nuevo servicio
        </button>
      </div>

      {/* Tabla */}
      <div style={{
        background: '#111111', border: '1px solid #1E1E1E',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0,1,2,3].map(i => <div key={i} className="dash-skeleton" style={{ height: 52 }} />)}
          </div>
        ) : services.length === 0 ? (
          <EmptyServicios onAdd={openCreate} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {/* Cabecera */}
            <div className="servicios-table-row" style={{ borderBottom: '1px solid #1A1A1A' }}>
              {['NOMBRE','CATEGORÍA','DURACIÓN','PRECIO','ESTADO',''].map((h, i) => (
                <span key={i} style={{
                  color: '#3A3A3A', fontSize: '0.65rem',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 700, letterSpacing: '0.06em',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {services.map((s, i) => (
              <ServiceRow
                key={s.id}
                service={s}
                index={i}
                toggling={toggling === s.id}
                onEdit={() => openEdit(s)}
                onToggle={() => handleToggle(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="dash-modal-overlay"
          ref={el => { if (el) el.scrollTop = 0 }}
          onClick={e => e.target === e.currentTarget && setModal(false)}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="dash-modal">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#F5F5F5' }}>
                {editing ? 'Editar servicio' : 'Nuevo servicio'}
              </h3>
              <button
                onClick={() => setModal(false)}
                style={{ background: 'none', border: 'none', color: '#555555', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FormGroup label="Nombre *">
                <input
                  ref={nameInputRef}
                  className="dash-input"
                  placeholder="Ej: Corte + barba"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </FormGroup>

              <FormGroup label="Categoría" hint="opcional">
                <input
                  className="dash-input"
                  placeholder="Cortes / Barba / Combos"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                />
              </FormGroup>

              <FormGroup label="Descripción" hint="opcional">
                <textarea
                  className="dash-input"
                  placeholder="Breve descripción del servicio"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </FormGroup>

              <FormGroup label="Foto del servicio" hint="opcional — desde tu PC">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files[0]
                    if (!file) return
                    const b64 = await resizeToBase64(file)
                    setForm(f => ({ ...f, photo_url: b64 }))
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                    border: '1px dashed #2A2A2A', background: '#0A0A0A',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#2A2A2A'}
                >
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ImageIcon size={16} color="#444" />
                    </div>
                  )}
                  <div>
                    <p style={{ color: form.photo_url ? 'var(--accent)' : '#555', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                      {form.photo_url ? 'Foto cargada ✓' : 'Subir foto desde PC'}
                    </p>
                    <p style={{ color: '#3A3A3A', fontSize: '0.72rem', fontFamily: 'DM Sans, sans-serif', margin: '2px 0 0' }}>
                      JPG, PNG o WebP — se comprime automático
                    </p>
                  </div>
                  <Upload size={14} color="#333" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                </div>
              </FormGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormGroup label="Duración (min) *">
                  <input
                    className="dash-input"
                    type="number" min="5" step="5"
                    placeholder="30"
                    value={form.duration_minutes}
                    onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  />
                </FormGroup>
                <FormGroup label="Precio (COP) *">
                  <input
                    className="dash-input"
                    type="number" min="0" step="1000"
                    placeholder="25000"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  />
                </FormGroup>
              </div>
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
                  background: 'none', border: '1px solid #252525',
                  borderRadius: 8, padding: '10px 20px',
                  color: '#666666', fontSize: '0.85rem',
                  fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3A3A3A'; e.currentTarget.style.color = '#F5F5F5' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#666666' }}
              >
                Cancelar
              </button>
              <button
                className="btn-mint"
                onClick={handleSave}
                disabled={saving}
                style={{ opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear servicio')}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ServiceRow({ service, index, toggling, onEdit, onToggle }) {
  return (
    <div
      className="servicios-table-row servicios-data-row"
      style={{
        animation: `fadeInUp 0.3s ease ${index * 35}ms forwards`,
        opacity: 0,
      }}
    >
      {/* Nombre + descripción */}
      <div style={{ minWidth: 0 }}>
        <p style={{
          color: service.is_active ? '#F5F5F5' : '#555555',
          fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {service.name}
        </p>
        {service.description && (
          <p style={{
            color: '#3A3A3A', fontSize: '0.72rem', fontFamily: 'DM Sans, sans-serif',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {service.description}
          </p>
        )}
      </div>

      {/* Categoría */}
      <span style={{ color: '#666666', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif' }}>
        {service.category ?? '—'}
      </span>

      {/* Duración */}
      <span style={{ color: '#888888', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif' }}>
        {formatMin(service.duration_minutes)}
      </span>

      {/* Precio */}
      <span style={{
        color: 'var(--accent)', fontSize: '0.88rem',
        fontFamily: 'DM Sans, sans-serif', fontWeight: 700,
      }}>
        {formatCOP(service.price)}
      </span>

      {/* Estado */}
      <span className={`status-badge ${service.is_active ? 'confirmed' : 'cancelled'}`}>
        {service.is_active ? 'Activo' : 'Inactivo'}
      </span>

      {/* Acciones */}
      <div className="servicios-row-actions" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          onClick={onEdit}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            border: '1px solid #252525', borderRadius: 6,
            padding: '4px 10px', fontSize: '0.72rem',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            background: 'none', color: '#888888',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#888888' }}
        >
          <Pencil size={12} /> Editar
        </button>
        <button
          onClick={onToggle}
          disabled={toggling}
          style={{
            border: `1px solid ${service.is_active ? 'rgba(255,77,77,0.25)' : 'rgba(var(--accent-rgb),0.25)'}`,
            borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem',
            cursor: toggling ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            background: 'none',
            color: service.is_active ? '#FF4D4D' : 'var(--accent)',
            opacity: toggling ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {toggling ? '…' : (service.is_active ? 'Desactivar' : 'Activar')}
        </button>
      </div>
    </div>
  )
}

function FormGroup({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 7 }}>
        <label style={{ color: '#888888', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
          {label}
        </label>
        {hint && (
          <span style={{ color: '#3A3A3A', fontSize: '0.68rem', fontFamily: 'DM Sans, sans-serif' }}>{hint}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyServicios({ onAdd }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px' }}>
      <Scissors size={44} color="#282828" style={{ margin: '0 auto 16px', display: 'block' }} />
      <p style={{
        color: '#444444', fontFamily: 'Syne, sans-serif',
        fontWeight: 700, fontSize: '0.95rem', marginBottom: 6,
      }}>
        Sin servicios registrados
      </p>
      <p style={{ color: '#333333', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', marginBottom: 20 }}>
        Agrega los servicios que ofrece tu negocio
      </p>
      <button className="btn-mint" onClick={onAdd}>
        <Plus size={15} /> Agregar servicio
      </button>
    </div>
  )
}

