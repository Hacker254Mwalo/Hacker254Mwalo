import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getInvestments, getDeposits, getWithdrawals, getUserLoans, getShortTermInvestments } from '../lib/db'
import { PLANS } from '../lib/plans'

const PLAN_NAME_MAP = {
  'Starter': '⚡ Micro-AI Node (V1)',
  'Basic': '🚀 Cloud GPU Rig (RTX 4090)',
  'Silver': '💻 AI Server Cluster (A100)',
  'Gold': '🔥 Neural Network Array (H100)',
  'Platinum': '🌐 Deep Learning Center',
  'Diamond': '⚡ Quantum-AI Gateway',
  'Ruby': '🏗️ DataCenter Pod V1',
  'Emerald': '🛡️ Sovereign AI Rig',
  'Sapphire': '🚀 HyperScale AI Grid',
  'VIP': '👑 Enterprise Compute Matrix',
}

function getRebrandedName(planName) {
  return PLAN_NAME_MAP[planName] || planName
}

function StatusBadge({ status }) {
  const map = {
    pending:   { cls: 'badge-pending',  icon: '⏳', label: 'Pending' },
    approved:  { cls: 'badge-approved', icon: '✓',  label: 'Approved' },
    rejected:  { cls: 'badge-rejected', icon: '✗',  label: 'Rejected' },
    active:    { cls: 'badge-active',   icon: '●',  label: 'Active' },
    completed: { cls: 'badge-approved', icon: '✓',  label: 'Completed' },
  }
  const { cls, icon, label } = map[status] || { cls: 'badge-active', icon: '?', label: status }
  return <span className={cls}>{icon} {label}</span>
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="card text-center py-16">
      <p className="text-5xl mb-4">{icon}</p>
      <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
    </div>
  )
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [nodes, setInvestments] = useState([])
  const [shortTermInvestments, setShortTermInvestments] = useState([])
  const [deposits, setDeposits] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [loans, setLoans] = useState([])
  const [tab, setTab] = useState('ledger')
  const [toast, setToast] = useState(null)
  const prevDepositStatuses = useRef({})
  const prevWithdrawalStatuses = useRef({})

  const phone = user?.phone || user?.id

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    if (!user) return
    getInvestments(phone).then(setInvestments).catch(() => {})
    getShortTermInvestments(phone).then(setShortTermInvestments).catch(() => {})
    getDeposits(phone).then(setDeposits).catch(() => {})
    getWithdrawals(phone).then(setWithdrawals).catch(() => {})
    getUserLoans(phone).then(setLoans).catch(() => {})
  }, [user, phone])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      try {
        const [deps, withs, lns, stInvs] = await Promise.all([
          getDeposits(phone), 
          getWithdrawals(phone),
          getUserLoans(phone),
          getShortTermInvestments(phone)
        ])
        setDeposits(deps)
        setWithdrawals(withs)
        setLoans(lns)
        setShortTermInvestments(stInvs)
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
      if (prev === 'pending' && d.status === 'approved') showToast(`✅ Top up of KSh ${Number(d.amount).toLocaleString()} approved!`, 'success')
      if (prev === 'pending' && d.status === 'rejected') showToast(`❌ Top up of KSh ${Number(d.amount).toLocaleString()} rejected.`, 'error')
    })
    prevDepositStatuses.current = newDepStatuses

    const newWithStatuses = {}
    withdrawals.forEach(w => { newWithStatuses[w.id] = w.status })
    withdrawals.forEach(w => {
      const prev = prevWithdrawalStatuses.current[w.id]
      if (prev === 'pending' && w.status === 'approved') showToast(`✅ Withdrawal of KSh ${Number(w.amount).toLocaleString()} approved!`, 'success')
      if (prev === 'pending' && w.status === 'rejected') showToast(`❌ Withdrawal of KSh ${Number(w.amount).toLocaleString()} rejected & refunded.`, 'error')
    })
    prevWithdrawalStatuses.current = newWithStatuses
  }, [deposits, withdrawals, showToast])

  const totalInvested = nodes.reduce((s, i) => s + Number(i.amount || 0), 0)
  const totalExpectedReturn = nodes.reduce((s, i) => s + Number(i.totalReturn || 0), 0)
  const activeNodes = nodes.filter(i => i.status === 'active')
  // Show actual credited profit from all active nodes (from server-side cron accrual)
  const todayInterest = activeNodes.reduce((s, i) => s + Number(i.profit || 0), 0)

  const combinedLedger = [
    ...deposits.map(d => ({ ...d, type: 'deposit' })),
    ...withdrawals.map(w => ({ ...w, type: 'withdrawal' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const tabs = [
    { id: 'ledger', label: 'Ledger', count: combinedLedger.length },
    { id: 'investments', label: 'Node Fleet', count: nodes.length },
    { id: 'quick-returns', label: 'Spot Market', count: shortTermInvestments.length },
    { id: 'deposits', label: 'Top Ups', count: deposits.length },
    { id: 'withdrawals', label: 'Withdrawals', count: withdrawals.length },
    { id: 'loans', label: 'Loans', count: loans.length },
  ]

  function fmt(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-black">Transaction History</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Detailed account metrics and activity</p>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Today's Compute Yield</p>
          <p className="text-2xl font-black text-green-400">+KSh {todayInterest.toLocaleString()}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>From {activeNodes.length} active plan{activeNodes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Total Network Capacity</p>
          <p className="text-2xl font-black text-red-400">KSh {totalInvested.toLocaleString()}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Expected Yield: KSh {totalExpectedReturn.toLocaleString()}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--bg-input)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow'
                : 'text-gray-400'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-gray-700 text-gray-400'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Ledger Tab */}
      {tab === 'ledger' && (
        <div className="space-y-3 animate-fadeIn">
          {combinedLedger.length === 0 ? (
            <EmptyState icon="📋" title="No transactions yet" subtitle="Your deposits and withdrawals will appear here" />
          ) : (
            combinedLedger.map((item, idx) => (
              <div key={item.id || idx} className="card flex items-start justify-between gap-4 hover:border-gray-600 transition-colors">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                    item.type === 'deposit' ? 'bg-gradient-to-br from-green-600 to-emerald-600' :
                    'bg-gradient-to-br from-orange-600 to-red-600'
                  }`}>
                    {item.type === 'deposit' ? '💳' : '💸'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {item.type === 'deposit' ? 'M-Pesa Top Up' : 'Withdrawal'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmt(item.created_at)}</p>
                    {item.type === 'withdrawal' && item.mpesa_phone && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>→ {item.mpesa_phone}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className={`font-bold text-sm ${
                    item.type === 'deposit' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {item.type === 'deposit' ? '+' : '-'}KSh {Number(item.amount).toLocaleString()}
                  </p>
                  <StatusBadge status={item.status} />
                  {item.type === 'withdrawal' && item.net_amount && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Net: KSh {Number(item.net_amount).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Investments Tab */}
      {tab === 'investments' && (
        <div className="space-y-3 animate-fadeIn">
          {nodes.length === 0 ? (
            <EmptyState icon="📊" title="No nodes yet" subtitle="Provision a node to see your operation logs here" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="card text-center">
                  <p className="text-red-400 text-xl font-black">KSh {totalInvested.toLocaleString()}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Total Network Capacity</p>
                </div>
                <div className="card text-center">
                  <p className="text-green-400 text-xl font-black">KSh {totalExpectedReturn.toLocaleString()}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Expected Compute Yield</p>
                </div>
              </div>
              {nodes.map(inv => {
                const startDate = inv.startedAt ? new Date(inv.startedAt) : new Date(inv.date)
                const endDate = inv.endsAt ? new Date(inv.endsAt) : new Date(startDate.getTime() + 60 * 86400000)
                const now = new Date()
                const totalDays = Math.max(1, Math.ceil((endDate - startDate) / 86400000))
                const daysPassed = inv.status === 'active'
                  ? Math.max(0, Math.floor((now - startDate) / 86400000))
                  : totalDays
                const dailyReturn = Number(inv.dailyReturn || 0)
                // Show ACTUAL credited profit from server for active nodes
                // Completed nodes show their full total return
                const accumulatedProfit = inv.status === 'active'
                  ? Number(inv.profit || 0)
                  : Number(inv.totalReturn || 0)
                const targetTotal = Number(inv.totalReturn || 0)
                // Progress % = (accumulated profit / total return target) * 100
                // This shows actual earnings progress, not just calendar days
                const progress = targetTotal > 0 ? Math.min(100, Math.round((accumulatedProfit / targetTotal) * 100)) : 0

                return (
                <div key={inv.id} className="card hover:border-gray-600 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={inv.status || 'active'} />
                      </div>
                      <p className="font-semibold">{getRebrandedName(inv.planName)}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmt(inv.date)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-red-400">-KSh {Number(inv.amount).toLocaleString()}</p>
                      <p className="text-green-400 text-sm">+KSh {dailyReturn.toLocaleString()}/day</p>
                      <p className="text-yellow-400 text-xs">Total: KSh {targetTotal.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg px-3 py-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>+ Total Yield</span>
                      <span className="text-green-400 font-bold text-sm">KSh {accumulatedProfit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      <span>Day {daysPassed} of {totalDays}</span>
                      <span>{progress}% complete</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-input)' }}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-pink-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
              })}
            </>
          )}
        </div>
      )}

      {/* Quick Returns Tab (Short-Term Nodes) */}
      {tab === 'quick-returns' && (
        <div className="space-y-3 animate-fadeIn">
          {shortTermInvestments.length === 0 ? (
            <EmptyState icon="⚡" title="No Spot Market nodes yet" subtitle="Provision a spot contract from the Compute page" />
          ) : (
            shortTermInvestments.map(inv => {
              const startDate = inv.startedAt ? new Date(inv.startedAt) : new Date(inv.created_at)
              const endDate = inv.endsAt ? new Date(inv.endsAt) : new Date(startDate.getTime() + inv.duration_hours * 3600000)
              const now = new Date()
              const isExpired = endDate <= now
              const statusLabel = inv.status === 'completed' ? 'completed' : isExpired ? 'active' : 'active'
              const totalDays = Math.max(1, Math.ceil((endDate - startDate) / 86400000))
              const daysPassed = isExpired ? totalDays : Math.max(0, Math.floor((now - startDate) / 86400000))
              const progress = totalDays > 0 ? Math.min(100, Math.round((daysPassed / totalDays) * 100)) : 0

              return (
                <div key={inv.id} className="card hover:border-gray-600 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={statusLabel} />
                        {inv.nodeId && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                            {inv.nodeId}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold">{inv.planName}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmt(inv.created_at)}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {inv.duration_hours}h cycle · {(Math.round((inv.multiplier - 1) * 100))}% return
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-blue-400">-KSh {Number(inv.amount).toLocaleString()}</p>
                      <p className="text-emerald-400 text-xs">+KSh {Number(inv.totalReturn - inv.amount).toLocaleString()} profit</p>
                      <p className="text-yellow-400 text-xs">Total: KSh {Number(inv.totalReturn).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg px-3 py-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Progress</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {inv.status === 'completed' ? 'Completed ✓' : isExpired ? 'Maturing...' : `${daysPassed}d of ${totalDays}d`}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      <span>{progress}% complete</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-input)' }}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Loans Tab */}
      {tab === 'loans' && (
        <div className="space-y-3 animate-fadeIn">
          {loans.length === 0 ? (
            <EmptyState icon="💰" title="No loans yet" subtitle="Request a loan to see it here" />
          ) : (
            loans.map(loan => (
              <div key={loan.id} className="card flex items-start justify-between gap-4 hover:border-gray-600 transition-colors">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-lg flex-shrink-0">💰</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Loan Request</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmt(loan.created_at)}</p>
                    {loan.purpose && (
                      <p className="text-xs mt-0.5 italic" style={{ color: 'var(--text-secondary)' }}>"{loan.purpose}"</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="font-bold text-sm text-blue-400">KSh {Number(loan.amount).toLocaleString()}</p>
                  <StatusBadge status={loan.status} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Top Ups Tab */}
      {tab === 'deposits' && (
        <div className="space-y-3 animate-fadeIn">
          {deposits.length === 0 ? (
            <EmptyState icon="💳" title="No top ups yet" subtitle="Top up via M-Pesa to get started" />
          ) : (
            deposits.map(dep => (
              <div key={dep.id} className="card flex items-start justify-between gap-4 hover:border-gray-600 transition-colors">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-lg flex-shrink-0">💳</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">M-Pesa Top Up</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmt(dep.created_at)}</p>
                    {dep.mpesa_receipt && (
                      <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-secondary)' }}>Ref: {dep.mpesa_receipt}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="font-bold text-green-400">+KSh {Number(dep.amount).toLocaleString()}</p>
                  <StatusBadge status={dep.status} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Withdrawals Tab */}
      {tab === 'withdrawals' && (
        <div className="space-y-3 animate-fadeIn">
          {withdrawals.length === 0 ? (
            <EmptyState icon="💸" title="No withdrawals yet" subtitle="Withdraw funds to your M-Pesa" />
          ) : (
            withdrawals.map(w => (
              <div key={w.id} className="card flex items-start justify-between gap-4 hover:border-gray-600 transition-colors">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center text-lg flex-shrink-0">💸</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Withdrawal Request</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmt(w.created_at)}</p>
                    {w.mpesa_phone && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>→ {w.mpesa_phone}</p>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="font-bold text-red-400">-KSh {Number(w.amount).toLocaleString()}</p>
                  <StatusBadge status={w.status} />
                  {w.net_amount && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Net: KSh {Number(w.net_amount).toLocaleString()}
                      {w.fee ? ` (fee: KSh ${Number(w.fee).toLocaleString()})` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
