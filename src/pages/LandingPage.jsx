import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, MessageCircle, BarChart2, Users,
  CheckCircle, ArrowRight, Star, Zap, Clock, LogOut,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useScrollReveal(threshold = 0.12) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function useTypewriter(text, speed = 40) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(id); setDone(true) }
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return [displayed, done]
}

function useAnimatedCounter(target, duration = 2000, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1)
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [start, target, duration])
  return value
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 5vw',
      background: scrolled ? 'rgba(10,10,10,0.85)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? '1px solid #1E1E1E' : 'none',
      transition: 'all 0.3s ease',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 64,
    }}>
      <span style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800,
        fontSize: '1.3rem', color: 'var(--accent)', letterSpacing: '-0.02em',
      }}>
        TURNO
      </span>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {session ? (
          <>
            <span style={{
              color: '#666', fontSize: '0.78rem',
              fontFamily: 'DM Sans, sans-serif',
              display: 'none',
            }} className="nav-user-email">
              {session.user.email}
            </span>
            <button
              onClick={handleSignOut}
              style={{
                background: 'transparent', border: '1px solid #333',
                color: '#888888', padding: '8px 16px',
                borderRadius: 8, fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.85rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF4D4D'; e.currentTarget.style.color = '#FF4D4D' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888888' }}
            >
              <LogOut size={14} /> Cerrar sesión
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'var(--accent)', border: 'none',
                color: '#0A0A0A', padding: '8px 20px',
                borderRadius: 8, fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              Ir al Dashboard
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent', border: '1px solid #333',
                color: '#888888', padding: '8px 20px',
                borderRadius: 8, fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.85rem', cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = '#F5F5F5' }}
              onMouseLeave={e => { e.target.style.borderColor = '#333'; e.target.style.color = '#888888' }}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => navigate('/turno-demo')}
              style={{
                background: 'var(--accent)', border: 'none',
                color: '#0A0A0A', padding: '8px 20px',
                borderRadius: 8, fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 0 rgba(var(--accent-rgb),0)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.03)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(var(--accent-rgb),0.4)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 0 0 rgba(var(--accent-rgb),0)'
              }}
            >
              Ver demo
            </button>
          </>
        )}
      </div>
    </nav>
  )
}

// ── Section: Hero ─────────────────────────────────────────────────────────────

const TITLE_PLAIN = 'Deja de perder citas '
const TITLE_COLOR = 'por WhatsApp'
const FULL_TITLE  = TITLE_PLAIN + TITLE_COLOR

