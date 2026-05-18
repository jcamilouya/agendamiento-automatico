import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck, Calendar, Clock, Sun, Moon, LogOut } from 'lucide-react'
import { useNotifications, formatDateShort, formatHM, relativeTime } from '../../hooks/useNotifications'

const DIAS   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12)  return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ── Toast GRANDE centrado ─────────────────────────────────────────────────────

function NotifToast({ notif, onDismiss }) {
  const [leaving, setLeaving] = useState(false)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    // barra de progreso
    const interval = setInterval(() => setProgress(p => Math.max(0, p - 1.25)), 75)
    const hide   = setTimeout(() => setLeaving(true), 8000)
    const remove = setTimeout(() => onDismiss(notif.id), 8500)
    return () => { clearInterval(interval); clearTimeout(hide); clearTimeout(remove) }
  }, [])

  function dismiss() { setLeaving(true); setTimeout(() => onDismiss(notif.id), 400) }

  const initials = notif.clientName?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?'

  return (
    <>
      {/* Overlay oscuro detrás */}
      {!leaving && (
        <div
          onClick={dismiss}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(3px)',
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Card central grande */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          width: 'min(420px, calc(100vw - 40px))',
          background: '#0F0F0F',
          border: '1px solid rgba(var(--accent-rgb),0.35)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(var(--accent-rgb),0.1), 0 40px 80px rgba(0,0,0,0.8), 0 0 60px rgba(var(--accent-rgb),0.12)',
          animation: leaving
            ? 'toastBigOut 0.35s ease forwards'
            : 'toastBigIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
      >
        {/* Glow superior */}
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        }} />

        <div style={{ padding: '28px 28px 20px' }}>
          {/* Badge + cerrar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.25)',
              borderRadius: 999, padding: '5px 12px',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)',
                animation: 'pulse-dot 1.2s ease-in-out infinite',
              }} />
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '0.06em' }}>
                NUEVA CITA
              </span>
            </div>
            <button onClick={dismiss} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#666', cursor: 'pointer', padding: '6px 8px', lineHeight: 1 }}>
              <X size={16} />
            </button>
          </div>

          {/* Cliente */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(var(--accent-rgb),0.1)', border: '2px solid rgba(var(--accent-rgb),0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--accent)',
            }}>
              {initials}
            </div>
            <div>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.25rem', color: '#F5F5F5', marginBottom: 3 }}>
                {notif.clientName}
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', color: '#666' }}>
                acaba de reservar una cita
              </p>
            </div>
          </div>

          {/* Detalles */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 10, marginBottom: 20,
          }}>
            {[
              { label: 'Servicio',  value: notif.serviceName },
              { label: 'Con',       value: notif.stylistName },
              { label: 'Fecha',     value: formatDateShort(notif.date) },
              { label: 'Hora',      value: formatHM(notif.startTime) },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '10px 12px',
              }}>
                <p style={{ color: '#444', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</p>
                <p style={{ color: '#F5F5F5', fontWeight: 600, fontSize: '0.88rem' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Botón cerrar */}
          <button
            onClick={dismiss}
            style={{
              width: '100%', padding: '12px',
              background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.25)',
              borderRadius: 10, color: 'var(--accent)',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '0.88rem',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--accent-rgb),0.1)' }}
          >
            Entendido ✓
          </button>
        </div>

        {/* Barra de progreso */}
        <div style={{ height: 3, background: '#1A1A1A' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: 'var(--accent)',
            transition: 'width 0.1s linear',
          }} />
        </div>
      </div>
    </>
  )
}

// ── Dropdown de notificaciones ────────────────────────────────────────────────

function NotifItem({ notif, onRead }) {
  return (
    <div
      onClick={() => onRead(notif.id)}
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid #161616',
        cursor: 'pointer',
        background: notif.read ? 'transparent' : 'rgba(var(--accent-rgb),0.03)',
        transition: 'background 0.15s ease',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#161616' }}
      onMouseLeave={e => { e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(var(--accent-rgb),0.03)' }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5,
        background: notif.read ? '#2A2A2A' : 'var(--accent)',
        boxShadow: notif.read ? 'none' : '0 0 5px var(--accent)',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
          <span style={{
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            fontSize: '0.82rem', color: '#F5F5F5',
          }}>
            {notif.clientName}
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.68rem', color: '#444', flexShrink: 0, marginLeft: 8 }}>
            {relativeTime(notif.ts)}
          </span>
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: '#666', marginBottom: 4 }}>
          {notif.serviceName} · {notif.stylistName}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', color: '#444' }}>
            <Calendar size={10} color="#444" /> {formatDateShort(notif.date)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', color: '#444' }}>
            <Clock size={10} color="#444" /> {formatHM(notif.startTime)}
          </span>
        </div>
      </div>
    </div>
  )
}

function NotifDropdown({ notifications, unreadCount, onMarkAll, onRead, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 198 }}
      />

      {/* Panel */}
      <div
        ref={ref}
        style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 360, zIndex: 199,
          background: '#111111', border: '1px solid #1E1E1E',
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          animation: 'fadeInUp 0.2s ease forwards',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid #1A1A1A',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={14} color="#888" />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#F5F5F5' }}>
              Notificaciones
            </span>
            {unreadCount > 0 && (
              <span style={{
                background: 'var(--accent)', color: '#0A0A0A',
                fontSize: '0.6rem', fontWeight: 700,
                borderRadius: 999, padding: '1px 6px',
                fontFamily: 'DM Sans, sans-serif',
              }}>
                {unreadCount} nuevas
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAll}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none',
                color: '#555', fontSize: '0.72rem',
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = '#555'}
            >
              <CheckCheck size={13} /> Marcar leídas
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Bell size={32} color="#222" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', color: '#333' }}>
                Sin notificaciones aún
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', color: '#2A2A2A', marginTop: 4 }}>
                Las nuevas citas aparecerán aquí en tiempo real
              </p>
            </div>
          ) : (
            notifications.map(n => (
              <NotifItem key={n.id} notif={n} onRead={onRead} />
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div style={{
            padding: '10px 16px', borderTop: '1px solid #1A1A1A',
            textAlign: 'center',
          }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.7rem', color: '#333' }}>
              Últimas {notifications.length} notificaciones de esta sesión
            </span>
          </div>
        )}
      </div>
    </>
  )
}

