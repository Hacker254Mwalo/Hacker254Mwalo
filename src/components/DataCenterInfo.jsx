import { useState, useEffect } from 'react'

export default function DataCenterInfo() {
  const [dataCenters, setDataCenters] = useState([
    { region: 'US-East-1', load: 72, status: 'Optimal' },
    { region: 'EU-Central-1', load: 68, status: 'Optimal' },
    { region: 'Asia-Pacific-1', load: 81, status: 'High' }
  ])

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

  return (
    <div className="my-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
      <div className="text-[10px] text-gray-400 uppercase font-bold mb-3">Data Center Status</div>
      <div className="space-y-2">
        {dataCenters.map((dc, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌐</span>
              <div>
                <div className="font-semibold text-gray-300">{dc.region}</div>
                <div className="text-gray-500">{dc.status}</div>
              </div>
            </div>
            <div className={`font-bold ${getLoadColor(dc.load)}`}>{dc.load.toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}
