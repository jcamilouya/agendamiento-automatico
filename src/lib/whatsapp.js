import { supabase } from './supabase'

const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function formatFechaLinda(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

function formatHora(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

// Normaliza a E.164 colombiano: +573XXXXXXXXX
export function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('57') && digits.length >= 12) return `+${digits}`
  if (digits.length === 10) return `+57${digits}`
  return `+${digits}`
}

// Genera link wa.me con mensaje pre-llenado
export function whatsAppLink(phone, message) {
  const num = normalizePhone(phone).replace('+', '')
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

// ── Templates ────────────────────────────────────────────────

export function msgConfirmacion({ clientName, negocioName, fecha, hora, servicio, estilista }) {
  const nombre = clientName.split(' ')[0]
  return [
    `Hola ${nombre} 👋`,
    ``,
    `Tu cita en *${negocioName}* está confirmada ✅`,
    ``,
    `📅 ${formatFechaLinda(fecha)}`,
    `🕐 ${formatHora(hora)}`,
    `✂️ ${servicio} con ${estilista}`,
    ``,
    `¡Te esperamos!`,
  ].join('\n')
}

export function msgRecordatorio({ clientName, negocioName, fecha, hora, servicio, estilista }) {
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

export function msgNuevaCita({ clientName, clientPhone, fecha, hora, servicio, estilista, precio }) {
  return [
    `🔔 *Nueva cita agendada*`,
    ``,
    `👤 ${clientName}`,
    `📱 ${clientPhone}`,
    `📅 ${formatFechaLinda(fecha)} a las ${formatHora(hora)}`,
    `✂️ ${servicio} con ${estilista}`,
    precio ? `💰 $${Number(precio).toLocaleString('es-CO')}` : '',
  ].filter(Boolean).join('\n')
}

// ── Envío automático vía Edge Function ───────────────────────

// Fire-and-forget: no lanzar si Twilio no está configurado
export async function sendWhatsApp(phone, message) {
  try {
    const to = normalizePhone(phone)
    const { error } = await supabase.functions.invoke('send-whatsapp', {
      body: { to, message },
    })
    if (error) throw error
    return { ok: true }
  } catch (err) {
    console.warn('[WhatsApp] envío fallido:', err.message)
    return { ok: false }
  }
}
