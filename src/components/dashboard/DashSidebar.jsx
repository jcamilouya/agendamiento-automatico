import { LayoutDashboard, Calendar, Users, Scissors, BarChart2, LogOut, Settings, UserCircle } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'inicio',     label: 'Inicio',       Icon: LayoutDashboard },
  { id: 'citas',      label: 'Citas',        Icon: Calendar        },
  { id: 'clientes',   label: 'Clientes',     Icon: UserCircle      },
  { id: 'estilistas', label: 'Equipo',       Icon: Users           },
  { id: 'servicios',  label: 'Servicios',    Icon: Scissors        },
  { id: 'reportes',   label: 'Reportes',     Icon: BarChart2       },
  { id: 'ajustes',    label: 'Personalizar', Icon: Settings        },
]

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'T'
}

export default function DashSidebar({ activeSection, onNavigate, negocio, onSignOut, userEmail }) {
  const initials = getInitials(negocio?.name)
  const accent   = negocio?.accent_color ?? '#00FF88'

  return (
    <aside className="dash-sidebar">
      {/* Business Profile */}
      <div style={{ padding: '24px 20px 16px' }}>
        {/* Avatar */}
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: `linear-gradient(135deg, ${accent}22 0%, ${accent}44 100%)`,
          border: `1.5px solid ${accent}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12,
          boxShadow: `0 4px 16px ${accent}18`,
        }}>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '1.2rem', color: accent,
          }}>
            {initials}
          </span>
        </div>

        {/* Name + plan */}
        <div>
          <p style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '0.88rem', color: '#F5F5F5',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 4,
          }}>
            {negocio?.name ?? 'Mi negocio'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: accent, flexShrink: 0,
              animation: 'pulse-dot 2s ease-in-out infinite',
              boxShadow: `0 0 6px ${accent}80`,
            }} />
            <span style={{
              color: '#444', fontSize: '0.68rem',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {negocio?.subscription_plan === 'pro' ? 'Pro' : 'Trial'}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px 8px' }} />

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 4 }}>
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`dash-nav-item${activeSection === id ? ' active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={16} />
            <span className="dash-nav-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 20px' }}>
        {userEmail && (
          <p style={{
            color: '#333', fontSize: '0.68rem',
            fontFamily: 'DM Sans, sans-serif',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 10,
          }}>
            {userEmail}
          </p>
        )}
        <button
          onClick={onSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none',
            color: '#444', fontSize: '0.8rem',
            fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer', padding: '6px 0',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#FF4D4D'}
          onMouseLeave={e => e.currentTarget.style.color = '#444'}
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
