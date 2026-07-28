import { useEffect, useState } from 'react'

export default function GlobalNetworkStatus() {
  const [stats, setStats] = useState({
    networkLoad: 78,
    activeNodes: 14281,
    status: 'Optimal'
  })
  
  useEffect(() => {
    // Simulate realistic fluctuations
    const interval = setInterval(() => {
      setStats(prev => ({
        networkLoad: Math.max(60, Math.min(95, prev.networkLoad + (Math.random() - 0.5) * 10)),
        activeNodes: prev.activeNodes + Math.floor((Math.random() - 0.5) * 20),
        status: Math.random() > 0.05 ? 'Optimal' : 'High Load'
      }))
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="console-card">
      <div className="console-label mb-3">Global Network Status</div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Network Load</span>
          <span className="text-white">{stats.networkLoad.toFixed(0)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Active Global Nodes</span>
          <span className="text-green-400">{stats.activeNodes.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Status</span>
          <span className={stats.status === 'Optimal' ? 'text-green-400' : 'text-yellow-400'}>
            {stats.status}
          </span>
        </div>
      </div>
    </div>
  )
}
