import { CheckCircle } from 'lucide-react'

const DIAS_NOMBRE = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatHora(hora) {
  const [h, m] = hora.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

export default function PasoConfirmacion({ seleccion, negocio, onReiniciar }) {
  const { servicio, estilista, fecha, hora, nombre } = seleccion
  const d = new Date(fecha + 'T12:00:00')
  const fechaLinda = `${DIAS_NOMBRE[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
  const primerNombre = nombre ? nombre.split(' ')[0] : ''

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
        marginBottom: '32px', textAlign: 'left'
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
        </div>
      </div>

      <button
        onClick={onReiniciar}
        style={{
          background: 'transparent', color: '#888888',
          border: '1px solid #1E1E1E', borderRadius: '8px',
          padding: '12px 28px', cursor: 'pointer',
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

