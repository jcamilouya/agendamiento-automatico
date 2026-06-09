// Formateo consistente de moneda colombiana en toda la app.
// Sin decimales, sin formato anglosajón ($58.00).
//  >= 1_000_000  → $1.2M
//  >= 1_000      → $58k
//  resto         → $850

export function formatCurrency(value) {
  const n = Number(value ?? 0)
  if (!isFinite(n)) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}
