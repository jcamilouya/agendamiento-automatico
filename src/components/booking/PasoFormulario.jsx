import { useState, useEffect, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { normalizePhone } from '../../lib/whatsapp'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatHora(hora) {
  const [h, m] = hora.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

export default function PasoFormulario({ seleccion, guardando, onConfirmar, onVolver, businessId }) {
  const [nombre,   setNombre]   = useState(seleccion.nombre   || '')
  const [telefono, setTelefono] = useState(seleccion.telefono || '')
  const [errores,  setErrores]  = useState({})
  const [focusNombre, setFocusNombre] = useState(false)
  const [focusTel,    setFocusTel]    = useState(false)
  const [cliente, setCliente] = useState(null)
  const timerRef = useRef(null)

  const { servicio, estilista, fecha, hora } = seleccion
  const d = new Date(fecha + 'T12:00:00')
  const fechaLinda = `${d.getDate()} de ${MESES[d.getMonth()]}`

  // Búsqueda de cliente recurrente con debounce 600ms
  useEffect(() => {
    const digitos = telefono.replace(/\D/g, '')
    if (digitos.length < 10 || !businessId) {
      setCliente(null)
      return
    }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc('get_client_by_phone', {
          p_business_id: businessId,
          p_phone:       normalizePhone(telefono),
        })
        const c = Array.isArray(data) ? data[0] : data
        if (c?.name) {
          setCliente(c)
          setNombre(prev => prev.trim() ? prev : c.name)
        } else {
          setCliente(null)
        }
      } catch {
        setCliente(null)
      }
    }, 600)
    return () => clearTimeout(timerRef.current)
  }, [telefono, businessId])

  function validar() {
    const e = {}
    const nom = nombre.trim()
    if (nom.length < 3 || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,50}$/.test(nom))
      e.nombre = 'Solo letras, mínimo 3 caracteres'
    const tel = telefono.replace(/\D/g, '')
    if (tel.length !== 10 || !tel.startsWith('3'))
      e.telefono = 'Número colombiano válido (ej: 3001234567)'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  function handleNombreChange(e) {
    const v = e.target.value
    setNombre(v)
    if (errores.nombre && v.trim().length >= 3) setErrores(prev => ({ ...prev, nombre: '' }))
  }

  function handleTelefonoChange(e) {
    const v = e.target.value
    setTelefono(v)
    const tel = v.replace(/\D/g, '')
    if (errores.telefono && tel.length === 10 && tel.startsWith('3'))
      setErrores(prev => ({ ...prev, telefono: '' }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (validar()) onConfirmar(nombre.trim(), telefono.trim())
  }

  const inputBase = (error, focus) => ({
    width: '100%', background: '#0A0A0A',
    border: `1px solid ${error ? '#FF4D4D' : focus ? 'var(--accent)' : '#1E1E1E'}`,
    borderRadius: '8px', padding: '13px 16px',
    color: '#F5F5F5', fontSize: '0.9rem',
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
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

      {/* Resumen de la cita */}
      <div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
        {[
          { lbl: 'Servicio',  val: servicio.name,   color: '#F5F5F5' },
          { lbl: 'Estilista', val: estilista.name,  color: '#F5F5F5' },
          { lbl: 'Fecha',     val: fechaLinda,      color: '#F5F5F5' },
          { lbl: 'Hora',      val: formatHora(hora), color: 'var(--accent)' },
        ].map(({ lbl, val, color }) => (
          <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
            <span style={{ color: '#888888', fontSize: '0.8rem' }}>{lbl}</span>
            <span style={{ color, fontSize: '0.8rem', fontWeight: 600 }}>{val}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* WhatsApp primero → dispara la búsqueda */}
        <div>
          <label style={{ display: 'block', color: '#888888', fontSize: '0.78rem', marginBottom: '6px' }}>WhatsApp</label>
          <input
            type="tel"
            value={telefono}
            onChange={handleTelefonoChange}
            onFocus={() => setFocusTel(true)}
            onBlur={() => setFocusTel(false)}
            placeholder="Ej: 3001234567"
            style={inputBase(errores.telefono, focusTel)}
          />
          {errores.telefono && <p style={{ color: '#FF4D4D', fontSize: '0.73rem', marginTop: '4px' }}>{errores.telefono}</p>}
        </div>

        {/* Banner de bienvenida — cliente recurrente */}
        {cliente && (
          <div style={{
            background: '#0D3320',
            border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            animation: 'fadeSlideIn 0.25s ease forwards',
          }}>
            <div>
              <p style={{ color: '#00FF88', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                ¡Bienvenido de nuevo, {cliente.name.split(' ')[0]}! 👋
              </p>
              {cliente.last_visit_at && (
                <p style={{ color: 'rgba(0,255,136,0.55)', fontSize: '0.75rem', margin: '2px 0 0', fontFamily: 'DM Sans, sans-serif' }}>
                  Última visita: {new Date(cliente.last_visit_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            {cliente.visit_count > 0 && (
              <span style={{
                background: 'rgba(0,255,136,0.1)',
                border: '1px solid rgba(0,255,136,0.2)',
                color: '#00FF88',
                borderRadius: '999px',
                padding: '3px 10px',
                fontSize: '0.75rem',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {cliente.visit_count} visita{cliente.visit_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Nombre — se auto-rellena si el cliente es recurrente */}
        <div>
          <label style={{ display: 'block', color: '#888888', fontSize: '0.78rem', marginBottom: '6px' }}>Nombre completo</label>
          <input
            type="text"
            value={nombre}
            onChange={handleNombreChange}
            onFocus={() => setFocusNombre(true)}
            onBlur={() => setFocusNombre(false)}
            placeholder="Ej: Juan García"
            style={inputBase(errores.nombre, focusNombre)}
          />
          {errores.nombre && <p style={{ color: '#FF4D4D', fontSize: '0.73rem', marginTop: '4px' }}>{errores.nombre}</p>}
        </div>

        <button
          type="submit"
          disabled={guardando}
          style={{
            background: guardando ? '#0D3320' : 'var(--accent)',
            color: '#0A0A0A', border: 'none', borderRadius: '8px',
            padding: '14px', fontWeight: 700, fontSize: '1rem',
            cursor: guardando ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            transition: 'opacity 0.2s ease', marginTop: '4px',
          }}
        >
          {guardando ? 'Confirmando...' : 'Confirmar cita ✓'}
        </button>
      </form>
    </div>
  )
}
