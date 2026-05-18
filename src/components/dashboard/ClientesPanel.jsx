import { useState, useEffect, useCallback } from 'react'
import { X, Phone, Calendar, Star, FileText, Loader2, Users, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function formatFecha(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}
function formatCOP(n) { return '$' + Math.round(n).toLocaleString('es-CO') }

function ClientDrawer({ cliente, businessId, onClose }) {
  const [notas, setNotas]           = useState(cliente.notes ?? '')
  const [guardando, setGuardando]   = useState(false)
  const [historial, setHistorial]   = useState([])
  const [loadingH, setLoadingH]     = useState(true)

  useEffect(() => {
    supabase.from('appointments')
      .select('date, start_time, status, services(name, price)')
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
    .reduce((s, a) => s + Number(a.services?.price ?? 0), 0)

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: 'min(420px, 100vw)',
        background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.08)',
        borderRight: 'none',
        zIndex: 201, overflowY: 'auto',
        animation: 'slideInLeft 0.25s ease reverse',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
      }}>
        {/* Brillo superior */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

        <div style={{ padding: '24px' }}>
          {/* Header */}
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

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
            {[
              { label: 'Visitas', value: cliente.visit_count ?? 0, icon: Calendar },
              { label: 'Ingresos', value: formatCOP(totalIngresos), icon: Star },
              { label: 'Última visita', value: formatFecha(cliente.last_visit_at), icon: Calendar },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px', padding: '12px',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</p>
                <p style={{ color: '#F5F5F5', fontWeight: 600, fontSize: '0.85rem' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Notas privadas */}
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

          {/* Historial */}
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
                      <p style={{ color: a.status === 'completed' ? '#00FF88' : a.status === 'cancelled' ? '#FF4D4D' : '#F59E0B', fontSize: '0.72rem', fontWeight: 600 }}>
                        {a.status === 'completed' ? 'Completada' : a.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                      </p>
                      {a.status === 'completed' && a.services?.price && (
                        <p style={{ color: '#444', fontSize: '0.7rem' }}>{formatCOP(a.services.price)}</p>
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

export default function ClientesPanel({ businessId }) {
  const [clientes,   setClientes]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState(null)
  const [showNuevo,  setShowNuevo]  = useState(false)

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

  const filtrados = clientes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: '#F5F5F5', marginBottom: '4px' }}>
            Clientes
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
            {clientes.length} clientes registrados
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            className="dash-input"
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '220px' }}
          />
          <button onClick={() => setShowNuevo(true)} className="btn-mint">
            <UserPlus size={14} />
            Agregar
          </button>
        </div>
      </div>

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
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', width: '100%', textAlign: 'left',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px', cursor: 'pointer',
                transition: 'all 0.2s ease', fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
            >
              {/* Avatar */}
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

      {/* Drawer lateral */}
      {selected && (
        <ClientDrawer
          cliente={selected}
          businessId={businessId}
          onClose={() => { setSelected(null); cargar() }}
        />
      )}

      {/* Modal nuevo cliente */}
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