function Hero() {
  const navigate    = useNavigate()
  const heroRef     = useRef(null)
  const videoRef    = useRef(null)
  const contentRef  = useRef(null)

  const [typed, typedDone] = useTypewriter(FULL_TITLE, 40)
  const count500 = useAnimatedCounter(500, 2000, typedDone)
  const count98  = useAnimatedCounter(98,  2000, typedDone)
  const count30  = useAnimatedCounter(30,  2000, typedDone)

  const plainTyped   = typed.slice(0, TITLE_PLAIN.length)
  const coloredTyped = typed.length > TITLE_PLAIN.length ? typed.slice(TITLE_PLAIN.length) : ''

  // rAF-throttled 3D parallax scroll — passive listener never blocks scroll thread
  useEffect(() => {
    let rafId = null
    const onScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const hero    = heroRef.current
        const video   = videoRef.current
        const content = contentRef.current
        if (!hero || !video || !content) return

        const scrolled  = window.scrollY
        const heroH     = hero.offsetHeight
        const progress  = Math.min(scrolled / heroH, 1)

        // Video: slow translateY (parallax depth) + subtle zoom
        video.style.transform =
          `translate3d(0, ${scrolled * 0.28}px, 0) scale(${1 + progress * 0.12})`

        // Content: float up + fade as hero scrolls past
        content.style.transform = `translate3d(0, ${-scrolled * 0.14}px, 0)`
        content.style.opacity   = String(Math.max(0, 1 - progress * 1.6))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  const stats = [
    { value: `+${count500}`, label: 'negocios activos' },
    { value: `${count98}%`,  label: 'satisfacción' },
    { value: `${count30}min`, label: 'ahorrados al día' },
  ]

  return (
    <section
      ref={heroRef}
      style={{
        position: 'relative', overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Video background — GPU-composited via will-change */}
      <video
        ref={videoRef}
        src="/video_landing.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      />

      {/* Gradient overlay — bottom darkens to blend with next section */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background:
          'linear-gradient(to bottom, rgba(10,10,10,0.62) 0%, rgba(10,10,10,0.3) 45%, rgba(10,10,10,0.72) 80%, #0A0A0A 100%)',
      }} />

      {/* Brand radial glow */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background:
          'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(61,255,168,0.07) 0%, transparent 70%)',
      }} />

      {/* Content — floats up on scroll */}
      <div
        ref={contentRef}
        style={{
          position: 'relative', zIndex: 3,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '120px 5vw 80px',
          textAlign: 'center',
          willChange: 'transform, opacity',
        }}
      >
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(17,17,17,0.8)', border: '1px solid #1E1E1E',
          borderRadius: 999, padding: '6px 16px',
          marginBottom: 32,
          animation: 'fadeInUp 0.5s ease forwards',
          backdropFilter: 'blur(8px)',
        }}>
          <Zap size={13} color="var(--accent)" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', color: '#888888' }}>
            Agendamiento inteligente para Colombia
          </span>
        </div>

        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(2.6rem, 6vw, 5rem)',
          lineHeight: 1.05, letterSpacing: '-0.03em',
          color: '#F5F5F5', maxWidth: 820, marginBottom: 24,
          minHeight: '1.1em',
          textShadow: '0 2px 40px rgba(0,0,0,0.5)',
        }}>
          {plainTyped}
          {coloredTyped && (
            <span style={{
              background: 'linear-gradient(135deg, #00FF88 0%, #00D4AA 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {coloredTyped}
            </span>
          )}
          {!typedDone && (
            <span style={{
              display: 'inline-block', width: 3, height: '0.85em',
              background: 'var(--accent)', verticalAlign: 'text-bottom', marginLeft: 3,
              animation: 'cursorBlink 0.7s ease-in-out infinite',
            }} />
          )}
        </h1>

        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 'clamp(1rem, 2vw, 1.2rem)',
          color: 'rgba(245,245,245,0.8)', maxWidth: 560, lineHeight: 1.6,
          marginBottom: 40,
          opacity: typedDone ? 1 : 0,
          transform: typedDone ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          textShadow: '0 1px 20px rgba(0,0,0,0.6)',
        }}>
          Turno digitaliza el agendamiento de tu estética o barbería.
          Tus clientes agendan solos, 24/7 — tú recibes la cita directo en WhatsApp.
        </p>

        <div style={{
          display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
          marginBottom: 64,
          opacity: typedDone ? 1 : 0,
          transform: typedDone ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s',
        }}>
          <button
            onClick={() => navigate('/turno-demo')}
            style={{
              background: 'var(--accent)', border: 'none',
              color: '#0A0A0A', padding: '14px 32px',
              borderRadius: 10, fontFamily: 'DM Sans, sans-serif',
              fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s ease',
              boxShadow: '0 0 40px rgba(61,255,168,0.25)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.03) translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 40px rgba(61,255,168,0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1) translateY(0)'
              e.currentTarget.style.boxShadow = '0 0 40px rgba(61,255,168,0.25)'
            }}
          >
            Probar demo gratis <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'rgba(10,10,10,0.4)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#F5F5F5', padding: '14px 32px',
              borderRadius: 10, fontFamily: 'DM Sans, sans-serif',
              fontSize: '1rem', cursor: 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#00FF88' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
          >
            Ver dashboard
          </button>
        </div>

        <div style={{
          display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center',
          opacity: typedDone ? 1 : 0,
          transform: typedDone ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
        }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '1.8rem', color: '#F5F5F5', lineHeight: 1,
                textShadow: '0 2px 16px rgba(0,0,0,0.5)',
              }}>
                {s.value}
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: 'rgba(245,245,245,0.5)', marginTop: 4 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section: Features ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Calendar,
    title: 'Agenda 24/7',
    desc: 'Tus clientes reservan en minutos desde el celular, sin llamadas ni mensajes. Tú descansas, el negocio trabaja.',
    color: 'var(--accent)',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp automático',
    desc: 'Confirmaciones y recordatorios se envían solos. Reduce cancelaciones y no-shows hasta un 40%.',
    color: '#25D366',
  },
  {
    icon: BarChart2,
    title: 'Reportes avanzados',
    desc: 'Ingresos, horas pico, servicios más populares y tasa de retención — todo en un dashboard claro.',
    color: '#F59E0B',
  },
  {
    icon: Users,
    title: 'Gestión de equipo',
    desc: 'Administra estilistas, horarios y disponibilidad. Cada uno con su propia agenda sincronizada.',
    color: 'var(--accent)',
  },
]

