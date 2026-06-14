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

// ── Helpers de formato (mensajes claros, sin fechas/horas crudas tipo "2026-06-10" / "13:00:00") ──
const MESES_WA = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function fechaLinda(fecha) {
  if (!fecha) return '';
  const [y, m, d] = String(fecha).split('-').map(Number);
  if (!y || !m || !d) return String(fecha);
  return `${d} de ${MESES_WA[m - 1]}`;
}

function horaLinda(hora) {
  if (!hora) return '';
  const [h, mi] = String(hora).split(':').map(Number);
  if (Number.isNaN(h)) return String(hora);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${String(mi || 0).padStart(2, '0')} ${ampm}`;
}

// "con {estilista}" solo cuando hay un nombre real (las agencias no muestran staff)
const conStaff = (estilista) => (estilista ? ` con ${estilista}` : '');
const primerNombre = (n) => (n ? String(n).split(' ')[0] : '');

export const msgConfirmacion = ({ clientName, negocioName, fecha, hora, servicio, estilista, cancelUrl }) => {
  const nombre = primerNombre(clientName);
  const lines = [
    `✅ *¡Cita confirmada${nombre ? `, ${nombre}` : ''}!*`,
    ``,
    `Tu reserva en *${negocioName}* quedó lista:`,
    ``,
    `📅 ${fechaLinda(fecha)}`,
    `🕐 ${horaLinda(hora)}`,
    `📌 ${servicio}${conStaff(estilista)}`,
  ];
  if (cancelUrl) {
    lines.push(``, `¿Necesitas cancelar o reprogramar?`, `👉 ${cancelUrl}`);
  }
  lines.push(``, `¡Te esperamos!`);
  return lines.join('\n');
};

export const msgNuevaCita = ({ clientName, clientPhone, fecha, hora, servicio, estilista, precio }) => [
  `🔔 *Nueva cita agendada*`,
  ``,
  `${clientName} · ${clientPhone}`,
  `📅 ${fechaLinda(fecha)}`,
  `🕐 ${horaLinda(hora)}`,
  `📌 ${servicio}${conStaff(estilista)}`,
  precio ? `💰 $${Number(precio).toLocaleString('es-CO')}` : '',
].filter(Boolean).join('\n');

export const msgCancelacion = (nombre, servicio, fecha, hora, slug) =>
  `❌ *Cita cancelada*\n\n` +
  `Hola ${primerNombre(nombre)}, tu cita de *${servicio}* del ${fechaLinda(fecha)} a las ${horaLinda(hora)} quedó cancelada.\n\n` +
  `¿Quieres agendar de nuevo?\n👉 turnott.com/${slug}`;

export const msgCancelacionDueno = (nombre, servicio, fecha, hora) =>
  `⚠️ *Cita cancelada*\n\n` +
  `*${nombre}* canceló *${servicio}*\n` +
  `📅 ${fechaLinda(fecha)} · 🕐 ${horaLinda(hora)}\n\n` +
  `El horario quedó libre de nuevo.`;

export const msgRecordatorio = ({ clientName, negocioName, fecha, hora, servicio, estilista }) => {
  const nombre = primerNombre(clientName);
  return [
    `⏰ *Recordatorio de tu cita*`,
    ``,
    `Hola ${nombre}, te recordamos tu cita en *${negocioName}*:`,
    ``,
    `📅 ${fechaLinda(fecha)}`,
    `🕐 ${horaLinda(hora)}`,
    `📌 ${servicio}${conStaff(estilista)}`,
    ``,
    `¿Todo bien? Si necesitas cancelar o cambiar la hora, escríbenos. ¡Te esperamos!`,
  ].join('\n');
};
