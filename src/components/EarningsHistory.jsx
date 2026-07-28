import { useState } from 'react'

export default function EarningsHistory({ planName }) {
  const [period, setPeriod] = useState('7d')

  // Realistic earnings data per plan
  const earningsData = {
    'Starter': {
      '7d': [42, 45, 40, 48, 46, 44, 43],
      '30d': [42, 45, 40, 48, 46, 44, 43, 47, 45, 41, 49, 50, 44, 42, 45, 43, 46, 48, 42, 44, 47, 45, 43, 46, 44, 42, 48, 45, 43, 46]
    },
    'Cloud GPU Rig (RTX 4090)': {
      '7d': [105, 112, 108, 115, 110, 113, 111],
      '30d': [105, 112, 108, 115, 110, 113, 111, 114, 109, 116, 112, 110, 115, 113, 111, 108, 114, 112, 110, 115, 113, 111, 109, 114, 112, 110, 115, 113, 111, 114]
    },
    'AI Server Cluster (A100)': {
      '7d': [225, 240, 235, 250, 245, 242, 238],
      '30d': [225, 240, 235, 250, 245, 242, 238, 248, 240, 252, 244, 238, 250, 246, 241, 235, 248, 244, 240, 250, 246, 242, 238, 248, 244, 240, 250, 246, 242, 248]
    }
  }

  const data = earningsData[planName] || earningsData['Starter']
  const earnings = period === '7d' ? data['7d'] : data['30d']
  const avgEarnings = Math.round(earnings.reduce((a, b) => a + b) / earnings.length)
  const maxEarnings = Math.max(...earnings)
  const minEarnings = Math.min(...earnings)

  return (
    <div className="my-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
      <div className="flex justify-between items-center mb-3">
        <div className="text-[10px] text-gray-400 uppercase font-bold">Average Daily Earnings</div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('7d')}
            className={`text-[10px] px-2 py-1 rounded ${period === '7d' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
          >
            7D
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`text-[10px] px-2 py-1 rounded ${period === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
          >
            30D
          </button>
        </div>
      </div>

      {/* Mini chart */}
      <div className="flex items-end gap-1 h-12 mb-3">
        {earnings.map((e, i) => (
          <div
            key={i}
            className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t opacity-70 hover:opacity-100 transition"
            style={{ height: `${(e / maxEarnings) * 100}%` }}
            title={`KSh ${e}`}
          />
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-gray-500">Average</div>
          <div className="font-bold text-green-400">KSh {avgEarnings}</div>
        </div>
        <div>
          <div className="text-gray-500">Max</div>
          <div className="font-bold text-green-400">KSh {maxEarnings}</div>
        </div>
        <div>
          <div className="text-gray-500">Min</div>
          <div className="font-bold text-yellow-400">KSh {minEarnings}</div>
        </div>
      </div>
    </div>
  )
}