function Features() {
  const [ref, visible] = useScrollReveal()

  return (
    <section ref={ref} style={{ padding: '80px 5vw', background: '#0D0D0D' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem',
          color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 12, textAlign: 'center',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          Todo lo que necesitas
        </p>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          color: '#F5F5F5', textAlign: 'center',
          marginBottom: 56, letterSpacing: '-0.02em',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
        }}>
          Una sola herramienta para todo
        </h2>

        <div className="landing-features-grid">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              style={{
                background: '#111111', border: '1px solid #1E1E1E',
                borderRadius: 16, padding: '28px 24px',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(30px)',
                transition: `opacity 0.6s ease ${(i + 2) * 100}ms, transform 0.6s ease ${(i + 2) * 100}ms, border-color 0.2s ease`,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = f.color + '55' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1E' }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: f.color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <f.icon size={20} color={f.color} />
              </div>
              <h3 style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '1.05rem', color: '#F5F5F5', marginBottom: 8,
              }}>
                {f.title}
              </h3>
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem',
                color: '#666666', lineHeight: 1.6,
              }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section: How it works (enfocado en el cliente) ────────────────────────────

const CLIENT_STEPS = [
  {
    n: '01',
    title: 'Comparte tu link',
    desc: 'Envía tu link personalizado por WhatsApp, Instagram o ponlo en tu bio. Tus clientes acceden desde cualquier celular, sin instalar nada.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    ),
  },
  {
    n: '02',
    title: 'El cliente elige y agenda',
    desc: 'Seleccionan servicio, estilista, fecha y hora en segundos. Sin llamadas ni mensajes de ida y vuelta. Simple, rápido, 24/7.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <path d="m9 16 2 2 4-4"/>
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Recibes la cita en WhatsApp',
    desc: 'Te notificamos al instante con todos los detalles. El cliente recibe confirmación automática. Tú solo apareces y trabajas.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
]

function HowItWorks() {
  const [ref, visible] = useScrollReveal()

  return (
    <section ref={ref} style={{ padding: '80px 5vw' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem',
          color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 12, textAlign: 'center',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          Así de simple
        </p>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          color: '#F5F5F5', textAlign: 'center',
          marginBottom: 56, letterSpacing: '-0.02em',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
        }}>
          En 3 pasos, listo
        </h2>

        <div className="landing-steps-grid">
          {CLIENT_STEPS.map((s, i) => (
            <div
              key={s.n}
              style={{
                textAlign: 'center', position: 'relative',
                background: '#111111',
                borderRadius: 20, padding: '40px 28px',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(30px)',
                transition: `opacity 0.6s ease ${(i + 2) * 120}ms, transform 0.6s ease ${(i + 2) * 120}ms`,
                animation: visible ? `stepGlow 9s ease-in-out infinite ${i * 3}s` : 'none',
              }}
            >
              <p style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '4.5rem', lineHeight: 1, color: '#0D3320',
                marginBottom: 16, userSelect: 'none',
              }}>
                {s.n}
              </p>

              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'rgba(61,255,168,0.07)',
                border: '1px solid rgba(61,255,168,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                color: 'var(--accent)',
              }}>
                {s.icon}
              </div>

              <h3 style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '1.1rem', color: '#F5F5F5', marginBottom: 12,
              }}>
                {s.title}
              </h3>
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem',
                color: '#666666', lineHeight: 1.65, maxWidth: 260, margin: '0 auto',
              }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section: Testimonials ─────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: 'Antes perdía citas porque no podía atender el teléfono mientras trabajaba. Ahora mis clientes agendan solos y yo recibo el WhatsApp.',
    name: 'Carlos Mendoza',
    biz: 'Barber House · Bogotá',
    stars: 5,
  },
  {
    quote: 'Aumenté mis reservas un 35% en el primer mes. Mis clientes aman poder agendar a las 11 de la noche sin molestar a nadie.',
    name: 'María López',
    biz: 'Estética Bella · Medellín',
    stars: 5,
  },
  {
    quote: 'El dashboard me muestra cuánto gané, qué servicio es el más popular y quién trabaja más. Para un dueño de negocio, eso no tiene precio.',
    name: 'Andrés Ruiz',
    biz: "King's Cut · Cali",
    stars: 5,
  },
]

