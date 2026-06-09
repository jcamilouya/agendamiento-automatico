const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function normalizePhone(phone) {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '57' + clean.slice(1);
  if (!clean.startsWith('57') && clean.length === 10) clean = '57' + clean;
  return clean;
}

export async function sendWhatsApp(to, text) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ to: normalizePhone(to), text }),
    });
    return res.ok;
  } catch (err) {
    console.error('WhatsApp error:', err);
    return false;
  }
}

export function whatsAppLink(phone, message) {
  const num = normalizePhone(phone);
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export const msgConfirmacion = ({ clientName, negocioName, fecha, hora, servicio, estilista, cancelUrl }) => {
  const nombre = clientName.split(' ')[0];
  const lines = [
    `✅ *¡Cita confirmada, ${nombre}!*`,
    ``,
    `Tu cita en *${negocioName}* está lista.`,
    ``,
    `💇 *${servicio}* con ${estilista}`,
    `📅 ${fecha}`,
    `🕐 ${hora}`,
  ];
  if (cancelUrl) {
    lines.push(``, `❌ ¿Necesitas cancelar?`, `👉 ${cancelUrl}`);
  }
  lines.push(``, `_¡Te esperamos!_`);
  return lines.join('\n');
};

export const msgNuevaCita = ({ clientName, clientPhone, fecha, hora, servicio, estilista, precio }) => [
  `🔔 *Nueva cita agendada*`,
  ``,
  `👤 ${clientName}`,
  `📱 ${clientPhone}`,
  `📅 ${fecha} a las ${hora}`,
  `✂️ ${servicio} con ${estilista}`,
  precio ? `💰 $${Number(precio).toLocaleString('es-CO')}` : '',
].filter(Boolean).join('\n');

export const msgCancelacion = (nombre, servicio, fecha, hora, slug) =>
  `❌ *Cita cancelada*\n\n` +
  `Hola ${nombre}, tu cita de *${servicio}* el ${fecha} a las ${hora} fue cancelada.\n\n` +
  `Para agendar de nuevo 👉 turnott.com/${slug}`;

export const msgCancelacionDueno = (nombre, servicio, fecha, hora) =>
  `⚠️ *Cita cancelada*\n\n` +
  `*${nombre}* canceló *${servicio}*\n` +
  `📅 ${fecha} a las ${hora}\n\nEl slot quedó libre.`;

export const msgRecordatorio = ({ clientName, negocioName, fecha, hora, servicio, estilista }) => {
  const nombre = clientName.split(' ')[0];
  return [
    `Hola ${nombre} 👋`,
    ``,
    `Te recordamos tu cita mañana en *${negocioName}*:`,
    ``,
    `📅 ${fecha}`,
    `🕐 ${hora}`,
    `✂️ ${servicio} con ${estilista}`,
    ``,
    `¿Todo bien? Si necesitas cancelar o cambiar la hora, solo dinos 🙌`,
  ].join('\n');
};
