import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import RemoteDepositTrigger from '../components/RemoteDepositTrigger'
import {
  getAllDeposits, approveDeposit, rejectDeposit,
  getAllWithdrawals, approveWithdrawal, rejectWithdrawal,
  getAllLoans, approveLoan, rejectLoan,
  adminSetBalance, adminSetBonusBalance,
  adminDeleteUser, adminUpdateUserStatus, getInvestments,
  getKeywords, createKeyword, updateKeyword, deleteKeyword, toggleKeyword,
  getAllSupportThreads, getSupportMessages, sendSupportMessage,
  getPasswordResetRequests, adminResetPassword,
  getWhatsAppSettings, updateAppSetting,
  getAllReferrals, getReferrals,
  getAllTransactions, deleteTransaction,
  adminGetAllNotifications, adminSendNotificationAll, adminSendNotificationUser, adminDeleteNotification,
  getAllUsers,
} from '../lib/db'

// ── Shared helpers ────────────────────────────────────────────────────────────
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

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function SectionHeader({ title, count, subtitle }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-bold">{title}</h3>
        {count !== undefined && count > 0 && (
          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-semibold">{count}</span>
        )}
      </div>
      {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <p className="font-semibold text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} className="btn-primary flex-1">Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ── Deposits Tab ──────────────────────────────────────────────────────────────
function DepositsTab({ showToast }) {
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setDeposits(await getAllDeposits())
    } catch (error) {
      setDeposits([])
      showToast(error instanceof Error ? error.message : 'Failed to load deposits', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const filtered = deposits.filter(d => filter === 'all' ? true : d.status === filter)
  const pendingCount = deposits.filter(d => d.status === 'pending').length

  async function handleApprove(dep) {
    try {
      await approveDeposit(dep.id, dep.user_phone, dep.amount)
      showToast(`✅ Deposit of KSh ${Number(dep.amount).toLocaleString()} approved`)
      load()
    } catch { showToast('❌ Failed to approve deposit', 'error') }
  }

  async function handleReject(dep) {
    try {
      await rejectDeposit(dep.id)
      showToast('Deposit rejected')
      load()
    } catch { showToast('❌ Failed to reject deposit', 'error') }
  }

  return (
    <div>
      {confirm && <ConfirmDialog message={confirm.message} onConfirm={() => { confirm.action(); setConfirm(null) }} onCancel={() => setConfirm(null)} />}
      <RemoteDepositTrigger showToast={showToast} />
      <SectionHeader title="Deposit Requests" count={pendingCount} subtitle="Approve or reject M-Pesa deposit submissions" />

      <div className="flex gap-2 mb-5 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
            style={{ background: filter === f ? undefined : 'var(--bg-input)' }}>
            {f} {f !== 'all' && <span className="ml-1 opacity-70">({deposits.filter(d => d.status === f).length})</span>}
          </button>
        ))}
        <button onClick={load} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-all" style={{ background: 'var(--bg-input)' }}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">💳</p>
          <p style={{ color: 'var(--text-muted)' }}>No deposits found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(dep => (
            <div key={dep.id} className="card hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold">{dep.users?.name || dep.user_phone}</span>
                    <StatusBadge status={dep.status} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{dep.user_phone}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{fmt(dep.created_at)}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${dep.method === 'stk' ? 'bg-blue-900/40 text-blue-300' : 'bg-orange-900/40 text-orange-300'}`}>
                      {dep.method || 'manual'}
                    </span>
                    {dep.mpesa_receipt && (
                      <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>Ref: {dep.mpesa_receipt}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-green-400">KSh {Number(dep.amount).toLocaleString()}</p>
                  {dep.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setConfirm({ message: `Approve KSh ${Number(dep.amount).toLocaleString()} deposit?`, action: () => handleApprove(dep) })}
                        className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
                      >✓ Approve</button>
                      <button
                        onClick={() => setConfirm({ message: 'Reject this deposit?', action: () => handleReject(dep) })}
                        className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >✗ Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Withdrawals Tab ───────────────────────────────────────────────────────────
function WithdrawalsTab({ showToast }) {
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setWithdrawals(await getAllWithdrawals()) } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = withdrawals.filter(w => filter === 'all' ? true : w.status === filter)
  const pendingCount = withdrawals.filter(w => w.status === 'pending').length

  async function handleApprove(w) {
    try {
      await approveWithdrawal(w.id)
      showToast(`✅ Withdrawal approved — send KSh ${Number(w.net_amount || w.amount).toLocaleString()} to ${w.mpesa_phone}`)
      load()
    } catch { showToast('❌ Failed to approve withdrawal', 'error') }
  }

  async function handleReject(w) {
    try {
      await rejectWithdrawal(w.id, w.user_phone, w.amount)
      showToast(`Withdrawal rejected & KSh ${Number(w.amount).toLocaleString()} refunded`)
      load()
    } catch { showToast('❌ Failed to reject withdrawal', 'error') }
  }

  return (
    <div>
      {confirm && <ConfirmDialog message={confirm.message} onConfirm={() => { confirm.action(); setConfirm(null) }} onCancel={() => setConfirm(null)} />}
      <SectionHeader title="Withdrawal Requests" count={pendingCount} subtitle="Review and process M-Pesa withdrawal requests" />

      <div className="flex gap-2 mb-5 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
            style={{ background: filter === f ? undefined : 'var(--bg-input)' }}>
            {f} {f !== 'all' && <span className="ml-1 opacity-70">({withdrawals.filter(w => w.status === f).length})</span>}
          </button>
        ))}
        <button onClick={load} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-all" style={{ background: 'var(--bg-input)' }}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">💸</p>
          <p style={{ color: 'var(--text-muted)' }}>No {filter} withdrawals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(w => (
            <div key={w.id} className="card hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold">{w.users?.name || w.user_phone}</span>
                    <StatusBadge status={w.status} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{w.user_phone}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{fmt(w.created_at)}</p>
                  <div className="mt-2 p-2 rounded-lg text-xs space-y-0.5" style={{ background: 'var(--bg-input)' }}>
                    <p>Send to: <span className="font-bold text-white">{w.mpesa_phone}</span></p>
                    <p>Net amount: <span className="font-bold text-green-400">KSh {Number(w.net_amount || w.amount).toLocaleString()}</span></p>
                    {w.fee > 0 && <p style={{ color: 'var(--text-muted)' }}>Fee: KSh {Number(w.fee).toLocaleString()}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-red-400">KSh {Number(w.amount).toLocaleString()}</p>
                  {w.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setConfirm({ message: `Approve withdrawal of KSh ${Number(w.amount).toLocaleString()} to ${w.mpesa_phone}?`, action: () => handleApprove(w) })}
                        className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
                      >✓ Approve</button>
                      <button
                        onClick={() => setConfirm({ message: `Reject & refund KSh ${Number(w.amount).toLocaleString()} to user?`, action: () => handleReject(w) })}
                        className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >↩ Refund</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Loans Tab ─────────────────────────────────────────────────────────────────
function LoansTab({ showToast }) {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setLoans(await getAllLoans()) } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = loans.filter(l => filter === 'all' ? true : l.status === filter)
  const pendingCount = loans.filter(l => l.status === 'pending').length

  async function handleApprove(loan) {
    try {
      await approveLoan(loan.id, loan.user_phone, loan.amount)
      showToast(`✅ Loan of KSh ${Number(loan.amount).toLocaleString()} approved & credited`)
      load()
    } catch { showToast('❌ Failed to approve loan', 'error') }
  }

  async function handleReject(loan) {
    try {
      await rejectLoan(loan.id)
      showToast('Loan request rejected')
      load()
    } catch { showToast('❌ Failed to reject loan', 'error') }
  }

  return (
    <div>
      {confirm && <ConfirmDialog message={confirm.message} onConfirm={() => { confirm.action(); setConfirm(null) }} onCancel={() => setConfirm(null)} />}
      <SectionHeader title="Loan Requests" count={pendingCount} subtitle="Review and disburse loan applications" />

      <div className="flex gap-2 mb-5 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
            style={{ background: filter === f ? undefined : 'var(--bg-input)' }}>
            {f} {f !== 'all' && <span className="ml-1 opacity-70">({loans.filter(l => l.status === f).length})</span>}
          </button>
        ))}
        <button onClick={load} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-all" style={{ background: 'var(--bg-input)' }}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🏦</p>
          <p style={{ color: 'var(--text-muted)' }}>No {filter} loan requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(loan => (
            <div key={loan.id} className="card hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold">{loan.users?.name || loan.user_phone}</span>
                    <StatusBadge status={loan.status} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{loan.user_phone}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{fmt(loan.created_at)}</p>
                  {loan.purpose && (
                    <p className="text-xs mt-1 italic" style={{ color: 'var(--text-secondary)' }}>"{loan.purpose}"</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-purple-400">KSh {Number(loan.amount).toLocaleString()}</p>
                  {loan.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setConfirm({ message: `Approve & disburse KSh ${Number(loan.amount).toLocaleString()} loan?`, action: () => handleApprove(loan) })}
                        className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
                      >✓ Disburse</button>
                      <button
                        onClick={() => setConfirm({ message: 'Reject this loan request?', action: () => handleReject(loan) })}
                        className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >✗ Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab({ showToast }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [editBalance, setEditBalance] = useState('')
  const [editBonus, setEditBonus] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewingInvestments, setViewingInvestments] = useState(null)
  const [userInvs, setUserInvs] = useState([])
  const [invLoading, setInvLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [viewingReferrals, setViewingReferrals] = useState(null)
  const [userReferrals, setUserReferrals] = useState([])
  const [refLoading, setRefLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setUsers(await getAllUsers()) } catch (e) { console.error('Failed to load users:', e) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search)
  )

  function startEdit(u) {
    setEditing(u)
    setEditBalance(String(u.balance || 0))
    setEditBonus(String(u.bonus_balance || 0))
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    try {
      const bal = parseFloat(editBalance)
      const bon = parseFloat(editBonus)
      if (!isNaN(bal)) await adminSetBalance(editing.phone, bal)
      if (!isNaN(bon)) await adminSetBonusBalance(editing.phone, bon)
      showToast(`✅ Updated balance for ${editing.name || editing.phone}`)
      setEditing(null)
      load()
    } catch { showToast('❌ Failed to update balance', 'error') }
    setSaving(false)
  }

  async function handleToggleStatus(u) {
    const newStatus = u.status === 'suspended' ? 'active' : 'suspended'
    try {
      await adminUpdateUserStatus(u.phone, newStatus)
      showToast(`User ${u.phone} is now ${newStatus}`)
      load()
    } catch { showToast('❌ Failed to update status', 'error') }
  }

  async function handleDelete(u) {
    try {
      await adminDeleteUser(u.phone)
      showToast(`✅ Account ${u.phone} deleted permanently`)
      load()
    } catch (error) { 
      showToast(error instanceof Error ? `❌ ${error.message}` : '❌ Failed to delete account', 'error') 
    }
  }

  async function handleViewInvestments(u) {
    setViewingInvestments(u)
    setInvLoading(true)
    try {
      const invs = await getInvestments(u.phone)
      setUserInvs(invs)
    } catch { showToast('❌ Failed to load investments', 'error') }
    setInvLoading(false)
  }

  async function handleViewReferrals(u) {
    setViewingReferrals(u)
    setRefLoading(true)
    try {
      const refs = await getReferrals(u.phone)
      setUserReferrals(refs)
    } catch (e) { console.error('Failed to load referrals:', e); setUserReferrals([]) }
    setRefLoading(false)
  }

  const totalBalance = users.reduce((s, u) => s + Number(u.balance || 0), 0)

  return (
    <div>
      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Edit User Balance</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{editing.name} · {editing.phone}</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Main Balance (KSh)</label>
                <input className="input-field" type="number" value={editBalance} onChange={e => setEditBalance(e.target.value)} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Bonus Balance (KSh)</label>
                <input className="input-field" type="number" value={editBonus} onChange={e => setEditBonus(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <SectionHeader title="All Users" count={users.length} subtitle={`Total platform balance: KSh ${totalBalance.toLocaleString()}`} />

      <div className="mb-4">
        <input className="input-field" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={() => { confirmAction.action(); setConfirmAction(null) }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {viewingInvestments && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewingInvestments(null)}>
          <div className="card max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Investments: {viewingInvestments.phone}</h3>
              <button onClick={() => setViewingInvestments(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            {invLoading ? (
              <p className="text-center py-8 text-gray-500">Loading...</p>
            ) : userInvs.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No investments found.</p>
            ) : (
              <div className="space-y-3">
                {userInvs.map(inv => (
                  <div key={inv.id} className="p-3 rounded-xl border border-gray-700 bg-gray-800/50">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-sm">{inv.planName}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                      <p>Amount: <span className="text-white">KSh {inv.amount.toLocaleString()}</span></p>
                      <p>Daily: <span className="text-green-400">KSh {inv.dailyReturn.toLocaleString()}</span></p>
                      <p>Started: <span>{fmt(inv.date)}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(u => (
            <div key={u.phone} className={`card flex flex-col gap-3 hover:border-gray-600 transition-colors ${u.status === 'suspended' ? 'opacity-60 border-red-900/50' : ''}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{u.name || 'Unknown'}</p>
                      {u.status === 'suspended' && <span className="text-[10px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded uppercase font-bold">Suspended</span>}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.phone}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-green-400">KSh {Number(u.balance || 0).toLocaleString()}</p>
                  {u.bonus_balance > 0 && (
                    <p className="text-xs text-yellow-400">+KSh {Number(u.bonus_balance).toLocaleString()} bonus</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-800">
                <button onClick={() => startEdit(u)} className="px-2 py-1 text-[10px] rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">
                  ✏️ Edit Bal
                </button>
                <button onClick={() => handleViewInvestments(u)} className="px-2 py-1 text-[10px] rounded bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 transition-colors">
                  📈 Packages
                </button>
                <button onClick={() => handleViewReferrals(u)} className="px-2 py-1 text-[10px] rounded bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 transition-colors">
                  🤝 Referrals
                </button>
                {!u.is_admin && (
                  <>
                    <button onClick={() => handleToggleStatus(u)} className={`px-2 py-1 text-[10px] rounded transition-colors ${u.status === 'suspended' ? 'bg-green-900/30 text-green-300 hover:bg-green-900/50' : 'bg-yellow-900/30 text-yellow-300 hover:bg-yellow-900/50'}`}>
                      {u.status === 'suspended' ? '🔓 Activate' : '🚫 Suspend'}
                    </button>
                    <button onClick={() => setConfirmAction({ message: `Permanently DELETE account ${u.phone}? This cannot be undone.`, action: () => handleDelete(u) })} className="px-2 py-1 text-[10px] rounded bg-red-900/30 hover:bg-red-900/50 text-red-300 transition-colors">
                      🗑️ Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View user referrals modal */}
      {viewingReferrals && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewingReferrals(null)}>
          <div className="card max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Referral Team: {viewingReferrals.name}</h3>
              <button onClick={() => setViewingReferrals(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            {refLoading ? (
              <p className="text-center py-8 text-gray-500">Loading...</p>
            ) : userReferrals.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No referrals yet.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Total team commissions: <span className="text-green-400 font-bold">KSh {userReferrals.reduce((s, r) => s + Number(r.commission || 0), 0).toLocaleString()}</span>
                </p>
                {userReferrals.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl border border-gray-700 bg-gray-800/50">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-sm">{r.referredName || r.referredPhone}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${r.isInvested ? 'bg-blue-900/50 text-blue-300' : 'bg-yellow-900/50 text-yellow-300'}`}>
                        {r.isInvested ? 'Invested' : 'No Invest'}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      <p>{r.referredPhone}</p>
                      {r.commission > 0 ? (
                        <p>Commission: <span className="text-green-400">KSh {Number(r.commission).toLocaleString()}</span></p>
                      ) : (
                        <p className="text-yellow-400">Earning potential: 10% on 1st investment</p>
                      )}
                      <p>{r.planName && <span>via {r.planName} · </span>}{fmt(r.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Referrals Tab ───────────────────────────────────────────────────────────────
function ReferralsTab({ showToast }) {
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setReferrals(await getAllReferrals()) } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalCommission = referrals.reduce((s, r) => s + Number(r.commission || 0), 0)
  const level1 = referrals.filter(r => r.level === 1)
  const level2 = referrals.filter(r => r.level === 2)

  return (
    <div>
      <SectionHeader
        title="Referral Commissions"
        count={referrals.length}
        subtitle={`Total commissions paid: KSh ${totalCommission.toLocaleString()}`}
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card text-center">
          <p className="text-2xl font-black text-green-400">{referrals.length}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Total Referrals</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-blue-400">{level1.length}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Level 1 (10%)</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-black text-purple-400">{level2.length}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Level 2 (4%)</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={load} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-all" style={{ background: 'var(--bg-input)' }}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : referrals.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🤝</p>
          <p style={{ color: 'var(--text-muted)' }}>No referral commissions yet</p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Commissions are paid when a referred user makes their first investment or deposit.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {referrals.map(r => (
            <div key={r.id} className="card hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${r.level === 1 ? 'bg-blue-900/50 text-blue-300' : 'bg-purple-900/50 text-purple-300'}`}>
                      Level {r.level}
                    </span>
                    <span className="font-semibold text-sm">{r.referrer_name || r.referrer_phone}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Referred: <span className="text-white">{r.referred_name || r.referred_phone}</span>
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {r.plan_name && <span>via {r.plan_name}</span>}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{fmt(r.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-green-400">+KSh {Number(r.commission || 0).toLocaleString()}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>to {r.referrer_phone}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Promo Codes Tab ───────────────────────────────────────────────────────────
function PromoTab({ showToast }) {
  const [keywords, setKeywords] = useState([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [minBonus, setMinBonus] = useState('50')
  const [maxBonus, setMaxBonus] = useState('500')
  const [maxClaims, setMaxClaims] = useState('10')
  const [creating, setCreating] = useState(false)

  // Edit modal state
  const [editingKw, setEditingKw] = useState(null)
  const [editMin, setEditMin] = useState('')
  const [editMax, setEditMax] = useState('')
  const [editMaxClaims, setEditMaxClaims] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setKeywords(await getKeywords()) } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    if (!code.trim()) return
    setCreating(true)
    try {
      await createKeyword(code.trim().toUpperCase(), Number(minBonus), Number(maxBonus), Number(maxClaims))
      showToast(`✅ Promo code "${code.toUpperCase()}" created`)
      setCode(''); setMinBonus('50'); setMaxBonus('500'); setMaxClaims('10')
      load()
    } catch (err) { showToast(err.message || '❌ Failed to create code', 'error') }
    setCreating(false)
  }

  function openEdit(kw) {
    setEditingKw(kw)
    setEditMin(String(kw.min_bonus))
    setEditMax(String(kw.max_bonus))
    setEditMaxClaims(String(kw.max_claims))
  }

  async function handleSaveEdit() {
    if (!editingKw) return
    setSaving(true)
    try {
      await updateKeyword(editingKw.id, {
        minBonus: Number(editMin),
        maxBonus: Number(editMax),
        maxClaims: Number(editMaxClaims),
      })
      showToast(`✅ Code "${editingKw.code}" updated`)
      setEditingKw(null)
      load()
    } catch { showToast('❌ Failed to update code', 'error') }
    setSaving(false)
  }

  async function handleDelete(kw) {
    try {
      await deleteKeyword(kw.id)
      showToast(`✅ Code "${kw.code}" deleted`)
      setConfirmDelete(null)
      load()
    } catch { showToast('❌ Failed to delete code', 'error') }
  }

  async function handleToggle(kw) {
    try {
      await toggleKeyword(kw.id, !kw.active)
      showToast(`Code "${kw.code}" ${!kw.active ? 'activated' : 'deactivated'}`)
      load()
    } catch { showToast('❌ Failed to toggle code', 'error') }
  }

  return (
    <div>
      {editingKw && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditingKw(null)}>
          <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Edit Code</h3>
            <p className="font-mono tracking-widest text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{editingKw.code}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Min Bonus (KSh)</label>
                <input className="input-field" type="number" min="1" value={editMin} onChange={e => setEditMin(e.target.value)} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Max Bonus (KSh)</label>
                <input className="input-field" type="number" min="1" value={editMax} onChange={e => setEditMax(e.target.value)} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Max Claims</label>
                <input className="input-field" type="number" min="1" value={editMaxClaims} onChange={e => setEditMaxClaims(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditingKw(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Delete Code</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Permanently delete <span className="font-mono">{confirmDelete.code}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 rounded-xl font-semibold text-sm bg-red-700 hover:bg-red-600 text-white flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}

      <SectionHeader title="Promo Codes" count={keywords.filter(k => k.active).length} subtitle="Create and manage bonus redemption codes" />

      <div className="card mb-6">
        <h4 className="font-semibold mb-4">Create New Code</h4>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Code (uppercase)</label>
            <input className="input-field font-mono uppercase tracking-widest" placeholder="e.g. WELCOME100" value={code}
              onChange={e => setCode(e.target.value.toUpperCase())} maxLength={20} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Min Bonus (KSh)</label>
              <input className="input-field" type="number" min="1" value={minBonus} onChange={e => setMinBonus(e.target.value)} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Max Bonus (KSh)</label>
              <input className="input-field" type="number" min="1" value={maxBonus} onChange={e => setMaxBonus(e.target.value)} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Max Claims</label>
              <input className="input-field" type="number" min="1" value={maxClaims} onChange={e => setMaxClaims(e.target.value)} />
            </div>
          </div>
          <button type="submit" disabled={creating || !code.trim()} className="btn-primary w-full">
            {creating ? 'Creating...' : '+ Create Code'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : keywords.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🎟️</p>
          <p style={{ color: 'var(--text-muted)' }}>No promo codes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keywords.map(kw => (
            <div key={kw.id} className={`card hover:border-gray-600 transition-colors ${kw.status === 'suspended' ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold tracking-widest">{kw.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${kw.active ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {kw.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
                  {kw.claim_count}/{kw.max_claims} claimed
                </p>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                KSh {Number(kw.min_bonus).toLocaleString()} – {Number(kw.max_bonus).toLocaleString()} bonus
              </p>
              <div className="flex gap-2 flex-wrap pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => openEdit(kw)} className="px-2 py-1 text-[10px] rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">
                  ✏️ Edit
                </button>
                <button onClick={() => handleToggle(kw)} className={`px-2 py-1 text-[10px] rounded transition-colors ${kw.active ? 'bg-red-900/30 text-red-300 hover:bg-red-900/50' : 'bg-green-900/30 text-green-300 hover:bg-green-900/50'}`}>
                  {kw.active ? '⏸️ Deactivate' : '▶️ Activate'}
                </button>
                <button onClick={() => setConfirmDelete(kw)} className="px-2 py-1 text-[10px] rounded bg-red-900/30 hover:bg-red-900/50 text-red-300 transition-colors">
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Support Tab ───────────────────────────────────────────────────────────────
function SupportTab({ showToast }) {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePhone, setActivePhone] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const loadThreads = useCallback(async () => {
    setLoading(true)
    try { setThreads(await getAllSupportThreads()) } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { loadThreads() }, [loadThreads])

  useEffect(() => {
    if (!activePhone) return
    const load = async () => {
      try {
        const msgs = await getSupportMessages(activePhone)
        setMessages(msgs)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      } catch { }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [activePhone])

  async function handleSend(e) {
    e.preventDefault()
    if (!reply.trim() || !activePhone) return
    setSending(true)
    try {
      await sendSupportMessage(activePhone, reply.trim(), 'admin')
      setReply('')
      const msgs = await getSupportMessages(activePhone)
      setMessages(msgs)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      loadThreads()
    } catch { showToast('❌ Failed to send message', 'error') }
    setSending(false)
  }

  const unreadCount = threads.filter(t => t.messages?.at(-1)?.sender_type === 'user').length

  return (
    <div>
      <SectionHeader title="Support Messages" count={unreadCount} subtitle="Reply to user support requests in real-time" />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : threads.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">💬</p>
              <p style={{ color: 'var(--text-muted)' }}>No support messages yet</p>
            </div>
          ) : (
            threads.map(t => {
              const last = t.messages?.at(-1)
              const isUnread = last?.sender_type === 'user'
              return (
                <div key={t.userPhone} onClick={() => setActivePhone(t.userPhone)}
                  className={`card cursor-pointer transition-all hover:border-gray-600 ${activePhone === t.userPhone ? 'border-red-600 ring-1 ring-red-600/30' : ''} ${isUnread ? 'border-yellow-700/50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {t.userPhone?.slice(-2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{t.userPhone}</p>
                        {isUnread && <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{last?.message || '...'}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {activePhone ? (
          <div className="card flex flex-col h-96">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setActivePhone(null)} className="text-gray-400 hover:text-white text-sm">←</button>
              <p className="font-semibold text-sm">{activePhone}</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
              {messages.length === 0 ? (
                <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No messages</p>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.sender_type === 'admin' ? 'bg-gradient-to-r from-red-700 to-pink-700 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none'}`}>
                      <p>{m.message}</p>
                      <p className={`text-[10px] mt-1 ${m.sender_type === 'admin' ? 'text-red-200' : 'text-gray-500'}`}>
                        {new Date(m.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="flex gap-2">
              <input className="flex-1 text-sm px-3 py-2 rounded-xl border outline-none transition-colors"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder="Type reply..." value={reply} onChange={e => setReply(e.target.value)} />
              <button type="submit" disabled={sending || !reply.trim()} className="btn-primary text-sm py-2 px-4">
                {sending ? '...' : 'Send'}
              </button>
            </form>
          </div>
        ) : (
          <div className="card flex items-center justify-center h-96">
            <p style={{ color: 'var(--text-muted)' }}>Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Password Resets Tab ───────────────────────────────────────────────────────
function PasswordResetsTab({ showToast }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(null)
  const [newPin, setNewPin] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRequests(await getPasswordResetRequests()) } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleReset(req) {
    if (!newPin || newPin.length < 4) { showToast('PIN must be at least 4 digits', 'error'); return }
    setSaving(true)
    try {
      await adminResetPassword(req.id, req.user_phone, newPin)
      showToast(`✅ PIN reset for ${req.user_phone}. The user must change it after login.`)
      setResetting(null); setNewPin('')
      load()
    } catch (err) {
      showToast(`❌ ${err.message || 'Failed to reset PIN'}`, 'error')
    }
    setSaving(false)
  }

  const pending = requests.filter(r => r.status === 'pending')

  return (
    <div>
      {resetting && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setResetting(null)}>
          <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Reset PIN</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{resetting.user_phone}</p>
            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>New Temporary PIN (4–6 digits)</label>
              <input className="input-field" type="text" maxLength={6} placeholder="e.g. 1234"
                value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="p-3 rounded-xl text-xs mb-4" style={{ background: 'var(--bg-input)' }}>
              ⚠️ User will be forced to change this PIN on next login.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setResetting(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleReset(resetting)} disabled={saving || newPin.length < 4} className="btn-primary flex-1">
                {saving ? 'Resetting...' : 'Reset PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SectionHeader title="PIN Reset Requests" count={pending.length} subtitle="Assign temporary PINs to locked-out users" />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🔑</p>
          <p style={{ color: 'var(--text-muted)' }}>No PIN reset requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="card flex items-center justify-between gap-4 hover:border-gray-600 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{req.user_phone}</span>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Requested: {fmt(req.created_at)}</p>
                {req.completed_at && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Completed: {fmt(req.completed_at)}</p>}
              </div>
              {req.status === 'pending' && (
                <button onClick={() => { setResetting(req); setNewPin('') }}
                  className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
                  🔑 Reset PIN
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Transactions Tab ──────────────────────────────────────────────────────────
function TransactionsTab({ showToast }) {
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllTransactions()
      setTxs(data)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await deleteTransaction(confirmDelete.id)
      showToast(`✅ Transaction deleted`)
      setConfirmDelete(null)
      load()
    } catch { showToast('❌ Failed to delete transaction', 'error') }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>

  return (
    <div>
      <SectionHeader title="All Transactions" count={txs.length} subtitle="Recent platform transactions" />

      {txs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p style={{ color: 'var(--text-muted)' }}>No transactions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {txs.map(tx => (
            <div key={tx.id} className="card flex items-center justify-between gap-3 hover:border-gray-600 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{tx.user_phone || tx.phone_number || 'Unknown'}</span>
                  <StatusBadge status={tx.status} />
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {tx.type} · KSh {Number(tx.amount).toLocaleString()} · {fmt(tx.created_at)}
                </p>
                {tx.reference && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ref: {tx.reference}</p>}
              </div>
              <button onClick={() => setConfirmDelete(tx)}
                className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/60 text-red-300 text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
                🗑 Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`Delete this transaction (${confirmDelete.type} · KSh ${Number(confirmDelete.amount).toLocaleString()})? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

// ── Overview / Stats Tab ──────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [deposits, withdrawals, loans, users] = await Promise.all([
          getAllDeposits(), getAllWithdrawals(), getAllLoans(), getAllUsers()
        ])
        setStats({
          totalUsers: users.length,
          totalBalance: users.reduce((s, u) => s + Number(u.balance || 0), 0),
          pendingDeposits: deposits.filter(d => d.status === 'pending').length,
          pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
          pendingLoans: loans.filter(l => l.status === 'pending').length,
          totalDeposited: deposits.filter(d => d.status === 'approved').reduce((s, d) => s + Number(d.amount), 0),
          totalWithdrawn: withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + Number(w.amount), 0),
        })
      } catch { }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-500">Loading overview...</div>
  if (!stats) return null

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'text-blue-400' },
    { label: 'Platform Balance', value: `KSh ${stats.totalBalance.toLocaleString()}`, icon: '💰', color: 'text-green-400' },
    { label: 'Total Deposited', value: `KSh ${stats.totalDeposited.toLocaleString()}`, icon: '💳', color: 'text-emerald-400' },
    { label: 'Total Withdrawn', value: `KSh ${stats.totalWithdrawn.toLocaleString()}`, icon: '💸', color: 'text-red-400' },
    { label: 'Pending Deposits', value: stats.pendingDeposits, icon: '⏳', color: stats.pendingDeposits > 0 ? 'text-amber-400' : 'text-gray-400' },
    { label: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: '⏳', color: stats.pendingWithdrawals > 0 ? 'text-amber-400' : 'text-gray-400' },
    { label: 'Pending Loans', value: stats.pendingLoans, icon: '🏦', color: stats.pendingLoans > 0 ? 'text-purple-400' : 'text-gray-400' },
  ]

  return (
    <div>
      <SectionHeader title="Platform Overview" subtitle="Real-time summary of all platform activity" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="card text-center hover:border-gray-600 transition-colors">
            <p className="text-3xl mb-2">{c.icon}</p>
            <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ user, showToast }) {
  const [phone, setPhone] = useState('')
  const [groupLink, setGroupLink] = useState('')
  const [stkEnabled, setStkEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const callerPhone = user?.phone || ''

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const s = await getWhatsAppSettings()
      setPhone(s.whatsapp_phone || '')
      setGroupLink(s.whatsapp_group_link || '')
      setStkEnabled(s.stk_enabled !== 'false')
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSavePhone() {
    if (!phone.trim()) return
    setSaving(true)
    try {
      const res = await updateAppSetting(callerPhone, 'whatsapp_phone', phone.trim())
      if (res.success) showToast('WhatsApp phone updated')
      else showToast(res.message || 'Failed', 'error')
    } catch { showToast('Failed to save phone', 'error') }
    setSaving(false)
  }

  async function handleSaveGroup() {
    setSaving(true)
    try {
      const res = await updateAppSetting(callerPhone, 'whatsapp_group_link', groupLink.trim())
      if (res.success) showToast('WhatsApp group link updated')
      else showToast(res.message || 'Failed', 'error')
    } catch { showToast('Failed to save group link', 'error') }
    setSaving(false)
  }

  return (
    <div>
      <SectionHeader title="App Settings" subtitle="Configure WhatsApp support number, group link, and payment methods" />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* WhatsApp Phone */}
          <div className="card">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">💬</span> WhatsApp Support Number
            </h4>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              This number will be shown to all users for WhatsApp support.
            </p>
            <div className="flex gap-3">
              <input
                className="input-field flex-1"
                placeholder="e.g. +254707976424"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <button
                onClick={handleSavePhone}
                disabled={saving || !phone.trim()}
                className="btn-primary flex-shrink-0"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {phone && (
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Preview: <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-400 underline">wa.me/{phone.replace(/\D/g, '')}</a>
              </p>
            )}
          </div>

          {/* WhatsApp Group Link */}
          <div className="card">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">👥</span> WhatsApp Group Link
            </h4>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Users will see a "Join WhatsApp Group" button. Leave empty to hide it.
            </p>
            <div className="flex gap-3">
              <input
                className="input-field flex-1"
                placeholder="https://chat.whatsapp.com/..."
                value={groupLink}
                onChange={e => setGroupLink(e.target.value)}
              />
              <button
                onClick={handleSaveGroup}
                disabled={saving}
                className="btn-primary flex-shrink-0"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Get a group invite link from WhatsApp: Group Info → Invite via Link
            </p>
          </div>

          {/* STK Push Toggle */}
          <div className="card">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">📱</span> STK Push Payment
            </h4>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Enable or disable STK push for deposits. When disabled, users deposit via Paybill only.
            </p>
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--bg-input)' }}>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={stkEnabled}
                  onChange={async (e) => {
                    const val = e.target.checked
                    setSaving(true)
                    try {
                      const res = await updateAppSetting(callerPhone, 'stk_enabled', String(val))
                      if (res && res.success) {
                        setStkEnabled(val)
                        showToast(`STK Push ${val ? 'enabled' : 'disabled'}`)
                      } else {
                        setStkEnabled(!val)
                        showToast('Failed to update STK setting', 'error')
                      }
                    } catch {
                      setStkEnabled(!val)
                      showToast('Failed to update STK setting', 'error')
                    } finally {
                      setSaving(false)
                    }
                  }}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
              </label>
              <div className="flex-1">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {stkEnabled ? 'STK Push is ON' : 'STK Push is OFF'}
                </span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {stkEnabled ? 'Users can deposit via STK push (auto M-Pesa prompt). Falls back to Paybill if STK fails.' : 'Users deposit via Paybill number only.'}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${stkEnabled ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                {stkEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Notifications Tab ───────────────────────────────────────────────────────
function NotificationsTab({ showToast }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [sending, setSending] = useState(false)
  const [confirm, setConfirm] = useState(null)

  // Compose form
  const [target, setTarget] = useState('all') // 'all' | 'new' | 'returning' | 'user'
  const [targetPhone, setTargetPhone] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('info')
  const [icon, setIcon] = useState('')
  const [displayAsBar, setDisplayAsBar] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [notifs, allUsers] = await Promise.all([
        adminGetAllNotifications(),
        getAllUsers(),
      ])
      setNotifications(notifs)
      setUsers(allUsers)
    } catch {
      showToast('Failed to load notifications', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  async function handleSend(e) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    try {
      const payload = { title: title.trim(), message: message.trim(), type, icon: icon.trim(), displayAsBar }
      let targetLabel = 'ALL users'
      
      if (target === 'all') {
        await adminSendNotificationAll(payload)
        targetLabel = 'ALL users'
      } else if (target === 'new') {
        await adminSendNotificationAll({ ...payload, targetSegment: 'new_users' })
        targetLabel = 'NEW users'
      } else if (target === 'returning') {
        await adminSendNotificationAll({ ...payload, targetSegment: 'returning_users' })
        targetLabel = 'RETURNING users'
      } else if (target === 'user') {
        if (!targetPhone.trim()) { showToast('Please select a user', 'error'); setSending(false); return }
        await adminSendNotificationUser(targetPhone.trim(), payload)
        targetLabel = targetPhone
      }
      
      showToast(`✅ Notification sent to ${targetLabel}${displayAsBar ? ' (as banner)' : ''}`)
      setTitle('')
      setMessage('')
      setIcon('')
      setDisplayAsBar(false)
      load()
    } catch (err) {
      showToast(err.message || 'Failed to send notification', 'error')
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(id) {
    try {
      await adminDeleteNotification(id)
      showToast('Notification deleted')
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch {
      showToast('Failed to delete notification', 'error')
    }
  }

  const typeOptions = [
    { value: 'info',    label: '📢 Info',    color: '#3b82f6' },
    { value: 'success', label: '✅ Success', color: '#10b981' },
    { value: 'warning', label: '⚠️ Warning', color: '#f59e0b' },
    { value: 'promo',   label: '🎁 Promo',   color: '#8b5cf6' },
    { value: 'alert',   label: '🔔 Alert',   color: '#ef4444' },
  ]

  function timeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div>
      {confirm && <ConfirmDialog message={confirm.message} onConfirm={() => { confirm.action(); setConfirm(null) }} onCancel={() => setConfirm(null)} />}
      <SectionHeader title="Notifications" subtitle="Send announcements and alerts to users" />

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Compose Form ── */}
        <div>
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
            <span className="text-lg">📤</span> Compose Notification
          </h4>
          <form onSubmit={handleSend} className="card space-y-4">
            {/* Target */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>Send To</label>
              <div className="flex gap-2 flex-wrap">
                {[{ v: 'all', label: '🌍 All Users' }, { v: 'new', label: '✨ New Users' }, { v: 'returning', label: '🔄 Returning Users' }, { v: 'user', label: '👤 Specific User' }].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setTarget(opt.v)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      target === opt.v ? 'text-white shadow-lg' : 'text-gray-400'
                    }`}
                    style={{
                      background: target === opt.v
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : 'var(--bg-input)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* User selector */}
            {target === 'user' && (
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Select User</label>
                <select
                  className="w-full text-sm px-3 py-2 rounded-xl border outline-none"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  value={targetPhone}
                  onChange={e => setTargetPhone(e.target.value)}
                  required={target === 'user'}
                >
                  <option value="">— Select user —</option>
                  {users.map(u => (
                    <option key={u.phone} value={u.phone}>
                      {u.name} ({u.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Type */}
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>Type</label>
              <div className="flex flex-wrap gap-1.5">
                {typeOptions.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      type === t.value ? 'text-white' : 'text-gray-400'
                    }`}
                    style={{
                      background: type === t.value ? t.color : 'var(--bg-input)',
                      border: `1px solid ${type === t.value ? t.color : 'transparent'}`,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon (emoji) */}
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Icon (emoji, optional)</label>
              <input
                className="w-full text-sm px-3 py-2 rounded-xl border outline-none"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder="e.g. 🎉"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                maxLength={4}
              />
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Title (optional)</label>
              <input
                className="w-full text-sm px-3 py-2 rounded-xl border outline-none"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder="Notification title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={80}
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Message *</label>
              <textarea
                className="w-full text-sm px-3 py-2 rounded-xl border outline-none resize-none"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder="Write your notification message..."
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                maxLength={500}
              />
              <p className="text-[10px] text-right mt-0.5" style={{ color: 'var(--text-muted)' }}>{message.length}/500</p>
            </div>

            {/* Display as Message Bar Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
              <input
                type="checkbox"
                id="displayAsBar"
                checked={displayAsBar}
                onChange={e => setDisplayAsBar(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="displayAsBar" className="text-xs font-semibold cursor-pointer flex-1" style={{ color: 'var(--text-primary)' }}>
                📄 Display as Message Bar
              </label>
              <span className="text-[10px] px-2 py-1 rounded" style={{ background: displayAsBar ? 'var(--border-hover)' : 'var(--border)', color: 'var(--text-muted)' }}>
                {displayAsBar ? 'Banner' : 'Notification'}
              </span>
            </div>

            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: sending ? 'var(--bg-input)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: sending ? 'var(--text-muted)' : '#000',
              }}
            >
              {sending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Sending...
                </span>
              ) : target === 'all' ? '📡 Send to All Users' : '📨 Send to User'}
            </button>
          </form>
        </div>

        {/* ── Notification History ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <span className="text-lg">📋</span> Sent Notifications
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{notifications.length}</span>
            </h4>
            <button onClick={load} className="text-xs text-gray-400 hover:text-white transition-colors">↻ Refresh</button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">🔔</p>
              <p style={{ color: 'var(--text-muted)' }}>No notifications sent yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {notifications.map(n => (
                <div key={n.id} className="card hover:border-gray-600 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{n.icon || '📢'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        {n.title && <span className="font-semibold text-sm">{n.title}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${
                          n.type === 'success' ? 'bg-green-900/40 text-green-300' :
                          n.type === 'warning' ? 'bg-yellow-900/40 text-yellow-300' :
                          n.type === 'promo'   ? 'bg-purple-900/40 text-purple-300' :
                          n.type === 'alert'   ? 'bg-red-900/40 text-red-300' :
                          'bg-blue-900/40 text-blue-300'
                        }`}>{n.type}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          n.target === 'all' ? 'bg-amber-900/40 text-amber-300' : 'bg-gray-700 text-gray-300'
                        }`}>
                          {n.target === 'all' ? '🌍 All' : `👤 ${n.user_phone || 'User'}`}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.created_at)}</p>
                    </div>
                    <button
                      onClick={() => setConfirm({ message: 'Delete this notification?', action: () => handleDelete(n.id) })}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview',    icon: '📊' },
  { id: 'deposits',    label: 'Deposits',    icon: '💳' },
  { id: 'withdrawals', label: 'Withdrawals', icon: '💸' },
  { id: 'loans',       label: 'Loans',       icon: '🏦' },
  { id: 'users',       label: 'Users',       icon: '👥' },
  { id: 'referrals',   label: 'Referrals',   icon: '🤝' },
  { id: 'promo',       label: 'Promo Codes', icon: '🎟️' },
  { id: 'support',     label: 'Support',     icon: '💬' },
  { id: 'resets',      label: 'PIN Resets',  icon: '🔑' },
  { id: 'transactions', label: 'Transactions', icon: '📋' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'settings',    label: 'Settings',    icon: '⚙️' },
]

export default function AdminPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [toast, setToast] = useState(null)

  const isAdmin = user?.isAdmin === true

  useEffect(() => {
    if (loading) return
    if (user === null) navigate('/login')
    else if (user && !isAdmin) navigate('/dashboard')
  }, [user, isAdmin, navigate, loading])

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🔒</p>
          <p className="font-semibold">Admin access required</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-sm transition-colors">← Back</button>
          <div>
            <span className="font-black text-lg bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">Dumiropay</span>
            <span className="ml-2 text-xs bg-yellow-600 text-white px-2 py-0.5 rounded-full font-semibold">Admin</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center font-bold text-sm">
          {user?.name?.[0]?.toUpperCase() || 'A'}
        </div>
      </div>

      <div className="flex flex-col md:flex-row min-h-[calc(100vh-57px)]">
        {/* Sidebar — desktop */}
        <aside className="hidden md:flex flex-col w-56 border-r p-4 gap-1 flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${tab === t.id ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </aside>

        {/* Mobile tab bar */}
        <div className="md:hidden overflow-x-auto border-b flex gap-1 px-3 py-2 flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white' : 'text-gray-400'}`}
              style={{ background: tab === t.id ? undefined : 'var(--bg-input)' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-4xl mx-auto animate-fadeIn">
            {tab === 'overview'    && <OverviewTab />}
            {tab === 'deposits'    && <DepositsTab showToast={showToast} />}
            {tab === 'withdrawals' && <WithdrawalsTab showToast={showToast} />}
            {tab === 'loans'       && <LoansTab showToast={showToast} />}
            {tab === 'users'       && <UsersTab showToast={showToast} />}
            {tab === 'referrals'   && <ReferralsTab showToast={showToast} />}
            {tab === 'promo'       && <PromoTab showToast={showToast} />}
            {tab === 'support'     && <SupportTab showToast={showToast} />}
            {tab === 'resets'      && <PasswordResetsTab showToast={showToast} />}
            {tab === 'transactions'  && <TransactionsTab showToast={showToast} />}
            {tab === 'notifications' && <NotificationsTab showToast={showToast} />}
            {tab === 'settings'      && <SettingsTab user={user} showToast={showToast} />}
          </div>
        </main>
      </div>
    </div>
  )
}
