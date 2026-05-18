// Supabase Edge Function — envío de WhatsApp vía Twilio
// Secrets requeridos en Supabase Dashboard > Settings > Edge Functions:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
//   (TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886" para sandbox)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ALLOWED_ORIGINS = new Set([
  'https://agendamiento-five.vercel.app',
  'http://localhost:5173',
])

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://agendamiento-five.vercel.app'
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

// Rate limit: máximo 5 mensajes por minuto por IP
const rateLimit = new Map<string, number[]>()
function checkRate(ip: string) {
  const now = Date.now()
  const window = 60_000
  const max = 5
  const hits = (rateLimit.get(ip) || []).filter(t => now - t < window)
  if (hits.length >= max) return false
  hits.push(now)
  rateLimit.set(ip, hits)
  return true
}

// Solo números colombianos válidos: +57 seguido de 10 dígitos
function isValidColombianPhone(to: string): boolean {
  return /^\+57\d{10}$/.test(to)
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const CORS_HEADERS = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRate(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limit excedido' }), {
        status: 429,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { to, message } = await req.json()

    if (!to || !message) {
      return json({ error: 'Faltan parámetros: to, message' }, 400, CORS_HEADERS)
    }

    if (!isValidColombianPhone(to)) {
      return json({ error: 'Solo se aceptan números colombianos (+57XXXXXXXXXX)' }, 400, CORS_HEADERS)
    }

    if (typeof message !== 'string' || message.length > 1600) {
      return json({ error: 'Mensaje inválido' }, 400, CORS_HEADERS)
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')
    const from       = Deno.env.get('TWILIO_WHATSAPP_FROM')

    if (!accountSid || !authToken || !from) {
      return json({ error: 'Twilio no configurado' }, 503, CORS_HEADERS)
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const body = new URLSearchParams({
      From: from,
      To:   `whatsapp:${to}`,
      Body: message,
    })

    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
      body,
    })

    const data = await res.json()

    if (!res.ok) {
      return json({ error: data.message ?? 'Error Twilio', code: data.code }, 400, CORS_HEADERS)
    }

    return json({ ok: true, sid: data.sid }, 200, CORS_HEADERS)
  } catch (err) {
    return json({ error: err.message }, 500, CORS_HEADERS)
  }
})

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
