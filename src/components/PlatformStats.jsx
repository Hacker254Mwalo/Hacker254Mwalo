import { useState, useEffect } from 'react'
import { getPlatformStats } from '../lib/db'

export default function PlatformStats() {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getPlatformStats()
        setStats(data)
      } catch (err) {
        console.error('Failed to load platform stats:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  if (loading && stats.length === 0) return (
    <div className="h-12 flex items-center justify-center space-x-8 overflow-hidden bg-black/20 border-b border-white/5">
      <div className="w-32 h-4 bg-white/5 animate-pulse rounded"></div>
      <div className="w-32 h-4 bg-white/5 animate-pulse rounded"></div>
      <div className="w-32 h-4 bg-white/5 animate-pulse rounded"></div>
    </div>
  )

  return (
    <div className="relative overflow-hidden bg-black/40 border-b border-white/5 backdrop-blur-sm py-2">
      <div className="flex whitespace-nowrap animate-scroll-stats px-4 space-x-12 items-center">
        {stats.map((s, i) => (
          <div key={i} className="flex items-center space-x-2 text-[10px] md:text-xs font-mono">
            <span className="text-emerald-400">🟢</span>
            <span className="text-gray-400">{s.stat_label}:</span>
            <span className="text-white font-bold">
              {s.stat_key.includes('ksh') ? 'KSh ' : ''}
              {Number(s.stat_value).toLocaleString()}
            </span>
          </div>
        ))}
        {/* Duplicate for infinite scroll feel if list is short */}
        {stats.map((s, i) => (
          <div key={`dup-${i}`} className="flex items-center space-x-2 text-[10px] md:text-xs font-mono">
            <span className="text-emerald-400">🟢</span>
            <span className="text-gray-400">{s.stat_label}:</span>
            <span className="text-white font-bold">
              {s.stat_key.includes('ksh') ? 'KSh ' : ''}
              {Number(s.stat_value).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes scroll-stats {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll-stats {
          animation: scroll-stats 40s linear infinite;
        }
        .animate-scroll-stats:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
