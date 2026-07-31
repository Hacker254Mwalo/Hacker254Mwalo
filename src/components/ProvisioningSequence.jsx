import { useEffect, useState, useRef } from 'react'

export default function ProvisioningSequence({ isActive, onComplete }) {
  const [logs, setLogs] = useState([])
  const [progress, setProgress] = useState(0)
  const logEndRef = useRef(null)
  
  const terminalLines = [
    { text: '> INITIALIZING PROVISIONING PROTOCOL...', color: 'text-blue-400', delay: 400 },
    { text: '> CONNECTING TO NAIROBI-DC-04 CLUSTER...', color: 'text-gray-400', delay: 600 },
    { text: '> AUTHENTICATING OPERATOR CREDENTIALS... [OK]', color: 'text-emerald-400', delay: 500 },
    { text: '> ALLOCATING GPU CORES (NVIDIA H100)...', color: 'text-gray-400', delay: 800 },
    { text: '> MOUNTING VIRTUAL RUNTIME ENVIRONMENT...', color: 'text-gray-400', delay: 400 },
    { text: '> LOADING ENTERPRISE WORKLOAD DATASETS...', color: 'text-gray-400', delay: 700 },
    { text: '> OPTIMIZING TENSOR PARALLELISM... [SUCCESS]', color: 'text-emerald-400', delay: 600 },
    { text: '> ESTABLISHING SECURE REVENUE UPLINK...', color: 'text-blue-400', delay: 500 },
    { text: '> SYNCING WITH GLOBAL COMPUTE NETWORK...', color: 'text-gray-400', delay: 900 },
    { text: '> STARTING YIELD GENERATION ENGINE...', color: 'text-yellow-400', delay: 600 },
    { text: '> NODE STATUS: ACTIVE & OPERATIONAL.', color: 'text-emerald-400', fontBold: true, delay: 500 },
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
        timeoutId = setTimeout(onComplete, 1000)
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
    <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#050505] rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col" style={{ height: '400px' }}>
        {/* Terminal Header */}
        <div className="bg-[#1a1a1a] px-4 py-2 flex items-center justify-between border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
          </div>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Provisioning Terminal v4.0.2</span>
        </div>

        {/* Terminal Content */}
        <div className="flex-1 p-5 font-mono text-[11px] overflow-y-auto space-y-1.5 scrollbar-hide">
          {logs.map((log, i) => (
            <div key={i} className={`${log.color} ${log.fontBold ? 'font-black text-xs mt-2' : ''} animate-fadeIn`}>
              {log.text}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Progress Bar Area */}
        <div className="p-5 bg-black/50 border-t border-white/5">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-tighter">
              {progress < 100 ? 'System Initializing...' : 'Deployment Complete'}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 via-emerald-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  )
}