function Testimonials() {
  const [ref, visible] = useScrollReveal()

  return (
    <section ref={ref} style={{ padding: '80px 5vw', background: '#0D0D0D' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          color: '#F5F5F5', textAlign: 'center',
          marginBottom: 56, letterSpacing: '-0.02em',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          Lo que dicen nuestros clientes
        </h2>

        <div className="landing-testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              style={{
                background: '#111111', border: '1px solid #1E1E1E',
                borderRadius: 16, padding: '28px 24px',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(30px)',
                transition: `opacity 0.6s ease ${(i + 1) * 100}ms, transform 0.6s ease ${(i + 1) * 100}ms`,
              }}
            >
              <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} size={14} fill="#F59E0B" color="#F59E0B" />
                ))}
              </div>
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem',
                color: '#CCCCCC', lineHeight: 1.7, marginBottom: 20,
              }}>
                "{t.quote}"
              </p>
              <div>
                <p style={{
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                  fontSize: '0.85rem', color: '#F5F5F5',
                }}>
                  {t.name}
                </p>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem', color: '#555555' }}>
                  {t.biz}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section: Pricing ──────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Básico',
    price: '$89.000',
    desc: 'Perfecto para empezar',
    highlight: false,
    features: [
      '1 estilista',
      'Hasta 60 citas / mes',
      'WhatsApp automático',
      'Reportes básicos',
      'Soporte por chat',
    ],
  },
  {
    name: 'Pro',
    price: '$159.000',
    desc: 'El favorito de los negocios en crecimiento',
    highlight: true,
    badge: 'Más popular',
    features: [
      'Hasta 5 estilistas',
      'Citas ilimitadas',
      'WhatsApp automático',
      'Reportes avanzados',
      'Soporte prioritario',
    ],
  },
  {
    name: 'Negocio',
    price: '$299.000',
    desc: 'Para cadenas y múltiples sedes',
    highlight: false,
    features: [
      'Estilistas ilimitados',
      'Múltiples sedes',
      'WhatsApp automático',
      'Reportes avanzados',
      'Gerente de cuenta',
    ],
  },
]

