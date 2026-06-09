import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, DollarSign, Clock, TrendingUp, Home, Users, User, Settings, Link, Share2, Scissors, BarChart2, Menu, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import DashSidebar   from '../components/dashboard/DashSidebar'
import DashHeader    from '../components/dashboard/DashHeader'
import KPICard       from '../components/dashboard/KPICard'
import AgendaHoy     from '../components/dashboard/AgendaHoy'
import SemanaResumen from '../components/dashboard/SemanaResumen'
import GraficosPanel from '../components/dashboard/GraficosPanel'
import CitasPanel       from '../components/dashboard/CitasPanel'
import EstilistasPanel from '../components/dashboard/EstilistasPanel'
import ServiciosPanel  from '../components/dashboard/ServiciosPanel'
import AjustesPanel    from '../components/dashboard/AjustesPanel'
import ClientesPanel   from '../components/dashboard/ClientesPanel'
import HorariosPanel   from '../components/dashboard/HorariosPanel'
import ReporteSemanal  from '../components/dashboard/ReporteSemanal'
import { formatCurrency } from '../lib/format'
import { isSuperAdmin } from '../config/admin'

const DEMO_SLUG = 'turno-demo'

function toYMD(d) {
  return d.toISOString().split('T')[0]
}

function getMonday(d) {
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m    = new Date(d)
  m.setDate(d.getDate() + diff)
  return toYMD(m)
}

function getSunday(d) {
  const day  = d.getDay()
  const diff = day === 0 ? 0 : 7 - day
  const s    = new Date(d)
  s.setDate(d.getDate() + diff)
  return toYMD(s)
}

const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

function priceOf(a) {
  return Number(a.final_price ?? a.services?.price ?? 0)
}

function buildWeekData(appts) {
  const map = {}
  DIAS_SEMANA.forEach(d => { map[d] = { dia: d, citas: 0, ingresos: 0 } })
  appts.forEach(a => {
    const d   = new Date(a.date + 'T12:00:00')
    const key = DIAS_SEMANA[d.getDay() === 0 ? 6 : d.getDay() - 1]
    map[key].citas++
    if (a.status === 'completed') map[key].ingresos += priceOf(a)
  })
  return DIAS_SEMANA.map(d => map[d])
}

