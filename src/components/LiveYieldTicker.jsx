import { useEffect, useState } from 'react'

export default function LiveYieldTicker({ investment }) {
  const [displayYield, setDisplayYield] = useState(0)
  
  useEffect(() => {
    if (!investment) return
    
    const dailyYield = Number(investment.daily_return || 0)
    const lastProfitAt = new Date(investment.last_profit_at || investment.started_at)
    const now = new Date()
    
    const secondsElapsed = (now - lastProfitAt) / 1000
    const secondsInDay = 86400
    const yieldPerSecond = dailyYield / secondsInDay
    const currentYield = yieldPerSecond * secondsElapsed
    
    setDisplayYield(Math.max(0, currentYield))
  }, [investment])
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayYield(prev => {
        const dailyYield = Number(investment?.daily_return || 0)
        const secondsInDay = 86400
        const yieldPerSecond = dailyYield / secondsInDay
        return prev + yieldPerSecond
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [investment])
  
  return (
    <div className="console-card mt-3">
      <div className="console-label">Current Cycle Yield</div>
      <div className="console-value text-green-400">
        +KSh {displayYield.toFixed(2)}
      </div>
      <div className="text-xs text-gray-400 mt-2">
        {Math.round((displayYield / (investment?.daily_return || 1)) * 100)}% of daily target
      </div>
    </div>
  )
}
