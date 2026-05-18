# TURNO — Prompt Maestro para Claude Code
> Pega este archivo completo al inicio de tu sesión en Claude Code. Contiene todas las mejoras priorizadas, el sistema de onboarding multi-negocio, fix de notificaciones, UI liquid glass 3D y el flujo de activación de cuenta.

---

## CONTEXTO DEL PROYECTO

**App:** TURNO — SaaS de agendamiento online para barberías, salones de belleza, spas, nail studios y estéticas en Colombia y LATAM.  
**Stack actual:** React 19 + Vite + Tailwind CSS v4 + Supabase + React Router v7 + Recharts + Lucide React  
**Deploy:** Vercel  
**URL actual:** https://agendamiento-five.vercel.app  
**Repo:** https://github.com/jcamilouya/agendamiento-automatico  

**Filosofía de diseño que queremos:** UI estilo liquid glass — fondos con blur, capas translúcidas, bordes suaves con brillo, profundidad 3D real, animaciones fluidas. Referencia visual: macOS Sequoia + iOS 18 glass morphism + dashboard 3D moderno. Dark theme base con negro profundo `#050505` y verde eléctrico `#00FF88` como acento principal.

---

## FASE 0 — FIX CRÍTICO: NOTIFICACIONES WHATSAPP (hacer primero)

Las notificaciones no están llegando. Diagnostica y repara el sistema completo.

### Tarea 0.1 — Diagnóstico
```
1. Revisa el archivo de la función que envía WhatsApp (probablemente en /api/ o /supabase/functions/)
2. Verifica que TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_WHATSAPP_FROM estén en .env y en Vercel env vars
3. Agrega console.log en cada paso del flujo de notificación para identificar dónde falla
4. Revisa los logs de Vercel Functions para ver el error exacto
```

### Tarea 0.2 — Reparar flujo de notificaciones
Asegúrate de que al confirmar una cita (POST /api/bookings o equivalente) se ejecute:

```javascript
// NOTIFICACIÓN AL CLIENTE
await sendWhatsApp({
  to: `whatsapp:+57${booking.client_phone}`,
  body: `✅ *Cita confirmada en ${shop.name}*\n\n` +
        `📅 ${formatDate(booking.date)} a las ${booking.time}\n` +
        `✂️ ${booking.service} con ${booking.barber_name}\n` +
        `📍 ${shop.address}\n\n` +
        `_Para cancelar responde CANCELAR_`
});

// NOTIFICACIÓN AL BARBERO
await sendWhatsApp({
  to: `whatsapp:+57${shop.whatsapp_number}`,
  body: `🔔 *Nueva cita agendada*\n\n` +
        `👤 ${booking.client_name} - ${booking.client_phone}\n` +
        `📅 ${formatDate(booking.date)} a las ${booking.time}\n` +
        `✂️ ${booking.service}\n` +
        `💰 $${booking.price.toLocaleString('es-CO')}`
});
```

### Tarea 0.3 — Recordatorio automático 24h (Supabase Edge Function)
```sql
-- Crear en Supabase: Edge Function "send-reminders"
-- Cron: 0 15 * * * (10am Colombia = 15:00 UTC)
-- Lógica:
SELECT b.*, s.name as service_name, br.name as barber_name, 
       sh.name as shop_name, sh.whatsapp_number,
       c.phone as client_phone, c.name as client_name
FROM bookings b
JOIN services s ON b.service_id = s.id  
JOIN barbers br ON b.barber_id = br.id
JOIN barbershops sh ON b.barbershop_id = sh.id
JOIN clients c ON b.client_phone = c.phone
WHERE b.date = CURRENT_DATE + INTERVAL '1 day'
  AND b.reminder_sent = false
  AND b.status = 'confirmed'
```

### Tarea 0.4 — Mensaje de recordatorio
```
*⏰ Recordatorio de cita*

Hola [nombre], te recordamos tu cita mañana:

📅 [fecha] a las [hora]
✂️ [servicio] con [barbero]  
📍 [dirección de la barbería]

¿Todo bien? Si necesitas cancelar responde CANCELAR
```

