import { useState } from 'react'
import { updateInvestmentWorkload } from '../lib/db'

const WORKLOADS = [
  { id: 'healthcare', name: 'Healthcare Diagnostics', desc: 'Medical AI processing', yield_multiplier: 1.0 },
  { id: 'autonomous', name: 'Autonomous Driving', desc: 'Self-driving car data', yield_multiplier: 1.15 },
  { id: 'finance', name: 'Financial Forecasting', desc: 'Market algorithms', yield_multiplier: 1.25 }
]

export default function WorkloadSelector({ investment, userPhone }) {
  const [selected, setSelected] = useState(investment.workload || 'healthcare')
  const [isSaving, setIsSaving] = useState(false)
  
  const handleSelect = async (workloadId) => {
    setSelected(workloadId)
    setIsSaving(true)
    try {
      await updateInvestmentWorkload(investment.id, workloadId, userPhone)
    } catch (err) {
      console.error('Workload update failed:', err)
      setSelected(investment.workload || 'healthcare')
    }
    setIsSaving(false)
  }
  
  return (
    <div className="console-card mt-3">
      <div className="console-label mb-3">Deploy Workload</div>
      <div className="space-y-2">
        {WORKLOADS.map(w => (
          <button
            key={w.id}
            onClick={() => handleSelect(w.id)}
            disabled={isSaving}
            className={`w-full p-3 rounded-lg text-left text-sm transition ${
              selected === w.id
                ? 'bg-blue-600 border border-blue-400'
                : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="font-semibold">{w.name}</div>
            <div className="text-xs text-gray-400">{w.desc}</div>
            <div className="text-xs text-green-400 mt-1">+{((w.yield_multiplier - 1) * 100).toFixed(0)}% yield</div>
          </button>
        ))}
      </div>
    </div>
  )
}
