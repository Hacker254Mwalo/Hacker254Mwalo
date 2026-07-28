import { useEffect, useState } from 'react'

export default function LiveYieldTicker({ investment }) {
  const [displayYield, setDisplayYield] = useState(0)

  useEffect(() => {
    if (!investment) return

    const dailyYield = Number(investment.daily_return || investment.dailyReturn || 0)
    if (isNaN(dailyYield) || dailyYield <= 0) return

    const lastProfitAt = new Date(investment.last_profit_at || investment.started_at || investment.startedAt)
    const now = new Date()

    if (isNaN(lastProfitAt.getTime())) return

    const secondsElapsed = (now - lastProfitAt) / 1000
    const secondsInDay = 86400
    const yieldPerSecond = dailyYield / secondsInDay
    const currentYield = yieldPerSecond * secondsElapsed

    setDisplayYield(Math.max(0, currentYield))
  }, [investment])

  useEffect(() => {
    const dailyYield = Number(investment?.daily_return || investment?.dailyReturn || 0)
    if (isNaN(dailyYield) || dailyYield <= 0) return

    const interval = setInterval(() => {
      setDisplayYield(prev => {
        const secondsInDay = 86400
        const yieldPerSecond = dailyYield / secondsInDay
        return prev + yieldPerSecond
      })
    }, 500) // 500ms for sub-cent feel

    return () => clearInterval(interval)
  }, [investment])

  const dailyYield = Number(investment?.daily_return || investment?.dailyReturn || 0)
  const progress = dailyYield > 0 ? (displayYield / dailyYield) * 100 : 0
  const workload = investment?.workload || 'healthcare'

  return (
    <div className="rounded-xl p-3 mt-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,180,255,0.08)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#00B4FF' }}>
          Current Cycle Yield
        </span>
        <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
          {workload === 'finance' ? '📊 Finance' : workload === 'autonomous' ? '🚗 Autonomous' : '🏥 Healthcare'}
        </span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-xs text-green-400">+KSh</span>
        <span className="text-2xl font-black text-green-400 tabular-nums">
          {displayYield < 1 ? displayYield.toFixed(4) : displayYield < 100 ? displayYield.toFixed(2) : displayYield.toFixed(0)}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progress)}%`, background: 'linear-gradient(90deg, #34d399, #00B4FF)' }}
          />
        </div>
        <span className="text-[10px] font-semibold text-blue-400 tabular-nums">{Math.min(100, progress).toFixed(1)}%</span>
      </div>
    </div>
  )
}