---

## FASE 1 — SISTEMA DE ONBOARDING MULTI-NEGOCIO

Esta es la arquitectura central del SaaS. Cuando un barbero/dueño se registra, obtiene su propia barbería configurada y activa en minutos.

### Tarea 1.1 — Tipos de negocio y personalización por categoría

Crea el sistema de categorías. Cada tipo de negocio tiene su propia identidad visual y vocabulario:

```typescript
// types/business.ts
export const BUSINESS_TYPES = {
  barbershop: {
    id: 'barbershop',
    name: 'Barbería',
    emoji: '✂️',
    accentColor: '#00FF88',
    gradientFrom: '#050505',
    gradientTo: '#0A1A0F',
    staffLabel: 'Barbero',
    staffLabelPlural: 'Barberos',
    bookingTitle: '¿Qué te hacemos hoy?',
    stepLabels: ['Servicio', 'Barbero', 'Fecha y hora', 'Tus datos'],
    defaultServices: [
      { name: 'Corte de cabello', duration: 30, price: 25000, category: 'CORTES' },
      { name: 'Corte + barba', duration: 45, price: 35000, category: 'COMBOS' },
      { name: 'Afeitado clásico', duration: 30, price: 20000, category: 'BARBA' },
    ]
  },
  beauty_salon: {
    id: 'beauty_salon', 
    name: 'Salón de Belleza',
    emoji: '💇‍♀️',
    accentColor: '#FF6B9D',
    gradientFrom: '#0D050A',
    gradientTo: '#1A0812',
    staffLabel: 'Estilista',
    staffLabelPlural: 'Estilistas',
    bookingTitle: '¿Qué servicio deseas hoy?',
    stepLabels: ['Servicio', 'Estilista', 'Fecha y hora', 'Tus datos'],
    defaultServices: [
      { name: 'Corte de cabello', duration: 45, price: 35000, category: 'CORTES' },
      { name: 'Tintura', duration: 120, price: 80000, category: 'COLOR' },
      { name: 'Keratina', duration: 150, price: 120000, category: 'TRATAMIENTOS' },
    ]
  },
  nail_studio: {
    id: 'nail_studio',
    name: 'Nail Studio / Uñas',
    emoji: '💅',
    accentColor: '#C084FC',
    gradientFrom: '#0A0510',
    gradientTo: '#120820',
    staffLabel: 'Nail Artist',
    staffLabelPlural: 'Nail Artists',
    bookingTitle: '¿Qué diseño te ponemos hoy?',
    stepLabels: ['Servicio', 'Artista', 'Fecha y hora', 'Tus datos'],
    defaultServices: [
      { name: 'Semipermanente', duration: 60, price: 45000, category: 'SEMIPERMANENTE' },
      { name: 'Acrílicas', duration: 90, price: 70000, category: 'ACRÍLICAS' },
      { name: 'Manicure clásico', duration: 45, price: 25000, category: 'CLÁSICO' },
    ]
  },
  spa: {
    id: 'spa',
    name: 'Spa / Estética',
    emoji: '🧖‍♀️',
    accentColor: '#34D399',
    gradientFrom: '#020A07',
    gradientTo: '#051410',
    staffLabel: 'Especialista',
    staffLabelPlural: 'Especialistas',
    bookingTitle: '¿Qué tratamiento deseas?',
    stepLabels: ['Tratamiento', 'Especialista', 'Fecha y hora', 'Tus datos'],
    defaultServices: [
      { name: 'Masaje relajante 60min', duration: 60, price: 90000, category: 'MASAJES' },
      { name: 'Limpieza facial', duration: 75, price: 75000, category: 'FACIAL' },
      { name: 'Depilación completa', duration: 60, price: 85000, category: 'DEPILACIÓN' },
    ]
  },
  tattoo: {
    id: 'tattoo',
    name: 'Tatuajes / Piercing',
    emoji: '🎨',
    accentColor: '#FB923C',
    gradientFrom: '#0A0500',
    gradientTo: '#1A0B00',
    staffLabel: 'Artista',
    staffLabelPlural: 'Artistas',
    bookingTitle: '¿Qué sesión agendamos?',
    stepLabels: ['Tipo', 'Artista', 'Fecha y hora', 'Tus datos'],
    defaultServices: [
      { name: 'Consultoría + diseño', duration: 60, price: 50000, category: 'DISEÑO' },
      { name: 'Tatuaje pequeño', duration: 120, price: 150000, category: 'TATUAJES' },
      { name: 'Piercing', duration: 30, price: 40000, category: 'PIERCING' },
    ]
  }
} as const;
```

