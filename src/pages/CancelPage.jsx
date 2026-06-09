import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { sendWhatsApp, msgCancelacion, msgCancelacionDueno, normalizePhone } from '../lib/whatsapp'

function Spinner() {
  return (
    <span style={{
      width: 28, height: 28, borderRadius: '50%',
      border: '2px solid #1E1E1E', borderTopColor: 'var(--accent)',
      display: 'inline-block', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

export default function CancelPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [cita, setCita] = useState(null)
  const [negocio, setNegocio] = useState(null)
  const [estado, setEstado] = useState('loading') // loading | confirm | done | error | expired

  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, businesses(*), services(name), stylists(name)')
        .eq('cancel_token', token)
        .single()

      if (error || !data) { setEstado('error'); return }
      if (data.status === 'cancelled') { setEstado('expired'); return }

      const fechaCita = new Date(`${data.date}T${data.start_time}`)
      if (fechaCita < new Date()) { setEstado('expired'); return }

      setCita(data)
      setNegocio(data.businesses)
      if (data.businesses?.accent_color) {
        document.documentElement.style.setProperty('--accent', data.businesses.accent_color)
      }
      setEstado('confirm')
    }
    cargar()
  }, [token])

  const handleCancelar = async () => {
    setEstado('loading')
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('cancel_token', token)

    if (error) { setEstado('error'); return }

    sendWhatsApp(
      normalizePhone(cita.client_phone),
      msgCancelacion(cita.client_name, cita.services.name, cita.date, cita.start_time, negocio?.slug)
    )
    if (negocio?.phone) {
      sendWhatsApp(
        normalizePhone(negocio.phone),
        msgCancelacionDueno(cita.client_name, cita.services.name, cita.date, cita.start_time)
      )
    }
    setEstado('done')
  }

  const wrap = (children) => (
    <div style={{
      minHeight: '100vh', background: '#050505',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif', padding: '24px',
    }}>
      {children}
    </div>
  )

  if (estado === 'loading') return wrap(<Spinner />)

  if (estado === 'error') return wrap(
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '2rem', marginBottom: 12 }}>😕</p>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#F5F5F5', marginBottom: 8 }}>
        Algo salió mal
      </h2>
      <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 24 }}>
        No encontramos esa cita. Puede que el link sea inválido.
      </p>
      <button onClick={() => navigate('/')} style={btnOutline}>Volver al inicio</button>
    </div>
  )

  if (estado === 'expired') return wrap(
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</p>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#F5F5F5', marginBottom: 8 }}>
        Esta cita ya no se puede cancelar
      </h2>
      <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 24 }}>
        La cita ya fue cancelada o ya ocurrió.
      </p>
      <button onClick={() => navigate('/')} style={btnOutline}>Volver al inicio</button>
    </div>
  )

  if (estado === 'done') return wrap(
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</p>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
        Cita cancelada
      </h2>
      <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 8 }}>
        Tu cita fue cancelada exitosamente.
      </p>
      <p style={{ color: '#666', fontSize: '0.82rem', marginBottom: 28 }}>
        Recibirás un mensaje de confirmación por WhatsApp.
      </p>
      {negocio && (
        <button onClick={() => navigate(`/${negocio.slug}`)} style={btnAccent}>
          Agendar nueva cita
        </button>
      )}
    </div>
  )

  // estado === 'confirm'
  return wrap(
    <div style={{
      background: '#111111', border: '1px solid #1E1E1E',
      borderRadius: 16, padding: '32px 28px',
      width: '100%', maxWidth: 420,
    }}>
      <h2 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 700,
        fontSize: '1.3rem', color: '#F5F5F5', marginBottom: 6,
      }}>
        Cancelar cita
      </h2>
      <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 24 }}>
        ¿Seguro que deseas cancelar? Esta acción no se puede deshacer.
      </p>

      <div style={{
        background: '#0A0A0A', border: '1px solid #1E1E1E',
        borderRadius: 12, padding: '16px 20px', marginBottom: 28,
      }}>
        <p style={{ color: '#888', fontSize: '0.75rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Detalle de la cita
        </p>
        <p style={{ color: '#F5F5F5', fontWeight: 600, marginBottom: 4 }}>{cita.services?.name}</p>
        {cita.stylists?.name && (
          <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 4 }}>con {cita.stylists.name}</p>
        )}
        <p style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>
          {cita.date} · {cita.start_time?.slice(0, 5)}
        </p>
        <p style={{ color: '#666', fontSize: '0.8rem', marginTop: 4 }}>{negocio?.name}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={handleCancelar} style={btnRed}>
          Sí, cancelar mi cita
        </button>
        <button onClick={() => navigate(-1)} style={btnOutline}>
          No, mantener cita
        </button>
      </div>
    </div>
  )
}

const btnAccent = {
  background: 'var(--accent)', border: 'none',
  color: '#0A0A0A', padding: '12px 28px',
  borderRadius: 8, fontFamily: 'DM Sans, sans-serif',
  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
}

const btnRed = {
  background: '#FF4D4D', border: 'none',
  color: '#fff', padding: '12px',
  borderRadius: 8, fontFamily: 'DM Sans, sans-serif',
  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
}

const btnOutline = {
  background: 'transparent', border: '1px solid #333',
  color: '#888', padding: '12px',
  borderRadius: 8, fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.9rem', cursor: 'pointer',
}
