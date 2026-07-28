import { useEffect, useState } from 'react'

export default function ProvisioningSequence({ isActive, onComplete }) {
  const [step, setStep] = useState(0)
  
  const steps = [
    'Allocating Virtual GPU...',
    'Loading Industry Workload...',
    'Establishing Secure Uplink...',
    'Initializing Yield Engine...'
  ]
  
  useEffect(() => {
    if (!isActive) return
    
    const interval = setInterval(() => {
      setStep(prev => {
        if (prev >= steps.length - 1) {
          onComplete()
          return prev
        }
        return prev + 1
      })
    }, 1200)
    
    return () => clearInterval(interval)
  }, [isActive, steps.length, onComplete])
  
  if (!isActive) return null
  
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="console-card max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⚙️</div>
          <h3 className="text-lg font-bold">Provisioning Node</h3>
        </div>
        
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 flex items-center justify-center">
                {i < step ? '✓' : i === step ? '⟳' : '○'}
              </div>
              <span className={i <= step ? 'text-white' : 'text-gray-600'}>{s}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-6 w-full bg-gray-700 rounded-full h-1 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