export default function DashboardPage() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  const [negocio,        setNegocio]        = useState(null)
  const [todayAppts,     setTodayAppts]     = useState([])
  const [weekAppts,      setWeekAppts]      = useState([])
  const [upcomingAppts,  setUpcomingAppts]  = useState([])
  const [stylists,       setStylists]       = useState([])
  const [services,       setServices]       = useState([])
  const [dataLoading,    setDataLoading]    = useState(true)
  const [allCitas,       setAllCitas]       = useState([])
  const [allCitasLoading,setAllCitasLoading]= useState(false)
  const [activeSection,  setActiveSection]  = useState('inicio')
  const [drawerAbierto,  setDrawerAbierto]  = useState(false)
  const [theme,          setTheme]          = useState(() => localStorage.getItem('turno-theme') || 'dark')
  const [accentColor,    setAccentColor]    = useState(() => localStorage.getItem('turno-accent') || '#00FF88')
  const [widgetOrder,    setWidgetOrder]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('turno-widgets')) || ['kpis','agenda','graficos'] }
    catch { return ['kpis','agenda','graficos'] }
  })

  // Aplica el tema al documento
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light')
    } else {
      document.documentElement.classList.remove('theme-light')
    }
    localStorage.setItem('turno-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  function applyAccentVars(color) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    document.documentElement.style.setProperty('--accent', color)
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
    document.documentElement.style.setProperty('--accent-dim', `rgba(${r},${g},${b},0.12)`)
    document.documentElement.style.setProperty('--accent-glow', `0 0 20px rgba(${r},${g},${b},0.3), 0 0 60px rgba(${r},${g},${b},0.1)`)
  }

  function handleAccentChange(color) {
    setAccentColor(color)
    localStorage.setItem('turno-accent', color)
    applyAccentVars(color)
  }

  // Aplica accent al montar (desde localStorage)
  useEffect(() => { applyAccentVars(accentColor) }, [])

  function handleWidgetOrderChange(order) {
    setWidgetOrder(order)
    localStorage.setItem('turno-widgets', JSON.stringify(order))
  }

  useEffect(() => {
    if (!session) return
    // El super-admin no tiene un dashboard de negocio — siempre va al panel admin.
    if (isSuperAdmin(session)) {
      navigate('/admin', { replace: true })
      return
    }
    loadAll()
  }, [session])

  async function loadAll() {
    setDataLoading(true)
    try {
      const today = toYMD(new Date())
      const mon   = getMonday(new Date())
      const sun   = getSunday(new Date())

      // Carga el negocio del usuario autenticado.
      // Solo el usuario demo (admin@turno.co) cae al slug 'turno-demo'.
      let neg = null
      const { data: ownBiz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle()

      if (ownBiz) {
        neg = ownBiz
      } else if (session.user.email === 'admin@turno.co') {
        const { data: demoBiz } = await supabase
          .from('businesses').select('*').eq('slug', DEMO_SLUG).maybeSingle()
        neg = demoBiz
      } else {
        // Usuario autenticado sin negocio asociado → redirigir a registro
        navigate('/register')
        return
      }
      if (!neg) {
        navigate('/register')
        return
      }
      setNegocio(neg)

      const [todayRes, weekRes, upcomingRes, stylistsRes, servicesRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, stylists(id, name, photo_url), services(name, price, duration_minutes)')
          .eq('business_id', neg.id)
          .eq('date', today)
          .order('start_time'),

        supabase
          .from('appointments')
          .select('date, status, final_price, services(price)')
          .eq('business_id', neg.id)
          .gte('date', mon)
          .lte('date', sun)
          .neq('status', 'cancelled'),

        supabase
          .from('appointments')
          .select('*, stylists(name), services(name)')
          .eq('business_id', neg.id)
          .gte('date', today)
          .in('status', ['pending', 'confirmed'])
          .order('date')
          .order('start_time')
          .limit(5),

        supabase
          .from('stylists')
          .select('id, name')
          .eq('business_id', neg.id)
          .eq('is_active', true)
          .order('name'),

        supabase
          .from('services')
          .select('id, name, price, duration_minutes')
          .eq('business_id', neg.id)
          .eq('is_active', true)
          .order('name'),
      ])

      setTodayAppts(todayRes.data ?? [])
      setWeekAppts(weekRes.data ?? [])
      setUpcomingAppts(upcomingRes.data ?? [])
      setStylists(stylistsRes.data ?? [])
      setServices(servicesRes.data ?? [])
    } catch (err) {
      console.error('Error cargando dashboard:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const loadAllCitas = useCallback(async ({ dateFrom, dateTo, status, stylistId }) => {
    if (!negocio) return
    setAllCitasLoading(true)
    try {
      let query = supabase
        .from('appointments')
        .select('*, stylists(id, name), services(name, price, duration_minutes)')
        .eq('business_id', negocio.id)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date')
        .order('start_time')

      if (status !== 'all')    query = query.eq('status', status)
      if (stylistId !== 'all') query = query.eq('stylist_id', stylistId)

      const { data, error } = await query
      if (error) throw error
      setAllCitas(data ?? [])
    } catch (err) {
      console.error('Error cargando citas:', err)
    } finally {
      setAllCitasLoading(false)
    }
  }, [negocio])

  async function handleStatusChange(appointmentId, newStatus) {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)

    if (!error) {
      const patch = prev => prev.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a)
      setTodayAppts(patch)
      setAllCitas(patch)
    }
  }

  async function handleAddWalkin({ nombre, telefono, stylist_id, service_id }) {
    const svc = services.find(s => s.id === service_id)
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const startTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`
    const endMs  = now.getTime() + (svc?.duration_minutes ?? 30) * 60000
    const endD   = new Date(endMs)
    const endTime = `${pad(endD.getHours())}:${pad(endD.getMinutes())}`

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        business_id:  negocio.id,
        stylist_id,
        service_id,
        client_name:  nombre.trim(),
        client_phone: telefono.replace(/\D/g, '') || 'N/A',
        date:         toYMD(now),
        start_time:   startTime,
        end_time:     endTime,
        status:       'confirmed',
      })
      .select('*, stylists(id, name, photo_url), services(name, price, duration_minutes)')
      .single()

    if (error) {
      console.error('Walk-in Supabase error:', JSON.stringify(error))
      throw error
    }

    setTodayAppts(prev =>
      [...prev, data].sort((a, b) => a.start_time.localeCompare(b.start_time))
    )
    setWeekAppts(prev => [...prev, data])
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // KPIs derivados
  const pendingCount = todayAppts.filter(a => a.status === 'pending').length
  const revenueHoy   = todayAppts
    .filter(a => a.status === 'completed')
    .reduce((s, a) => s + priceOf(a), 0)
  const weekCount    = weekAppts.length

  // Datos para gráficos
  const weekData = buildWeekData(weekAppts)
  const statusData = [
    { label: 'Pendientes',  value: todayAppts.filter(a => a.status === 'pending').length,   color: '#F59E0B' },
    { label: 'Confirmadas', value: todayAppts.filter(a => a.status === 'confirmed').length,  color: 'var(--accent)' },
    { label: 'Completadas', value: todayAppts.filter(a => a.status === 'completed').length,  color: '#888888' },
    { label: 'Canceladas',  value: todayAppts.filter(a => a.status === 'cancelled').length,  color: '#FF4D4D' },
  ]

  return (
    <div className="dash-layout">
      <DashSidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        negocio={negocio}
        onSignOut={handleSignOut}
        userEmail={session?.user?.email}
        accentColor={accentColor}
      />

      <main className="dash-main">
        <DashHeader negocio={negocio} pendingAppts={todayAppts.filter(a => a.status === 'pending')} theme={theme} onThemeToggle={toggleTheme} onSignOut={handleSignOut} />

        <div style={{ padding: '28px 32px' }}>

          {/* Sección activa */}
          {activeSection === 'citas' ? (
            <>
              <div className="kpi-grid" style={{ marginBottom: 28 }}>
                <KPICard icon={Calendar}   label="Citas hoy"    value={dataLoading ? '—' : String(todayAppts.length)} delay={0} />
                <KPICard icon={DollarSign} label="Ingresos hoy" value={dataLoading ? '—' : formatCurrency(revenueHoy)} sublabel="completadas" delay={100} />
                <KPICard icon={Clock}      label="Pendientes"   value={dataLoading ? '—' : String(pendingCount)} delay={200} pulse={!dataLoading && pendingCount > 0} />
                <KPICard icon={TrendingUp} label="Esta semana"  value={dataLoading ? '—' : String(weekCount)} sublabel="citas totales" delay={300} />
              </div>
              <CitasPanel
                citas={allCitas}
                loading={allCitasLoading}
                stylists={stylists}
                negocioName={negocio?.name}
                businessId={negocio?.id}
                onLoad={loadAllCitas}
                onStatusChange={handleStatusChange}
              />
            </>
          ) : activeSection === 'clientes' ? (
            <ClientesPanel businessId={negocio?.id} negocioSlug={negocio?.slug} />
          ) : activeSection === 'estilistas' ? (
            <EstilistasPanel businessId={negocio?.id} />
          ) : activeSection === 'servicios' ? (
            <ServiciosPanel businessId={negocio?.id} />
          ) : activeSection === 'horarios' ? (
            <HorariosPanel businessId={negocio?.id} />
          ) : activeSection === 'reportes' ? (
            <GraficosPanel businessId={negocio?.id} />
          ) : activeSection === 'ajustes' ? (
            <AjustesPanel
              accentColor={accentColor}
              onAccentChange={handleAccentChange}
              widgetOrder={widgetOrder}
              onWidgetOrderChange={handleWidgetOrderChange}
              businessId={negocio?.id}
              negocio={negocio}
              session={session}
            />
          ) : (
            /* ── INICIO ─────────────────────────────────────────── */
            <div style={{ animation: 'fadeInUp 0.35s ease forwards' }}>

              {/* Welcome Banner */}
              <div style={{
                position: 'relative', overflow: 'hidden',
                borderRadius: 16, padding: '28px 32px', marginBottom: 24,
                background: `linear-gradient(135deg, ${accentColor}14 0%, rgba(5,5,5,0) 60%)`,
                border: `1px solid ${accentColor}20`,
              }}>
                {/* Glow orb */}
                <div style={{
                  position: 'absolute', top: -80, right: -80,
                  width: 260, height: 260, borderRadius: '50%',
                  background: `radial-gradient(circle, ${accentColor}10 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
                  <div>
                    <p style={{
                      color: accentColor, fontSize: '0.65rem', fontWeight: 700,
                      letterSpacing: '0.12em', fontFamily: 'DM Sans, sans-serif',
                      marginBottom: 8, opacity: 0.8,
                    }}>
                      PANEL DE CONTROL
                    </p>
                    <h2 style={{
                      fontFamily: 'Syne, sans-serif', fontWeight: 800,
                      fontSize: '1.55rem', color: '#F5F5F5', marginBottom: 6,
                    }}>
                      {dataLoading ? 'Cargando…' : `Hola, ${negocio?.name ?? 'bienvenido'} 👋`}
                    </h2>
                    <p style={{ color: '#555', fontSize: '0.83rem', fontFamily: 'DM Sans, sans-serif' }}>
                      {dataLoading ? '' : pendingCount > 0
                        ? `Tienes ${pendingCount} cita${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} por confirmar hoy`
                        : todayAppts.length > 0
                          ? `${todayAppts.length} cita${todayAppts.length > 1 ? 's' : ''} programada${todayAppts.length > 1 ? 's' : ''} para hoy`
                          : 'Sin citas programadas hoy — buen momento para descansar'
                      }
                    </p>
                  </div>

                  {/* Mini stats */}
                  <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexShrink: 0 }}>
                    {[
                      { label: 'Hoy', value: dataLoading ? '—' : String(todayAppts.length), color: accentColor },
                      { label: 'Pendientes', value: dataLoading ? '—' : String(pendingCount), color: '#F59E0B' },
                      { label: 'Completadas', value: dataLoading ? '—' : String(todayAppts.filter(a => a.status === 'completed').length), color: '#888' },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: s.color, lineHeight: 1 }}>{s.value}</p>
                        <p style={{ color: '#3A3A3A', fontSize: '0.68rem', fontFamily: 'DM Sans, sans-serif', marginTop: 4 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Link para compartir — prominente en móvil */}
                {negocio?.slug && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#0D3320',
                      border: '1px solid rgba(0,255,136,0.2)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      marginTop: '12px',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      const url = `https://turnott.com/${negocio.slug}`
                      if (navigator.share) {
                        navigator.share({ title: negocio.name, url }).catch(() => {})
                      } else {
                        navigator.clipboard.writeText(url)
                      }
                    }}
                  >
                    <Link size={16} color="var(--accent)" />
                    <span style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600, flex: 1, fontFamily: 'DM Sans, sans-serif' }}>
                      turnott.com/{negocio.slug}
                    </span>
                    <Share2 size={16} color="#888" />
                  </div>
                )}
              </div>

              {/* Onboarding checklist — solo cuando el negocio no tiene servicios ni estilistas */}
              {!dataLoading && services.length === 0 && stylists.length === 0 && (
                <div style={{
                  background: '#0D3320', border: '1px solid rgba(0,255,136,0.2)',
                  borderRadius: 16, padding: '24px', marginBottom: 20,
                }}>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', color: '#F5F5F5', marginBottom: 4 }}>
                    👋 Bienvenido a TURNOTT
                  </p>
                  <p style={{ fontSize: '13px', color: '#888', marginBottom: 20, fontFamily: 'DM Sans, sans-serif' }}>
                    Completa estos pasos para empezar a recibir citas
                  </p>
                  {[
                    { paso: 1, texto: 'Agrega tus servicios',          hecho: services.length > 0,   accion: () => setActiveSection('servicios') },
                    { paso: 2, texto: 'Agrega tu equipo',               hecho: stylists.length > 0,   accion: () => setActiveSection('estilistas') },
                    { paso: 3, texto: 'Configura tus horarios',         hecho: false,                  accion: () => setActiveSection('horarios') },
                    { paso: 4, texto: 'Comparte tu link con clientes',  hecho: false,                  accion: () => { navigator.clipboard?.writeText(`https://turnott.com/${negocio?.slug}`) } },
                  ].map(item => (
                    <div
                      key={item.paso}
                      onClick={item.accion}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: 12, marginBottom: 8, cursor: 'pointer',
                        background: item.hecho ? '#0a1a0f' : '#111',
                        border: `1px solid ${item.hecho ? 'rgba(0,255,136,0.3)' : '#1E1E1E'}`,
                        borderRadius: 10,
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: item.hecho ? 'var(--accent)' : '#1a1a1a',
                        border: `1px solid ${item.hecho ? 'var(--accent)' : '#333'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: item.hecho ? '#050505' : '#555',
                        fontWeight: 700, flexShrink: 0, fontFamily: 'DM Sans, sans-serif',
                      }}>
                        {item.hecho ? '✓' : item.paso}
                      </div>
                      <span style={{
                        fontSize: 14, fontFamily: 'DM Sans, sans-serif',
                        color: item.hecho ? '#555' : '#F5F5F5',
                        textDecoration: item.hecho ? 'line-through' : 'none',
                      }}>
                        {item.texto}
                      </span>
                      {!item.hecho && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--accent)' }}>→</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* KPI Cards */}
              <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <KPICard icon={Calendar}   label="Citas hoy"    value={dataLoading ? '—' : String(todayAppts.length)} delay={0} />
                <KPICard icon={DollarSign} label="Ingresos hoy" value={dataLoading ? '—' : formatCurrency(revenueHoy)} sublabel="completadas" delay={80} />
                <KPICard icon={Clock}      label="Pendientes"   value={dataLoading ? '—' : String(pendingCount)} delay={160} pulse={!dataLoading && pendingCount > 0} />
                <KPICard icon={TrendingUp} label="Esta semana"  value={dataLoading ? '—' : String(weekCount)} sublabel="citas totales" delay={240} />
              </div>

              {/* Reporte semanal */}
              <ReporteSemanal businessId={negocio?.id} />

              {/* Agenda + Semana */}
              <div className="dash-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
                <AgendaHoy
                  citas={todayAppts}
                  loading={dataLoading}
                  negocioName={negocio?.name}
                  onStatusChange={handleStatusChange}
                  stylists={stylists}
                  services={services}
                  businessId={negocio?.id}
                  onAddWalkin={handleAddWalkin}
                />
                <SemanaResumen
                  weekAppointments={weekAppts}
                  upcomingAppointments={upcomingAppts}
                  loading={dataLoading}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Overlay del drawer */}
      <div
        className={`dash-more-drawer-overlay ${drawerAbierto ? 'open' : ''}`}
        onClick={() => setDrawerAbierto(false)}
      />

      {/* Drawer de opciones adicionales */}
      <div className={`dash-more-drawer ${drawerAbierto ? 'open' : ''}`}>
        <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
          Más opciones
        </p>
        <div className="dash-more-grid">
          <button
            className={`dash-more-item ${activeSection === 'servicios' ? 'active' : ''}`}
            onClick={() => { setActiveSection('servicios'); setDrawerAbierto(false) }}
          >
            <Scissors size={20} />
            <span>Servicios</span>
          </button>
          <button
            className={`dash-more-item ${activeSection === 'horarios' ? 'active' : ''}`}
            onClick={() => { setActiveSection('horarios'); setDrawerAbierto(false) }}
          >
            <Clock size={20} />
            <span>Horarios</span>
          </button>
          <button
            className={`dash-more-item ${activeSection === 'reportes' ? 'active' : ''}`}
            onClick={() => { setActiveSection('reportes'); setDrawerAbierto(false) }}
          >
            <BarChart2 size={20} />
            <span>Reportes</span>
          </button>
          <button
            className={`dash-more-item ${activeSection === 'ajustes' ? 'active' : ''}`}
            onClick={() => { setActiveSection('ajustes'); setDrawerAbierto(false) }}
          >
            <Settings size={20} />
            <span>Ajustes</span>
          </button>
        </div>

        <button
          onClick={handleSignOut}
          style={{
            marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'rgba(255,77,77,0.07)', border: '1px solid rgba(255,77,77,0.2)',
            borderRadius: 10, padding: '12px', cursor: 'pointer',
            color: '#FF4D4D', fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
          }}
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>

      {/* Bottom Navigation — solo visible en móvil via CSS */}
      <nav className="dash-bottom-nav">
        <button
          className={activeSection === 'inicio' ? 'active' : ''}
          onClick={() => { setActiveSection('inicio'); setDrawerAbierto(false) }}
        >
          <Home size={22} />
          <span>Inicio</span>
        </button>
        <button
          className={activeSection === 'citas' ? 'active' : ''}
          onClick={() => { setActiveSection('citas'); setDrawerAbierto(false) }}
        >
          <Calendar size={22} />
          <span>Citas</span>
        </button>
        <button
          className={activeSection === 'clientes' ? 'active' : ''}
          onClick={() => { setActiveSection('clientes'); setDrawerAbierto(false) }}
        >
          <Users size={22} />
          <span>Clientes</span>
        </button>
        <button
          className={activeSection === 'estilistas' ? 'active' : ''}
          onClick={() => { setActiveSection('estilistas'); setDrawerAbierto(false) }}
        >
          <User size={22} />
          <span>Equipo</span>
        </button>
        <button
          className={drawerAbierto ? 'active' : ''}
          onClick={() => setDrawerAbierto(v => !v)}
        >
          <Menu size={22} />
          <span>Más</span>
        </button>
      </nav>
    </div>
  )
}

