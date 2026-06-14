import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN')!;
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!;

async function sendText(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''),
      type: 'text',
      text: { body: text }
    }),
  });
}

Deno.serve(async () => {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const today = now.toISOString().split('T')[0];
    const nowTime = now.toTimeString().slice(0, 5);
    const laterTime = oneHourLater.toTimeString().slice(0, 5);

    const { data: citas } = await supabase
      .from('appointments')
      .select('*, businesses(name, slug, business_type), services(name), stylists(name)')
      .eq('date', today)
      .gte('start_time', nowTime)
      .lte('start_time', laterTime)
      .in('status', ['pending', 'confirmed'])
      .eq('reminder_sent', false);

    if (!citas?.length) return new Response(JSON.stringify({ sent: 0 }));

    let sent = 0;
    for (const cita of citas) {
      const biz = cita.businesses as any;
      const isAgency = biz?.business_type === 'marketing_agency';
      const stylistName = (cita.stylists as any)?.name;
      // Las agencias no muestran "con {staff}"; el resto solo si hay nombre.
      const conQuien = isAgency || !stylistName ? '' : ` con ${stylistName}`;
      const nombre = String(cita.client_name ?? '').split(' ')[0];
      const horaFmt = String(cita.start_time ?? '').slice(0, 5);

      await sendText(cita.client_phone,
        `⏰ *Recordatorio de tu cita*\n\n` +
        `Hola ${nombre}, tu cita en *${biz?.name}* es hoy:\n\n` +
        `🕐 ${horaFmt} (en aprox. 1 hora)\n` +
        `📌 ${(cita.services as any)?.name}${conQuien}\n\n` +
        `Si no puedes asistir, escribe *cancelar*. ¡Te esperamos!`
      );
      await supabase.from('appointments')
        .update({ reminder_sent: true }).eq('id', cita.id);
      sent++;
    }

    return new Response(JSON.stringify({ sent }));
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
