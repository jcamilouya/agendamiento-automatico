import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const HORAS = Array.from({ length: 13 }, (_, i) =>
  String(i + 7).padStart(2, '0') // 07 a 19 (7am a 7pm)
)
const MINUTOS = ['00', '15', '30', '45']

export default function TimePicker({ value, onChange, label }) {
  const [abierto, setAbierto] = useState(false)

  const [hora, minuto] = value ? value.split(':') : ['09', '00']

  const handleSelect = (h, m) => {
    onChange(`${h}:${m}`)
    setAbierto(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      {label && (
        <label style={{
          fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        style={{
          width: '100%', padding: '10px 14px',
          background: '#1a1a1a', border: '1px solid #1E1E1E',
          borderRadius: '10px', color: '#F5F5F5', fontSize: '14px',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <span>
          {hora}:{minuto} {parseInt(hora) < 12 ? 'AM' : 'PM'}
        </span>
        <ChevronDown size={16} color="#555" />
      </button>

      {abierto && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={() => setAbierto(false)}
          />

          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: '#111111', border: '1px solid #1E1E1E',
            borderRadius: '12px', zIndex: 50, marginTop: '4px',
            padding: '12px', maxHeight: '280px', overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
            }}>
              {HORAS.map(h =>
                MINUTOS.map(m => {
                  const selected = h === hora && m === minuto
                  const hora12 = parseInt(h) > 12 ? parseInt(h) - 12 : parseInt(h)
                  const ampm = parseInt(h) < 12 ? 'am' : 'pm'
                  return (
                    <button
                      key={`${h}:${m}`}
                      type="button"
                      onClick={() => handleSelect(h, m)}
                      style={{
                        padding: '8px 4px',
                        background: selected ? '#0D3320' : '#1a1a1a',
                        border: `1px solid ${selected ? 'var(--accent)' : '#1E1E1E'}`,
                        borderRadius: '8px',
                        color: selected ? 'var(--accent)' : '#ccc',
                        fontSize: '12px', cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: selected ? 600 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {hora12}:{m}{ampm}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
