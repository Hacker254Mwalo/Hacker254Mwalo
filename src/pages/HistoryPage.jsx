import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getInvestments, getDeposits, getWithdrawals } from '../lib/db'

export default function HistoryPage() {
  const { user } = useAuth()
  const [investments, setInvestments] = useState([])
  const [deposits, setDeposits] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [tab, setTab] = useState('ledger')
  const [toast, setToast] = useState('')
  const prevDepositStatuses = useRef({})
  const prevWithdrawalStatuses = useRef({})

  const phone = user?.phone || user?.id

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }, [])

  useEffect(() => {
    if (!user) return
    getInvestments(phone).then(setInvestments).catch(() => {})
    getDeposits(phone).then(setDeposits).catch(() => {})
    getWithdrawals(phone).then(setWithdrawals).catch(() => {})
  }, [user, phone])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      try {
        const [deps, withs] = await Promise.all([getDeposits(phone), getWithdrawals(phone)])
        setDeposits(deps)
        setWithdrawals(withs)
      } catch { }
    }, 10000)
    return () => clearInterval(interval)
  }, [user, phone])

  useEffect(() => {
    if (!deposits.length && !withdrawals.length) return
    const newDepStatuses = {}
    deposits.forEach(d => { newDepStatuses[d.id] = d.status })
    deposits.forEach(d => {
      const prev = prevDepositStatuses.current[d.id]
      if (prev === 'pending' && d.status === 'approved') showToast(`✅ Deposit of KSh ${Number(d.amount).toLocaleString()} approved!`)
      if (prev === 'pending' && d.status === 'rejected') showToast(`❌ Deposit of KSh ${Number(d.amount).toLocaleString()} rejected.`)
    })
    prevDepositStatuses.current = newDepStatuses

    const newWithStatuses = {}
    withdrawals.forEach(w => { newWithStatuses[w.id] = w.status })
    withdrawals.forEach(w => {
      const prev = prevWithdrawalStatuses.current[w.id]
      if (prev === 'pending' && w.status === 'approved') showToast(`✅ Withdrawal of KSh ${Number(w.amount).toLocaleString()} approved!`)
      if (prev === 'pending' && w.status === 'rejected') showToast(`❌ Withdrawal of KSh ${Number(w.amount).toLocaleString()} rejected & refunded.`)
    })
    prevWithdrawalStatuses.current = newWithStatuses
  }, [deposits, withdrawals, showToast])

  const totalInvested = investments.reduce((s, i) => s + Number(i.amount), 0)
  const totalExpectedReturn = investments.reduce((s, i) => s + Number(i.totalReturn), 0)
  const activeInvestments = investments.filter(i => i.status === 'active')
  const todayInterest = activeInvestments.reduce((s, i) => s + Number(i.dailyReturn), 0)

  const combinedLedger = [
    ...deposits.map(d => ({ ...d, type: 'deposit' })),
    ...withdrawals.map(w => ({ ...w, type: 'withdrawal' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const statusBadge = (status) => {
    const map = {
      pending:   'bg-yellow-900/60 text-yellow-400',
      approved:  'bg-green-900/60 text-green-400',
      rejected:  'bg-red-900/60 text-red-400',
      active:    'bg-green-900/60 text-green-400',
      completed: 'bg-blue-900/60 text-blue-400',
    }
    const label = status === 'approved' ? '✓ Approved' : status === 'rejected' ? '✗ Rejected' : status === 'pending' ? '⏳ Pending' : status
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-800 text-gray-400'}`}>{label}</span>
  }

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-800 border border-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium animate-bounce">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-black">Transaction History</h2>
        <p className="text-gray-400 text-sm mt-1">Detailed account metrics and activity</p>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Today's Interest</p>
          <p className="text-2xl font-black text-green-400">+KSh {todayInterest.toLocaleString()}</p>
          <p className="text-gray-500 text-xs mt-1">From {activeInvestments.length} active plan{activeInvestments.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="card">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Invested</p>
          <p className="text-2xl font-black text-red-400">KSh {totalInvested.toLocaleString()}</p>
          <p className="text-gray-500 text-xs mt-1">Expected return: KSh {totalExpectedReturn.toLocaleString()}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-800 p-1 rounded-xl mb-6">
        {['ledger', 'investments', 'deposits', 'withdrawals'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
              tab === t ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow' : 'text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'ledger' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Account Ledger ({combinedLedger.length})
          </p>
          {combinedLedger.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-400">No transactions yet</p>
            </div>
          ) : (
            combinedLedger.map((item, idx) => (
              <div key={item.id || idx} className="card flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                    item.type === 'deposit' ? 'bg-gradient-to-br from-green-600 to-emerald-600' :
                    item.type === 'withdrawal' ? 'bg-gradient-to-br from-orange-600 to-red-600' :
                    'bg-gradient-to-br from-purple-600 to-indigo-600'
                  }`}>
                    {item.type === 'deposit' ? '💳' : item.type === 'withdrawal' ? '💸' : '📈'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {item.type === 'deposit' ? 'M-Pesa Deposit' : item.type === 'withdrawal' ? 'Withdrawal' : item.planName || 'Investment'}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {new Date(item.created_at).toLocaleDateString('en-KE', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    {item.purpose && <p className="text-gray-400 text-xs italic mt-0.5">"{item.purpose}"</p>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-sm ${item.type === 'deposit' ? 'text-green-400' : item.type === 'withdrawal' ? 'text-red-400' : 'text-red-400'}`}>
                    {item.type === 'deposit' ? '+' : '-'}KSh {Number(item.amount).toLocaleString()}
                  </p>
                  {statusBadge(item.status)}
                  {item.type === 'withdrawal' && item.net_amount && (
                    <p className="text-gray-500 text-xs">Net: KSh {Number(item.net_amount).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'investments' && (
        <div className="space-y-3">
          {investments.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-5xl mb-4">📊</p>
              <p className="text-gray-400 font-medium">No investments yet</p>
              <p className="text-gray-500 text-sm mt-1">Start investing to see your history here</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="card text-center">
                  <p className="text-red-400 text-xl font-black">KSh {totalInvested.toLocaleString()}</p>
                  <p className="text-gray-400 text-xs mt-1">Total Invested</p>
                </div>
                <div className="card text-center">
                  <p className="text-green-400 text-xl font-black">KSh {totalExpectedReturn.toLocaleString()}</p>
                  <p className="text-gray-400 text-xs mt-1">Expected Earnings</p>
                </div>
              </div>
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
                    <p className="font-bold text-red-400">-KSh {Number(inv.amount).toLocaleString()}</p>
                    <p className="text-green-400 text-sm">+KSh {Number(inv.dailyReturn).toLocaleString()}/day</p>
                    <p className="text-yellow-400 text-xs">Total: KSh {Number(inv.totalReturn).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'deposits' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">All Deposits ({deposits.length})</p>
          {deposits.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-5xl mb-4">💳</p>
              <p className="text-gray-400 font-medium">No deposits yet</p>
              <p className="text-gray-500 text-sm mt-1">Deposit via M-Pesa to get started</p>
            </div>
          ) : (
            deposits.map(dep => (
              <div key={dep.id} className="card flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-lg flex-shrink-0">💳</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {statusBadge(dep.status)}
                    </div>
                    <p className="font-semibold text-sm">M-Pesa Deposit</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {new Date(dep.created_at).toLocaleDateString('en-KE', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-green-400">+KSh {Number(dep.amount).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">All Withdrawals ({withdrawals.length})</p>
          {withdrawals.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-5xl mb-4">💸</p>
              <p className="text-gray-400 font-medium">No withdrawals yet</p>
              <p className="text-gray-500 text-sm mt-1">Withdraw funds to your M-Pesa</p>
            </div>
          ) : (
            withdrawals.map(w => (
              <div key={w.id} className="card flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center text-lg flex-shrink-0">💸</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {statusBadge(w.status)}
                    </div>
                    <p className="font-semibold text-sm">Withdrawal</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {new Date(w.created_at).toLocaleDateString('en-KE', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    {w.mpesa_phone && <p className="text-gray-400 text-xs">→ {w.mpesa_phone}</p>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-red-400">-KSh {Number(w.amount).toLocaleString()}</p>
                  {w.net_amount && <p className="text-gray-500 text-xs">Net: KSh {Number(w.net_amount).toLocaleString()}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
