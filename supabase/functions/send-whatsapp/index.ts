// Supabase Edge Function — envío de WhatsApp vía Twilio
// Secrets requeridos en Supabase Dashboard > Settings > Edge Functions:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
//   (TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886" para sandbox)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { to, message } = await req.json()

    if (!to || !message) {
      return json({ error: 'Faltan parámetros: to, message' }, 400)
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')
    const from       = Deno.env.get('TWILIO_WHATSAPP_FROM')

    if (!accountSid || !authToken || !from) {
      return json({ error: 'Twilio no configurado' }, 503)
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
      return json({ error: data.message ?? 'Error Twilio', code: data.code }, 400)
    }

    return json({ ok: true, sid: data.sid })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