### Tarea 1.2 — Flujo de registro y onboarding (4 pasos)

Crea `/register` con un wizard de 4 pasos. Diseño liquid glass, animación de entrada por paso:

**Paso 1 — Tipo de negocio**
```
Pantalla: Grid de 5 tarjetas glass con el emoji grande, nombre del tipo y descripción corta.
Al hacer hover: la tarjeta se eleva con sombra 3D y el color de acento del tipo hace glow.
Al seleccionar: la tarjeta se mantiene seleccionada con borde del color del tipo.
```

**Paso 2 — Datos del negocio**
```
Campos:
- Nombre del negocio (ej: "El Corte Fino")  
- Slug único → se auto-genera desde el nombre pero es editable
  - Preview en tiempo real: turno.co/[slug] (verificar disponibilidad en Supabase)
- Ciudad / barrio
- Dirección
- Número de WhatsApp (con validación formato colombiano)
- Logo (upload opcional, si no sube pone las iniciales con el color del tipo)
```

**Paso 3 — Cuenta de acceso**
```
- Email
- Contraseña (mínimo 8 caracteres)
- Confirmar contraseña
- Checkbox: "Acepto términos y condiciones"
```

**Paso 4 — Activando tu negocio (pantalla de éxito)**
```
Animación: logo/nombre del negocio aparece con efecto de materialización 3D
Muestra:
- "Tu barbería está lista en turno.co/[slug]"
- Botón principal: "Ir a mi dashboard"  
- Botón secundario: "Ver mi página de clientes" (abre /[slug] en nueva pestaña)
- QR code descargable de su link
```

### Tarea 1.3 — Schema Supabase actualizado

```sql
-- Tabla principal de negocios
CREATE TABLE IF NOT EXISTS barbershops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'barbershop', -- barbershop|beauty_salon|nail_studio|spa|tattoo
  description TEXT,
  logo_url TEXT,
  address TEXT,
  city TEXT DEFAULT 'Bogotá',
  whatsapp_number TEXT,
  accent_color TEXT DEFAULT '#00FF88',
  is_active BOOLEAN DEFAULT true,
  subscription_plan TEXT DEFAULT 'trial', -- trial|basic|pro|business
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preferencias del dashboard por usuario
CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark', -- dark|light
  accent_color TEXT DEFAULT '#00FF88',
  widget_order JSONB DEFAULT '["timeline","revenue","stats","upcoming","retention"]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, barbershop_id)
);

-- Clientes por negocio
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT, -- notas privadas del barbero sobre este cliente
  visit_count INTEGER DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barbershop_id, phone)
);

-- Lista de espera
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES barbershops(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  service_id UUID REFERENCES services(id),
  barber_id UUID REFERENCES barbers(id),
  preferred_date DATE,
  preferred_time_from TEXT,
  preferred_time_to TEXT,
  notified_at TIMESTAMPTZ,
  status TEXT DEFAULT 'waiting', -- waiting|offered|booked|expired
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegura RLS (Row Level Security)
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Políticas: cada dueño solo ve SU negocio
CREATE POLICY "Owner sees own shop" ON barbershops
  FOR ALL USING (owner_id = auth.uid());
```

### Tarea 1.4 — Middleware de autenticación y rutas protegidas

