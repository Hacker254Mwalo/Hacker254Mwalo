import { useMemo } from 'react'
import { WORKLOAD_MULTIPLIERS, getWorkloadYield } from '../lib/plans'

export default function EarningsForecast({ investment }) {
  const workload = investment?.workload || 'healthcare'
  const w = WORKLOAD_MULTIPLIERS[workload] || WORKLOAD_MULTIPLIERS.healthcare

  const daily = getWorkloadYield(Number(investment.amount || 0), workload)
  const weekly = daily * 7
  const monthly = daily * 30
  const totalReturn = daily * 60

  return (
    <div className="rounded-xl p-3 mt-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(52,211,153,0.1)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#34d399' }}>
          Earnings Forecast
        </span>
        <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,180,255,0.1)', color: '#00B4FF', border: '1px solid rgba(0,180,255,0.2)' }}>
          {w.icon} {w.name}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>24H</div>
          <div className="text-sm font-bold text-green-400">KSh {daily.toLocaleString()}</div>
        </div>
        <div className="text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>7D</div>
          <div className="text-sm font-bold text-green-400">KSh {weekly.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>30D</div>
          <div className="text-sm font-bold text-green-400">KSh {monthly.toLocaleString()}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>60-Day Total</span>
        <span className="text-xs font-bold text-yellow-400">KSh {totalReturn.toLocaleString()}</span>
      </div>
    </div>
  )
}
