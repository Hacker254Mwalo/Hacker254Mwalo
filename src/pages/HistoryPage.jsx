import { useAuth } from '../context/AuthContext'
import { getInvestments } from '../lib/storage'


export default function HistoryPage() {
  const { user } = useAuth()
  const investments = user ? getInvestments(user.id) : []

  const totalInvested = investments.reduce((s, i) => s + i.amount, 0)
  const totalEarned = investments.reduce((s, i) => s + i.totalReturn, 0)

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-black">Investment History</h2>
        <p className="text-gray-400 text-sm mt-1">Track your investment portfolio</p>
      </div>

      {/* Summary cards */}
      {investments.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-red-400 text-xl font-black">KSh {totalInvested.toLocaleString()}</p>
            <p className="text-gray-400 text-xs mt-1">Total Invested</p>
          </div>
          <div className="card text-center">
            <p className="text-green-400 text-xl font-black">KSh {totalEarned.toLocaleString()}</p>
            <p className="text-gray-400 text-xs mt-1">Expected Earnings</p>
          </div>
        </div>
      )}

      {/* Investment list */}
      {investments.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-gray-400 font-medium">No investments yet</p>
          <p className="text-gray-500 text-sm mt-1">Start investing to see your history here</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">All Investments ({investments.length})</p>
          {investments.map(inv => (
            <div key={inv.id} className="card flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    inv.status === 'active' ? 'bg-green-900/60 text-green-400' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {inv.status || 'active'}
                  </span>
                </div>
                <p className="font-semibold">{inv.planName} Plan</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {new Date(inv.date).toLocaleDateString('en-KE', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-red-400">-KSh {inv.amount.toLocaleString()}</p>
                <p className="text-green-400 text-sm">+KSh {inv.dailyReturn}/day</p>
                <p className="text-yellow-400 text-xs">Total: KSh {inv.totalReturn.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
