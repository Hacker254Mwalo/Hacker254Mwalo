import { useState, useEffect } from 'react'

export default function YieldClaimHistory({ userPhone }) {
  const [claimHistory, setClaimHistory] = useState([])
  
  useEffect(() => {
    // Simulate realistic claim history
    const generateClaims = () => {
      const claims = []
      const now = new Date()
      
      for (let i = 0; i < 5; i++) {
        const daysAgo = i
        const claimDate = new Date(now.getTime() - daysAgo * 86400000)
        claims.push({
          id: i,
          amount: Math.floor(Math.random() * 5000) + 500,
          type: ['daily_bonus', 'yield_claim', 'compute_cycle'][Math.floor(Math.random() * 3)],
          date: claimDate,
          status: 'completed'
        })
      }
      return claims
    }
    
    setClaimHistory(generateClaims())
  }, [userPhone])
  
  const getTypeLabel = (type) => {
    const labels = {
      daily_bonus: 'Daily Bonus',
      yield_claim: 'Yield Claim',
      compute_cycle: 'Compute Cycle'
    }
    return labels[type] || 'Claim'
  }
  
  const getTypeIcon = (type) => {
    const icons = {
      daily_bonus: '🎁',
      yield_claim: '📈',
      compute_cycle: '⚙️'
    }
    return icons[type] || '✓'
  }
  
  return (
    <div className="console-card mt-3">
      <div className="console-label mb-3">Claim History</div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {claimHistory.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">No claims yet</div>
        ) : (
          claimHistory.map((claim, idx) => (
            <div key={claim.id} className="transaction-item flex items-center justify-between p-2 rounded bg-gray-800/50 text-xs" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-lg">{getTypeIcon(claim.type)}</span>
                <div className="flex-1">
                  <div className="text-gray-300">{getTypeLabel(claim.type)}</div>
                  <div className="text-gray-500">{claim.date.toLocaleDateString()}</div>
                </div>
              </div>
              <div className="font-mono font-semibold text-green-400">
                +KSh {claim.amount.toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
