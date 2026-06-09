import { useState, useEffect, useCallback } from 'react'
import { X, Phone, Calendar, Star, FileText, Loader2, Users, UserPlus, MessageCircle, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/format'
import { normalizePhone } from '../../lib/whatsapp'

const DIAS_RETOQUE = 20

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function formatFecha(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

function diasDesde(ts) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function waRetoque(cliente, negocioSlug) {
  const nombre    = cliente.name.split(' ')[0]
  const dias      = diasDesde(cliente.last_visit_at)
  const bookUrl   = negocioSlug ? `https://turnott.com/${negocioSlug}` : ''
  const partes    = [
    `¡Hola ${nombre}! 👋`,
    ``,
    `Ya ${dias ? `hace ${dias} días` : 'hace un tiempo'} que no te vemos por aquí... ✂️`,
    ``,
    `¿Listo para tu retoque? Agenda cuando quieras:`,
  ]
  if (bookUrl) partes.push(bookUrl)
  const msg = partes.join('\n')
  const num = normalizePhone(cliente.phone).replace('+', '')
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

function ClientDrawer({ cliente, businessId, onClose }) {
  const [notas, setNotas]           = useState(cliente.notes ?? '')
  const [guardando, setGuardando]   = useState(false)
  const [historial, setHistorial]   = useState([])
  const [loadingH, setLoadingH]     = useState(true)

  useEffect(() => {
    supabase.from('appointments')
      .select('date, start_time, status, final_price, services(name, price)')
      .eq('business_id', businessId)
      .eq('client_phone', cliente.phone)
      .order('date', { ascending: false })
      .limit(10)
      .then(({ data }) => { setHistorial(data ?? []); setLoadingH(false) })
  }, [cliente.phone, businessId])

  async function guardarNotas() {
    setGuardando(true)
    await supabase.from('clients').update({ notes: notas }).eq('id', cliente.id)
    setGuardando(false)
  }

  const initials = cliente.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const totalIngresos = historial
    .filter(a => a.status === 'completed')
    .reduce((s, a) => s + Number(a.final_price ?? a.services?.price ?? 0), 0)

  return (
    <>
      <div onClick={onClose} className="cliente-drawer-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: 'min(420px, 100vw)',
        background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.08)',
        borderRight: 'none',
        zIndex: 201, overflowY: 'auto',
        animation: 'slideInLeft 0.25s ease reverse',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent)',
              }}>
                {initials}
              </div>
              <div>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#F5F5F5', marginBottom: '4px' }}>
                  {cliente.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#666666', fontSize: '0.78rem' }}>
                  <Phone size={12} /> {cliente.phone}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
            {[
              { label: 'Visitas', value: cliente.visit_count ?? 0, icon: Calendar },
              { label: 'Ingresos', value: formatCurrency(totalIngresos), icon: Star },
              { label: 'Última visita', value: formatFecha(cliente.last_visit_at), icon: Calendar },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px', padding: '12px',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</p>
                <p style={{ color: '#F5F5F5', fontWeight: 600, fontSize: '0.85rem' }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <FileText size={14} color="var(--accent)" />
              <h4 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.85rem', color: '#F5F5F5' }}>
                Notas del barbero
              </h4>
            </div>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Le gusta el fade bajo, máquina 1.5 en lados, no le gusta la espuma..."
              className="dash-input"
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6, fontSize: '0.85rem' }}
            />
            <button
              onClick={guardarNotas}
              disabled={guardando}
              style={{
                marginTop: '8px', padding: '8px 18px', borderRadius: '8px',
                background: 'var(--accent)', color: '#050505',
                border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.82rem',
                fontFamily: 'DM Sans, sans-serif',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {guardando ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : null}
              {guardando ? 'Guardando...' : 'Guardar notas'}
            </button>
          </div>

          <div>
            <h4 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.85rem', color: '#F5F5F5', marginBottom: '12px' }}>
              Historial de citas
            </h4>
            {loadingH ? (
              <div className="dash-skeleton" style={{ height: 60 }} />
            ) : historial.length === 0 ? (
              <p style={{ color: '#444', fontSize: '0.8rem' }}>Sin historial de citas</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historial.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                  }}>
                    <div>
                      <p style={{ color: '#F5F5F5', fontSize: '0.82rem', fontWeight: 500 }}>{a.services?.name}</p>
                      <p style={{ color: '#555', fontSize: '0.72rem' }}>{formatFecha(a.date)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: a.status === 'completed' ? 'var(--accent)' : a.status === 'cancelled' ? '#FF4D4D' : '#F59E0B', fontSize: '0.72rem', fontWeight: 600 }}>
                        {a.status === 'completed' ? 'Completada' : a.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                      </p>
                      {a.status === 'completed' && (a.final_price || a.services?.price) && (
                        <p style={{ color: '#444', fontSize: '0.7rem' }}>{formatCurrency(a.final_price ?? a.services.price)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

const FORM_EMPTY = { name: '', phone: '', email: '', notes: '' }

function NuevoClienteModal({ businessId, onClose, onCreado }) {
  const [form,      setForm]      = useState(FORM_EMPTY)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')

  async function guardar() {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Nombre y teléfono son obligatorios')
      return
    }
    setGuardando(true)
    setError('')
    const { error: err } = await supabase.from('clients').insert({
      business_id: businessId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
      visit_count: 0,
    })
    setGuardando(false)
    if (err) { setError(err.message); return }
    onCreado()
    onClose()
  }

  const inp = (field) => ({
    className: 'dash-input',
    value: form[field],
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    style: { width: '100%', marginBottom: 12 },
  })

  return (
    <div className="dash-modal-overlay">
      <div className="dash-modal" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: '#F5F5F5' }}>
            Nuevo cliente
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <input {...inp('name')}  placeholder="Nombre completo *" />
        <input {...inp('phone')} placeholder="Teléfono (ej: 3001234567) *" />
        <input {...inp('email')} placeholder="Email (opcional)" type="email" />
        <textarea
          className="dash-input"
          placeholder="Notas privadas (opcional)"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={3}
          style={{ width: '100%', marginBottom: 12, resize: 'vertical' }}
        />
        {error && <p style={{ color: '#FF4D4D', fontSize: '0.8rem', marginBottom: 10 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 8, border: '1px solid #2A2A2A',
            background: 'none', color: '#888', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem',
          }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} className="btn-mint">
            {guardando ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <UserPlus size={14} />}
            {guardando ? 'Guardando…' : 'Agregar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Fila de cliente que necesita retoque — muestra días sin visitar + botón wa.me
function FilaRetoque({ cliente, negocioSlug, onClick }) {
  const dias = diasDesde(cliente.last_visit_at)
  return (
    <div className="cliente-card cliente-card-retoque" style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 14px',
      background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)',
      borderRadius: '10px',
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#F59E0B', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'Syne, sans-serif',
      }}>
        {cliente.name.charAt(0).toUpperCase()}
      </div>

      <button
        onClick={onClick}
        style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
      >
        <p style={{ color: '#F5F5F5', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>{cliente.name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#F59E0B', fontSize: '0.7rem', marginTop: '2px' }}>
          <Clock size={11} />
          {dias !== null ? `${dias} días sin visitar` : 'Sin visitas registradas'}
        </div>
      </button>

      <a
        href={waRetoque(cliente, negocioSlug)}
        target="_blank"
        rel="noopener noreferrer"
        title="Enviar recordatorio por WhatsApp"
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '7px 12px',
          background: '#25D366', color: '#fff',
          borderRadius: '8px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.75rem',
          textDecoration: 'none', flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#20ba58' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#25D366' }}
      >
        <MessageCircle size={14} />
        Recordar
      </a>
    </div>
  )
}

export default function ClientesPanel({ businessId, negocioSlug }) {
  const [clientes,   setClientes]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState(null)
  const [showNuevo,  setShowNuevo]  = useState(false)
  const [mostrarTodos, setMostrarTodos] = useState(false)

  const cargar = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('business_id', businessId)
      .order('last_visit_at', { ascending: false })
    setClientes(data ?? [])
    setLoading(false)
  }, [businessId])

  useEffect(() => { cargar() }, [cargar])

  const hoy = Date.now()
  const necesitanRetoque = clientes.filter(c => {
    if (!c.last_visit_at) return false
    const dias = Math.floor((hoy - new Date(c.last_visit_at).getTime()) / 86400000)
    return dias >= DIAS_RETOQUE
  })

  const filtrados = clientes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <div>
      <div className="clientes-header">
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: '#F5F5F5', marginBottom: '4px' }}>
            Clientes
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
            {clientes.length} clientes registrados
          </p>
        </div>
        <div className="clientes-header-actions">
          <input
            className="dash-input clientes-search"
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button onClick={() => setShowNuevo(true)} className="btn-mint">
            <UserPlus size={14} />
            Agregar
          </button>
        </div>
      </div>

      {/* Sección: necesitan retoque */}
      {!loading && necesitanRetoque.length > 0 && !search && (
        <div style={{
          background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.18)',
          borderRadius: '12px', padding: '16px 18px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#F59E0B" />
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#F59E0B' }}>
                Necesitan retoque
              </span>
              <span style={{
                background: 'rgba(245,158,11,0.15)', color: '#F59E0B',
                borderRadius: '999px', padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700,
              }}>
                {necesitanRetoque.length}
              </span>
            </div>
            <span style={{ color: '#555', fontSize: '0.72rem' }}>+{DIAS_RETOQUE} días sin visitar</span>
          </div>

          <p style={{ color: '#666', fontSize: '0.78rem', marginBottom: '12px' }}>
            Toca "Recordar" para abrir WhatsApp con el mensaje listo. Solo toca Enviar.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(mostrarTodos ? necesitanRetoque : necesitanRetoque.slice(0, 5)).map(c => (
              <FilaRetoque
                key={c.id}
                cliente={c}
                negocioSlug={negocioSlug}
                onClick={() => setSelected(c)}
              />
            ))}
          </div>

          {necesitanRetoque.length > 5 && (
            <button
              onClick={() => setMostrarTodos(v => !v)}
              style={{
                marginTop: '10px', background: 'none', border: 'none',
                color: '#F59E0B', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem',
                padding: '4px 0', textDecoration: 'underline',
              }}
            >
              {mostrarTodos ? 'Ver menos' : `Ver ${necesitanRetoque.length - 5} más`}
            </button>
          )}
        </div>
      )}

      {/* Lista principal */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[0,1,2,3].map(i => <div key={i} className="dash-skeleton" style={{ height: 72 }} />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Users size={48} color="#282828" style={{ margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: '#444', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>Sin clientes aún</p>
          <p style={{ color: '#333', fontSize: '0.8rem', marginTop: '6px' }}>Los clientes aparecen automáticamente cuando agendan una cita</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtrados.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="cliente-card"
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', width: '100%', textAlign: 'left',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px', cursor: 'pointer',
                transition: 'background 0.2s ease, border-color 0.2s ease', fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'Syne, sans-serif',
              }}>
                {c.name.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#F5F5F5', fontWeight: 600, fontSize: '0.88rem', marginBottom: '3px' }}>
                  {c.name}
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#555', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={11} /> {c.phone}
                  </span>
                  <span style={{ color: '#555', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={11} /> Última: {formatFecha(c.last_visit_at)}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'Syne, sans-serif' }}>
                  {c.visit_count ?? 0}
                </p>
                <p style={{ color: '#444', fontSize: '0.68rem' }}>visitas</p>
              </div>

              {c.notes && (
                <div style={{ color: '#555', flexShrink: 0 }}>
                  <FileText size={14} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ClientDrawer
          cliente={selected}
          businessId={businessId}
          onClose={() => { setSelected(null); cargar() }}
        />
      )}

      {showNuevo && (
        <NuevoClienteModal
          businessId={businessId}
          onClose={() => setShowNuevo(false)}
          onCreado={cargar}
        />
      )}
    </div>
  )
}
