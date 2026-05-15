// Supabase Edge Function — notifica al primero en lista de espera cuando se libera un cupo
// Llamada desde CitasPanel al cancelar una cita
// Body esperado: { businessId, stylistId, date, startTime, serviceName }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function formatFecha(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

function formatHora(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('57') && digits.length >= 12) return `+${digits}`
  if (digits.length === 10) return `+57${digits}`
  return `+${digits}`
}

async function sendTwilio(to: string, message: string) {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from  = Deno.env.get('TWILIO_WHATSAPP_FROM')
  if (!sid || !token || !from) return false

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
      },
      body: new URLSearchParams({ From: from, To: `whatsapp:${to}`, Body: message }),
    }
  )
  return res.ok
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const { businessId, stylistId, date, startTime, serviceName, shopSlug } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db          = createClient(supabaseUrl, serviceKey)

    // Busca el primero en lista de espera para este negocio + día
    const { data: entry } = await db
      .from('waitlist')
      .select('id, client_name, client_phone')
      .eq('business_id', businessId)
      .eq('preferred_date', date)
      .eq('status', 'waiting')
      .order('created_at')
      .limit(1)
      .maybeSingle()

    if (!entry) return json({ ok: true, notified: false, reason: 'No hay nadie en lista de espera' })

    const nombre  = entry.client_name.split(' ')[0]
    const link    = shopSlug ? `agendamiento-five.vercel.app/${shopSlug}` : 'tu página de citas'
    const mensaje = [
      `¡Hola ${nombre}! 🎉`,
      ``,
      `Se liberó un cupo en ${serviceName}:`,
      `📅 ${formatFecha(date)} a las ${formatHora(startTime)}`,
      ``,
      `¿Lo tomas? Tienes 15 minutos para agendar antes de que se ofrezca al siguiente 🕐`,
      ``,
      `👉 ${link}`,
    ].join('\n')

    const phone = normalizePhone(entry.client_phone)
    const sent  = await sendTwilio(phone, mensaje)

    if (sent) {
      await db.from('waitlist').update({ status: 'offered', notified_at: new Date().toISOString() }).eq('id', entry.id)
    }

    return json({ ok: true, notified: sent, phone })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