```javascript
// En App.jsx / router — estructura de rutas
const routes = [
  // Rutas públicas
  { path: '/', element: <LandingPage /> },
  { path: '/register', element: <RegisterWizard /> },
  { path: '/login', element: <Login /> },
  
  // Booking público por slug (para los clientes del negocio)
  { path: '/:shopSlug', element: <BookingFlow /> },
  { path: '/:shopSlug/booking', element: <BookingFlow /> },
  
  // Dashboard privado (requiere auth)
  { path: '/dashboard', element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardHome /> },
      { path: 'appointments', element: <Appointments /> },
      { path: 'clients', element: <Clients /> },
      { path: 'services', element: <Services /> },
      { path: 'team', element: <Team /> },
      { path: 'settings', element: <Settings /> },
    ]
  },
];

// ProtectedRoute: si no hay sesión → redirige a /login
// Al entrar a /dashboard, lee el barbershop del usuario autenticado
// Inyecta el contexto del negocio (business_type, accent_color, etc.) en toda la app
```

---

## FASE 2 — UI LIQUID GLASS 3D COMPLETA

### Tarea 2.1 — Sistema de tokens de diseño liquid glass

Agrega estas variables CSS en tu archivo de estilos globales:

```css
/* Liquid Glass Design System */
:root {
  --glass-bg: rgba(255, 255, 255, 0.04);
  --glass-bg-hover: rgba(255, 255, 255, 0.07);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-bright: rgba(255, 255, 255, 0.15);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255,255,255,0.05) inset;
  --glass-shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255,255,255,0.08) inset;
  --glass-blur: blur(20px);
  --glass-blur-sm: blur(10px);
  
  --accent: #00FF88;
  --accent-glow: 0 0 20px rgba(0, 255, 136, 0.3), 0 0 60px rgba(0, 255, 136, 0.1);
  --accent-glow-intense: 0 0 30px rgba(0, 255, 136, 0.5), 0 0 80px rgba(0, 255, 136, 0.2);
  
  --surface-1: rgba(255,255,255,0.03);
  --surface-2: rgba(255,255,255,0.06);
  --surface-3: rgba(255,255,255,0.09);
  
  --text-primary: rgba(255,255,255,0.95);
  --text-secondary: rgba(255,255,255,0.6);
  --text-tertiary: rgba(255,255,255,0.35);
  
  --radius-glass: 16px;
  --radius-glass-sm: 10px;
  
  --transition-smooth: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --transition-bounce: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Tarea 2.2 — Componente GlassCard base

```tsx
// components/ui/GlassCard.tsx
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, hover = true, glow = false, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-[16px] 
        bg-white/[0.04] border border-white/[0.08]
        backdrop-blur-[20px]
        shadow-[0_8px_32px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.05)_inset]
        ${hover ? 'transition-all duration-300 hover:bg-white/[0.07] hover:border-white/[0.15] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]' : ''}
        ${glow ? 'shadow-[0_0_30px_rgba(0,255,136,0.15)]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Brillo superior — efecto 3D */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  );
}
```

### Tarea 2.3 — Dashboard 3D completo

Rediseña `DashboardHome.jsx` con esta estructura visual:

#### A) Header del dashboard — identidad del negocio
```
Fondo: gradiente radial del color de acento del tipo de negocio (muy sutil, 5% opacidad)
Contenido:
- Logo del negocio (o iniciales en glass pill) + nombre
- Badge: "Abierto / Cerrado" según horario actual
- Fecha y hora en tiempo real
- Notificación de plan (días de trial restantes si aplica)
```

#### B) Widget de Línea de tiempo del día (el más importante)
```
Visualización: barra horizontal de 8am a 9pm
Cada hora es un slot visual
- Verde brillante + glow: cita confirmada (con nombre del cliente)
- Gris glass: slot libre  
- Rojo suave: no-show / cancelado
- Naranja pulsante: próxima cita en menos de 30 min

Por barbero: si hay múltiples, apilar las barras (una por barbero)
Animación: los slots aparecen con stagger al cargar
```

#### C) KPIs flotantes (grid 2x2 o 4 en fila)
```
Cada KPI es un GlassCard con:
- Número grande animado (cuenta desde 0 al montar)
- Icono con glow del color del acento
- Comparativa vs ayer (+12% en verde, -5% en rojo)

