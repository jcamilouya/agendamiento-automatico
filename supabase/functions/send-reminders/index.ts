// Supabase Edge Function — recordatorios automáticos 24h antes de la cita
// Cron sugerido: 0 15 * * * (10am Colombia = 15:00 UTC)
// Secrets requeridos: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
// También requiere: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (disponibles automáticamente)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function formatFechaLinda(dateStr: string) {
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

function msgRecordatorio({ clientName, negocioName, fecha, hora, servicio, estilista }: {
  clientName: string; negocioName: string; fecha: string;
  hora: string; servicio: string; estilista: string
}) {
  const nombre = clientName.split(' ')[0]
  return [
    `Hola ${nombre} 👋`,
    ``,
    `Te recordamos tu cita mañana en *${negocioName}*:`,
    ``,
    `📅 ${formatFechaLinda(fecha)}`,
    `🕐 ${formatHora(hora)}`,
    `✂️ ${servicio} con ${estilista}`,
    ``,
    `¿Todo bien? Si necesitas cancelar o cambiar la hora, solo dinos 🙌`,
  ].join('\n')
}

async function sendTwilioWhatsApp(to: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from       = Deno.env.get('TWILIO_WHATSAPP_FROM')

  if (!accountSid || !authToken || !from) {
    console.warn('[Reminders] Twilio no configurado, omitiendo envío')
    return false
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const body = new URLSearchParams({
    From: from,
    To:   `whatsapp:${to}`,
    Body: message,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
    },
    body,
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('[Reminders] Error Twilio:', data.message, data.code)
    return false
  }

  console.log('[Reminders] Enviado SID:', data.sid)
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase    = createClient(supabaseUrl, serviceKey)

    // Citas de mañana que no han recibido recordatorio
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: citas, error } = await supabase
      .from('appointments')
      .select(`
        id, client_name, client_phone, date, start_time,
        businesses(name),
        stylists(name),
        services(name)
      `)
      .eq('date', tomorrowStr)
      .eq('reminder_sent', false)
      .in('status', ['pending', 'confirmed'])

    if (error) throw error

    if (!citas || citas.length === 0) {
      return json({ ok: true, sent: 0, message: 'Sin recordatorios para mañana' })
    }

    let sent = 0
    const ids: string[] = []

    for (const cita of citas) {
      const phone = normalizePhone(cita.client_phone)
      const mensaje = msgRecordatorio({
        clientName:  cita.client_name,
        negocioName: (cita.businesses as any)?.name ?? 'el negocio',
        fecha:       cita.date,
        hora:        cita.start_time,
        servicio:    (cita.services as any)?.name ?? 'el servicio',
        estilista:   (cita.stylists as any)?.name ?? 'el estilista',
      })

      const ok = await sendTwilioWhatsApp(phone, mensaje)
      if (ok) {
        sent++
        ids.push(cita.id)
      }
    }

    // Marcar como enviados
    if (ids.length > 0) {
      await supabase
        .from('appointments')
        .update({ reminder_sent: true })
        .in('id', ids)
    }

    return json({ ok: true, sent, total: citas.length })
  } catch (err) {
    console.error('[Reminders] Error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
