import { useEffect, useState } from 'react'

export default function ApiRateLimiter() {
  const [calls, setCalls] = useState(1247)
  const limit = 10000
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCalls(prev => Math.min(limit, prev + Math.floor(Math.random() * 5)))
    }, 3000)
    return () => clearInterval(interval)
  }, [])
  
  const percentage = (calls / limit) * 100
  
  return (
    <div className="console-card mt-3">
      <div className="flex justify-between items-center mb-2">
        <div className="console-label">API Rate Limit</div>
        <div className="text-xs font-mono text-gray-400">
          {calls.toLocaleString()} / {limit.toLocaleString()}
        </div>
      </div>
      <div className="performance-gauge-bg">
        <div
          className="performance-gauge-fill bg-blue-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-[10px] text-gray-500 mt-2 text-right uppercase tracking-tighter">
        Secure Gateway: Active
      </div>
    </div>
  )
}
