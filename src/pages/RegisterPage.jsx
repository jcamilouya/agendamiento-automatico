import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BUSINESS_TYPE_LIST } from '../config/businessTypes'
import { Check, ChevronLeft, Loader2, Store, Sparkles } from 'lucide-react'

// Genera slug desde el nombre del negocio
function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// Pasos del wizard
const TOTAL_PASOS = 4

export default function RegisterPage() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(1)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Datos del formulario
  const [tipo, setTipo] = useState(null)
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [slugCustom, setSlugCustom] = useState(false)
  const [slugDisponible, setSlugDisponible] = useState(null)
  const [ciudad, setCiudad] = useState('')
  const [direccion, setDireccion] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [negocioCreado, setNegocioCreado] = useState(null)
  const [needsConfirm,  setNeedsConfirm]  = useState(false)

  const slugTimer = useRef(null)

  // Auto-genera el slug al cambiar el nombre (si no fue editado manualmente)
  useEffect(() => {
    if (!slugCustom && nombre) {
      const generado = toSlug(nombre)
      setSlug(generado)
    }
  }, [nombre, slugCustom])

  // Verifica disponibilidad del slug con debounce
  useEffect(() => {
    if (!slug || slug.length < 3) { setSlugDisponible(null); return }
    clearTimeout(slugTimer.current)
    setSlugDisponible(null)
    slugTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      setSlugDisponible(!data)
    }, 500)
    return () => clearTimeout(slugTimer.current)
  }, [slug])

  function irPaso(n) {
    setError('')
    setPaso(n)
  }

  function validarPaso1() {
    if (!tipo) { setError('Elige el tipo de negocio para continuar'); return false }
    return true
  }

  function validarPaso2() {
    if (!nombre.trim()) { setError('El nombre del negocio es obligatorio'); return false }
    if (!slug || slug.length < 3) { setError('El link debe tener al menos 3 caracteres'); return false }
    if (slugDisponible === false) { setError('Ese link ya está en uso, elige otro'); return false }
    if (!whatsapp.trim()) { setError('El número de WhatsApp es obligatorio'); return false }
    return true
  }

  function validarPaso3() {
    if (!email.trim()) { setError('El email es obligatorio'); return false }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return false }
    if (password !== password2) { setError('Las contraseñas no coinciden'); return false }
    if (!aceptaTerminos) { setError('Debes aceptar los términos para continuar'); return false }
    return true
  }

  async function registrar() {
    if (!validarPaso3()) return
    setGuardando(true)
    setError('')

    try {
      // 1. Crear cuenta
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      })
      if (authErr) throw authErr

      if (!authData.user?.id) throw new Error('No se pudo crear la cuenta')

      // 2. Iniciar sesión para obtener JWT activo antes del INSERT en businesses.
      //    Si la confirmación de email está activa en Supabase, esto falla y mostramos
      //    una pantalla de "revisa tu correo" en lugar de un error genérico.
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) {
        if (loginErr.message === 'Email not confirmed') {
          setNeedsConfirm(true)
          irPaso(4)
          return
        }
        throw loginErr
      }

      // El owner_id DEBE venir de la sesión autenticada, no de signUp(): si el email
      // ya existía, signUp() devuelve un usuario "fantasma" con un id fabricado distinto
      // del real, y entonces owner_id != auth.uid() → la policy RLS rechaza el INSERT.
      const userId = loginData.session?.user?.id ?? loginData.user?.id
      if (!userId) throw new Error('No se pudo iniciar sesión tras el registro')

      // 3. Crear el negocio
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 30)

      const { data: biz, error: bizErr } = await supabase
        .from('businesses')
        .insert({
          owner_id: userId,
          name: nombre.trim(),
          slug,
          business_type: tipo.id,
          accent_color: tipo.accentColor,
          phone: whatsapp.replace(/\D/g, ''),
          city: ciudad.trim() || 'Bogotá',
          address: direccion.trim(),
          is_active: true,
          subscription_plan: 'trial',
          trial_ends_at: trialEndsAt.toISOString(),
        })
        .select()
        .single()
      if (bizErr) throw bizErr

      // 4. Crear estilista por defecto
      const { data: estilista, error: estErr } = await supabase
        .from('stylists')
        .insert({ business_id: biz.id, name: tipo.staffLabel, is_active: true })
        .select()
        .single()
      if (estErr) throw estErr

      // 5. Crear servicios por defecto
      await supabase.from('services').insert(
        tipo.defaultServices.map(s => ({ ...s, business_id: biz.id, is_active: true }))
      )

      // 6. Disponibilidad L-S 9am-6pm
      const diasLaborales = [1, 2, 3, 4, 5, 6] // lunes a sábado
      await supabase.from('availability').insert(
        diasLaborales.map(day => ({
          stylist_id: estilista.id,
          day_of_week: day,
          start_time: '09:00',
          end_time: '18:00',
          is_active: true,
        }))
      )

      setNegocioCreado(biz)
      irPaso(4)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const acento = tipo?.accentColor ?? '#00FF88'

  return (
    <div style={{
      minHeight: '100vh',
      background: tipo
        ? `radial-gradient(ellipse at 50% 0%, ${acento}18 0%, #050505 60%)`
        : '#050505',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      transition: 'background 0.6s ease',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '2rem', color: '#F5F5F5', margin: 0, letterSpacing: '-0.02em' }}>
          TURNOTT
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '4px' }}>
          Tu negocio en línea en menos de 3 minutos
        </p>
      </div>

      {/* Card principal */}
      <div style={{
        width: '100%',
        maxWidth: paso === 1 ? '680px' : '480px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        backdropFilter: 'blur(20px)',
        padding: '32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset',
        transition: 'max-width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Barra de progreso */}
        {paso < 4 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {Array.from({ length: TOTAL_PASOS - 1 }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: '3px', borderRadius: '999px',
                  background: i + 1 <= paso - 1
                    ? acento
                    : i + 1 === paso
                    ? `${acento}60`
                    : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.4s ease',
                }} />
              ))}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
              Paso {paso} de 3
            </p>
          </div>
        )}

        {/* ── PASO 1: Tipo de negocio ── */}
        {paso === 1 && (
          <div style={{ animation: 'fadeSlideIn 0.25s ease' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.4rem', color: '#F5F5F5', marginBottom: '6px' }}>
              ¿Qué tipo de negocio tienes?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Personalizamos la app según tu negocio
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {BUSINESS_TYPE_LIST.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t)}
                  style={{
                    background: tipo?.id === t.id
                      ? `${t.accentColor}15`
                      : 'rgba(255,255,255,0.03)',
                    border: tipo?.id === t.id
                      ? `1.5px solid ${t.accentColor}80`
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '20px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.25s ease',
                    transform: tipo?.id === t.id ? 'translateY(-2px)' : 'none',
                    boxShadow: tipo?.id === t.id
                      ? `0 8px 24px ${t.accentColor}20`
                      : 'none',
                  }}
                  onMouseEnter={e => {
                    if (tipo?.id !== t.id) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (tipo?.id !== t.id) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      e.currentTarget.style.transform = 'none'
                    }
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{t.emoji}</div>
                  <div style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '0.9rem', marginBottom: '4px' }}>{t.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', lineHeight: 1.4 }}>{t.description}</div>
                  {tipo?.id === t.id && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px', color: t.accentColor, fontSize: '0.75rem', fontWeight: 600 }}>
                      <Check size={12} /> Seleccionado
                    </div>
                  )}
                </button>
              ))}
            </div>

            {error && <p style={{ color: '#FF4D4D', fontSize: '0.82rem', marginBottom: '16px' }}>{error}</p>}

            <button
              onClick={() => { if (validarPaso1()) irPaso(2) }}
              disabled={!tipo}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                background: tipo ? acento : 'rgba(255,255,255,0.08)',
                color: tipo ? '#000' : 'rgba(255,255,255,0.3)',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: 'none',
                cursor: tipo ? 'pointer' : 'not-allowed',
                opacity: tipo ? 1 : 0.5,
                transition: 'all 0.25s ease',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Continuar
            </button>

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '16px' }}>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" style={{ color: acento, textDecoration: 'none' }}>Inicia sesión</Link>
            </p>
          </div>
        )}

        {/* ── PASO 2: Datos del negocio ── */}
        {paso === 2 && (
          <div style={{ animation: 'fadeSlideIn 0.25s ease' }}>
            <button onClick={() => irPaso(1)} style={backBtnStyle}>
              <ChevronLeft size={16} /> Volver
            </button>

            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '1.8rem' }}>{tipo?.emoji}</span>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: '#F5F5F5', margin: '8px 0 4px' }}>
                Cuéntanos de tu {tipo?.name.toLowerCase()}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
                Estos datos aparecerán en tu página de clientes
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Nombre del negocio *</label>
                <input
                  className="dash-input"
                  placeholder={`Ej: ${tipo?.name === 'Barbería' ? 'El Corte Fino' : tipo?.name === 'Salón de Belleza' ? 'Salón Glamour' : 'Mi ' + tipo?.name}`}
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Link de tu negocio *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem',
                  }}>
                    turno.co/
                  </span>
                  <input
                    className="dash-input"
                    value={slug}
                    onChange={e => { setSlugCustom(true); setSlug(toSlug(e.target.value)) }}
                    placeholder="mi-negocio"
                    style={{ ...inputStyle, paddingLeft: '78px' }}
                  />
                  {slug?.length >= 3 && (
                    <span style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      fontSize: '0.75rem', fontWeight: 600,
                      color: slugDisponible === null ? 'rgba(255,255,255,0.3)'
                           : slugDisponible ? '#00FF88' : '#FF4D4D',
                    }}>
                      {slugDisponible === null ? 'Verificando...' : slugDisponible ? '✓ Disponible' : '✗ En uso'}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Ciudad</label>
                  <input className="dash-input" placeholder="Bogotá" value={ciudad} onChange={e => setCiudad(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>WhatsApp *</label>
                  <input className="dash-input" placeholder="3001234567" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} style={inputStyle} type="tel" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Dirección (opcional)</label>
                <input className="dash-input" placeholder="Calle 72 # 10-35, Local 2" value={direccion} onChange={e => setDireccion(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {error && <p style={{ color: '#FF4D4D', fontSize: '0.82rem', marginBottom: '14px' }}>{error}</p>}

            <button onClick={() => { if (validarPaso2()) irPaso(3) }} style={{ ...btnPrimaryStyle, background: acento }}>
              Continuar
            </button>
          </div>
        )}

        {/* ── PASO 3: Cuenta de acceso ── */}
        {paso === 3 && (
          <div style={{ animation: 'fadeSlideIn 0.25s ease' }}>
            <button onClick={() => irPaso(2)} style={backBtnStyle}>
              <ChevronLeft size={16} /> Volver
            </button>

            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: '#F5F5F5', marginBottom: '6px' }}>
              Crea tu cuenta
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', marginBottom: '24px' }}>
              Con esto entras al dashboard de <strong style={{ color: '#F5F5F5' }}>{nombre}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Email *</label>
                <input className="dash-input" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contraseña * (mínimo 8 caracteres)</label>
                <input className="dash-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Confirmar contraseña *</label>
                <input className="dash-input" type="password" placeholder="••••••••" value={password2} onChange={e => setPassword2(e.target.value)} style={inputStyle} />
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={aceptaTerminos}
                  onChange={e => setAceptaTerminos(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: acento }}
                />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  Acepto los{' '}
                  <span style={{ color: acento, cursor: 'pointer' }}>términos y condiciones</span>
                  {' '}y la{' '}
                  <span style={{ color: acento, cursor: 'pointer' }}>política de privacidad</span>
                </span>
              </label>
            </div>

            {error && <p style={{ color: '#FF4D4D', fontSize: '0.82rem', marginBottom: '14px' }}>{error}</p>}

            <button
              onClick={registrar}
              disabled={guardando}
              style={{ ...btnPrimaryStyle, background: acento, opacity: guardando ? 0.7 : 1 }}
            >
              {guardando
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Creando tu negocio...</span>
                : 'Crear cuenta y activar negocio'}
            </button>
          </div>
        )}

        {/* ── PASO 4a: Confirma tu correo ── */}
        {paso === 4 && needsConfirm && (
          <div style={{ animation: 'fadeSlideIn 0.3s ease', textAlign: 'center' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'rgba(0,200,255,0.1)', border: '2px solid rgba(0,200,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '2.2rem',
              boxShadow: '0 0 40px rgba(0,200,255,0.15)',
            }}>
              📧
            </div>

            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#F5F5F5', marginBottom: '8px' }}>
              Revisa tu correo
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.6 }}>
              Te enviamos un enlace de confirmación a<br/>
              <span style={{ color: '#F5F5F5', fontWeight: 600 }}>{email}</span>
            </p>

            <div style={{
              background: 'rgba(0,200,255,0.05)',
              border: '1px solid rgba(0,200,255,0.2)',
              borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', textAlign: 'left',
            }}>
              {['Abre el correo que te enviamos', 'Haz clic en el enlace de confirmación', 'Vuelve e inicia sesión con tu cuenta'].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < 2 ? 12 : 0 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(0,200,255,0.15)', border: '1px solid rgba(0,200,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700, color: 'rgba(0,200,255,0.9)',
                  }}>{i + 1}</span>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'DM Sans, sans-serif' }}>{step}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/login')}
              style={{ ...btnPrimaryStyle, background: acento }}
            >
              Ir a Iniciar sesión
            </button>
            <p style={{ marginTop: 14, color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif' }}>
              ¿No llegó? Revisa la carpeta de spam
            </p>
          </div>
        )}

        {/* ── PASO 4b: ¡Listo! ── */}
        {paso === 4 && !needsConfirm && negocioCreado && (
          <div style={{ animation: 'fadeSlideIn 0.3s ease', textAlign: 'center' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: `${acento}20`, border: `2px solid ${acento}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: `0 0 40px ${acento}30`,
            }}>
              <Sparkles size={32} color={acento} />
            </div>

            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#F5F5F5', marginBottom: '8px' }}>
              ¡{nombre} está lista! 🎉
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '28px', lineHeight: 1.6 }}>
              Tu página de clientes ya está activa. Compártela y empieza a recibir citas hoy mismo.
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', wordBreak: 'break-all',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Tu link de citas
              </p>
              <p style={{ color: acento, fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                turnott.com/{negocioCreado.slug}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => navigate('/dashboard')} style={{ ...btnPrimaryStyle, background: acento }}>
                <Store size={16} style={{ display: 'inline', marginRight: '6px' }} />
                Ir a mi dashboard
              </button>
              <button
                onClick={() => window.open(`/${negocioCreado.slug}`, '_blank')}
                style={{ ...btnPrimaryStyle, background: 'transparent', color: '#F5F5F5', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                Ver mi página de clientes ↗
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Estilos compartidos ──────────────────────────────────────────
const labelStyle = {
  display: 'block',
  color: 'rgba(255,255,255,0.5)',
  fontSize: '0.78rem',
  fontWeight: 500,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
}

const btnPrimaryStyle = {
  width: '100%',
  padding: '14px',
  borderRadius: '10px',
  color: '#000',
  fontWeight: 700,
  fontSize: '0.95rem',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
  transition: 'all 0.25s ease',
  display: 'block',
}

const backBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.4)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '0.82rem',
  padding: '0 0 20px',
  fontFamily: 'DM Sans, sans-serif',
  transition: 'color 0.2s',
}
