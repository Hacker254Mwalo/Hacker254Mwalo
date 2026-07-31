import { useMemo } from 'react'

function generateNodeId(inv) {
  const seed = `${inv.id || ''}${inv.planId || ''}${inv.amount || ''}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const prefix = 'DUM'
  const num = Math.abs(hash % 9000 + 1000)
  const gpu = inv.planName?.includes('4090') ? 'RTX4090' : inv.planName?.includes('H100') ? 'H100' : inv.planName?.includes('Deep') ? 'DL-C' : 'GPU-V1'
  return `${prefix}-${num}-${gpu}`
}

export default function DeploymentCertificate({ inv, onClose }) {
  const nodeId = useMemo(() => generateNodeId(inv), [inv])
  const deployDate = inv.startedAt ? new Date(inv.startedAt) : new Date(inv.date)

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full text-center" onClick={e => e.stopPropagation()} style={{ animation: 'fadeIn 0.3s ease-out' }}>
        {/* Header */}
        <div className="mb-4">
          <div className="text-3xl mb-2">📜</div>
          <h3 className="text-lg font-black" style={{ background: 'linear-gradient(135deg, #FFD700, #DAA520)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Node Commission Certificate
          </h3>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Your AI compute node is active and earning
          </p>
        </div>

        {/* Certificate body */}
        <div className="rounded-xl p-4 space-y-3 text-left" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,215,0,0.15)' }}>
          <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Node ID</span>
            <span className="text-sm font-bold font-mono" style={{ color: '#FFD700' }}>{nodeId}</span>
          </div>

          <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Infrastructure</span>
            <span className="text-sm font-semibold">{inv.planName}</span>
          </div>

          <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Allocated Capacity</span>
            <span className="text-sm font-bold text-green-400">KSh {Number(inv.amount || 0).toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>24h Revenue</span>
            <span className="text-sm font-bold" style={{ color: '#34D399' }}>KSh {Number(inv.dailyReturn || 0).toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Contract Value</span>
            <span className="text-sm font-bold text-yellow-400">KSh {Number(inv.totalReturn || 0).toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Deployed On</span>
            <span className="text-sm font-semibold">{deployDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-700/30 font-semibold">ACTIVE</span>
          </div>
        </div>

        {/* Verification badge */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#34D399" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          <span>Verified on Dumiropay AI Compute Network</span>
        </div>

        <button onClick={onClose} className="btn-secondary w-full mt-4 text-sm">Close</button>
      </div>
    </div>
  )
}
