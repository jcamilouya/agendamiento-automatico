# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**TURNO** — SaaS de agendamiento para estéticas y barberías colombianas.
Stack: React 19 + Vite 8 + Tailwind CSS v4 + Supabase + React Router v7 + Recharts + Lucide React.

## Commands

```bash
npm run dev      # Servidor de desarrollo → http://localhost:5173 (o 5174 si el puerto está ocupado)
npm run build    # Build de producción (verifica errores de compilación)
npm run lint     # ESLint
npm run preview  # Preview del build de producción
```

Siempre correr `npm run build` antes de reportar una tarea como terminada.

```bash
# Re-deploy Edge Function (requiere SUPABASE_ACCESS_TOKEN en entorno)
SUPABASE_ACCESS_TOKEN=<pat> npx supabase@latest functions deploy send-whatsapp \
  --project-ref teawwzyeybsgpbaezzsh --use-api --no-verify-jwt
```

## Architecture

### Routing
`App.jsx` usa React Router v7 (`BrowserRouter`). Rutas activas:
- `/` → `BookingPage` (flujo de cliente, público)
- `/login` → `LoginPage` (auth del dueño)
- `/dashboard` → `DashboardPage` (protegida por `ProtectedRoute`)

`ProtectedRoute` (definido en `App.jsx`) usa `useAuth()` — redirige a `/login` si no hay sesión.

### Auth
`src/hooks/useAuth.js` — hook único para toda la auth. Expone `{ session, loading, signOut }`.
- `session` inicia como `undefined` (cargando), luego `null` (sin auth) o el objeto de sesión
- Usa `supabase.auth.getSession()` + `onAuthStateChange()`
- El dueño se autentica con email/password (`supabase.auth.signInWithPassword`)
- Usuario demo: `admin@turno.co` / `Turno2024!`

### Supabase
Cliente único en `src/lib/supabase.js`. Credenciales en `.env.local` (nunca comitear).

Tablas: `businesses`, `stylists`, `services`, `availability`, `appointments`, `time_blocks`.
- RLS habilitado en todas las tablas
- Lectura pública sin auth para el flujo de booking (`/`)
- `appointments`: INSERT público (clientes agendan sin login), UPDATE requiere `auth.role() = 'authenticated'`
- El dashboard carga el negocio por `slug = 'turno-demo'` (hardcoded en `DashboardPage`)

### Tailwind v4
Configurado con el plugin de Vite (`@tailwindcss/vite`) — **no hay `tailwind.config.js`**.
El theme y las variables CSS están en `src/index.css` dentro de `@theme {}`.
**Todo CSS de layout responsive va en `src/index.css`, nunca inline en componentes.**

### Flujo de agendamiento — `BookingPage`
`BookingPage` orquesta 5 pasos con estado local. Componentes en `src/components/booking/`:
```
BookingPage (estado global + queries Supabase)
  ├── PasoServicio     → selección de servicio
  ├── PasoEstilista    → selección de estilista
  ├── PasoFechaHora    → calendario + slots disponibles
  ├── PasoFormulario   → nombre + WhatsApp del cliente
  └── PasoConfirmacion → resumen; dispara sendWhatsApp() al confirmar
```
La lógica de slots está en `PasoFechaHora` — cruza `availability`, `appointments` y `time_blocks`.

### Dashboard del dueño — `DashboardPage`
`DashboardPage` es el orquestador: carga todos los datos y los pasa como props. **No hacer queries Supabase dentro de los componentes hijos del dashboard** (excepción: `EstilistasPanel` y `ServiciosPanel` que manejan su propio CRUD y solo reciben `businessId`).

```
DashboardPage (estado global + queries + section routing)
  ├── DashSidebar    → nav lateral fija, muestra activeSection
  ├── DashHeader     → saludo dinámico + campana de pendientes (sticky)
  ├── KPICard ×4     → métricas animadas con stagger
  └── [según activeSection]
      ├── 'inicio'      → AgendaHoy + SemanaResumen
      ├── 'citas'       → CitasPanel (tabla filtrable, rango de fechas)
      ├── 'estilistas'  → EstilistasPanel (CRUD propio, grid de cards)
      ├── 'servicios'   → ServiciosPanel (CRUD propio, tabla)
      └── 'reportes'    → GraficosPanel (Recharts)
```

**Carga de datos en `DashboardPage`:**
1. Primero carga `businesses` (necesita `business_id` para el resto)
2. Luego 4 queries en `Promise.all`: citas de hoy (con joins), citas de la semana, próximas 5 citas, estilistas activos
3. `buildWeekData(weekAppts)` agrupa citas de la semana por día para los gráficos
4. `loadAllCitas(filters)` — `useCallback(deps:[negocio])` pasado como prop `onLoad` a `CitasPanel`

**`handleStatusChange`:** actualiza optimistamente `todayAppts` y `allCitas` con el mismo `patch` fn tras el UPDATE en Supabase.

**Patrón de filtros en `CitasPanel`:** estado de filtros vive en `CitasPanel`; cuando cambia llama `onLoad(filters)` → `DashboardPage` ejecuta la query. Tabla scrolleable horizontalmente (`overflow-x: auto`, `min-width: 720px`). Acciones por fila en hover via `.citas-row-actions`.

