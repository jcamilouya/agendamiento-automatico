# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**TURNO** — SaaS de agendamiento para estéticas y barberías colombianas.
Stack: React 19 + Vite 8 + Tailwind CSS v4 + Supabase + React Router v7 + Recharts + Lucide React.

Desplegado en producción: `https://agendamiento-five.vercel.app`

## Commands

```bash
npm run dev      # Servidor de desarrollo → http://localhost:5173 (puertos siguientes si está ocupado)
npm run build    # Build de producción — correr siempre antes de reportar una tarea como terminada
npm run lint     # ESLint
npm run preview  # Preview del build de producción
```

```bash
# Re-deploy a Vercel (env vars ya configuradas en el proyecto)
npx vercel --prod --yes

# Re-deploy Edge Function de WhatsApp (requiere SUPABASE_ACCESS_TOKEN)
SUPABASE_ACCESS_TOKEN=<pat> npx supabase@latest functions deploy send-whatsapp \
  --project-ref teawwzyeybsgpbaezzsh --use-api --no-verify-jwt
```

## Architecture

### Routing
`App.jsx` usa React Router v7 (`BrowserRouter`). Rutas activas:
- `/`         → `LandingPage` (página de ventas SaaS, pública)
- `/demo`     → `BookingPage` (flujo de agendamiento del cliente, público)
- `/login`    → `LoginPage` (auth del dueño)
- `/dashboard`→ `DashboardPage` (protegida por `ProtectedRoute`)

`ProtectedRoute` (en `App.jsx`) usa `useAuth()` — redirige a `/login` si no hay sesión.

### Auth
`src/hooks/useAuth.js` — expone `{ session, loading, signOut }`.
- `session` inicia como `undefined` (cargando), luego `null` (sin auth) o el objeto de sesión
- El dueño se autentica con email/password. Usuario demo: `admin@turno.co` / `Turno2024!`

### Supabase
Cliente único en `src/lib/supabase.js`. Credenciales en `.env.local` (gitignoreado) y en variables de entorno de Vercel.

Tablas: `businesses`, `stylists`, `services`, `availability`, `appointments`, `time_blocks`.
- RLS habilitado en todas las tablas; lectura pública para el flujo de booking
- `appointments`: INSERT público, UPDATE requiere `auth.role() = 'authenticated'`
- El dashboard carga el negocio por `slug = 'turno-demo'` (hardcoded en `DashboardPage`)

### Tailwind v4
Configurado con el plugin de Vite (`@tailwindcss/vite`) — **no hay `tailwind.config.js`**.
Theme y variables CSS en `src/index.css` dentro de `@theme {}`.
**Todo CSS de layout responsive va en `src/index.css`, nunca inline en componentes.**

### Landing page — `LandingPage.jsx`
Página de ventas en `/`. Secciones: Nav sticky (frosted-glass al scroll) → Hero → Features → How it works → Testimonials → Pricing → CTA band → Footer. Todos los CTAs de "Ver demo" apuntan a `/demo`; "Iniciar sesión" apunta a `/login`. CSS de grids de la landing en `src/index.css` (clases `.landing-*`).

### Flujo de agendamiento — `BookingPage`
Orquesta 5 pasos con estado local. Componentes en `src/components/booking/`:
```
BookingPage (estado + queries Supabase)
  ├── PasoServicio     → selección de servicio
  ├── PasoEstilista    → selección de estilista
  ├── PasoFechaHora    → calendario + slots disponibles
  ├── PasoFormulario   → nombre + WhatsApp del cliente
  └── PasoConfirmacion → resumen; dispara sendWhatsApp() al confirmar
```
La lógica de slots está en `PasoFechaHora` — cruza `availability`, `appointments` y `time_blocks`.

### Dashboard — `DashboardPage`
`DashboardPage` es el orquestador principal. **No hacer queries Supabase en los hijos del dashboard**, excepto los paneles marcados como autónomos:

| Componente | Datos | Patrón |
|---|---|---|
| `AgendaHoy`, `SemanaResumen`, `KPICard` | reciben props | orquestado por DashboardPage |
| `CitasPanel` | recibe `citas[]` + callback `onLoad` | DashboardPage ejecuta la query |
| `EstilistasPanel` | recibe solo `businessId` | autónomo — CRUD + stats propios |
| `ServiciosPanel` | recibe solo `businessId` | autónomo — CRUD propio |
| `GraficosPanel` | recibe solo `businessId` | autónomo — sus propias queries por período |

