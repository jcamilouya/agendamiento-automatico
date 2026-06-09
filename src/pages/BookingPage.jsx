import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { sendWhatsApp, msgConfirmacion, msgNuevaCita, normalizePhone } from '../lib/whatsapp'
import { findPromo, applyDiscount } from '../lib/promos'
import { BUSINESS_TYPES } from '../config/businessTypes'
import PasoServicio from '../components/booking/PasoServicio'
import PasoEstilista from '../components/booking/PasoEstilista'
import PasoFechaHora from '../components/booking/PasoFechaHora'
import PasoFormulario from '../components/booking/PasoFormulario'
import PasoConfirmacion from '../components/booking/PasoConfirmacion'
import WhatsAppFloat from '../components/WhatsAppFloat'

const ETIQUETAS = ['Servicio', 'Estilista', 'Fecha y hora', 'Tus datos']

function ErrorScreen({ mensaje = 'Algo salió mal', onReintentar }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#050505', padding: '24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
      <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', color: '#F5F5F5', marginBottom: '8px' }}>
        {mensaje}
      </p>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#555', marginBottom: '24px' }}>
        Estamos trabajando para resolverlo. Intenta de nuevo en unos minutos.
      </p>
      {onReintentar && (
        <button
          onClick={onReintentar}
          style={{
            padding: '12px 24px', background: 'var(--accent)',
            border: 'none', borderRadius: '10px', color: '#050505',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Reintentar
        </button>
      )}
      <p style={{ fontSize: '12px', color: '#333', marginTop: '24px', fontFamily: 'DM Sans, sans-serif' }}>
        ¿Necesitas ayuda? WhatsApp: 3143707036
      </p>
    </div>
  )
}

export default function BookingPage() {
  const { shopSlug } = useParams()
  const navigate = useNavigate()

  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [negocio, setNegocio] = useState(null)
  const [servicios, setServicios] = useState([])
  const [estilistas, setEstilistas] = useState([])
  const [promociones, setPromociones] = useState([])
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
        .from('businesses').select('*').eq('slug', shopSlug).eq('is_active', true).maybeSingle()
      if (e1) throw e1
      if (!neg) { setNotFound(true); return }
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
      document.title = `${neg.name} — TURNOTT`

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

      const { data: promos } = await supabase
        .from('promotions').select('*')
        .eq('business_id', neg.id).eq('is_active', true)
      setPromociones(promos ?? [])
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

      const promo       = findPromo(promociones, fecha, hora)
      const finalPrice  = applyDiscount(Number(servicio.price ?? 0), promo)

      const cancelToken = crypto.randomUUID()

      const basePayload = {
        business_id: negocio.id,
        stylist_id: estilista.id,
        service_id: servicio.id,
        client_name: nombre,
        client_phone: telefono,
        date: fecha,
        start_time: hora,
        end_time: horaFin,
        status: 'pending',
        final_price: finalPrice,
      }

      // Intentar con cancel_token; si la columna no existe aún, reintentar sin él
      let insertRes = await supabase.from('appointments').insert({ ...basePayload, cancel_token: cancelToken })
      let columnMissing = false
      if (insertRes.error) {
        const msg = insertRes.error.message ?? ''
        const isColErr = insertRes.error.code === 'PGRST204'
          || msg.includes('cancel_token')
          || msg.includes('column')
        if (isColErr) {
          columnMissing = true
          insertRes = await supabase.from('appointments').insert(basePayload)
        }
      }

      const { error: err } = insertRes
      if (err) {
        if (err.code === '23505') {
          throw new Error('Ese horario acaba de ser reservado por otra persona. Por favor elige otro.')
        }
        throw err
      }

      const cancelUrl = columnMissing ? null : `${window.location.origin}/cancelar/${cancelToken}`

      // Confirmación al cliente — fire-and-forget
      sendWhatsApp(normalizePhone(telefono), msgConfirmacion({
        clientName:  nombre,
        negocioName: negocio.name,
        fecha, hora,
        servicio:    servicio.name,
        estilista:   estilista.name,
        cancelUrl,
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

      setSeleccion(prev => ({ ...prev, nombre, telefono, promo, finalPrice }))
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

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A', padding: '24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: '#F5F5F5', marginBottom: 10 }}>
          No encontramos este negocio
        </h1>
        <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
          El link <strong style={{ color: '#F5F5F5' }}>turnott.com/{shopSlug}</strong> no existe o el negocio aún no está activo.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--accent)', color: '#0A0A0A',
            border: 'none', borderRadius: 10, padding: '12px 22px',
            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )

  if (error) return <ErrorScreen onReintentar={() => window.location.reload()} />

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

      <WhatsAppFloat />

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
              staffLabel={BUSINESS_TYPES[negocio?.business_type]?.staffLabel || 'profesional'}
              onSeleccionar={(est) => { setSeleccion(p => ({ ...p, estilista: est })); setPaso(3) }}
              onVolver={() => setPaso(1)}
            />
          </div>
        )}
        {paso === 3 && (
          <div className="paso-animado" key="p3">
            <PasoFechaHora
              seleccion={seleccion}
              promociones={promociones}
              businessId={negocio?.id}
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
              businessId={negocio?.id}
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