**Modales en EstilistasPanel/ServiciosPanel:** backdrop oscuro `.dash-modal-overlay`; se cierra al hacer clic en el backdrop (`e.target === e.currentTarget`). Toggle activo/inactivo reemplaza el borrado permanente.

### WhatsApp — `src/lib/whatsapp.js`
- `msgConfirmacion(data)` / `msgRecordatorio(data)` — templates en español listos para WhatsApp
- `normalizePhone(raw)` — normaliza a E.164 colombiano (`+57XXXXXXXXXX`)
- `whatsAppLink(phone, msg)` — genera `wa.me/57…?text=…` (funciona siempre, sin Twilio)
- `sendWhatsApp(phone, msg)` — llama la Edge Function `send-whatsapp`; falla silenciosamente si no está configurada

**Flujo automático:** `BookingPage.confirmarCita()` llama `sendWhatsApp()` como fire-and-forget tras el INSERT.
**Flujo manual:** botón "Recordar" (verde `#25D366`) en `CitaItem` y `CitasPanel.CitaRow` abre `wa.me` en nueva pestaña.

Edge Function deployada en `supabase/functions/send-whatsapp/index.ts` (Deno). Secrets ya configurados en el proyecto Supabase: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` (`whatsapp:+14155238886` — sandbox; cambiar al pasar a producción).

### Gráficos (Recharts)
`GraficosPanel.jsx` usa `BarChart`, `Bar`, `Cell`, `ResponsiveContainer`, `XAxis`, `YAxis`, `Tooltip`.
- Tooltip siempre con `contentStyle` dark (`#1A1A1A`, border `#2A2A2A`)
- Barras del día actual resaltadas en mint (`#3DFFA8`), ingresos en ámbar (`#F59E0B`)
- Barras horizontales de estado usan CSS puro con `transition: width 0.9s`

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
En el **booking flow** (`/`), los estilos de inputs/botones van inline (el flujo no usa clases del dashboard).
En el **dashboard**, usar las clases CSS reutilizables:

```css
.btn-mint          /* botón primario verde, reemplaza <button style="background:#3DFFA8"> */
.dash-input        /* input/textarea con :focus mint, reemplaza el patrón onFocus/onBlur */
.dash-modal-overlay + .dash-modal  /* modal centrado con backdrop */
.dash-skeleton     /* shimmer de carga */
.status-badge.{pending|confirmed|completed|cancelled}
```

Card base (igual en ambos contextos):
```jsx
<div style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: 12, padding: 24 }}>
```

### Otras reglas
- Fondo siempre oscuro, nunca blanco
- Border radius: `12px` cards, `8px` inputs/botones, `999px` pills
- Iconos: **Lucide React únicamente**
- Animaciones: `0.2s ease` estándar; `fadeInUp` para entradas con stagger via `animationDelay` inline
- Spinner: `border: 2px solid transparent; border-top-color: X; animation: spin 0.7s linear infinite`

### CSS del dashboard (`src/index.css`)
Clases de layout:
- `.dash-layout` — grid `240px 1fr`, `height:100vh; overflow:hidden`
- `.dash-main` — `height:100vh; overflow-y:auto` ← hace que el header sticky funcione
- `.dash-header` — `position:sticky; top:0` dentro del scroll de `.dash-main`
- `.kpi-grid` — `repeat(4, 1fr)`; 2×2 en tablet, igual en móvil

Clases de tablas/grids:
- `.citas-grid-row` — 7 cols: `100px 75px 1fr 150px 130px 110px auto`
- `.servicios-table-row` — 6 cols: `1fr 120px 80px 100px 90px auto`
- `.estilistas-grid` — 3 cols desktop / 2 tablet / 1 móvil
- `.citas-row-actions` / `.servicios-row-actions` — `opacity:0`, `1` en hover del row padre

**Breakpoints:**
- `< 768px`: sidebar → bottom nav 60px, todo apilado
- `768–1100px`: sidebar 200px, KPIs 2×2
- `> 1400px`: columna `SemanaResumen` más ancha

## Fases del proyecto

| Fase | Estado | Descripción |
|------|--------|-------------|
| 0 | ✅ | Setup React + Vite + Tailwind + Supabase |
| 1 | ✅ | Flujo de agendamiento del cliente (5 pasos) |
| 2 | ✅ | Dashboard del dueño (agenda hoy, citas completo, gráficos, CRUD estilistas y servicios) |
| 3 | ✅ | WhatsApp automático con Twilio (Edge Function deployada) |
| 4 | ✅ | Métricas y reportes avanzados |
| 5 | ✅ | Demo + landing page para venta SaaS |

## Supabase — DB setup y políticas RLS

```bash
# En Supabase SQL Editor, correr en orden:
# 1. supabase/schema.sql  → crea las 6 tablas + RLS + políticas base
# 2. supabase/seed.sql    → datos demo (negocio "turno-demo", servicios, estilistas)
```

Políticas adicionales requeridas para el dashboard:
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
