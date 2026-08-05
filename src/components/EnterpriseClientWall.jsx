import { useState, useEffect } from 'react'

const ENTERPRISE_CLIENTS = [
  { name: 'MedScan AI', sector: 'Healthcare', load: 92, status: 'Active', color: '#10B981', icon: '🏥', activeJobs: 14, contracts: 3, monthlyVolume: 'KSh 2.4M', trend: 'up' },
  { name: 'FinModel Pro', sector: 'Finance', load: 98, status: 'Critical', color: '#EF4444', icon: '📊', activeJobs: 22, contracts: 5, monthlyVolume: 'KSh 8.1M', trend: 'up' },
  { name: 'UrbanDrive', sector: 'Autonomous', load: 84, status: 'Stable', color: '#3B82F6', icon: '🚗', activeJobs: 9, contracts: 2, monthlyVolume: 'KSh 1.8M', trend: 'stable' },
  { name: 'SecureGov', sector: 'Public Sector', load: 89, status: 'Active', color: '#8B5CF6', icon: '🛡️', activeJobs: 7, contracts: 1, monthlyVolume: 'KSh 3.2M', trend: 'up' },
  { name: 'AgriSense', sector: 'Agriculture', load: 76, status: 'Stable', color: '#F59E0B', icon: '🌾', activeJobs: 5, contracts: 1, monthlyVolume: 'KSh 890K', trend: 'stable' },
  { name: 'RetailFlow', sector: 'E-commerce', load: 94, status: 'Active', color: '#EC4899', icon: '🛒', activeJobs: 11, contracts: 2, monthlyVolume: 'KSh 1.5M', trend: 'up' },
]

function LiveJobsTicker() {
  const [jobs, setJobs] = useState([
    { client: 'FinModel Pro', task: 'Risk model inference', nodes: 4 },
    { client: 'MedScan AI', task: 'CT scan classification', nodes: 2 },
    { client: 'UrbanDrive', task: 'LIDAR point cloud', nodes: 3 },
    { client: 'RetailFlow', task: 'Demand forecasting', nodes: 2 },
  ])
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const tick = () => {
      setFlash(true)
      setTimeout(() => setFlash(false), 400)
      setJobs(prev => {
        const newJobs = [...prev]
        const idx = Math.floor(Math.random() * newJobs.length)
        const newNodes = Math.max(1, newJobs[idx].nodes + (Math.random() > 0.5 ? 1 : -1))
        newJobs[idx] = { ...newJobs[idx], nodes: newNodes }
        return newJobs
      })
    }
    const id = setInterval(tick, 3500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={`mt-6 rounded-xl px-3 py-2.5 transition-all duration-300 ${flash ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.01] border-white/5'} border`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
        <span className="text-[8px] uppercase tracking-widest font-black text-gray-400">Live Enterprise Workloads</span>
        <span className="text-[8px] text-gray-600 ml-auto font-mono">Updated 2s ago</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {jobs.map((job, i) => (
          <div key={i} className="flex items-center justify-between text-[9px]">
            <span className="text-gray-400 truncate max-w-[120px]">{job.client}</span>
            <span className="text-gray-500 text-[8px] truncate max-w-[80px] hidden sm:block">{job.task}</span>
            <span className="text-emerald-400 font-bold">{job.nodes} nodes</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EnterpriseClientWall() {
  const [clients, setClients] = useState(ENTERPRISE_CLIENTS)

  useEffect(() => {
    const interval = setInterval(() => {
      setClients(prev => prev.map(c => ({
        ...c,
        load: Math.max(60, Math.min(99, c.load + (Math.random() - 0.5) * 4))
      })))
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const totalVolume = clients.reduce((sum, c) => {
    const val = parseFloat(c.monthlyVolume.replace('KSh ', '').replace('M', '').replace('K', ''))
    return sum + (c.monthlyVolume.includes('M') ? val * 1000 : val)
  }, 0)

  return (
    <div className="mt-12 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] font-black text-gray-500">
            Enterprise Compute Partners
          </p>
          <p className="text-[8px] text-gray-600 mt-0.5">6 Active Contracts · 68 Nodes Deployed</p>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {clients.map(client => (
          <div key={client.name} className="group relative p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-all duration-500">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                  <span className="text-sm">{client.icon}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Load</span>
                <span className="text-[10px] font-black text-white">{client.load.toFixed(0)}%</span>
              </div>
            </div>
            
            <p className="text-xs font-black text-white tracking-tight mb-1">{client.name}</p>
            
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: client.color }}></div>
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{client.sector}</span>
            </div>

            {/* Job metrics */}
            <div className="flex items-center justify-between text-[9px] border-t border-white/5 pt-2">
              <span className="text-gray-500">{client.activeJobs} active jobs</span>
              <span className="text-gray-400 font-bold">{client.monthlyVolume}</span>
            </div>

            {/* Subtle glow on hover */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          </div>
        ))}
      </div>
      
      {/* Live jobs ticker */}
      <LiveJobsTicker />

      {/* Summary bar */}
      <div className="mt-4 flex items-center justify-center gap-6 text-[9px] text-gray-500 font-medium">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
          <span>REAL-TIME ALLOCATION ACTIVE</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-gray-800"></div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></div>
          <span>KSh {totalVolume > 0 ? (totalVolume/1000).toFixed(1) + 'M' : '0'} Monthly Volume</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-gray-800"></div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50"></div>
          <span>24/7 ENTERPRISE UPTIME</span>
        </div>
      </div>
    </div>
  )
}
