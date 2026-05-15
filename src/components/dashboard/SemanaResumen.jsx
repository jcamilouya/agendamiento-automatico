const DIAS_SHORT  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const MESES_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function getWeekDays() {
  const today = new Date()
  const day   = today.getDay()
  const diff  = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toYMD(d) {
  return d.toISOString().split('T')[0]
}

function formatFechaProxima(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DIAS_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()} ${MESES_SHORT[d.getMonth()]}`
}

function formatHora(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function SemanaResumen({ weekAppointments, upcomingAppointments, loading }) {
  const weekDays = getWeekDays()
  const todayStr = toYMD(new Date())

  // Conteo de citas por día
  const countByDay = {}
  weekAppointments.forEach(a => {
    countByDay[a.date] = (countByDay[a.date] ?? 0) + 1
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Mini calendario semanal */}
      <div style={{
        background: '#111111', border: '1px solid #1E1E1E',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #1E1E1E' }}>
          <h3 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '0.95rem', color: '#F5F5F5',
          }}>
            Esta semana
          </h3>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4, padding: '16px 12px',
        }}>
          {weekDays.map((d, i) => {
            const dateStr = toYMD(d)
            const isToday = dateStr === todayStr
            const count   = countByDay[dateStr] ?? 0

            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <p style={{
                  color: '#555555', fontSize: '0.62rem',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em',
                }}>
                  {DIAS_SHORT[i][0]}
                </p>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  margin: '0 auto 6px',
                  background: isToday ? '#00FF88' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: isToday ? 'none' : '1px solid transparent',
                }}>
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                    fontSize: '0.8rem',
                    color: isToday ? '#0A0A0A' : '#888888',
                  }}>
                    {d.getDate()}
                  </span>
                </div>
                {loading ? (
                  <div className="dash-skeleton" style={{ height: 14, width: 20, margin: '0 auto', borderRadius: 4 }} />
                ) : count > 0 ? (
                  <span style={{
                    display: 'inline-block',
                    background: isToday ? 'rgba(61,255,168,0.15)' : 'rgba(136,136,136,0.1)',
                    color: isToday ? '#00FF88' : '#666666',
                    fontSize: '0.62rem', fontWeight: 700,
                    borderRadius: '999px', padding: '1px 6px',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                    {count}
                  </span>
                ) : (
                  <span style={{ display: 'inline-block', height: 18 }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Próximas citas */}
      <div style={{
        background: '#111111', border: '1px solid #1E1E1E',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #1E1E1E' }}>
          <h3 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '0.95rem', color: '#F5F5F5',
          }}>
            Próximas citas
          </h3>
        </div>

        <div style={{ padding: '8px 0' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 20px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="dash-skeleton" style={{ height: 48 }} />
              ))}
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <p style={{
              color: '#444444', textAlign: 'center',
              padding: '24px', fontSize: '0.82rem',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              No hay citas próximas
            </p>
          ) : (
            upcomingAppointments.map((a, i) => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 20px',
                borderBottom: i < upcomingAppointments.length - 1 ? '1px solid #161616' : 'none',
              }}>
                <div style={{
                  background: '#1A1A1A', border: '1px solid #222',
                  borderRadius: 8, padding: '6px 10px', textAlign: 'center',
                  minWidth: 54, flexShrink: 0,
                }}>
                  <p style={{ color: '#00FF88', fontSize: '0.68rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
                    {formatFechaProxima(a.date)}
                  </p>
                  <p style={{ color: '#888888', fontSize: '0.65rem', fontFamily: 'DM Sans, sans-serif' }}>
                    {formatHora(a.start_time)}
                  </p>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    color: '#F5F5F5', fontWeight: 600,
                    fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {a.client_name}
                  </p>
                  <p style={{
                    color: '#666666', fontSize: '0.72rem',
                    fontFamily: 'DM Sans, sans-serif',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {a.services?.name ?? 'Servicio'}
                    {a.stylists?.name ? ` · ${a.stylists.name}` : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
