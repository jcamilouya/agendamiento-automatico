function PulseDot() {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: '#F59E0B', display: 'inline-block',
      animation: 'pulse-dot 1.5s ease-in-out infinite',
      boxShadow: '0 0 6px rgba(245,158,11,0.4)',
    }} />
  )
}

export default function KPICard({ icon: Icon, label, value, sublabel, delay = 0, pulse = false }) {
  return (
    <div className="kpi-card" style={{ animationDelay: `${delay}ms` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{
          background: '#1A1A1A', borderRadius: 10, padding: 10,
          border: '1px solid #252525',
        }}>
          <Icon size={20} color="#3DFFA8" />
        </div>
        {pulse && <PulseDot />}
      </div>
      <p style={{
        fontSize: '2rem', fontFamily: 'Syne, sans-serif',
        fontWeight: 800, color: '#F5F5F5', margin: '0 0 4px', lineHeight: 1.1,
      }}>
        {value}
      </p>
      <p style={{ color: '#888888', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif' }}>
        {label}
      </p>
      {sublabel && (
        <p style={{ color: '#3DFFA8', fontSize: '0.7rem', marginTop: 4, fontFamily: 'DM Sans, sans-serif' }}>
          {sublabel}
        </p>
      )}
    </div>
  )
}
