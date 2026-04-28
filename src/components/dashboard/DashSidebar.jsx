import { LayoutDashboard, Calendar, Users, Scissors, BarChart2, LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'inicio',     label: 'Inicio',      Icon: LayoutDashboard },
  { id: 'citas',      label: 'Citas',       Icon: Calendar        },
  { id: 'estilistas', label: 'Estilistas',  Icon: Users           },
  { id: 'servicios',  label: 'Servicios',   Icon: Scissors        },
  { id: 'reportes',   label: 'Reportes',    Icon: BarChart2       },
]

export default function DashSidebar({ activeSection, onNavigate, negocio, onSignOut, userEmail }) {
  return (
    <aside className="dash-sidebar">
      {/* Brand */}
      <div className="dash-sidebar-brand" style={{ padding: '28px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '1.4rem', color: '#F5F5F5', letterSpacing: '-0.5px',
          }}>
            TURNO
          </span>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#3DFFA8', flexShrink: 0,
            animation: 'pulse-dot 2s ease-in-out infinite',
            boxShadow: '0 0 8px rgba(61,255,168,0.5)',
          }} />
        </div>
        {negocio && (
          <p style={{
            color: '#555555', fontSize: '0.75rem',
            fontFamily: 'DM Sans, sans-serif',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {negocio.name}
          </p>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#1E1E1E', margin: '0 12px 8px' }} />

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 4 }}>
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`dash-nav-item${activeSection === id ? ' active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={18} />
            <span className="dash-nav-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="dash-sidebar-footer" style={{ borderTop: '1px solid #1E1E1E', padding: '16px 20px' }}>
        {userEmail && (
          <p style={{
            color: '#444444', fontSize: '0.72rem',
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
            color: '#555555', fontSize: '0.82rem',
            fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer', padding: '6px 0',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#FF4D4D'}
          onMouseLeave={e => e.currentTarget.style.color = '#555555'}
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
