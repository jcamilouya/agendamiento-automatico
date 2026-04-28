import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, MessageCircle, BarChart2, Users,
  CheckCircle, ArrowRight, Star, Zap, Clock, Shield,
} from 'lucide-react'

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

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
        fontSize: '1.3rem', color: '#3DFFA8', letterSpacing: '-0.02em',
      }}>
        TURNO
      </span>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'transparent', border: '1px solid #333',
            color: '#888888', padding: '8px 20px',
            borderRadius: 8, fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.85rem', cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.target.style.borderColor = '#3DFFA8'; e.target.style.color = '#F5F5F5' }}
          onMouseLeave={e => { e.target.style.borderColor = '#333'; e.target.style.color = '#888888' }}
        >
          Iniciar sesión
        </button>
        <button
          onClick={() => navigate('/demo')}
          style={{
            background: '#3DFFA8', border: 'none',
            color: '#0A0A0A', padding: '8px 20px',
            borderRadius: 8, fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.target.style.opacity = '0.85' }}
          onMouseLeave={e => { e.target.style.opacity = '1' }}
        >
          Ver demo
        </button>
      </div>
    </nav>
  )
}

// ── Section: Hero ─────────────────────────────────────────────────────────────

function Hero() {
  const navigate = useNavigate()

  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '120px 5vw 80px',
      textAlign: 'center',
      background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(61,255,168,0.08) 0%, transparent 70%)',
    }}>
      {/* Badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: '#111111', border: '1px solid #1E1E1E',
        borderRadius: 999, padding: '6px 16px',
        marginBottom: 32,
        animation: 'fadeInUp 0.5s ease forwards',
      }}>
        <Zap size={13} color="#3DFFA8" />
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', color: '#888888' }}>
          Agendamiento inteligente para Colombia
        </span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 800,
        fontSize: 'clamp(2.6rem, 6vw, 5rem)',
        lineHeight: 1.05, letterSpacing: '-0.03em',
        color: '#F5F5F5', maxWidth: 820, marginBottom: 24,
        animation: 'fadeInUp 0.5s ease 80ms forwards', opacity: 0,
      }}>
        Deja de perder citas{' '}
        <span style={{
          background: 'linear-gradient(135deg, #3DFFA8 0%, #00D4AA 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          por WhatsApp
        </span>
      </h1>

      {/* Sub */}
      <p style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: 'clamp(1rem, 2vw, 1.2rem)',
        color: '#888888', maxWidth: 560, lineHeight: 1.6,
        marginBottom: 40,
        animation: 'fadeInUp 0.5s ease 160ms forwards', opacity: 0,
      }}>
        Turno digitaliza el agendamiento de tu estética o barbería.
        Tus clientes agendan solos, 24/7 — tú recibes la cita directo en WhatsApp.
      </p>

      {/* CTAs */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
        marginBottom: 64,
        animation: 'fadeInUp 0.5s ease 240ms forwards', opacity: 0,
      }}>
        <button
          onClick={() => navigate('/demo')}
          style={{
            background: '#3DFFA8', border: 'none',
            color: '#0A0A0A', padding: '14px 32px',
            borderRadius: 10, fontFamily: 'DM Sans, sans-serif',
            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.2s ease',
            boxShadow: '0 0 40px rgba(61,255,168,0.2)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(61,255,168,0.35)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(61,255,168,0.2)' }}
        >
          Probar demo gratis <ArrowRight size={16} />
        </button>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'transparent', border: '1px solid #2A2A2A',
            color: '#F5F5F5', padding: '14px 32px',
            borderRadius: 10, fontFamily: 'DM Sans, sans-serif',
            fontSize: '1rem', cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#3DFFA8' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A2A' }}
        >
          Ver dashboard
        </button>
      </div>

      {/* Trust stats */}
      <div style={{
        display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center',
        animation: 'fadeInUp 0.5s ease 320ms forwards', opacity: 0,
      }}>
        {[
          { n: '+500', label: 'negocios activos' },
          { n: '98%',  label: 'satisfacción' },
          { n: '30min', label: 'ahorrados al día' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800,
              fontSize: '1.8rem', color: '#F5F5F5', lineHeight: 1,
            }}>
              {s.n}
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', color: '#555555', marginTop: 4 }}>
              {s.label}
            </p>
          </div>
        ))}
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
    color: '#3DFFA8',
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
    color: '#3DFFA8',
  },
]

