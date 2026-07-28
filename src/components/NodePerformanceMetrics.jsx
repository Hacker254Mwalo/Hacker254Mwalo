import { useEffect, useState, useMemo } from 'react'
import { WORKLOAD_MULTIPLIERS } from '../lib/plans'

const WORKLOAD_PROFILES = {
  healthcare: { cpuBase: 45, gpuBase: 35, tempBase: 82, cpuVar: 8, gpuVar: 6, tempVar: 5, networkBase: 3, networkVar: 1.5 },
  autonomous: { cpuBase: 72, gpuBase: 68, tempBase: 72, cpuVar: 12, gpuVar: 10, tempVar: 6, networkBase: 6, networkVar: 2 },
  finance: { cpuBase: 85, gpuBase: 78, tempBase: 62, cpuVar: 15, gpuVar: 12, tempVar: 8, networkBase: 9, networkVar: 1 }
}

const JOB_LABELS = {
  healthcare: [
    'Processing MRI Scan Data',
    'Analyzing Patient Records',
    'Running Drug Discovery Simulation',
    'Training Diagnostic Model',
    'Processing X-Ray Dataset',
  ],
  autonomous: [
    'Processing LIDAR Point Cloud',
    'Training Lane Detection Model',
    'Simulating Driving Scenarios',
    'Processing Sensor Fusion Data',
    'Optimizing Path Planning',
  ],
  finance: [
    'Executing Trading Algorithm',
    'Analyzing Market Microstructure',
    'Running Risk Simulation',
    'Processing Order Book Data',
    'Optimizing Portfolio Weights',
  ],
}

export default function NodePerformanceMetrics({ investment }) {
  const [metrics, setMetrics] = useState({
    cpu: 50,
    gpu: 40,
    temp: 55,
    network: 4,
    uptime: 99.8
  })
  const [currentJob, setCurrentJob] = useState('Initializing...')
  const [jobIdx, setJobIdx] = useState(0)

  const workload = investment?.workload || 'healthcare'
  const profile = WORKLOAD_PROFILES[workload] || WORKLOAD_PROFILES.healthcare
  const workloadInfo = WORKLOAD_MULTIPLIERS[workload] || WORKLOAD_MULTIPLIERS.healthcare

  const jobs = useMemo(() => JOB_LABELS[workload] || JOB_LABELS.healthcare, [workload])

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(20, Math.min(95, profile.cpuBase + (Math.random() - 0.5) * profile.cpuVar)),
        gpu: Math.max(15, Math.min(95, profile.gpuBase + (Math.random() - 0.5) * profile.gpuVar)),
        temp: Math.max(40, Math.min(95, profile.tempBase + (Math.random() - 0.5) * profile.tempVar)),
        network: Math.max(1, Math.min(10, profile.networkBase + (Math.random() - 0.5) * profile.networkVar)),
        uptime: Math.min(99.99, prev.uptime + Math.random() * 0.01)
      }))
      setJobIdx(prev => {
        const next = (prev + 1) % jobs.length
        setCurrentJob(jobs[next])
        return next
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [workload, profile, jobs])

  const getGaugeClass = (value, thresholds = { warning: 70, critical: 85 }) => {
    if (value >= thresholds.critical) return 'gauge-critical'
    if (value >= thresholds.warning) return 'gauge-warning'
    return 'gauge-optimal'
  }

  const getGaugeColor = (value, thresholds = { warning: 70, critical: 85 }) => {
    if (value >= thresholds.critical) return '#ef4444'
    if (value >= thresholds.warning) return '#facc15'
    return '#34d399'
  }

  return (
    <div className="rounded-xl p-3 mt-3 font-mono text-xs" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,180,255,0.1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#00B4FF' }}>
          {workloadInfo.icon} Node Performance
        </span>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-700/30">
          {metrics.uptime.toFixed(2)}% uptime
        </span>
      </div>

      {/* Current Job */}
      <div className="rounded-lg px-3 py-2 mb-3 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{currentJob}</span>
      </div>

      <div className="space-y-3">
        {/* CPU Usage */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>CPU Usage</span>
            <span className="text-xs font-semibold" style={{ color: getGaugeColor(metrics.cpu) }}>{metrics.cpu.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${metrics.cpu}%`, background: getGaugeColor(metrics.cpu) }} />
          </div>
        </div>

        {/* GPU Usage */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>GPU Usage</span>
            <span className="text-xs font-semibold" style={{ color: getGaugeColor(metrics.gpu) }}>{metrics.gpu.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${metrics.gpu}%`, background: getGaugeColor(metrics.gpu) }} />
          </div>
        </div>

        {/* Temperature */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Temperature</span>
            <span className="text-xs font-semibold" style={{ color: getGaugeColor(metrics.temp, { warning: 65, critical: 75 }) }}>{metrics.temp.toFixed(1)}°C</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(metrics.temp / 100) * 100}%`, background: getGaugeColor(metrics.temp, { warning: 65, critical: 75 }) }} />
          </div>
        </div>

        {/* Network Throughput */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Network Throughput</span>
            <span className="text-xs font-semibold text-blue-400">{metrics.network.toFixed(1)} Gbps</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-1000 bg-blue-500" style={{ width: `${(metrics.network / 10) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
