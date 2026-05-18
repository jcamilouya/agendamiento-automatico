import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { sendWhatsApp, msgConfirmacion, msgNuevaCita } from '../lib/whatsapp'
import PasoServicio from '../components/booking/PasoServicio'
import PasoEstilista from '../components/booking/PasoEstilista'
import PasoFechaHora from '../components/booking/PasoFechaHora'
import PasoFormulario from '../components/booking/PasoFormulario'
import PasoConfirmacion from '../components/booking/PasoConfirmacion'

const ETIQUETAS = ['Servicio', 'Estilista', 'Fecha y hora', 'Tus datos']

export default function BookingPage() {
  const { shopSlug } = useParams()
  const navigate = useNavigate()

  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [negocio, setNegocio] = useState(null)
  const [servicios, setServicios] = useState([])
  const [estilistas, setEstilistas] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [seleccion, setSeleccion] = useState({
    servicio: null, estilista: null,
    fecha: null, hora: null,
    nombre: '', telefono: ''
  })

  useEffect(() => { cargarDatos() }, [shopSlug])

  async function cargarDatos() {
    try {
      const { data: neg, error: e1 } = await supabase
        .from('businesses').select('*').eq('slug', shopSlug).eq('is_active', true).single()
      if (e1 || !neg) { navigate('/404', { replace: true }); return }
      setNegocio(neg)

      // Aplica el color de acento y título del negocio
      if (neg.accent_color && /^#[0-9A-Fa-f]{6}$/.test(neg.accent_color)) {
        const c = neg.accent_color
        const r = parseInt(c.slice(1, 3), 16)
        const g = parseInt(c.slice(3, 5), 16)
        const b = parseInt(c.slice(5, 7), 16)
        const root = document.documentElement.style
        root.setProperty('--accent', c)
        root.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
        root.setProperty('--accent-dim', `rgba(${r},${g},${b},0.12)`)
        root.setProperty('--accent-glow', `0 0 20px rgba(${r},${g},${b},0.3), 0 0 60px rgba(${r},${g},${b},0.1)`)
      }
      document.title = `${neg.name} — TURNO`

      const { data: srvs, error: e2 } = await supabase
        .from('services').select('*')
        .eq('business_id', neg.id).eq('is_active', true).order('price')
      if (e2) throw e2
      setServicios(srvs)

      const { data: ests, error: e3 } = await supabase
        .from('stylists').select('*')
        .eq('business_id', neg.id).eq('is_active', true)
      if (e3) throw e3
      setEstilistas(ests)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  async function confirmarCita(nombre, telefono) {
    setGuardando(true)
    try {
      const { servicio, estilista, fecha, hora } = seleccion
      const [h, m] = hora.split(':').map(Number)
      const finMin = h * 60 + m + servicio.duration_minutes
      const horaFin = `${String(Math.floor(finMin / 60)).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}`

      const { error: err } = await supabase.from('appointments').insert({
        business_id: negocio.id,
        stylist_id: estilista.id,
        service_id: servicio.id,
        client_name: nombre,
        client_phone: telefono,
        date: fecha,
        start_time: hora,
        end_time: horaFin,
        status: 'pending'
      })
      if (err) throw err

      // Confirmación al cliente — fire-and-forget
      sendWhatsApp(telefono, msgConfirmacion({
        clientName:  nombre,
        negocioName: negocio.name,
        fecha, hora,
        servicio:    servicio.name,
        estilista:   estilista.name,
      }))

      // Alerta al dueño del negocio
      if (negocio.phone) {
        sendWhatsApp(negocio.phone, msgNuevaCita({
          clientName:  nombre,
          clientPhone: telefono,
          fecha, hora,
          servicio:    servicio.name,
          estilista:   estilista.name,
          precio:      servicio.price,
        }))
      }

      setSeleccion(prev => ({ ...prev, nombre, telefono }))
      setPaso(5)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  function reiniciar() {
    setSeleccion({ servicio: null, estilista: null, fecha: null, hora: null, nombre: '', telefono: '' })
    setPaso(1)
  }

  // --- Estados de UI ---
  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A' }}>
      <p style={{ color: '#888888', fontFamily: 'DM Sans, sans-serif' }}>Cargando...</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A', padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#FF4D4D', fontFamily: 'DM Sans, sans-serif', marginBottom: '8px' }}>Algo salió mal</p>
        <p style={{ color: '#888888', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif' }}>{error}</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0A0A', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1E1E1E', padding: '20px 0' }}>
        <div className="turno-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#F5F5F5', margin: 0 }}>
            {negocio.name}
          </h1>
          <span style={{ background: '#0D3320', color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 600, padding: '2px 10px', borderRadius: '999px' }}>
            Abierto
          </span>
        </div>
      </div>

      {/* Barra de progreso pasos 1-4 */}
      {paso < 5 && (
        <div className="turno-container" style={{ paddingTop: '20px' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {ETIQUETAS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: '3px', borderRadius: '999px',
                background: i + 1 <= paso ? 'var(--accent)' : '#1E1E1E',
                transition: 'background 0.3s ease'
              }} />
            ))}
          </div>
          <p style={{ color: '#888888', fontSize: '0.75rem' }}>
            Paso {paso} de {ETIQUETAS.length} — {ETIQUETAS[paso - 1]}
          </p>
        </div>
      )}

      {/* Contenido */}
      <div className="turno-container" style={{ paddingTop: '24px', paddingBottom: '48px' }}>
        {paso === 1 && (
          <div className="paso-animado" key="p1">
            <PasoServicio
              servicios={servicios}
              onSeleccionar={(srv) => { setSeleccion(p => ({ ...p, servicio: srv })); setPaso(2) }}
            />
          </div>
        )}
        {paso === 2 && (
          <div className="paso-animado" key="p2">
            <PasoEstilista
              estilistas={estilistas}
              onSeleccionar={(est) => { setSeleccion(p => ({ ...p, estilista: est })); setPaso(3) }}
              onVolver={() => setPaso(1)}
            />
          </div>
        )}
        {paso === 3 && (
          <div className="paso-animado" key="p3">
            <PasoFechaHora
              seleccion={seleccion}
              onSeleccionar={(fecha, hora) => { setSeleccion(p => ({ ...p, fecha, hora })); setPaso(4) }}
              onVolver={() => setPaso(2)}
            />
          </div>
        )}
        {paso === 4 && (
          <div className="paso-animado" key="p4">
            <PasoFormulario
              seleccion={seleccion}
              guardando={guardando}
              onConfirmar={confirmarCita}
              onVolver={() => setPaso(3)}
            />
          </div>
        )}
        {paso === 5 && (
          <div className="paso-animado" key="p5">
            <PasoConfirmacion
              seleccion={seleccion}
              negocio={negocio}
              onReiniciar={reiniciar}
            />
          </div>
        )}
      </div>
    </div>
  )
}

