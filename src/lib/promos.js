// Helpers para promociones por rango horario.

function timeToMin(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Devuelve la promo aplicable para una fecha (YYYY-MM-DD) + hora (HH:MM),
// o null. Si hay varias, gana la del mayor descuento.
export function findPromo(promociones, fecha, hora) {
  if (!promociones?.length || !fecha || !hora) return null
  const dow = new Date(fecha + 'T12:00:00').getDay()
  const minSlot = timeToMin(hora)

  const candidatas = promociones.filter(p => {
    if (!p.is_active) return false
    if (p.day_of_week !== null && p.day_of_week !== dow) return false
    const ini = timeToMin(p.start_time)
    const fin = timeToMin(p.end_time)
    return minSlot >= ini && minSlot < fin
  })

  if (candidatas.length === 0) return null
  return candidatas.reduce((a, b) =>
    Number(b.discount_percent) > Number(a.discount_percent) ? b : a
  )
}

// Devuelve la promo aplicable para un slot SOLO POR HORA (sin fecha) —
// útil para pintar la grilla del calendario antes de saber la fecha.
export function findPromoForTime(promociones, fecha, hora) {
  return findPromo(promociones, fecha, hora)
}

export function applyDiscount(price, promo) {
  if (!promo) return Number(price ?? 0)
  const pct = Number(promo.discount_percent ?? 0)
  return Math.round(Number(price ?? 0) * (1 - pct / 100))
}
