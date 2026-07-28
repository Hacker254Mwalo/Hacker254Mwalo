import { useEffect, useState } from 'react'

export default function TransactionLog({ userPhone }) {
  const [transactions, setTransactions] = useState([])
  
  useEffect(() => {
    // Simulate realistic transaction generation
    const generateTransaction = () => {
      const types = ['earning', 'withdrawal', 'bonus']
      const type = types[Math.floor(Math.random() * types.length)]
      
      let amount, description, icon, color
      
      if (type === 'earning') {
        amount = Math.floor(Math.random() * 231) + 19 // 19-250
        description = 'Yield Earned'
        icon = '📈'
        color = 'text-green-400'
      } else if (type === 'withdrawal') {
        amount = Math.floor(Math.random() * 11500) + 500 // 500-12000
        description = 'Withdrawal'
        icon = '💳'
        color = 'text-blue-400'
      } else {
        amount = Math.floor(Math.random() * 1192) + 8 // 8-1200
        description = 'Daily Bonus'
        icon = '🎁'
        color = 'text-yellow-400'
      }
      
      return {
        id: Date.now() + Math.random(),
        type,
        amount,
        description,
        icon,
        color,
        timestamp: new Date(),
        phone: `254712***${Math.floor(Math.random() * 90) + 10}`
      }
    }
    
    // Add initial transactions
    const initial = Array.from({ length: 3 }, () => generateTransaction())
    setTransactions(initial)
    
    // Simulate new transactions every 8-15 seconds
    const interval = setInterval(() => {
      setTransactions(prev => {
        const updated = [generateTransaction(), ...prev]
        return updated.slice(0, 8) // Keep max 8 transactions
      })
    }, Math.floor(Math.random() * 7000) + 8000)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="console-card mt-3">
      <div className="console-label mb-3">Recent Transactions</div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">No transactions yet</div>
        ) : (
          transactions.map((tx, idx) => (
            <div key={tx.id} className="transaction-item flex items-center justify-between p-2 rounded bg-gray-800/50 text-xs" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-lg">{tx.icon}</span>
                <div className="flex-1">
                  <div className="text-gray-300">{tx.description}</div>
                  <div className="text-gray-500">{tx.phone}</div>
                </div>
              </div>
              <div className={`font-mono font-semibold ${tx.color}`}>
                +KSh {tx.amount.toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