KPIs: Citas hoy | Ingresos hoy | Clientes nuevos este mes | Tasa retención
```

#### D) Widget de próximas citas (siguiente en 3D)
```
La PRÓXIMA cita tiene card grande 3D con:
- Foto/avatar del cliente (iniciales si no tiene)
- Nombre + servicio + hora
- Countdown en tiempo real: "En 23 min"
- Botón: "Ver todas"

Las siguientes 3 citas se apilan detrás en perspectiva 3D (transform: translateZ y scale decreciente)
```

#### E) Ingresos de la semana (Recharts glass)
```
AreaChart con:
- gradientFill desde el accentColor a transparente
- Línea brillante
- Tooltip glass
- Sin ejes visibles, solo la curva flotando
```

### Tarea 2.4 — Animaciones de entrada al dashboard

```tsx
// Usa este patrón para todos los widgets del dashboard
// Cada widget entra con delay progresivo

const widgets = [header, timeline, kpis, nextAppointment, chart];

// CSS animation classes para stagger:
// .animate-in-0 { animation: slideUp 0.5s ease forwards 0ms; }
// .animate-in-1 { animation: slideUp 0.5s ease forwards 100ms; }
// etc.

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## FASE 3 — DASHBOARD PERSONALIZABLE

### Tarea 3.1 — Modo dark/light por negocio
```
- Toggle en header del dashboard (ícono sol/luna con animación de rotación)
- Al cambiar: transición CSS suave de 400ms en todos los colores
- Guardar en Supabase: dashboard_preferences.theme
- Light mode: fondo #F8F9FA, cards blancas con sombra suave, texto oscuro
- El accent_color del tipo de negocio se mantiene en ambos modos
```

### Tarea 3.2 — Selector de color de acento
```
En /dashboard/settings → sección "Personalización"
5 colores predefinidos según el business_type + opción de color custom (input color)
Al cambiar: actualiza CSS custom property --accent en tiempo real
Guardar en Supabase: dashboard_preferences.accent_color
```

### Tarea 3.3 — Widgets arrastrables
```
Implementar con HTML5 Drag & Drop nativo (sin librerías)
Cada widget tiene un drag handle (6 puntos) en esquina superior derecha
Al hacer drag: el widget se eleva con sombra más intensa y opacity 0.8
Al soltar: animación de snap al nuevo lugar
Guardar orden en: dashboard_preferences.widget_order (array de IDs)
```

---

## FASE 4 — FEATURES ANTI NO-SHOW

### Tarea 4.1 — Lista de espera
```
Nueva tabla: waitlist (ya en schema de Fase 1)
En el booking flow: si el horario que quiere el cliente está ocupado → "Unirme a lista de espera"
Cuando se cancela una cita → Edge Function notifica por WhatsApp al primero en lista
Mensaje: "¡Hay un cupo disponible! [fecha] a las [hora] con [barbero]. ¿Lo tomas? Responde SÍ para confirmar (tienes 15 min)"
```

### Tarea 4.2 — Notas por cliente (la ficha del barbero)
```
En /dashboard/clients → al hacer click en un cliente → drawer lateral glass
Contenido:
- Foto/avatar + nombre + teléfono
- Total de visitas + fecha última visita
- Servicio favorito (el más frecuente)
- Campo de notas libre: "Le gusta el fade bajo, máquina 1.5 en lados, no le gusta la espuma"
- Historial de citas
Las notas aparecen en el panel del barbero cuando tiene una cita próxima con ese cliente
```

### Tarea 4.3 — Recordatorio de retorno (re-engagement)
```
Supabase cron semanal (lunes 9am):
- Busca clientes con last_visit_at entre 25 y 35 días atrás
- Envía WhatsApp: "Hola [nombre]! Ya pasó casi un mes desde tu corte con [barbero] en [barbería]. 
  ¿Agendamos el próximo? turno.co/[slug]"
- Marca como notificado para no repetir en 7 días
```