**Carga en `DashboardPage`:**
1. Carga `businesses` por slug
2. `Promise.all` de 4 queries: citas hoy (con joins), citas semana, próximas 5 citas, estilistas activos
3. `buildWeekData(weekAppts)` → array de 7 días para los KPI cards
4. `loadAllCitas(filters)` como `useCallback` pasado a `CitasPanel`

**`handleStatusChange`:** actualiza optimistamente `todayAppts` y `allCitas` con un `patch` fn tras el UPDATE en Supabase.

### Notificaciones — `useNotifications` + `DashHeader`
`src/hooks/useNotifications.js` — suscripción Supabase Realtime a INSERT en `appointments` (filtro por `business_id`). Cuando llega una cita nueva:
1. Hace follow-up query para obtener nombre de servicio y estilista
2. Llama `playChime()` — chime de dos notas E5→A5 generado con Web Audio API (sin archivos externos)
3. Agrega la notificación al estado; expone `{ notifications, unreadCount, markAllRead, markRead, dismissToast }`

`DashHeader` consume el hook con `negocio?.id` como `businessId`. Implementa:
- **Toasts** — slide-in desde la derecha, auto-dismiss en 5s, posición `fixed top-20 right-20`
- **Dropdown** — se abre al clic en la campana; backdrop transparent cierra al clic exterior; lista scrolleable con punto mint/gris por estado de lectura
- **Campana** — animación `bellPulse` cuando `unreadCount` sube; badge verde (notifs no leídas) o ámbar (pendientes del día si no hay notifs)

Los helpers de formato (`formatDateShort`, `formatHM`, `relativeTime`) están exportados desde el hook para reutilización.

### Reportes — `GraficosPanel`
Panel autónomo (recibe solo `businessId`). Selector de período: Esta semana / Últimos 30 días / Últimos 90 días. La query trae `date, start_time, status, client_phone, stylists(name), services(name, price)`.

Datos derivados del array raw en el cliente:
- `buildKPIs` → ingresos, ticket promedio, total citas, tasa cancelación
- `buildTrend` → 7 días (sem) / 30 puntos diarios (mes) / 13 semanas S1–S13 (trimestre)
- `buildServiciosData` → top 6 servicios por citas
- `buildStylistsData` → estilistas por citas + ingresos
- `buildHorasPico` → distribución horaria 8am–7pm
- `buildEstadoData` → desglose por status del período
- `buildRetencion` → clientes únicos por teléfono, nuevos vs recurrentes

### Estadísticas de equipo — `EstilistasPanel`
`load()` carga en `Promise.all`: lista de estilistas + citas de últimos 30 días del negocio (con `services(price)`). Construye un `statsMap: { [stylistId]: { total, completed, ingresos, cancelled } }` en el cliente. Cada `StylistCard` muestra: citas / ingresos / % completadas + barra visual verde-roja.

### WhatsApp — `src/lib/whatsapp.js`
- `sendWhatsApp(phone, msg)` — llama la Edge Function `send-whatsapp`; falla silenciosamente si no está configurada
- `whatsAppLink(phone, msg)` — genera `wa.me/57…?text=…` (siempre funciona, sin Twilio)
- `normalizePhone(raw)` — normaliza a E.164 colombiano (`+57XXXXXXXXXX`)

Edge Function en `supabase/functions/send-whatsapp/index.ts` (Deno). Secrets en proyecto Supabase: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`.

### Despliegue
Vercel — `vercel.json` con `rewrites` catch-all para SPA routing. Variables de entorno configuradas en el proyecto Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Las credenciales de Twilio **no** van en Vercel (son solo para la Edge Function de Supabase).

## Design System — Reglas irrompibles

### Colores
```
Fondo:        #0A0A0A   (negro profundo)
Surface/cards:#111111
Bordes:       #1E1E1E
Mint acento:  #3DFFA8   ← color principal de marca
Mint oscuro:  #1A5C3A   (hover/bg de badges)
Texto:        #F5F5F5
Texto gris:   #888888
Error:        #FF4D4D
Ámbar:        #F59E0B   (pendientes, ingresos)
WhatsApp:     #25D366   (solo para botones "Recordar")
```

### Tipografía
- Títulos/display: `Syne` (font-weight 700–800)
- Cuerpo: `DM Sans` (font-weight 400–600)
- **Nunca** usar Inter, Roboto, Arial ni fuentes del sistema

### Componentes base
En el **booking flow** y **landing** los estilos van inline (no usan clases del dashboard).
En el **dashboard** usar las clases reutilizables:

```css
.btn-mint          /* botón primario verde */
.dash-input        /* input/textarea con :focus mint */
.dash-modal-overlay + .dash-modal  /* modal centrado con backdrop */
.dash-skeleton     /* shimmer de carga */
.status-badge.{pending|confirmed|completed|cancelled}
```

Card base: `background:#111111; border:1px solid #1E1E1E; borderRadius:12px; padding:24px`

