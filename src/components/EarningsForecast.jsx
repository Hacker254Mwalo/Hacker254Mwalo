import { useEffect, useState } from 'react'

export default function EarningsForecast({ investment }) {
  const [forecast, setForecast] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0
  })
  
  useEffect(() => {
    if (!investment) return
    
    const daily = Number(investment.dailyReturn || 0)
    const multiplier = investment.workload === 'finance' ? 1.25 : investment.workload === 'autonomous' ? 1.15 : 1.0
    const adjustedDaily = daily * multiplier
    
    setForecast({
      daily: adjustedDaily,
      weekly: adjustedDaily * 7,
      monthly: adjustedDaily * 30
    })
  }, [investment])
  
  return (
    <div className="console-card mt-3">
      <div className="console-label mb-3">Earnings Forecast</div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-[10px] text-gray-500 uppercase">24H</div>
          <div className="text-sm font-bold text-green-400">KSh {Math.round(forecast.daily).toLocaleString()}</div>
        </div>
        <div className="text-center border-x border-gray-700">
          <div className="text-[10px] text-gray-500 uppercase">7D</div>
          <div className="text-sm font-bold text-green-400">KSh {Math.round(forecast.weekly).toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-gray-500 uppercase">30D</div>
          <div className="text-sm font-bold text-green-400">KSh {Math.round(forecast.monthly).toLocaleString()}</div>
        </div>
      </div>
      <div className="text-[10px] text-gray-500 mt-2 text-center italic">
        * Based on current {investment?.workload || 'healthcare'} workload
      </div>
    </div>
  )
}
