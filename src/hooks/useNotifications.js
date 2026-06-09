import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const toYMD = d => d.toISOString().split('T')[0]
  const today    = toYMD(new Date())
  const tomorrow = toYMD(new Date(Date.now() + 86400000))
  if (dateStr === today)    return 'Hoy'
  if (dateStr === tomorrow) return 'Mañana'
  const d = new Date(dateStr + 'T12:00:00')
  const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`
}

export function formatHM(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

export function relativeTime(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60)   return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  return `hace ${Math.floor(diff / 3600)}h`
}

// ── Chime ─────────────────────────────────────────────────────────────────────
// AudioContext compartido + desbloqueo en el primer gesto del usuario
// (Chrome/Safari bloquean audio hasta que haya interacción).

let _audioCtx = null

function getAudioCtx() {
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (_) { return null }
  }
  return _audioCtx
}

if (typeof window !== 'undefined') {
  const unlock = async () => {
    const ctx = getAudioCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      try { await ctx.resume() } catch (_) {}
    }
  }
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('keydown',     unlock, { passive: true })
  window.addEventListener('touchend',    unlock, { passive: true })
}

async function playChime() {
  const ctx = getAudioCtx()
  if (!ctx) return
  try {
    if (ctx.state !== 'running') await ctx.resume()
  } catch (_) { return }
  if (ctx.state !== 'running') return

  const now = ctx.currentTime
  const notes = [
    { freq: 523, start: 0,    end: 0.5,  vol: 0.35 },
    { freq: 659, start: 0.18, end: 0.65, vol: 0.30 },
    { freq: 784, start: 0.36, end: 0.9,  vol: 0.25 },
  ]
  notes.forEach(({ freq, start, end, vol }) => {
    try {
      const osc = ctx.createOscillator()
      const g   = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)
      g.gain.setValueAtTime(0, now)
      g.gain.setValueAtTime(vol, now + start)
      g.gain.exponentialRampToValueAtTime(0.001, now + end)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + end)
    } catch (_) {}
  })
}

// ── Hook ──────────────────────────────────────────────────────────────────────

let _id = 0

export function useNotifications(businessId) {
  const [items,   setItems]   = useState([])
  const channelRef             = useRef(null)

  // Limpiar notificaciones viejas (> 30 min) al montar
  useEffect(() => {
    const treintaMinutosAtras = Date.now() - 30 * 60 * 1000
    setItems(prev => prev.filter(n => n.ts.getTime() > treintaMinutosAtras))
  }, [])

  useEffect(() => {
    if (!businessId) return

    channelRef.current = supabase
      .channel(`notif:${businessId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'appointments',
        filter: `business_id=eq.${businessId}`,
      }, async (payload) => {
        const appt = payload.new
        if (appt.business_id !== businessId) return

        const { data } = await supabase
          .from('appointments')
          .select('stylists(name), services(name)')
          .eq('id', appt.id)
          .single()

        const notif = {
          id:          `n-${++_id}`,
          read:        false,
          toast:       true,
          ts:          new Date(),
          clientName:  appt.client_name,
          clientPhone: appt.client_phone,
          date:        appt.date,
          startTime:   appt.start_time,
          serviceName: data?.services?.name  ?? 'Servicio',
          stylistName: data?.stylists?.name  ?? 'Estilista',
        }

        setItems(prev => [notif, ...prev].slice(0, 20))
        playChime()
      })
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[useNotifications] subscribe status:', status, err)
        }
      })

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [businessId])

  return {
    notifications: items,
    unreadCount:   items.filter(n => !n.read).length,
    markAllRead:   ()  => setItems(p => p.map(n => ({ ...n, read: true }))),
    markRead:      (id) => setItems(p => p.map(n => n.id === id ? { ...n, read: true } : n)),
    dismissToast:  (id) => setItems(p => p.map(n => n.id === id ? { ...n, toast: false } : n)),
    clearAll:      ()  => setItems([]),
  }
}
