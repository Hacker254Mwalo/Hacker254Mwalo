import { useState, useMemo } from 'react'
import { updateInvestmentWorkload } from '../lib/db'
import { WORKLOAD_MULTIPLIERS, getWorkloadYield } from '../lib/plans'

export default function WorkloadSelector({ investment, userPhone }) {
  const [selected, setSelected] = useState(investment.workload || 'finance')
  const [isSaving, setIsSaving] = useState(false)

  const dailyBase = getWorkloadYield(Number(investment.amount || 0), selected)
  const workloads = useMemo(() => Object.values(WORKLOAD_MULTIPLIERS), [])

  const handleSelect = async (workloadId) => {
    setSelected(workloadId)
    setIsSaving(true)
    try {
      await updateInvestmentWorkload(investment.id, workloadId, userPhone)
    } catch (err) {
      console.error('Workload update failed:', err)
      setSelected(investment.workload || 'finance')
    }
    setIsSaving(false)
  }

  return (
    <div className="rounded-xl p-3 mt-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,180,255,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#00B4FF' }}>
          Deploy Workload
        </span>
        {isSaving && <span className="text-[9px] text-cyan-400 animate-pulse">Syncing...</span>}
      </div>
      <div className="space-y-2">
        {workloads.map(w => {
          const isActive = selected === w.id
          const projectedYield = getWorkloadYield(Number(investment.amount || 0), w.id)
          return (
            <button
              key={w.id}
              onClick={() => handleSelect(w.id)}
              disabled={isSaving}
              className={`w-full p-3 rounded-xl text-left text-sm transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-900/40 to-cyan-900/30 border-2 border-cyan-500 shadow-lg shadow-cyan-500/5'
                  : 'border border-gray-700/50 hover:border-gray-500'
              }`}
              style={{ background: isActive ? undefined : 'var(--bg-elevated)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{w.icon}</span>
                  <div>
                    <div className="font-semibold text-xs">{w.name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{w.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold ${w.multiplier >= 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {w.multiplier >= 1 ? '+' : ''}{Math.round((w.multiplier - 1) * 100)}%
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>KSh {projectedYield.toLocaleString()}/day</div>
                </div>
              </div>
              {isActive && (
                <div className="flex items-center gap-1 mt-2 text-[9px] text-cyan-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Active workload
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
