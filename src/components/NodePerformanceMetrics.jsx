import { useEffect, useState } from 'react'

const WORKLOAD_PROFILES = {
  healthcare: { cpuBase: 45, gpuBase: 35, tempBase: 52, cpuVar: 8, gpuVar: 6, tempVar: 4 },
  autonomous: { cpuBase: 72, gpuBase: 68, tempBase: 68, cpuVar: 12, gpuVar: 10, tempVar: 6 },
  finance: { cpuBase: 85, gpuBase: 78, tempBase: 75, cpuVar: 15, gpuVar: 12, tempVar: 8 }
}

export default function NodePerformanceMetrics({ investment }) {
  const [metrics, setMetrics] = useState({
    cpu: 50,
    gpu: 40,
    temp: 55,
    uptime: 99.8
  })
  
  const workload = investment?.workload || 'healthcare'
  const profile = WORKLOAD_PROFILES[workload] || WORKLOAD_PROFILES.healthcare
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(20, Math.min(95, profile.cpuBase + (Math.random() - 0.5) * profile.cpuVar)),
        gpu: Math.max(15, Math.min(95, profile.gpuBase + (Math.random() - 0.5) * profile.gpuVar)),
        temp: Math.max(40, Math.min(85, profile.tempBase + (Math.random() - 0.5) * profile.tempVar)),
        uptime: Math.min(99.99, prev.uptime + Math.random() * 0.01)
      }))
    }, 2000)
    
    return () => clearInterval(interval)
  }, [workload, profile])
  
  const getGaugeClass = (value, thresholds = { warning: 70, critical: 85 }) => {
    if (value >= thresholds.critical) return 'gauge-critical'
    if (value >= thresholds.warning) return 'gauge-warning'
    return 'gauge-optimal'
  }
  
  return (
    <div className="console-card mt-3">
      <div className="console-label mb-4">Node Performance</div>
      
      <div className="space-y-4">
        {/* CPU Usage */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">CPU Usage</span>
            <span className="text-sm font-mono text-white">{metrics.cpu.toFixed(1)}%</span>
          </div>
          <div className="performance-gauge-bg">
            <div
              className={`performance-gauge-fill ${getGaugeClass(metrics.cpu)}`}
              style={{ width: `${metrics.cpu}%` }}
            />
          </div>
        </div>
        
        {/* GPU Usage */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">GPU Usage</span>
            <span className="text-sm font-mono text-white">{metrics.gpu.toFixed(1)}%</span>
          </div>
          <div className="performance-gauge-bg">
            <div
              className={`performance-gauge-fill ${getGaugeClass(metrics.gpu)}`}
              style={{ width: `${metrics.gpu}%` }}
            />
          </div>
        </div>
        
        {/* Temperature */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">Temperature</span>
            <span className="text-sm font-mono text-white">{metrics.temp.toFixed(1)}°C</span>
          </div>
          <div className="performance-gauge-bg">
            <div
              className={`performance-gauge-fill ${getGaugeClass(metrics.temp, { warning: 65, critical: 75 })}`}
              style={{ width: `${(metrics.temp / 100) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Uptime */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-700">
          <span className="text-xs text-gray-400">Uptime</span>
          <span className="text-sm font-mono text-green-400">{metrics.uptime.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  )
}