### Otras reglas
- Fondo siempre oscuro, nunca blanco
- Border radius: `12px` cards, `8px` inputs/botones, `999px` pills
- Iconos: **Lucide React únicamente**
- Animaciones: `0.2s ease` estándar; `fadeInUp` para entradas con `animationDelay` inline
- Spinner: `border:2px solid transparent; border-top-color:X; animation:spin 0.7s linear infinite`

### CSS del dashboard (`src/index.css`)
Layout:
- `.dash-layout` — grid `240px 1fr`, `height:100vh; overflow:hidden`
- `.dash-main` — `height:100vh; overflow-y:auto` ← hace que el header sticky funcione
- `.dash-header` — `position:sticky; top:0` dentro del scroll de `.dash-main`
- `.kpi-grid` — `repeat(4,1fr)`; 2×2 en tablet y móvil
- `.report-kpi-grid` — `repeat(4,1fr)`; 2×2 en tablet y móvil (dentro de GraficosPanel)

Tablas/grids:
- `.citas-grid-row` — 7 cols: `100px 75px 1fr 150px 130px 110px auto`
- `.servicios-table-row` — 6 cols: `1fr 120px 80px 100px 90px auto`
- `.estilistas-grid` — 3 cols desktop / 2 tablet / 1 móvil
- `.graficos-grid` — 2 cols, 1 en tablet y móvil
- `.citas-row-actions` / `.servicios-row-actions` — `opacity:0`, `1` en hover del row padre

Landing:
- `.landing-features-grid` — 4 cols / 2 tablet / 1 móvil
- `.landing-steps-grid` — 3 cols / 1 tablet y móvil
- `.landing-testimonials-grid` — 3 cols / 1 tablet y móvil
- `.landing-pricing-grid` — 3 cols / 1 tablet y móvil

Keyframes disponibles: `fadeInUp`, `slideInLeft`, `shimmer`, `spin`, `pulse-dot`, `toastIn`, `toastOut`, `bellPulse`

**Breakpoints:** `<768px` sidebar→bottom nav / `768–1100px` sidebar 200px / `>1400px` columna SemanaResumen más ancha

## Fases del proyecto

| Fase | Estado | Descripción |
|------|--------|-------------|
| 0 | ✅ | Setup React + Vite + Tailwind + Supabase |
| 1 | ✅ | Flujo de agendamiento del cliente (5 pasos) |
| 2 | ✅ | Dashboard del dueño (agenda hoy, citas, gráficos, CRUD estilistas y servicios) |
| 3 | ✅ | WhatsApp automático con Twilio (Edge Function deployada) |
| 4 | ✅ | Métricas y reportes avanzados (selector período, 6 gráficas, retención) |
| 5 | ✅ | Landing page SaaS + despliegue en Vercel |

## Supabase — DB setup y RLS

```bash
# Correr en orden en Supabase SQL Editor:
# 1. supabase/schema.sql  → tablas + RLS + políticas base
# 2. supabase/seed.sql    → datos demo (negocio "turno-demo", servicios, estilistas)
```

Políticas adicionales requeridas:
```sql
create policy "owner update appointments"
  on appointments for update using (auth.role() = 'authenticated');

create policy "owner manage stylists"
  on stylists for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "owner manage services"
  on services for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
```

Para que las notificaciones en tiempo real funcionen, la tabla `appointments` necesita estar en la publicación de Realtime de Supabase (Dashboard → Database → Replication → supabase_realtime publication → agregar `appointments`).
