# TURNOTT

**Plataforma SaaS de agendamiento multi-negocio para estéticas, barberías y tatuajes en Colombia.**

🌐 **Producción:** [www.turnott.com](https://www.turnott.com)

---

## ¿Qué hace?

TURNOTT permite que un negocio (barbería, estética, tatuajes, salón de uñas, spa) tenga su propia página de reservas online, dashboard con KPIs en tiempo real, automatizaciones por WhatsApp y herramientas de fidelización.

### Para el cliente final
- Reserva sin instalar nada en `turnott.com/<nombre-del-negocio>`
- Recibe confirmación, recordatorio y link de cancelación por WhatsApp
- Puede cancelar/confirmar respondiendo `cancelar` o `confirmar` al chat

### Para el dueño del negocio
- Dashboard con citas de hoy, semana, ingresos en tiempo real
- Agenda visual por barbero/estilista
- CRUD de servicios, estilistas, horarios y promociones
- Panel de clientes con historial, notas y reactivación por WhatsApp
- Programa de fidelización ("10ma cita gratis") automático
- Reporte semanal por WhatsApp cada lunes a las 8am
- Notificaciones push en el navegador cuando llega una cita nueva

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 8 + Tailwind CSS v4 |
| Routing | React Router v7 |
| Backend | Supabase (Postgres + Auth + Realtime + Edge Functions) |
| Gráficos | Recharts |
| Iconos | Lucide React |
| PWA | vite-plugin-pwa (offline + instalable) |
| Mensajería | Meta WhatsApp Cloud API v21.0 |
| Deploy frontend | Vercel |
| Cron jobs | pg_cron (Supabase) + cron-job.org |

---

## Estructura del proyecto

```
src/
├── pages/                # Rutas principales (Landing, Login, Register, Booking, Dashboard, Admin, Cancel)
├── components/
│   ├── booking/          # Flujo público de reserva (5 pasos)
│   ├── dashboard/        # Panel del dueño del negocio
│   └── TimePicker.jsx    # Selector de hora custom (reemplaza input nativo)
├── hooks/                # useAuth, useNotifications, useScrollReveal
├── lib/                  # supabase, whatsapp, format, promos
└── config/               # admin (super-admin), businessTypes

supabase/
├── functions/            # Edge Functions Deno
│   ├── whatsapp-send/        # Envío de mensajes
│   ├── whatsapp-webhook/     # Recepción Meta (chatbot)
│   ├── send-reminders/       # Recordatorios 1h antes
│   ├── send-waitlist-notify/ # Lista de espera al cancelar
│   └── weekly-report/        # Reporte semanal al dueño
└── migrations/           # SQL schema y RLS policies
```

---

## Setup local (desarrollo)

### Requisitos
- Node.js 20+
- Cuenta de Supabase (proyecto creado)
- Cuenta de Meta for Developers con WhatsApp Business activado

### Pasos

1. **Clonar el repo:**
   ```bash
   git clone https://github.com/jcamilouya/agendamiento-automatico.git
   cd agendamiento-automatico
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Variables de entorno** — crear `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://<tu-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<tu-anon-key>
   ```

4. **Migraciones** — en Supabase Dashboard → SQL Editor ejecutar en este orden:
   - `supabase/schema.sql`
   - `supabase/seed.sql` (opcional, datos demo)
   - Cada archivo de `supabase/migrations/*.sql`

5. **Secrets de Edge Functions** — en Supabase Dashboard → Edge Functions → Secrets:
   ```
   WHATSAPP_TOKEN=<bearer-token-de-meta>
   WHATSAPP_PHONE_NUMBER_ID=<id-del-numero>
   WEBHOOK_VERIFY_TOKEN=<token-arbitrario-tuyo>
   ```

6. **Correr en local:**
   ```bash
   npm run dev      # http://localhost:5173
   ```

---

## Comandos disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción (correr antes de cada deploy)
npm run lint     # ESLint
npm run preview  # Preview del build local
```

### Deploy del frontend (Vercel)
```bash
npx vercel --prod --yes
```

### Deploy de Edge Functions (Supabase)
```bash
# Requiere SUPABASE_ACCESS_TOKEN (Personal Access Token, empieza con sbp_)
# Generarlo en https://app.supabase.com/account/tokens

$env:SUPABASE_ACCESS_TOKEN="<tu-pat>"
npx supabase@latest functions deploy whatsapp-send    --project-ref <tu-ref> --use-api --no-verify-jwt
npx supabase@latest functions deploy whatsapp-webhook --project-ref <tu-ref> --use-api --no-verify-jwt
npx supabase@latest functions deploy send-reminders   --project-ref <tu-ref> --use-api --no-verify-jwt
npx supabase@latest functions deploy weekly-report    --project-ref <tu-ref> --use-api --no-verify-jwt
```

---

## Configuración de WhatsApp (Meta)

1. **Crear app en Meta:** https://developers.facebook.com/apps
2. Agregar producto **WhatsApp** → conseguir `WHATSAPP_TOKEN` y `PHONE_NUMBER_ID`
3. **Configurar webhook:**
   - URL: `https://<tu-ref>.supabase.co/functions/v1/whatsapp-webhook`
   - Verify token: el valor de `WEBHOOK_VERIFY_TOKEN` de tus secrets
   - Suscribirse al campo `messages`
4. **Crear plantillas** (Meta Business Manager → WhatsApp → Plantillas):
   - `cita_confirmada` (Utility, Spanish)
   - `recordatorio_cita` (Utility, Spanish)
   - `cita_cancelada` (Utility, Spanish)
5. Esperar aprobación de Meta (5 min – 24h)

---

## Cron jobs automáticos

| Job | Función | Schedule | Configurado en |
|---|---|---|---|
| Recordatorios horarios | `send-reminders` | `0 * * * *` | Supabase `pg_cron` |
| Reporte semanal | `weekly-report` | `0 8 * * 1` (lunes 8am) | cron-job.org |

---

## Modelo de datos (resumen)

```
businesses         → cada negocio (slug, nombre, plan, loyalty config)
  ├─ stylists      → barberos/estilistas
  ├─ services      → servicios ofrecidos (con precio y duración)
  ├─ availability  → horarios de apertura por día
  ├─ time_blocks   → bloqueos puntuales (vacaciones, descansos)
  ├─ promotions    → descuentos por rango horario
  ├─ appointments  → citas (status: pending|confirmed|completed|cancelled)
  ├─ clients       → historial de clientes (auto-poblado por trigger)
  └─ waitlist      → lista de espera cuando no hay slot
```

Toda la seguridad se aplica con **Row Level Security (RLS)**: cada dueño solo ve sus datos. La página de booking pública es la única excepción y solo permite leer datos del negocio activo + insertar citas.

---

## Roadmap

- [x] Booking público multi-negocio
- [x] Dashboard con KPIs y agenda visual
- [x] WhatsApp automático (confirmación, recordatorios, cancelación)
- [x] Programa de fidelización configurable
- [x] Reporte semanal automático
- [x] PWA instalable
- [ ] Plantillas de WhatsApp aprobadas en Meta (en proceso)
- [ ] Verificación HMAC del webhook (X-Hub-Signature-256)
- [ ] Recordatorio de retoque a los 15 días sin visita
- [ ] Sistema de pagos online (Wompi / MercadoPago)

---

## Créditos

Diseñado y construido por **Juan Camilo Uya** ([@jcamilouya](mailto:jcamilouya@gmail.com)).

Asistencia de desarrollo con **Claude Code** (Anthropic).

---

## Licencia

Código propietario. No redistribuir sin autorización.
