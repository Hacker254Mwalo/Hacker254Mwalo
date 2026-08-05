import { useState, useEffect } from 'react'

const DC_REGIONS = [
  { region: 'US-East-1 (Virginia)', location: 'N. Virginia, USA', load: 72, status: 'Optimal', uptime: '99.98%', nodes: 284, gpuType: 'H100' },
  { region: 'EU-Central-1 (Frankfurt)', location: 'Frankfurt, DE', load: 68, status: 'Optimal', uptime: '99.97%', nodes: 196, gpuType: 'A100' },
  { region: 'Asia-Pacific-1 (Tokyo)', location: 'Tokyo, JP', load: 81, status: 'High', uptime: '99.95%', nodes: 162, gpuType: 'A100' },
  { region: 'AF-East-1 (Nairobi)', location: 'Nairobi, KE', load: 74, status: 'Optimal', uptime: '99.92%', nodes: 88, gpuType: 'RTX 4090' },
  { region: 'US-West-2 (Oregon)', location: 'Portland, USA', load: 65, status: 'Optimal', uptime: '99.99%', nodes: 312, gpuType: 'H100' },
]

export default function DataCenterInfo() {
  const [dataCenters, setDataCenters] = useState(DC_REGIONS)

  useEffect(() => {
    const interval = setInterval(() => {
      setDataCenters(prev => prev.map(dc => ({
        ...dc,
        load: Math.max(50, Math.min(95, dc.load + (Math.random() - 0.5) * 8))
      })))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const getLoadColor = (load) => {
    if (load >= 80) return 'text-red-400'
    if (load >= 70) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getLoadBg = (load) => {
    if (load >= 80) return 'bg-red-500'
    if (load >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="my-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Global Data Center Network</span>
        </div>
        <span className="text-[9px] text-gray-500 font-mono">5 Regions · Live</span>
      </div>
      <div className="space-y-2.5">
        {dataCenters.map((dc, i) => (
          <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-700/30 last:border-0">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm">🌐</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-300 text-[11px] truncate">{dc.region}</div>
                <div className="text-[9px] text-gray-500 flex items-center gap-1.5">
                  <span>{dc.location}</span>
                  <span className="text-gray-700">·</span>
                  <span>{dc.gpuType}</span>
                  <span className="text-gray-700">·</span>
                  <span>{dc.nodes} nodes</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Load bar */}
              <div className="w-16 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${getLoadBg(dc.load)}`}
                  style={{ width: `${dc.load}%` }} />
              </div>
              <div className={`font-bold text-[11px] w-10 text-right ${getLoadColor(dc.load)}`}>
                {dc.load.toFixed(0)}%
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[8px] text-gray-500 border-t border-gray-700/30 pt-2">
        <span>AVG UPTIME: 99.96%</span>
        <span className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
          ALL SYSTEMS OPERATIONAL
        </span>
      </div>
    </div>
  )
}
