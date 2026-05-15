# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**TURNO** — SaaS de agendamiento multi-negocio para estéticas y barberías colombianas.
Stack: React 19 + Vite 8 + Tailwind CSS v4 + Supabase + React Router v7 + Recharts + Lucide React + vite-plugin-pwa.

Producción: `https://agendamiento-five.vercel.app`
Ref Supabase: `teawwzyeybsgpbaezzsh`

## Commands

```bash
npm run dev      # Dev server → http://localhost:5173
npm run build    # Build de producción — correr siempre antes de reportar una tarea como terminada
npm run lint     # ESLint
npm run preview  # Preview del build
```

```bash
# Deploy a Vercel
npx vercel --prod --yes

# Deploy Edge Functions (requiere SUPABASE_ACCESS_TOKEN)
SUPABASE_ACCESS_TOKEN=<pat> npx supabase@latest functions deploy send-whatsapp \
  --project-ref teawwzyeybsgpbaezzsh --use-api --no-verify-jwt

SUPABASE_ACCESS_TOKEN=<pat> npx supabase@latest functions deploy send-reminders \
  --project-ref teawwzyeybsgpbaezzsh --use-api --no-verify-jwt

SUPABASE_ACCESS_TOKEN=<pat> npx supabase@latest functions deploy send-waitlist-notify \
  --project-ref teawwzyeybsgpbaezzsh --use-api --no-verify-jwt
```

## Architecture

### Routing
`App.jsx` — React Router v7 (`BrowserRouter`). Rutas activas:
- `/`           → `LandingPage` (página de ventas SaaS, pública)
- `/register`   → `RegisterPage` (wizard 4 pasos para nuevos negocios)
- `/login`      → `LoginPage`
- `/dashboard`  → `DashboardPage` (protegida por `ProtectedRoute`)
- `/404`        → `NotFoundPage`
- `/:shopSlug`  → `BookingPage` (booking público por slug del negocio)
- `*`           → redirect a `/404`

`ProtectedRoute` usa `useAuth()` — muestra spinner mientras `loading`, redirige a `/login` si no hay sesión.

### Multi-tenancy
Cada negocio tiene un `slug` único. El flujo:
1. Cliente visita `/:shopSlug` → `BookingPage` carga el negocio con `.eq('slug', shopSlug).eq('is_active', true)`. Si no existe, navega a `/404`.
2. Se aplica `document.documentElement.style.setProperty('--accent', negocio.accent_color)` y `document.title`.
3. El dashboard carga primero por `owner_id = auth.uid()`. Si no encuentra (usuario demo), cae al slug `'turno-demo'`.

El negocio demo (`turno-demo`) no tiene `owner_id` — así sigue siendo accesible para el usuario demo `admin@turno.co / Turno2024!`.

### Auth
`src/hooks/useAuth.js` — expone `{ session, loading, signOut }`. `session` inicia como `undefined` (loading), luego `null` o el objeto sesión.

### Supabase
Cliente único en `src/lib/supabase.js`. Credenciales en `.env.local` (gitignoreado) y en Vercel env vars.

**Tablas:**
- `businesses` — negocio; columnas clave: `slug`, `owner_id`, `is_active`, `accent_color`, `business_type`, `phone`
- `stylists`, `services`, `availability`, `time_blocks` — datos del negocio
- `appointments` — INSERT público, UPDATE requiere auth
- `clients` — historial agrupado por `(business_id, phone)`; se auto-popula vía trigger en INSERT de appointments
- `waitlist` — lista de espera; INSERT público desde booking flow

**Migraciones aplicadas:**
- `supabase/schema.sql` — tablas base + RLS
- `supabase/seed.sql` — datos demo
- `supabase/migrations/add_business_columns.sql` — columnas multi-tenancy en `businesses`
- `supabase/migrations/add_clients_waitlist.sql` — tablas `clients` y `waitlist` + trigger `sync_client_from_appointment`

**Edge Functions** (`supabase/functions/`, runtime Deno):
- `send-whatsapp` — envía mensaje vía Twilio; secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- `send-reminders` — recordatorios 24h antes; invocar vía cron `0 15 * * *` (10am Colombia)
- `send-waitlist-notify` — notifica al primero en lista de espera cuando se libera un slot