// ── Header principal ──────────────────────────────────────────────────────────

export default function DashHeader({ negocio, pendingCount, theme, onThemeToggle, onSignOut }) {
  const [open, setOpen] = useState(false)
  const bellRef         = useRef(null)
  const isLight         = theme === 'light'

  const { notifications, unreadCount, markAllRead, markRead, dismissToast } =
    useNotifications(negocio?.id)

  const toasts = notifications.filter(n => n.toast)
  const now    = new Date()

  // Pulso en la campana cuando llega algo nuevo
  const [pulse, setPulse] = useState(false)
  const prevUnread = useRef(0)
  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 700)
      prevUnread.current = unreadCount
      return () => clearTimeout(t)
    }
    prevUnread.current = unreadCount
  }, [unreadCount])

  return (
    <>
      {/* Toasts — esquina superior derecha */}
      <div style={{
        position: 'fixed', top: 20, right: 20,
        zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      }}>
        {toasts.map(n => (
          <NotifToast key={n.id} notif={n} onDismiss={dismissToast} />
        ))}
      </div>

      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '1.15rem', color: '#F5F5F5', marginBottom: 3,
          }}>
            {getGreeting()}{negocio ? `, ${negocio.name}` : ''}
          </h1>
          <p style={{ color: '#888888', fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif' }}>
            {DIAS[now.getDay()]}, {now.getDate()} de {MESES[now.getMonth()]} de {now.getFullYear()}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Toggle dark/light */}
          <button
            onClick={onThemeToggle}
            title={isLight ? 'Modo oscuro' : 'Modo claro'}
            style={{
              background: isLight ? 'rgba(0,0,0,0.06)' : '#1A1A1A',
              border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : '#252525'}`,
              borderRadius: 10, padding: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.1)' : '#252525' }}
          >
            {isLight
              ? <Moon size={18} color="#555" />
              : <Sun  size={18} color="#888" />
            }
          </button>

          {/* Cerrar sesión */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              title="Cerrar sesión"
              style={{
                background: isLight ? 'rgba(0,0,0,0.06)' : '#1A1A1A',
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : '#252525'}`,
                borderRadius: 10, padding: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF4D4D'; e.currentTarget.style.background = isLight ? 'rgba(255,77,77,0.06)' : 'rgba(255,77,77,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.1)' : '#252525'; e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.06)' : '#1A1A1A' }}
            >
              <LogOut size={18} color="#888" />
            </button>
          )}

          {/* Campana */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setOpen(o => !o)}
              style={{
                background: open ? '#1E2A1E' : '#1A1A1A',
                border: `1px solid ${open ? 'var(--accent)' : unreadCount > 0 ? 'rgba(var(--accent-rgb),0.4)' : '#252525'}`,
                borderRadius: 10, padding: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease',
                animation: pulse ? 'bellPulse 0.6s ease' : 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onMouseLeave={e => {
                if (!open) e.currentTarget.style.borderColor = unreadCount > 0 ? 'rgba(var(--accent-rgb),0.4)' : '#252525'
              }}
            >
              <Bell size={18} color={unreadCount > 0 ? 'var(--accent)' : '#888888'} />
            </button>

            {/* Badge */}
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5,
                background: 'var(--accent)', color: '#0A0A0A',
                fontSize: '0.58rem', fontWeight: 800,
                borderRadius: 999, padding: '2px 5px',
                fontFamily: 'DM Sans, sans-serif',
                minWidth: 17, textAlign: 'center',
                lineHeight: 1.4,
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}

            {/* Badge de pendientes del día (si no hay notifs nuevas) */}
            {unreadCount === 0 && pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5,
                background: '#F59E0B', color: '#0A0A0A',
                fontSize: '0.58rem', fontWeight: 800,
                borderRadius: 999, padding: '2px 5px',
                fontFamily: 'DM Sans, sans-serif',
                minWidth: 17, textAlign: 'center',
                lineHeight: 1.4,
              }}>
                {pendingCount}
              </span>
            )}

            {/* Dropdown */}
            {open && (
              <NotifDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAll={() => { markAllRead(); }}
                onRead={markRead}
                onClose={() => setOpen(false)}
              />
            )}
          </div>

          {/* Avatar del negocio */}
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(var(--accent-rgb),0.12)',
            border: '1px solid rgba(var(--accent-rgb),0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '0.85rem', color: 'var(--accent)', flexShrink: 0,
          }}>
            {negocio ? getInitials(negocio.name) : '?'}
          </div>
        </div>
      </div>
    </>
  )
}

