import { useEffect, useState, useRef } from 'react'

export default function ProvisioningSequence({ isActive, onComplete }) {
  const [logs, setLogs] = useState([])
  const [progress, setProgress] = useState(0)
  const logEndRef = useRef(null)
  
  const terminalLines = [
    { text: '>> INITIALIZING SECURE PROVISIONING PROTOCOL [AES-256]', color: 'text-blue-400', delay: 400 },
    { text: '>> ESTABLISHING HANDSHAKE WITH NAIROBI-DC-04...', color: 'text-gray-400', delay: 600 },
    { text: '>> RSA-4096 AUTHENTICATION: VERIFIED', color: 'text-emerald-400', delay: 500 },
    { text: '>> ALLOCATING H100 TENSOR CORES (8x CLUSTER)...', color: 'text-gray-400', delay: 800 },
    { text: '>> VIRTUALIZING NEURAL RUNTIME [CUDA 12.4]...', color: 'text-gray-400', delay: 400 },
    { text: '>> MOUNTING ENTERPRISE DATASETS: MEDSCAN_AI_V4', color: 'text-indigo-400', delay: 700 },
    { text: '>> OPTIMIZING TENSOR PARALLELISM: 98.4% EFFICIENCY', color: 'text-emerald-400', delay: 600 },
    { text: '>> UPLINK SECURED: MULTI-REGION REVENUE SYNC', color: 'text-blue-400', delay: 500 },
    { text: '>> SYNCING WITH GLOBAL COMPUTE LEDGER...', color: 'text-gray-400', delay: 900 },
    { text: '>> BOOTING REAL-TIME YIELD ENGINE...', color: 'text-yellow-400', delay: 600 },
    { text: '>> NODE STATUS: OPERATIONAL [ID: NODE-KE-PRO]', color: 'text-emerald-400', fontBold: true, delay: 500 },
  ]

  useEffect(() => {
    if (!isActive) return
    
    let currentLine = 0
    let timeoutId

    const addLine = () => {
      if (currentLine < terminalLines.length) {
        const line = terminalLines[currentLine]
        setLogs(prev => [...prev, line])
        setProgress(((currentLine + 1) / terminalLines.length) * 100)
        currentLine++
        timeoutId = setTimeout(addLine, line.delay)
      } else {
        timeoutId = setTimeout(onComplete, 1200)
      }
    }

    addLine()
    return () => clearTimeout(timeoutId)
  }, [isActive, onComplete])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  if (!isActive) return null

  return (
    <div className="fixed inset-0 bg-black/98 z-[100] flex items-center justify-center p-4 backdrop-blur-xl">
      <div className="w-full max-w-md bg-[#020202] rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,180,255,0.1)] overflow-hidden flex flex-col" style={{ height: '420px' }}>
        {/* Terminal Header */}
        <div className="bg-[#0a0a0a] px-5 py-3 flex items-center justify-between border-b border-white/5">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/30 border border-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/30 border border-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/50" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">Deployment Console v5.0</span>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="flex-1 p-6 font-mono text-[11px] overflow-y-auto space-y-2 scrollbar-hide">
          <div className="text-gray-600 mb-4 opacity-50 text-[9px]">
            [SYSTEM INFO] Kernel: v6.8.0-Compute | Arch: x86_64_AVX512
          </div>
          {logs.map((log, i) => (
            <div key={i} className={`${log.color} ${log.fontBold ? 'font-black text-xs mt-3 pt-3 border-t border-white/5' : ''} animate-fadeIn flex gap-2`}>
              <span className="opacity-30">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
              <span>{log.text}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Progress Bar Area */}
        <div className="p-6 bg-black/80 border-t border-white/5">
          <div className="flex justify-between items-end mb-3">
            <div className="flex flex-col">
              <span className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Deployment Progress</span>
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-tighter">
                {progress < 100 ? 'Synchronizing Cluster...' : 'Node Provisioned Successfully'}
              </span>
            </div>
            <span className="text-xs text-white font-mono font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-900/50 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 via-emerald-500 to-emerald-400 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.15s ease-out forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  )
}