function Pricing() {
  const navigate = useNavigate()
  const [ref, visible] = useScrollReveal()

  return (
    <section ref={ref} style={{ padding: '80px 5vw' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem',
          color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 12, textAlign: 'center',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          Planes y precios
        </p>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          color: '#F5F5F5', textAlign: 'center',
          marginBottom: 12, letterSpacing: '-0.02em',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
        }}>
          Invierte menos que un café al día
        </h2>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem',
          color: '#555555', textAlign: 'center', marginBottom: 56,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s',
        }}>
          14 días gratis, sin tarjeta de crédito
        </p>

        <div className="landing-pricing-grid">
          {PLANS.map((p, i) => (
            <div
              key={p.name}
              style={{
                background: p.highlight ? 'linear-gradient(145deg, #0F1F14, #111111)' : '#111111',
                border: `1px solid ${p.highlight ? '#00FF88' : '#1E1E1E'}`,
                borderRadius: 16, padding: '32px 28px',
                position: 'relative',
                boxShadow: p.highlight ? '0 0 60px rgba(61,255,168,0.1)' : 'none',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(30px)',
                transition: `opacity 0.6s ease ${(i + 2) * 100}ms, transform 0.6s ease ${(i + 2) * 100}ms`,
              }}
            >
              {p.badge && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--accent)', color: '#0A0A0A',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', fontWeight: 700,
                  padding: '4px 14px', borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}>
                  {p.badge}
                </div>
              )}

              <p style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '1rem', color: p.highlight ? '#00FF88' : '#F5F5F5',
                marginBottom: 4,
              }}>
                {p.name}
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', color: '#555555', marginBottom: 20 }}>
                {p.desc}
              </p>

              <div style={{ marginBottom: 28 }}>
                <span style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 800,
                  fontSize: '2.2rem', color: '#F5F5F5',
                }}>
                  {p.price}
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: '#555555' }}>
                  {' '}/mes
                </span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 28 }}>
                {p.features.map(f => (
                  <li key={f} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem',
                    color: '#CCCCCC', marginBottom: 10,
                  }}>
                    <CheckCircle size={15} color="var(--accent)" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate('/turno-demo')}
                style={{
                  width: '100%',
                  background: p.highlight ? '#00FF88' : 'transparent',
                  border: `1px solid ${p.highlight ? '#00FF88' : '#333333'}`,
                  color: p.highlight ? '#0A0A0A' : '#F5F5F5',
                  padding: '12px', borderRadius: 10,
                  fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem',
                  fontWeight: p.highlight ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  if (p.highlight) {
                    e.currentTarget.style.transform = 'scale(1.03)'
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(61,255,168,0.4)'
                  } else {
                    e.currentTarget.style.borderColor = '#00FF88'
                    e.currentTarget.style.color = '#00FF88'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                  if (!p.highlight) {
                    e.currentTarget.style.borderColor = '#333333'
                    e.currentTarget.style.color = '#F5F5F5'
                  }
                }}
              >
                Empezar gratis
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section: CTA band ─────────────────────────────────────────────────────────

function CTABand() {
  const navigate = useNavigate()
  const [ref, visible] = useScrollReveal()

  return (
    <section ref={ref} style={{
      padding: '80px 5vw',
      background: 'linear-gradient(135deg, rgba(61,255,168,0.06) 0%, transparent 60%)',
      borderTop: '1px solid #1A1A1A',
      borderBottom: '1px solid #1A1A1A',
      textAlign: 'center',
    }}>
      <div style={{
        maxWidth: 640, margin: '0 auto',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#111111', border: '1px solid #1E1E1E',
          borderRadius: 999, padding: '6px 16px', marginBottom: 24,
        }}>
          <Clock size={13} color="var(--accent)" />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', color: '#888888' }}>
            Setup en menos de 10 minutos
          </span>
        </div>

        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          color: '#F5F5F5', letterSpacing: '-0.02em',
          marginBottom: 16,
        }}>
          Tu negocio merece
          {' '}<span style={{
            background: 'linear-gradient(135deg, #00FF88 0%, #00D4AA 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            crecer sin límites
          </span>
        </h2>

        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '1rem',
          color: '#666666', lineHeight: 1.6, marginBottom: 36,
        }}>
          Únete a cientos de barberías y estéticas que ya digitalizaron sus citas.
          14 días gratis, sin tarjeta, sin compromisos.
        </p>

        <button
          onClick={() => navigate('/turno-demo')}
          style={{
            background: 'var(--accent)', border: 'none',
            color: '#0A0A0A', padding: '16px 40px',
            borderRadius: 12, fontFamily: 'DM Sans, sans-serif',
            fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 10,
            transition: 'all 0.2s ease',
            boxShadow: '0 0 50px rgba(61,255,168,0.25)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.03) translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 50px rgba(61,255,168,0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)'
            e.currentTarget.style.boxShadow = '0 0 50px rgba(61,255,168,0.25)'
          }}
        >
          Probar gratis 14 días <ArrowRight size={18} />
        </button>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  const navigate = useNavigate()

  return (
    <footer style={{
      padding: '40px 5vw',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 16,
      borderTop: '1px solid #1A1A1A',
    }}>
      <span style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800,
        fontSize: '1.1rem', color: 'var(--accent)',
      }}>
        TURNO
      </span>

      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', color: '#444444' }}>
        © 2025 Turno. Hecho con cariño en Colombia.
      </p>

      <div style={{ display: 'flex', gap: 24 }}>
        {[
          { label: 'Demo',      action: () => navigate('/turno-demo') },
          { label: 'Dashboard', action: () => navigate('/login') },
        ].map(l => (
          <button
            key={l.label}
            onClick={l.action}
            style={{
              background: 'none', border: 'none',
              fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem',
              color: '#555555', cursor: 'pointer',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => { e.target.style.color = '#F5F5F5' }}
            onMouseLeave={e => { e.target.style.color = '#555555' }}
          >
            {l.label}
          </button>
        ))}
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh' }}>
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <CTABand />
      <Footer />
    </div>
  )
}

