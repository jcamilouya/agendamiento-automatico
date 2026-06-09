import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, LogOut, Search, ExternalLink, BarChart3,
  Building2, CheckCircle2, AlertTriangle, Calendar, X, RefreshCw,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { isSuperAdmin } from '../config/admin'
import { formatCurrency } from '../lib/format'
import KPICard from '../components/dashboard/KPICard'

const DIAS_MS = 24 * 60 * 60 * 1000

function toYMD(d) { return d.toISOString().split('T')[0] }
function daysFromNow(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Math.ceil((d.getTime() - Date.now()) / DIAS_MS)
}
function formatDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()

  const [businesses, setBusinesses] = useState([])
  const [statsMap,   setStatsMap]   = useState({})  // { [biz_id]: { citas30, ingresos30, clientes } }
  const [loading,    setLoading]    = useState(true)
  const [query,      setQuery]      = useState('')
  const [filterActive,  setFilterActive]  = useState(false)
  const [filterExpired, setFilterExpired] = useState(false)
  const [drawerBiz,  setDrawerBiz]  = useState(null)
  const [busy,       setBusy]       = useState({})  // { [biz_id]: 'toggle'|'plan'|'trial' }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const since30 = toYMD(new Date(Date.now() - 30 * DIAS_MS))
      const [bizRes, apptRes, clientRes] = await Promise.all([
        supabase.from('businesses').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('appointments').select('business_id, status, final_price, services(price)').gte('date', since30),
        supabase.from('clients').select('business_id'),
      ])

      const map = {}
      ;(apptRes.data ?? []).forEach(a => {
        const k = a.business_id
        if (!map[k]) map[k] = { citas30: 0, ingresos30: 0, clientes: 0 }
        map[k].citas30++
        if (a.status === 'completed') {
          map[k].ingresos30 += Number(a.final_price ?? a.services?.price ?? 0)
        }
      })
      ;(clientRes.data ?? []).forEach(c => {
        const k = c.business_id
        if (!map[k]) map[k] = { citas30: 0, ingresos30: 0, clientes: 0 }
        map[k].clientes++
      })
      setStatsMap(map)
      setBusinesses(bizRes.data ?? [])
    } catch (err) {
      console.error('[Admin] load:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(biz) {
    setBusy(b => ({ ...b, [biz.id]: 'toggle' }))
    const { data, error } = await supabase
      .from('businesses').update({ is_active: !biz.is_active }).eq('id', biz.id).select().single()
    if (!error && data) setBusinesses(prev => prev.map(b => b.id === biz.id ? data : b))
    setBusy(b => { const c = { ...b }; delete c[biz.id]; return c })
  }

  async function handleChangePlan(biz, plan) {
    setBusy(b => ({ ...b, [biz.id]: 'plan' }))
    const { data, error } = await supabase
      .from('businesses').update({ subscription_plan: plan }).eq('id', biz.id).select().single()
    if (!error && data) setBusinesses(prev => prev.map(b => b.id === biz.id ? data : b))
    setBusy(b => { const c = { ...b }; delete c[biz.id]; return c })
  }

  async function handleTrial(biz, mode) {
    // mode: 'reset30' | 'add7' | 'add14' | 'add30'
    const now = Date.now()
    const cur = biz.trial_ends_at ? new Date(biz.trial_ends_at).getTime() : now
    const base = cur > now ? cur : now
    const map = { reset30: now + 30 * DIAS_MS, add7: base + 7 * DIAS_MS, add14: base + 14 * DIAS_MS, add30: base + 30 * DIAS_MS }
    const newTs = new Date(map[mode]).toISOString()
    setBusy(b => ({ ...b, [biz.id]: 'trial' }))
    const { data, error } = await supabase
      .from('businesses').update({ trial_ends_at: newTs }).eq('id', biz.id).select().single()
    if (!error && data) setBusinesses(prev => prev.map(b => b.id === biz.id ? data : b))
    setBusy(b => { const c = { ...b }; delete c[biz.id]; return c })
  }

  // KPIs globales
  const kpis = useMemo(() => {
    const total = businesses.length
    const activos = businesses.filter(b => b.is_active).length
    const venciendo = businesses.filter(b => {
      const d = daysFromNow(b.trial_ends_at)
      return b.subscription_plan === 'trial' && d !== null && d >= 0 && d <= 7
    }).length
    const citasMes = Object.values(statsMap).reduce((s, v) => s + v.citas30, 0)
    return { total, activos, venciendo, citasMes }
  }, [businesses, statsMap])

  // Filtros
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return businesses.filter(b => {
      if (filterActive && !b.is_active) return false
      if (filterExpired) {
        const d = daysFromNow(b.trial_ends_at)
        if (!(b.subscription_plan === 'trial' && d !== null && d < 0)) return false
      }
      if (q) {
        const hay = (b.name ?? '').toLowerCase().includes(q) || (b.slug ?? '').toLowerCase().includes(q)
        if (!hay) return false
      }
      return true
    })
  }, [businesses, query, filterActive, filterExpired])

  if (!session) return null
  if (!isSuperAdmin(session)) {
    navigate('/dashboard', { replace: true })
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: 'DM Sans, sans-serif', color: '#F5F5F5' }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', borderBottom: '1px solid #1A1A1A',
        background: 'rgba(10,10,10,0.85)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--accent)' }}>
            TURNOTT
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(var(--accent-rgb),0.1)',
            border: '1px solid rgba(var(--accent-rgb),0.3)',
            color: 'var(--accent)', borderRadius: 999, padding: '3px 10px',
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
          }}>
            <Shield size={11} /> SUPER ADMIN
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#666', fontSize: '0.78rem' }}>{session.user.email}</span>
          <button
            onClick={async () => { await signOut(); navigate('/login') }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: '1px solid #333',
              color: '#888', padding: '7px 14px', borderRadius: 8,
              cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF4D4D'; e.currentTarget.style.color = '#FF4D4D' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888' }}
          >
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      <main style={{ padding: '28px 32px', maxWidth: 1500, margin: '0 auto' }}>
        {/* Header de página */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', marginBottom: 4 }}>
              Negocios registrados
            </h1>
            <p style={{ color: '#666', fontSize: '0.85rem' }}>
              Gestiona todas las barberías inscritas en la plataforma
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#1A1A1A', border: '1px solid #2A2A2A',
              color: '#888', padding: '8px 14px', borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.82rem',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={13} /> Refrescar
          </button>
        </div>

        {/* KPIs */}
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <KPICard icon={Building2}      label="Total negocios"      value={loading ? '—' : String(kpis.total)}     delay={0}   />
          <KPICard icon={CheckCircle2}   label="Activos"             value={loading ? '—' : String(kpis.activos)}   delay={80}  />
          <KPICard icon={AlertTriangle}  label="Trials vencen ≤ 7d"  value={loading ? '—' : String(kpis.venciendo)} delay={160} pulse={!loading && kpis.venciendo > 0} />
          <KPICard icon={Calendar}       label="Citas (30d)"         value={loading ? '—' : String(kpis.citasMes)}  delay={240} />
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 380 }}>
            <Search size={14} style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: '#555', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar por nombre o slug"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="dash-input"
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>
          <FilterChip active={filterActive}  onClick={() => setFilterActive(v => !v)}  label="Solo activos" />
          <FilterChip active={filterExpired} onClick={() => setFilterExpired(v => !v)} label="Trial vencido" />
        </div>

        {/* Tabla */}
        <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0,1,2,3].map(i => <div key={i} className="dash-skeleton" style={{ height: 48 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Building2 size={36} color="#282828" style={{ margin: '0 auto 14px', display: 'block' }} />
              <p style={{ color: '#555', fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: 4 }}>
                {businesses.length === 0 ? 'Sin negocios registrados' : 'No hay coincidencias'}
              </p>
              <p style={{ color: '#3A3A3A', fontSize: '0.78rem' }}>
                {businesses.length === 0 ? 'Cuando alguien se registre, aparecerá aquí' : 'Prueba a quitar los filtros'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                <thead>
                  <tr style={{ background: '#0F0F0F', borderBottom: '1px solid #1E1E1E' }}>
                    {['Negocio', 'Plan', 'Estado', 'Trial', 'Citas (30d)', 'Clientes', 'Creado', 'Acciones'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '12px 14px',
                        color: '#666', fontSize: '0.72rem',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        fontWeight: 600,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(biz => (
                    <BusinessRow
                      key={biz.id}
                      biz={biz}
                      stats={statsMap[biz.id] ?? { citas30: 0, ingresos30: 0, clientes: 0 }}
                      busyKey={busy[biz.id]}
                      onToggleActive={() => handleToggleActive(biz)}
                      onChangePlan={(p) => handleChangePlan(biz, p)}
                      onTrial={(m) => handleTrial(biz, m)}
                      onOpenStats={() => setDrawerBiz(biz)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {drawerBiz && (
        <StatsDrawer
          biz={drawerBiz}
          stats={statsMap[drawerBiz.id] ?? { citas30: 0, ingresos30: 0, clientes: 0 }}
          onClose={() => setDrawerBiz(null)}
        />
      )}
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function FilterChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(var(--accent-rgb),0.12)' : 'transparent',
        border: `1px solid ${active ? 'rgba(var(--accent-rgb),0.4)' : '#252525'}`,
        color: active ? 'var(--accent)' : '#888',
        borderRadius: 999, padding: '7px 14px',
        cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
        transition: 'all 0.2s ease',
      }}
    >
      {label}
    </button>
  )
}

function BusinessRow({ biz, stats, busyKey, onToggleActive, onChangePlan, onTrial, onOpenStats }) {
  const [openMenu, setOpenMenu] = useState(null)  // 'plan' | 'trial' | null
  const trialDays = daysFromNow(biz.trial_ends_at)
  const trialColor =
    biz.subscription_plan === 'pro'      ? '#888' :
    trialDays === null                   ? '#888' :
    trialDays < 0                        ? '#FF4D4D' :
    trialDays <= 3                       ? '#F59E0B' :
                                           '#888'

  const cellStyle = { padding: '12px 14px', borderBottom: '1px solid #161616', fontSize: '0.85rem', color: '#F5F5F5', verticalAlign: 'middle' }

  return (
    <tr style={{ opacity: biz.is_active ? 1 : 0.55 }}>
      <td style={cellStyle}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600 }}>{biz.name}</span>
          <span style={{ color: '#555', fontSize: '0.72rem' }}>/{biz.slug}</span>
        </div>
      </td>
      <td style={cellStyle}>
        <span className={`status-badge ${biz.subscription_plan === 'pro' ? 'confirmed' : 'pending'}`} style={{ textTransform: 'capitalize' }}>
          {biz.subscription_plan ?? 'trial'}
        </span>
      </td>
      <td style={cellStyle}>
        <span className={`status-badge ${biz.is_active ? 'confirmed' : 'cancelled'}`}>
          {biz.is_active ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td style={{ ...cellStyle, color: trialColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {biz.subscription_plan === 'pro'
          ? '—'
          : trialDays === null
            ? '—'
            : trialDays < 0
              ? `Vencido (${Math.abs(trialDays)}d)`
              : `${trialDays}d`}
      </td>
      <td style={cellStyle}>{stats.citas30}</td>
      <td style={cellStyle}>{stats.clientes}</td>
      <td style={{ ...cellStyle, color: '#666', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
        {formatDate(biz.created_at)}
      </td>
      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <ToggleSwitch
            checked={biz.is_active}
            disabled={busyKey === 'toggle'}
            onChange={onToggleActive}
            title={biz.is_active ? 'Desactivar' : 'Activar'}
          />

          <RowActionButton onClick={() => setOpenMenu(m => m === 'plan' ? null : 'plan')} title="Cambiar plan">
            Plan
          </RowActionButton>
          {openMenu === 'plan' && (
            <PopMenu onClose={() => setOpenMenu(null)}>
              <PopItem onClick={() => { onChangePlan('trial'); setOpenMenu(null) }} active={biz.subscription_plan === 'trial'}>Trial</PopItem>
              <PopItem onClick={() => { onChangePlan('pro');   setOpenMenu(null) }} active={biz.subscription_plan === 'pro'}>Pro</PopItem>
            </PopMenu>
          )}

          <RowActionButton onClick={() => setOpenMenu(m => m === 'trial' ? null : 'trial')} title="Modificar trial">
            Trial
          </RowActionButton>
          {openMenu === 'trial' && (
            <PopMenu onClose={() => setOpenMenu(null)}>
              <PopItem onClick={() => { onTrial('reset30'); setOpenMenu(null) }}>Reiniciar 30d</PopItem>
              <PopItem onClick={() => { onTrial('add7');    setOpenMenu(null) }}>Extender +7d</PopItem>
              <PopItem onClick={() => { onTrial('add14');   setOpenMenu(null) }}>Extender +14d</PopItem>
              <PopItem onClick={() => { onTrial('add30');   setOpenMenu(null) }}>Extender +30d</PopItem>
            </PopMenu>
          )}

          <RowActionButton onClick={onOpenStats} title="Ver estadísticas">
            <BarChart3 size={13} />
          </RowActionButton>

          <a
            href={`/${biz.slug}`}
            target="_blank"
            rel="noreferrer"
            title="Abrir página pública"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 8,
              background: 'transparent', border: '1px solid #252525',
              color: '#888', textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#888' }}
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </td>
    </tr>
  )
}

function RowActionButton({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        minWidth: 30, height: 30, borderRadius: 8, padding: '0 9px',
        background: 'transparent', border: '1px solid #252525',
        color: '#888', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#888' }}
    >
      {children}
    </button>
  )
}

function PopMenu({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
      <div style={{
        position: 'absolute', marginTop: 36, zIndex: 61,
        background: '#161616', border: '1px solid #2A2A2A',
        borderRadius: 8, padding: 4, minWidth: 140,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      }}>
        {children}
      </div>
    </>
  )
}

function PopItem({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: active ? 'rgba(var(--accent-rgb),0.12)' : 'transparent',
        color: active ? 'var(--accent)' : '#CCC',
        border: 'none', borderRadius: 6, padding: '7px 10px',
        fontSize: '0.8rem', cursor: 'pointer',
        fontFamily: 'DM Sans, sans-serif',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#222' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

function ToggleSwitch({ checked, onChange, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={title}
      style={{
        width: 36, height: 20, borderRadius: 999,
        background: checked ? 'var(--accent)' : '#2A2A2A',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', flexShrink: 0,
        transition: 'background 0.2s ease',
        opacity: disabled ? 0.5 : 1,
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

function StatsDrawer({ biz, stats, onClose }) {
  const [services, setServices] = useState([])
  const [stylists, setStylists] = useState([])

  useEffect(() => {
    Promise.all([
      supabase.from('services').select('id, name, price').eq('business_id', biz.id).eq('is_active', true),
      supabase.from('stylists').select('id, name').eq('business_id', biz.id).eq('is_active', true),
    ]).then(([s, e]) => {
      setServices(s.data ?? [])
      setStylists(e.data ?? [])
    })
  }, [biz.id])

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: 'min(460px, 100vw)',
        background: '#0F0F0F', borderLeft: '1px solid #1E1E1E',
        zIndex: 201, overflowY: 'auto',
        animation: 'slideInLeft 0.25s ease reverse',
      }}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <p style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Estadísticas
              </p>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#F5F5F5' }}>
                {biz.name}
              </h3>
              <p style={{ color: '#666', fontSize: '0.78rem', marginTop: 2 }}>/{biz.slug}</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            <StatBox label="Citas 30d"      value={stats.citas30}                         color="#F5F5F5" />
            <StatBox label="Ingresos 30d"   value={formatCurrency(stats.ingresos30)}      color="var(--accent)" />
            <StatBox label="Clientes total" value={stats.clientes}                        color="#F5F5F5" />
            <StatBox label="Plan"           value={biz.subscription_plan ?? 'trial'}      color={biz.subscription_plan === 'pro' ? 'var(--accent)' : '#F59E0B'} />
          </div>

          <Section title="Configuración">
            <KV k="Estado"        v={biz.is_active ? 'Activo' : 'Inactivo'} />
            <KV k="Ciudad"        v={biz.city ?? '—'} />
            <KV k="Tipo"          v={biz.business_type ?? '—'} />
            <KV k="WhatsApp"      v={biz.phone ?? '—'} />
            <KV k="Trial expira"  v={formatDate(biz.trial_ends_at)} />
            <KV k="Creado"        v={formatDate(biz.created_at)} />
          </Section>

          <Section title={`Servicios (${services.length})`}>
            {services.length === 0
              ? <p style={{ color: '#555', fontSize: '0.78rem' }}>Sin servicios</p>
              : services.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1A1A1A' }}>
                  <span style={{ fontSize: '0.82rem', color: '#CCC' }}>{s.name}</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>{formatCurrency(s.price)}</span>
                </div>
              ))
            }
          </Section>

          <Section title={`Equipo (${stylists.length})`}>
            {stylists.length === 0
              ? <p style={{ color: '#555', fontSize: '0.78rem' }}>Sin equipo</p>
              : stylists.map(s => (
                <div key={s.id} style={{ padding: '6px 0', borderBottom: '1px solid #1A1A1A', fontSize: '0.82rem', color: '#CCC' }}>
                  {s.name}
                </div>
              ))
            }
          </Section>

          <a
            href={`/${biz.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(var(--accent-rgb),0.1)',
              border: '1px solid rgba(var(--accent-rgb),0.3)',
              color: 'var(--accent)', borderRadius: 8,
              padding: '9px 14px', textDecoration: 'none',
              fontSize: '0.84rem', fontWeight: 600,
              marginTop: 12,
            }}
          >
            <ExternalLink size={13} /> Ver página pública
          </a>
        </div>
      </div>
    </>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: '#161616', border: '1px solid #1E1E1E', borderRadius: 10, padding: '12px 14px' }}>
      <p style={{ color: '#555', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.15rem', color, textTransform: 'capitalize' }}>{value}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>
        {title}
      </p>
      <div>{children}</div>
    </div>
  )
}

function KV({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #1A1A1A' }}>
      <span style={{ color: '#666', fontSize: '0.78rem' }}>{k}</span>
      <span style={{ color: '#CCC', fontSize: '0.82rem', fontWeight: 500 }}>{v}</span>
    </div>
  )
}