### Tarea 4.4 — Modo walk-in con QR
```
En dashboard: botón "Modo Walk-in"
Abre pantalla grande con QR del link de la barbería
Texto grande: "Escanea para agendar"
El cliente escanea y va directo al booking flow del negocio
Opción del barbero: "Agregar cliente al instante" → formulario rápido de 30seg
```

---

## FASE 5 — MULTI-TENANCY COMPLETO

### Tarea 5.1 — Rutas dinámicas por slug
```javascript
// /:shopSlug → BookingFlow carga la config de esa barbería
// En BookingFlow.jsx:
const { shopSlug } = useParams();

useEffect(() => {
  const loadShop = async () => {
    const { data, error } = await supabase
      .from('barbershops')
      .select('*, services(*), barbers(*)')
      .eq('slug', shopSlug)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      navigate('/404');
      return;
    }
    
    setShop(data);
    // Aplica el tema del negocio
    document.documentElement.style.setProperty('--accent', data.accent_color);
    document.title = `Agendar en ${data.name}`;
  };
  
  loadShop();
}, [shopSlug]);
```

### Tarea 5.2 — 404 personalizado
```
Si el slug no existe: página 404 glass con:
- "Esta barbería no existe o el link ha cambiado"
- Botón: "¿Eres dueño de una barbería? Regístrate gratis"
```

### Tarea 5.3 — Super-admin (solo para ti)
```
Ruta: /super-admin (protegida con SUPER_ADMIN_EMAIL en .env)
Vista de todas las barberías registradas:
- Nombre + slug + business_type + plan + estado (activo/trial/inactivo)
- Total citas este mes por negocio
- Fecha de vencimiento del trial
- Botón para extender trial manualmente
- MRR total de la plataforma
```

---

## FASE 6 — PWA (App instalable)

### Tarea 6.1 — Manifest y Service Worker
```json
// public/manifest.json
{
  "name": "TURNO",
  "short_name": "TURNO",
  "description": "Agendamiento inteligente para tu negocio",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#050505",
  "theme_color": "#050505",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

```javascript
// En vite.config.js usa el plugin vite-plugin-pwa
// Genera los íconos desde el logo de TURNO
// Cache: pages y assets estáticos
// El barbero puede instalar TURNO en su celular como app
```

---

## NOTAS IMPORTANTES PARA CLAUDE CODE

1. **No cambies el stack** — React + Vite + Supabase + Tailwind v4 es el stack correcto. No agregues Next.js ni cambies el bundler.

2. **Variables de entorno necesarias** (verificar que estén en Vercel):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM` (formato: whatsapp:+14155238886)
   - `SUPER_ADMIN_EMAIL`

3. **Orden de implementación recomendado:**
   - FASE 0 (notificaciones) → deploy → prueba que lleguen
   - FASE 1 (onboarding) → es el corazón del SaaS
   - FASE 2 (UI glass) → lo que hace que el cliente diga wow
   - FASE 3 (personalización) → diferenciador vs competencia
   - FASE 4 (anti no-show) → lo que justifica la suscripción mensual
   - FASE 5 (multi-tenancy) → cuando tengas 3+ clientes activos
   - FASE 6 (PWA) → polish final

4. **Para el demo con barberías beta:**
   - Crea un seed script que pueble datos de prueba realistas
   - La barbería demo debe tener: 3 barberos, 6 servicios, 15 citas del mes
   - El dashboard demo debe verse "lleno", no vacío

5. **Liquid glass — no usar librerías externas de animación:**
   - Usa CSS animations y transitions nativas
   - Intersection Observer para scroll animations
   - requestAnimationFrame para contadores
   - CSS `backdrop-filter: blur()` para el efecto glass
   - `transform: perspective(1000px) rotateX() rotateY()` para el 3D

---

*Generado para el proyecto TURNO — SaaS de agendamiento LATAM*
*Stack: React 19 + Vite + Supabase + Tailwind v4*
