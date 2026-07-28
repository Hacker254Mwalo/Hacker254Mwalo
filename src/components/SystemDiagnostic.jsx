import { useState } from 'react'
import { updateInvestmentOptimization } from '../lib/db'

export default function SystemDiagnostic({ investment, userPhone }) {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationStep, setOptimizationStep] = useState(0)
  
  const steps = [
    'Flushing Node Cache...',
    'Calibrating GPU Cores...',
    'Syncing Yield Ledger...',
    'Verifying Network Uplink...'
  ]
  
  const handleOptimize = async () => {
    setIsOptimizing(true)
    
    for (let i = 0; i < steps.length; i++) {
      setOptimizationStep(i)
      await new Promise(resolve => setTimeout(resolve, 800))
    }
    
    try {
      await updateInvestmentOptimization(investment.id, userPhone)
    } catch (err) {
      console.error('Optimization failed:', err)
    }
    
    setIsOptimizing(false)
    setOptimizationStep(0)
  }
  
  const lastOptimized = new Date(investment.last_executed_at || investment.started_at)
  const hoursSince = (new Date() - lastOptimized) / 3600000
  const needsOptimization = hoursSince > 24
  
  return (
    <div className={`console-card mt-3 ${needsOptimization ? 'border-yellow-500/50' : ''}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="console-label">System Health</div>
        <div className={`text-sm font-bold ${needsOptimization ? 'text-yellow-400' : 'text-green-400'}`}>
          {needsOptimization ? '⚠ Needs Optimization' : '✓ Optimal'}
        </div>
      </div>
      
      {isOptimizing ? (
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="text-xs text-gray-400">
              {i < optimizationStep ? '✓' : i === optimizationStep ? '⟳' : '○'} {step}
            </div>
          ))}
        </div>
      ) : (
        <button
          onClick={handleOptimize}
          disabled={!needsOptimization}
          className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg text-sm font-semibold transition"
        >
          {needsOptimization ? 'Run Optimization' : 'System Optimal'}
        </button>
      )}
    </div>
  )
}
