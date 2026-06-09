import { useState, useRef, useEffect } from 'react'
import { Palette, GripVertical, LayoutDashboard, Calendar, BarChart2, User, Lock, Store, Gift } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const ACCENT_PRESETS = [
  { color: 'var(--accent)', label: 'Verde eléctrico (TURNOTT)' },
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

function Toast({ msg, type }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'error' ? '#FF4D4D' : '#0D3320',
      border: `1px solid ${type === 'error' ? '#FF4D4D' : 'var(--accent)'}`,
      color: type === 'error' ? '#fff' : 'var(--accent)',
      borderRadius: 10, padding: '12px 20px',
      fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem',
      animation: 'toastIn 0.25s ease',
    }}>
      {msg}
    </div>
  )
}

export default function AjustesPanel({
  accentColor, onAccentChange, widgetOrder, onWidgetOrderChange,
  businessId, negocio, session,
}) {
  const [customColor, setCustomColor] = useState(accentColor)
  const [dragging, setDragging]       = useState(null)
  const [dragOver, setDragOver]       = useState(null)
  const dragItem                      = useRef(null)
  const dragOverItem                  = useRef(null)

  // Perfil del negocio
  const [form, setForm] = useState({
    name:  negocio?.name  ?? '',
    phone: negocio?.phone ?? '',
    city:  negocio?.city  ?? '',
    slug:  negocio?.slug  ?? '',
  })
  const [slugDisponible, setSlugDisponible] = useState(null)
  const [checkingSlug,   setCheckingSlug]   = useState(false)
  const slugTimer                            = useRef(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [resetingPwd, setResetingPwd]     = useState(false)
  const [toast, setToast]                 = useState({ msg: '', type: 'ok' })

  function toSlug(v) {
    return v.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
  }

  useEffect(() => {
    const newSlug = form.slug
    if (!newSlug || newSlug === negocio?.slug) { setSlugDisponible(null); return }
    setCheckingSlug(true)
    clearTimeout(slugTimer.current)
    slugTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('businesses').select('id').eq('slug', newSlug).maybeSingle()
      setSlugDisponible(!data)
      setCheckingSlug(false)
    }, 500)
    return () => clearTimeout(slugTimer.current)
  }, [form.slug])

  // Fidelización
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(negocio?.loyalty_enabled ?? false)
  const [loyaltyVisits,  setLoyaltyVisits]  = useState(negocio?.loyalty_visits  ?? 10)
  const [savingLoyalty,  setSavingLoyalty]  = useState(false)

  async function handleGuardarLoyalty() {
    if (!negocio?.id) return
    setSavingLoyalty(true)
    const { error } = await supabase
      .from('businesses')
      .update({ loyalty_enabled: loyaltyEnabled, loyalty_visits: loyaltyVisits })
      .eq('id', negocio.id)
    setSavingLoyalty(false)
    if (error) showToast('Error guardando: ' + error.message, 'error')
    else       showToast('Fidelización guardada')
  }

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'ok' }), 3500)
  }

  function applyAccent(color) {
    document.documentElement.style.setProperty('--accent', color)
    onAccentChange(color)
  }

  async function handleGuardar() {
    if (!businessId) return
    const slugChanged = !!(form.slug && form.slug !== negocio?.slug)
    if (slugChanged && slugDisponible === false) { showToast('Ese link ya está en uso', 'error'); return }
    if (slugChanged && checkingSlug) { showToast('Espera a que termine la verificación del link', 'error'); return }
    setSavingProfile(true)
    const payload = { name: form.name, phone: form.phone, city: form.city }
    if (slugChanged) payload.slug = form.slug
    const { error } = await supabase.from('businesses').update(payload).eq('id', businessId)
    setSavingProfile(false)
    if (error) { showToast('Error al guardar: ' + error.message, 'error'); return }
    if (slugChanged) {
      showToast('Link actualizado — recargando…')
      setTimeout(() => window.location.reload(), 1200)
    } else {
      showToast('Cambios guardados ✓')
    }
  }

  async function handleResetPassword() {
    if (!session?.user?.email) return
    setResetingPwd(true)
    await supabase.auth.resetPasswordForEmail(session.user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetingPwd(false)
    showToast('Revisa tu email para cambiar la contraseña')
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

  const cardStyle = {
    background: '#111111', border: '1px solid #1E1E1E',
    borderRadius: 12, padding: 24, marginBottom: 20,
  }
  const sectionTitle = (icon, text) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      {icon}
      <h3 className="ajustes-h" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.95rem' }}>
        {text}
      </h3>
    </div>
  )

  return (
    <div className="ajustes-panel" style={{ maxWidth: 580 }}>
      <Toast msg={toast.msg} type={toast.type} />

      <h2 className="ajustes-h" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', marginBottom: 4 }}>
        Ajustes
      </h2>
      <p className="ajustes-p" style={{ fontSize: '0.85rem', marginBottom: 28 }}>
        Gestiona tu perfil, colores y layout del dashboard
      </p>

      {/* ── Card 1: Datos del negocio ── */}
      <div style={cardStyle}>
        {sectionTitle(<Store size={16} color="var(--accent)" />, 'Datos del negocio')}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: 5, fontFamily: 'DM Sans, sans-serif' }}>
              Nombre del negocio
            </label>
            <input
              className="dash-input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Barber House"
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: 5, fontFamily: 'DM Sans, sans-serif' }}>
              Teléfono / WhatsApp del negocio
            </label>
            <input
              className="dash-input"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="Ej. 3001234567"
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: 5, fontFamily: 'DM Sans, sans-serif' }}>
              Ciudad
            </label>
            <input
              className="dash-input"
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              placeholder="Ej. Bogotá"
            />
          </div>
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: 5, fontFamily: 'DM Sans, sans-serif' }}>
              Link de reservas
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#555', fontSize: '0.78rem', pointerEvents: 'none', whiteSpace: 'nowrap',
              }}>
                turnott.com/
              </span>
              <input
                className="dash-input"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))}
                style={{ paddingLeft: 104 }}
                placeholder="mi-negocio"
              />
              {form.slug && form.slug !== negocio?.slug && (
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: '0.72rem', fontWeight: 600,
                  color: checkingSlug ? '#888' : slugDisponible ? '#00FF88' : '#FF4D4D',
                }}>
                  {checkingSlug ? 'Verificando…' : slugDisponible ? '✓ Disponible' : '✗ En uso'}
                </span>
              )}
            </div>
            {form.slug !== negocio?.slug && (
              <p style={{ fontSize: '0.72rem', color: '#F59E0B', marginTop: 5, fontFamily: 'DM Sans, sans-serif' }}>
                ⚠️ El link anterior dejará de funcionar. Comparte el nuevo con tus clientes.
              </p>
            )}
          </div>

          <button
            className="btn-mint"
            onClick={handleGuardar}
            disabled={savingProfile}
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
          >
            {savingProfile ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* ── Card 2: Cuenta ── */}
      <div style={cardStyle}>
        {sectionTitle(<User size={16} color="var(--accent)" />, 'Cuenta')}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: '0.78rem', marginBottom: 5, fontFamily: 'DM Sans, sans-serif' }}>
              Email
            </label>
            <input
              className="dash-input"
              value={session?.user?.email ?? ''}
              readOnly
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>

          <button
            onClick={handleResetPassword}
            disabled={resetingPwd}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'transparent', border: '1px solid #333',
              color: '#F5F5F5', borderRadius: 8, padding: '10px 16px',
              fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem',
              cursor: 'pointer', alignSelf: 'flex-start',
            }}
          >
            <Lock size={14} />
            {resetingPwd ? 'Enviando…' : 'Cambiar contraseña'}
          </button>
        </div>
      </div>

      {/* ── Color de acento ── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Palette size={16} color="var(--accent)" />
          <h3 className="ajustes-h" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.95rem' }}>
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
                border: accentColor === color ? '3px solid #fff' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                boxShadow: accentColor === color ? `0 0 12px ${color}80` : 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            />
          ))}

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
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', pointerEvents: 'none' }}>+</span>
          </label>
        </div>

        <p className="ajustes-p" style={{ fontSize: '0.75rem' }}>
          Color actual: <span style={{ color: accentColor, fontWeight: 600 }}>{accentColor}</span>
        </p>
      </section>

      {/* ── Orden de widgets ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <GripVertical size={16} color="var(--accent)" />
          <h3 className="ajustes-h" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.95rem' }}>
            Orden de widgets
          </h3>
        </div>
        <p className="ajustes-p" style={{ fontSize: '0.78rem', marginBottom: '14px' }}>
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
                className={`ajustes-widget-item${isDrag ? ' is-dragging' : ''}${isOver ? ' is-over' : ''}`}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragEnter={e => handleDragEnter(e, idx)}
                onDragOver={e => e.preventDefault()}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '10px',
                  cursor: 'grab', transition: 'all 0.15s ease',
                  opacity: isDrag ? 0.7 : 1,
                  transform: isDrag ? 'scale(0.98)' : 'scale(1)',
                  userSelect: 'none',
                }}
              >
                <GripVertical size={16} className="ajustes-widget-grip" />
                <Icon size={16} color="var(--accent)" />
                <span className="ajustes-widget-label" style={{ fontSize: '0.88rem', fontFamily: 'DM Sans, sans-serif' }}>
                  {meta.label}
                </span>
                <span className="ajustes-widget-num" style={{ marginLeft: 'auto', fontSize: '0.72rem', fontFamily: 'DM Sans, sans-serif' }}>
                  #{idx + 1}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Programa de fidelización ── */}
      <div style={{
        background: '#111111', border: '1px solid #1E1E1E',
        borderRadius: '16px', padding: '24px', marginTop: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Gift size={20} color="var(--accent)" />
          <h3 className="ajustes-h" style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', margin: 0, fontWeight: 600 }}>
            Programa de fidelización
          </h3>
        </div>
        <p style={{ color: '#555', fontSize: '13px', marginBottom: '20px', fontFamily: 'DM Sans, sans-serif' }}>
          Recompensa a tus clientes frecuentes automáticamente por WhatsApp
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#1a1a1a', borderRadius: '10px', padding: '14px 16px',
          marginBottom: '16px', gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '14px', color: '#F5F5F5', margin: '0 0 2px', fontFamily: 'DM Sans, sans-serif' }}>
              Activar automáticamente
            </p>
            <p style={{ fontSize: '12px', color: '#555', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
              El cliente recibe un WhatsApp antes de su cita gratis
            </p>
          </div>
          <div
            onClick={() => setLoyaltyEnabled(v => !v)}
            style={{
              width: '44px', height: '24px', borderRadius: '999px',
              background: loyaltyEnabled ? 'var(--accent)' : '#2a2a2a',
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              border: `1px solid ${loyaltyEnabled ? 'var(--accent)' : '#333'}`,
              flexShrink: 0,
            }}
          >
            <div style={{
              width: '18px', height: '18px', borderRadius: '50%',
              background: '#fff', position: 'absolute',
              top: '2px', transition: 'left 0.2s',
              left: loyaltyEnabled ? '22px' : '2px',
            }} />
          </div>
        </div>

        {loyaltyEnabled && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '10px', fontFamily: 'DM Sans, sans-serif' }}>
              Número de citas para regalo
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[5, 8, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setLoyaltyVisits(n)}
                  style={{
                    padding: '8px 16px',
                    background: loyaltyVisits === n ? '#0D3320' : '#1a1a1a',
                    border: `1px solid ${loyaltyVisits === n ? 'var(--accent)' : '#1E1E1E'}`,
                    borderRadius: '8px',
                    color: loyaltyVisits === n ? 'var(--accent)' : '#888',
                    fontSize: '14px', fontWeight: loyaltyVisits === n ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {n} citas
                </button>
              ))}
            </div>

            <div style={{
              background: '#0D3320', borderRadius: '10px',
              padding: '12px 14px', marginTop: '14px',
              border: '1px solid rgba(0,255,136,0.15)',
            }}>
              <p style={{ fontSize: '11px', color: 'var(--accent)', marginBottom: '6px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                Preview del mensaje WhatsApp
              </p>
              <p style={{ fontSize: '13px', color: '#ccc', margin: 0, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}>
                🎉 ¡Hola [nombre]! Llevas {loyaltyVisits - 1} visitas con nosotros.<br/>
                Tu próxima cita es <strong style={{ color: 'var(--accent)' }}>GRATIS</strong> 🎁<br/>
                Agéndala aquí 👉 turnott.com/{negocio?.slug}
              </p>
            </div>
          </div>
        )}

        <button
          className="btn-mint"
          onClick={handleGuardarLoyalty}
          disabled={savingLoyalty}
          style={{ width: '100%' }}
        >
          {savingLoyalty ? 'Guardando…' : 'Guardar cambios'}
        </button>

        {/* Aviso token WhatsApp */}
        <div style={{
          background: '#2a1f00', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '10px', padding: '12px 14px', marginTop: '16px',
        }}>
          <p style={{ fontSize: '12px', color: '#F59E0B', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
            ⚠️ Si los mensajes de WhatsApp dejan de funcionar, el token de Meta puede haber expirado.
            Contacta a soporte en turnott.com
          </p>
        </div>
      </div>
    </div>
  )
}