### Onboarding — `RegisterPage`
Wizard 4 pasos:
1. Grid de 5 tipos de negocio (config en `src/config/businessTypes.js`)
2. Nombre, slug (con preview `turno.co/[slug]` y validación unique en tiempo real), ciudad, WhatsApp
3. Email + contraseña
4. Pantalla de éxito con link de booking

Flujo: `supabase.auth.signUp()` → INSERT en `businesses` → redirect `/dashboard`.

`src/config/businessTypes.js` exporta `BUSINESS_TYPES` (objeto) y `BUSINESS_TYPE_LIST` (array). Cada tipo tiene `accentColor`, `staffLabel`, `defaultServices`, etc.

### Tailwind v4
**No hay `tailwind.config.js`**. Plugin de Vite (`@tailwindcss/vite`). Variables CSS en `src/index.css` dentro de `@theme {}`. Todo CSS responsive va en `src/index.css`, nunca inline en componentes.

### PWA
`vite-plugin-pwa` en `vite.config.js` — estrategia `generateSW`, `registerType: 'autoUpdate'`. Genera `dist/sw.js` y `dist/workbox-*.js`. Iconos en `public/icons/` (SVG 192×192 y 512×512). Manifest en `public/manifest.json` y también inline en `vite.config.js`.

### Flujo de agendamiento — `BookingPage`
Orquesta 5 pasos; todos los queries Supabase están en `BookingPage`, los hijos solo reciben props:
```
BookingPage (estado + queries + negocio cargado por useParams)
  ├── PasoServicio     → selección de servicio
  ├── PasoEstilista    → "El primero disponible" (llama onSeleccionar(estilistas[0])) + lista
  ├── PasoFechaHora    → calendario + slots; si slot ocupado muestra botón "Lista de espera"
  ├── PasoFormulario   → nombre + WhatsApp
  └── PasoConfirmacion → resumen; confirmarCita() inserta appointment + envía WhatsApp al cliente y al dueño
```

`PasoFechaHora` cruza `availability`, `appointments` y `time_blocks` para generar slots. Domingos muestran tooltip "Cerrado" controlado por `hoveredDayIdx` state. Slots marcados con promos: mañana (9–10am, ámbar) y mediodía (12–13h, morado).

### Dashboard — `DashboardPage`
Orquestador principal. Regla: **no hacer queries Supabase en hijos del dashboard**, excepto los autónomos:

| Componente | Patrón |
|---|---|
| `AgendaHoy`, `SemanaResumen`, `KPICard` | reciben props de DashboardPage |
| `CitasPanel` | recibe `citas[]` + callback `onLoad` |
| `EstilistasPanel`, `ServiciosPanel`, `GraficosPanel`, `ClientesPanel` | autónomos — reciben solo `businessId` |
| `AjustesPanel` | recibe `accentColor`, `widgetOrder` + callbacks |

Carga: negocio por `owner_id` (o slug demo) → `Promise.all` de 4 queries → `buildWeekData()`. `handleStatusChange` actualiza `todayAppts` y `allCitas` optimistamente.

`AjustesPanel` — toggle dark/light (clase `theme-light` en `document.documentElement`), selector de acento (5 presets + input custom), widgets arrastrables con HTML5 DnD. Todo persiste en `localStorage`.

`ClientesPanel` — tabla de clientes con visitas e ingresos. Click abre drawer lateral glass con notas privadas (guardadas en `clients.notes`) e historial de citas.

### Notificaciones — `useNotifications` + `DashHeader`
`src/hooks/useNotifications.js` — Supabase Realtime en `appointments` filtrado por `business_id`. Por cada INSERT: follow-up query para nombre de servicio/estilista, chime E5→A5 (Web Audio API, sin archivos), expone `{ notifications, unreadCount, markAllRead, markRead, dismissToast }`.

