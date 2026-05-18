import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatHora(hora) {
  const [h, m] = hora.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

export default function PasoFormulario({ seleccion, guardando, onConfirmar, onVolver }) {
  const [nombre, setNombre] = useState(seleccion.nombre || '')
  const [telefono, setTelefono] = useState(seleccion.telefono || '')
  const [errores, setErrores] = useState({})
  const [focusNombre, setFocusNombre] = useState(false)
  const [focusTel, setFocusTel] = useState(false)

  const { servicio, estilista, fecha, hora } = seleccion
  const d = new Date(fecha + 'T12:00:00')
  const fechaLinda = `${d.getDate()} de ${MESES[d.getMonth()]}`

  function validar() {
    const e = {}
    if (!nombre.trim()) e.nombre = 'Ingresa tu nombre'
    if (!telefono.trim()) e.telefono = 'Ingresa tu número de WhatsApp'
    else if (telefono.replace(/\D/g, '').length < 10) e.telefono = 'Mínimo 10 dígitos'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (validar()) onConfirmar(nombre.trim(), telefono.trim())
  }

  const inputBase = (error, focus) => ({
    width: '100%', background: '#0A0A0A',
    border: `1px solid ${error ? '#FF4D4D' : focus ? '#00FF88' : '#1E1E1E'}`,
    borderRadius: '8px', padding: '13px 16px',
    color: '#F5F5F5', fontSize: '0.9rem',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s ease'
  })

  return (
    <div>
      <button onClick={onVolver} style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px', padding: 0 }}>
        <ChevronLeft size={15} />
        <span style={{ fontSize: '0.85rem', fontFamily: 'DM Sans, sans-serif' }}>Volver</span>
      </button>

      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: '#F5F5F5', marginBottom: '6px' }}>
        Tus datos
      </h2>
      <p style={{ color: '#888888', fontSize: '0.875rem', marginBottom: '24px' }}>
        Casi listo — confirma tu turno
      </p>

      {/* Resumen */}
      <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
        {[
          { lbl: 'Servicio', val: servicio.name, color: '#F5F5F5' },
          { lbl: 'Estilista', val: estilista.name, color: '#F5F5F5' },
          { lbl: 'Fecha',    val: fechaLinda,    color: '#F5F5F5' },
          { lbl: 'Hora',     val: formatHora(hora), color: 'var(--accent)' },
        ].map(({ lbl, val, color }) => (
          <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
            <span style={{ color: '#888888', fontSize: '0.8rem' }}>{lbl}</span>
            <span style={{ color, fontSize: '0.8rem', fontWeight: 600 }}>{val}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', color: '#888888', fontSize: '0.78rem', marginBottom: '6px' }}>Nombre completo</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onFocus={() => setFocusNombre(true)}
            onBlur={() => setFocusNombre(false)}
            placeholder="Ej: Juan García"
            style={inputBase(errores.nombre, focusNombre)}
          />
          {errores.nombre && <p style={{ color: '#FF4D4D', fontSize: '0.73rem', marginTop: '4px' }}>{errores.nombre}</p>}
        </div>

        <div>
          <label style={{ display: 'block', color: '#888888', fontSize: '0.78rem', marginBottom: '6px' }}>WhatsApp</label>
          <input
            type="tel"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            onFocus={() => setFocusTel(true)}
            onBlur={() => setFocusTel(false)}
            placeholder="Ej: 3001234567"
            style={inputBase(errores.telefono, focusTel)}
          />
          {errores.telefono && <p style={{ color: '#FF4D4D', fontSize: '0.73rem', marginTop: '4px' }}>{errores.telefono}</p>}
        </div>

        <button
          type="submit"
          disabled={guardando}
          style={{
            background: guardando ? '#0D3320' : '#00FF88',
            color: '#0A0A0A', border: 'none', borderRadius: '8px',
            padding: '14px', fontWeight: 700, fontSize: '1rem',
            cursor: guardando ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            transition: 'opacity 0.2s ease', marginTop: '4px'
          }}
        >
          {guardando ? 'Confirmando...' : 'Confirmar cita ✓'}
        </button>
      </form>
    </div>
  )
}

