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

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const now = ctx.currentTime
    // Two-tone ascending chime: E5 → A5
    const notes = [
      { freq: 659, start: 0,    end: 0.55, vol: 0.22 },
      { freq: 880, start: 0.14, end: 0.75, vol: 0.18 },
    ]
    notes.forEach(({ freq, start, end, vol }) => {
      const osc = ctx.createOscillator()
      const g   = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)
      g.gain.setValueAtTime(start === 0 ? vol : 0, now)
      if (start > 0) g.gain.setValueAtTime(vol, now + start)
      g.gain.exponentialRampToValueAtTime(0.001, now + end)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + end)
    })
  } catch (_) {}
}

// ── Hook ──────────────────────────────────────────────────────────────────────

let _id = 0

export function useNotifications(businessId) {
  const [items,   setItems]   = useState([])
  const channelRef             = useRef(null)

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
      .subscribe()

    return () => {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [businessId])

  return {
    notifications: items,
    unreadCount:   items.filter(n => !n.read).length,
    markAllRead:   ()  => setItems(p => p.map(n => ({ ...n, read: true }))),
    markRead:      (id) => setItems(p => p.map(n => n.id === id ? { ...n, read: true } : n)),
    dismissToast:  (id) => setItems(p => p.map(n => n.id === id ? { ...n, toast: false } : n)),
  }
}