`DashHeader` renderiza toasts (auto-dismiss 5s, animación `toastIn/toastOut`) y dropdown. `bellPulse` cuando sube `unreadCount`. Helpers `formatDateShort`, `formatHM`, `relativeTime` exportados desde el hook.

### WhatsApp — `src/lib/whatsapp.js`
- `sendWhatsApp(phone, msg)` — fire-and-forget vía Edge Function; falla silenciosamente.
- `msgConfirmacion` / `msgNuevaCita` / `msgRecordatorio` — templates. `msgNuevaCita` va al dueño (con emoji 🔔).
- `normalizePhone(raw)` — normaliza a E.164 colombiano (`+57XXXXXXXXXX`).

### Despliegue
Vercel — `vercel.json` con rewrite catch-all para SPA. Env vars en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Credenciales Twilio solo en Supabase Secrets (no en Vercel).

## Design System — Reglas irrompibles

### Colores
```
Fondo:        #050505   (negro profundo — bg base)
Surface/cards:#111111
Bordes:       #1E1E1E
Mint acento:  #00FF88   ← color principal de marca (var --accent, sobreescribible por negocio)
Mint dim:     #0D3320   (hover/bg de badges)
Texto:        #F5F5F5
Texto gris:   #888888
Error:        #FF4D4D
Ámbar:        #F59E0B   (pendientes, ingresos)
WhatsApp:     #25D366   (solo botones "Recordar")
```

Variables CSS disponibles (en `:root`):
```css
--accent              /* color de acento del negocio, default #00FF88 */
--accent-dim          /* fondo de badges mint */
--accent-glow         /* box-shadow verde suave */
--glass-bg            /* rgba(255,255,255,0.04) */
--glass-border        /* rgba(255,255,255,0.08) */
--glass-shadow        /* sombra de cards glass */
--glass-blur          /* blur(20px) */
```

### Tipografía
- Títulos/display: `Syne` (700–800)
- Cuerpo: `DM Sans` (400–600)
- Nunca Inter, Roboto, Arial ni fuentes del sistema.

### Estilos por contexto
**Landing** — 100% inline styles.
**Booking flow** — inline + clases en `src/index.css`:
```
.turno-container   .servicios-grid   .servicio-card
.paso-animado      .slots-grid       .slot-btn
```

**Dashboard** — clases reutilizables:
```
.btn-mint          .dash-input       .dash-modal-overlay + .dash-modal
.dash-skeleton     .status-badge.{pending|confirmed|completed|cancelled}
```

Card base: `background:#111111; border:1px solid #1E1E1E; borderRadius:12px; padding:24px`

### CSS del dashboard (`src/index.css`)
- `.dash-layout` — grid `240px 1fr`, `height:100vh; overflow:hidden`
- `.dash-main` — `height:100vh; overflow-y:auto` ← hace que el header sticky funcione
- `.kpi-grid` — `repeat(4,1fr)`; 2×2 en tablet/móvil
- `.citas-grid-row` — 7 cols: `100px 75px 1fr 150px 130px 110px auto`
- `.estilistas-grid` — 3 cols / 2 tablet / 1 móvil

Keyframes: `fadeInUp`, `slideInLeft`, `shimmer`, `spin`, `pulse-dot`, `toastIn`, `toastOut`, `bellPulse`, `float`, `fadeSlideIn`, `stepGlow`, `cursorBlink`

**Breakpoints:** `<768px` sidebar→bottom nav / `768–1100px` sidebar 200px / `>1400px` SemanaResumen más ancha

### Otras reglas
- Fondo siempre oscuro; nunca blanco.
- Border radius: `12px` cards, `8px` inputs/botones, `999px` pills.
- Iconos: Lucide React únicamente.
- Scroll reveal: patrón `useScrollReveal` + `opacity/transform transition` (no keyframe `fadeInUp` en secciones de scroll).
- Spinner: `border:2px solid transparent; border-top-color:X; animation:spin 0.7s linear infinite`
- Hover botones verdes: `scale(1.03) translateY(-2px)` + `box-shadow` verde intensificado.
- Cards glass: `backdrop-filter:blur(20px); background:var(--glass-bg); border:1px solid var(--glass-border)`
