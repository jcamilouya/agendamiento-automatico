import { CheckCircle, CalendarPlus, Bell } from 'lucide-react'
import { msgConfirmacion, whatsAppLink, normalizePhone } from '../../lib/whatsapp'

const DIAS_NOMBRE = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatHora(hora) {
  const [h, m] = hora.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

function formatCOP(v) {
  return '$' + Math.round(Number(v ?? 0)).toLocaleString('es-CO')
}

// Genera string de fecha/hora en formato ICS (Colombia = UTC-5, sin conversión para simplificar)
function toICSDate(fecha, hora) {
  const [y, mo, d] = fecha.split('-')
  const [h, mi]    = hora.split(':')
  return `${y}${mo}${d}T${h}${mi}00`
}

// Genera y descarga un archivo .ics con alarma 1h antes
function descargarCalendario({ negocioName, negocioPhone, clientName, fecha, hora, servicio, estilista, duracion }) {
  const dtStart   = toICSDate(fecha, hora)
  const [h, m]    = hora.split(':').map(Number)
  const finMin    = h * 60 + m + (duracion || 60)
  const horaFin   = `${String(Math.floor(finMin / 60)).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}`
  const dtEnd     = toICSDate(fecha, horaFin)
  const uid       = `turno-${fecha}-${hora.replace(':','')}-${Date.now()}@turno.co`
  const waNum     = negocioPhone ? normalizePhone(negocioPhone).replace('+', '') : ''
  const waMsgConfirm = encodeURIComponent(`Hola! Confirmo mi cita de ${servicio} el ${fecha} a las ${formatHora(hora)} con ${estilista}. ¡Ahí estaré!`)
  const waUrl     = waNum ? `https://wa.me/${waNum}?text=${waMsgConfirm}` : ''
  const descripcion = [
    `Cita en ${negocioName}`,
    `Servicio: ${servicio}`,
    `Estilista: ${estilista}`,
    waUrl ? `\\n¿Confirmas? Escríbenos: ${waUrl}` : '',
  ].filter(Boolean).join('\\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TURNOTT//Agendamiento//ES',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;TZID=America/Bogota:${dtStart}`,
    `DTEND;TZID=America/Bogota:${dtEnd}`,
    `SUMMARY:${servicio} en ${negocioName}`,
    `DESCRIPTION:${descripcion}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Tu cita de ${servicio} es en 1 hora. ${waUrl ? '¿Confirmas? Toca para escribir por WhatsApp' : '¡Ya casi es tu hora!'}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `cita-${negocioName.replace(/\s+/g, '-').toLowerCase()}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

export default function PasoConfirmacion({ seleccion, negocio, onReiniciar }) {
  const { servicio, estilista, fecha, hora, nombre, telefono, promo, finalPrice } = seleccion
  const d = new Date(fecha + 'T12:00:00')
  const fechaLinda = `${DIAS_NOMBRE[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
  const primerNombre = nombre ? nombre.split(' ')[0] : ''
  const precioOriginal = Number(servicio?.price ?? 0)
  const precioFinal    = Number(finalPrice ?? precioOriginal)
  const hayDescuento   = promo && precioFinal < precioOriginal

  const waLink = telefono ? whatsAppLink(
    telefono,
    msgConfirmacion({
      clientName:  nombre,
      negocioName: negocio.name,
      fecha, hora,
      servicio:    servicio.name,
      estilista:   estilista.name,
    })
  ) : null

  function handleCalendario() {
    descargarCalendario({
      negocioName:  negocio.name,
      negocioPhone: negocio.phone,
      clientName:   nombre,
      fecha, hora,
      servicio:     servicio.name,
      estilista:    estilista.name,
      duracion:     servicio.duration_minutes,
    })
  }

  return (
    <div style={{ textAlign: 'center', paddingTop: '16px' }}>
      {/* Ícono y título */}
      <div style={{ marginBottom: '28px' }}>
        <CheckCircle
          size={64} color="var(--accent)"
          style={{ margin: '0 auto 16px', filter: 'drop-shadow(0 0 20px rgba(var(--accent-rgb),0.4))' }}
        />
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: '#F5F5F5', marginBottom: '8px' }}>
          ¡Cita confirmada!
        </h2>
        <p style={{ color: '#888888', fontSize: '0.9rem' }}>
          {primerNombre ? `Gracias, ${primerNombre}` : 'Gracias'}. Te esperamos 💈
        </p>
      </div>

      {/* Tarjeta resumen */}
      <div style={{
        background: '#111111', border: '1px solid #1E1E1E',
        borderRadius: '12px', padding: '20px 24px',
        marginBottom: '24px', textAlign: 'left'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <div style={{ paddingBottom: '14px', borderBottom: '1px solid #1E1E1E', marginBottom: '14px' }}>
            <p style={{ color: '#555555', fontSize: '0.72rem', marginBottom: '3px' }}>Negocio</p>
            <p style={{ color: '#F5F5F5', fontWeight: 600, margin: 0 }}>{negocio.name}</p>
          </div>

          {[
            { lbl: 'Servicio', val: servicio.name },
            { lbl: 'Estilista', val: estilista.name },
          ].map(({ lbl, val }) => (
            <div key={lbl} style={{ marginBottom: '10px' }}>
              <p style={{ color: '#555555', fontSize: '0.72rem', marginBottom: '2px' }}>{lbl}</p>
              <p style={{ color: '#F5F5F5', fontWeight: 500, margin: 0 }}>{val}</p>
            </div>
          ))}

          <div style={{ paddingTop: '14px', borderTop: '1px solid #1E1E1E', marginTop: '4px' }}>
            <p style={{ color: '#555555', fontSize: '0.72rem', marginBottom: '4px' }}>Fecha y hora</p>
            <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>
              {fechaLinda} · {formatHora(hora)}
            </p>
          </div>

          {precioOriginal > 0 && (
            <div style={{ paddingTop: '14px', borderTop: '1px solid #1E1E1E', marginTop: '14px' }}>
              <p style={{ color: '#555555', fontSize: '0.72rem', marginBottom: '4px' }}>
                {hayDescuento ? 'Total con descuento' : 'Total'}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <p style={{ color: '#F5F5F5', fontWeight: 700, fontSize: '1.15rem', margin: 0 }}>
                  {formatCOP(precioFinal)}
                </p>
                {hayDescuento && (
                  <>
                    <span style={{ color: '#666', textDecoration: 'line-through', fontSize: '0.85rem' }}>
                      {formatCOP(precioOriginal)}
                    </span>
                    <span style={{
                      background: (promo.color || '#F59E0B') + '22',
                      color: promo.color || '#F59E0B',
                      border: `1px solid ${(promo.color || '#F59E0B')}44`,
                      borderRadius: 999, padding: '2px 8px',
                      fontSize: '0.7rem', fontWeight: 700,
                    }}>
                      -{Number(promo.discount_percent)}% · {promo.label}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agregar al calendario */}
      <button
        onClick={handleCalendario}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          width: '100%', padding: '14px 20px',
          background: 'var(--accent)', color: '#050505',
          border: 'none', borderRadius: '8px',
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '0.95rem',
          cursor: 'pointer', marginBottom: '10px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,136,0.35)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
      >
        <CalendarPlus size={20} />
        Agregar al calendario
      </button>

      {/* Recordatorio automático por WhatsApp */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: '#0D3320', borderRadius: '10px',
        padding: '12px 16px', marginBottom: '10px',
        border: '1px solid rgba(0,255,136,0.15)',
      }}>
        <Bell size={18} color="#00FF88" />
        <span style={{ color: '#ccc', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>
          Te enviaremos un recordatorio por WhatsApp 1 hora antes ⏰
        </span>
      </div>

      {/* Guardar en WhatsApp */}
      {waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            width: '100%', padding: '13px 20px',
            background: 'transparent', color: '#25D366',
            border: '1px solid #25D36644', borderRadius: '8px',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.9rem',
            textDecoration: 'none', cursor: 'pointer',
            marginBottom: '12px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#25D36611'; e.currentTarget.style.borderColor = '#25D366' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#25D36644' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Guardar confirmación en WhatsApp
        </a>
      )}

      <button
        onClick={onReiniciar}
        style={{
          background: 'transparent', color: '#888888',
          border: '1px solid #1E1E1E', borderRadius: '8px',
          padding: '12px 28px', cursor: 'pointer', width: '100%',
          fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = '#F5F5F5' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1E'; e.currentTarget.style.color = '#888888' }}
      >
        Agendar otra cita
      </button>
    </div>
  )
}
