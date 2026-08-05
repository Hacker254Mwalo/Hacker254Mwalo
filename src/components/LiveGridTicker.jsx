import { useState, useEffect } from 'react'

export default function LiveGridTicker() {
  const [stats, setStats] = useState({
    hashrate: '482.1 PH/s',
    nodes: '12,842',
    uptime: '99.99%',
    latency: '12ms'
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        hashrate: (480 + Math.random() * 5).toFixed(1) + ' PH/s',
        latency: (10 + Math.random() * 5).toFixed(0) + 'ms'
      }))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full bg-black/40 backdrop-blur-md border-y border-[#FFD700]/20 py-2 overflow-hidden whitespace-nowrap">
      <div className="flex animate-marquee items-center gap-12 text-[10px] font-mono uppercase tracking-widest text-[#FFD700]/80">
        <span className="flex items-center gap-2">● GLOBAL HASHRATE: <span className="text-white">{stats.hashrate}</span></span>
        <span className="flex items-center gap-2">● ACTIVE GPU NODES: <span className="text-white">{stats.nodes}</span></span>
        <span className="flex items-center gap-2">● NETWORK UPTIME: <span className="text-white">{stats.uptime}</span></span>
        <span className="flex items-center gap-2">● API LATENCY: <span className="text-white">{stats.latency}</span></span>
        <span className="flex items-center gap-2">● CLUSTER STATUS: <span className="text-green-400">OPTIMIZED</span></span>
        {/* Duplicate for seamless loop */}
        <span className="flex items-center gap-2">● GLOBAL HASHRATE: <span className="text-white">{stats.hashrate}</span></span>
        <span className="flex items-center gap-2">● ACTIVE GPU NODES: <span className="text-white">{stats.nodes}</span></span>
        <span className="flex items-center gap-2">● NETWORK UPTIME: <span className="text-white">{stats.uptime}</span></span>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  )
}