function Features() {
  return (
    <section style={{ padding: '80px 5vw', background: '#0D0D0D' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem',
          color: '#3DFFA8', letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 12, textAlign: 'center',
        }}>
          Todo lo que necesitas
        </p>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          color: '#F5F5F5', textAlign: 'center',
          marginBottom: 56, letterSpacing: '-0.02em',
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
                transition: 'border-color 0.2s ease',
                animation: `fadeInUp 0.5s ease ${i * 100}ms forwards`,
                opacity: 0,
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

// ── Section: How it works ─────────────────────────────────────────────────────

const STEPS = [
  {
    n: '01',
    title: 'Configura tu negocio',
    desc: 'Agrega tus estilistas, servicios, precios y horarios de atención en minutos.',
  },
  {
    n: '02',
    title: 'Comparte tu link',
    desc: 'Envía el link de agendamiento por WhatsApp, Instagram o ponlo en tu bio.',
  },
  {
    n: '03',
    title: 'Recibe las citas',
    desc: 'Te notificamos por WhatsApp en tiempo real. Tú solo apareces y trabajas.',
  },
]

function HowItWorks() {
  return (
    <section style={{ padding: '80px 5vw' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem',
          color: '#3DFFA8', letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 12, textAlign: 'center',
        }}>
          Así de simple
        </p>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          color: '#F5F5F5', textAlign: 'center',
          marginBottom: 56, letterSpacing: '-0.02em',
        }}>
          En 3 pasos, listo
        </h2>

        <div className="landing-steps-grid">
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                border: '2px solid #1E1E1E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                background: '#111111',
              }}>
                <span style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 800,
                  fontSize: '0.85rem', color: '#3DFFA8',
                }}>
                  {s.n}
                </span>
              </div>
              <h3 style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '1.1rem', color: '#F5F5F5', marginBottom: 10,
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
  return (
    <section style={{ padding: '80px 5vw', background: '#0D0D0D' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          color: '#F5F5F5', textAlign: 'center',
          marginBottom: 56, letterSpacing: '-0.02em',
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
                animation: `fadeInUp 0.5s ease ${i * 100}ms forwards`, opacity: 0,
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
    price: '$79.000',
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
    price: '$139.000',
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
    price: '$229.000',
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

  return (
    <section style={{ padding: '80px 5vw' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem',
          color: '#3DFFA8', letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 12, textAlign: 'center',
        }}>
          Planes y precios
        </p>
        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
          color: '#F5F5F5', textAlign: 'center',
          marginBottom: 12, letterSpacing: '-0.02em',
        }}>
          Invierte menos que un café al día
        </h2>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem',
          color: '#555555', textAlign: 'center', marginBottom: 56,
        }}>
          14 días gratis, sin tarjeta de crédito
        </p>

        <div className="landing-pricing-grid">
          {PLANS.map((p, i) => (
            <div
              key={p.name}
              style={{
                background: p.highlight ? 'linear-gradient(145deg, #0F1F14, #111111)' : '#111111',
                border: `1px solid ${p.highlight ? '#3DFFA8' : '#1E1E1E'}`,
                borderRadius: 16, padding: '32px 28px',
                position: 'relative',
                boxShadow: p.highlight ? '0 0 60px rgba(61,255,168,0.1)' : 'none',
                animation: `fadeInUp 0.5s ease ${i * 100}ms forwards`, opacity: 0,
              }}
            >
              {p.badge && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#3DFFA8', color: '#0A0A0A',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '0.72rem', fontWeight: 700,
                  padding: '4px 14px', borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}>
                  {p.badge}
                </div>
              )}

              <p style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '1rem', color: p.highlight ? '#3DFFA8' : '#F5F5F5',
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
                    <CheckCircle size={15} color="#3DFFA8" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate('/demo')}
                style={{
                  width: '100%',
                  background: p.highlight ? '#3DFFA8' : 'transparent',
                  border: `1px solid ${p.highlight ? '#3DFFA8' : '#333333'}`,
                  color: p.highlight ? '#0A0A0A' : '#F5F5F5',
                  padding: '12px', borderRadius: 10,
                  fontFamily: 'DM Sans, sans-serif', fontSize: '0.88rem',
                  fontWeight: p.highlight ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  if (!p.highlight) {
                    e.currentTarget.style.borderColor = '#3DFFA8'
                    e.currentTarget.style.color = '#3DFFA8'
                  } else {
                    e.currentTarget.style.opacity = '0.85'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '1'
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

  return (
    <section style={{
      padding: '80px 5vw',
      background: 'linear-gradient(135deg, rgba(61,255,168,0.06) 0%, transparent 60%)',
      borderTop: '1px solid #1A1A1A',
      borderBottom: '1px solid #1A1A1A',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#111111', border: '1px solid #1E1E1E',
          borderRadius: 999, padding: '6px 16px', marginBottom: 24,
        }}>
          <Clock size={13} color="#3DFFA8" />
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
            background: 'linear-gradient(135deg, #3DFFA8 0%, #00D4AA 100%)',
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
          onClick={() => navigate('/demo')}
          style={{
            background: '#3DFFA8', border: 'none',
            color: '#0A0A0A', padding: '16px 40px',
            borderRadius: 12, fontFamily: 'DM Sans, sans-serif',
            fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 10,
            transition: 'all 0.2s ease',
            boxShadow: '0 0 50px rgba(61,255,168,0.25)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 50px rgba(61,255,168,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(61,255,168,0.25)' }}
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
        fontSize: '1.1rem', color: '#3DFFA8',
      }}>
        TURNO
      </span>

      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', color: '#444444' }}>
        © 2025 Turno. Hecho con cariño en Colombia.
      </p>

      <div style={{ display: 'flex', gap: 24 }}>
        {[
          { label: 'Demo',     action: () => navigate('/demo') },
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
