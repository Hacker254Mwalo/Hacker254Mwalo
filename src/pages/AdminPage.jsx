import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getAllDeposits, approveDeposit, rejectDeposit,
  getAllWithdrawals, approveWithdrawal, rejectWithdrawal,
  getAllLoans, approveLoan, rejectLoan,
  getAllUsers, adminSetBalance, adminSetBonusBalance,
  getKeywords, createKeyword, toggleKeyword,
  getAllSupportThreads, getSupportMessages, sendSupportMessage,
  getPasswordResetRequests, adminResetPassword,
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
  const [filter, setFilter] = useState('pending')
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setDeposits(await getAllDeposits()) } catch { }
    setLoading(false)
  }, [])

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
          <p style={{ color: 'var(--text-muted)' }}>No {filter} deposits</p>
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
                  {dep.mpesa_receipt && (
                    <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>M-Pesa Ref: {dep.mpesa_receipt}</p>
                  )}
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

  const load = useCallback(async () => {
    setLoading(true)
    try { setUsers(await getAllUsers()) } catch { }
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

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(u => (
            <div key={u.phone} className="card flex items-center justify-between gap-4 hover:border-gray-600 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {u.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.name || 'Unknown'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.phone}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Joined {fmt(u.created_at)}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-green-400">KSh {Number(u.balance || 0).toLocaleString()}</p>
                {u.bonus_balance > 0 && (
                  <p className="text-xs text-yellow-400">+KSh {Number(u.bonus_balance).toLocaleString()} bonus</p>
                )}
                <button onClick={() => startEdit(u)} className="mt-1 px-2 py-1 text-xs rounded-lg font-semibold transition-colors text-gray-400 hover:text-white" style={{ background: 'var(--bg-input)' }}>
                  ✏️ Edit
                </button>
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

  async function handleToggle(kw) {
    try {
      await toggleKeyword(kw.id, !kw.active)
      showToast(`Code "${kw.code}" ${!kw.active ? 'activated' : 'deactivated'}`)
      load()
    } catch { showToast('❌ Failed to toggle code', 'error') }
  }

  return (
    <div>
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
            <div key={kw.id} className="card flex items-center justify-between gap-4 hover:border-gray-600 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold tracking-widest">{kw.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${kw.active ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {kw.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  KSh {Number(kw.min_bonus).toLocaleString()} – {Number(kw.max_bonus).toLocaleString()} bonus · {kw.claim_count}/{kw.max_claims} claimed
                </p>
              </div>
              <button onClick={() => handleToggle(kw)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${kw.active ? 'bg-red-900/50 text-red-400 hover:bg-red-800' : 'bg-green-900/50 text-green-400 hover:bg-green-800'}`}>
                {kw.active ? 'Deactivate' : 'Activate'}
              </button>
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

// ── Main Admin Page ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview',    icon: '📊' },
  { id: 'deposits',    label: 'Deposits',    icon: '💳' },
  { id: 'withdrawals', label: 'Withdrawals', icon: '💸' },
  { id: 'loans',       label: 'Loans',       icon: '🏦' },
  { id: 'users',       label: 'Users',       icon: '👥' },
  { id: 'promo',       label: 'Promo Codes', icon: '🎟️' },
  { id: 'support',     label: 'Support',     icon: '💬' },
  { id: 'resets',      label: 'PIN Resets',  icon: '🔑' },
]

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [toast, setToast] = useState(null)

  const adminPhone = import.meta.env.VITE_ADMIN_PHONE
  const isAdmin = user && (user.is_admin === true || (adminPhone && user.phone === adminPhone))

  useEffect(() => {
    if (user === null) navigate('/login')
    else if (user && !isAdmin) navigate('/dashboard')
  }, [user, isAdmin, navigate])

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

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
            {tab === 'promo'       && <PromoTab showToast={showToast} />}
            {tab === 'support'     && <SupportTab showToast={showToast} />}
            {tab === 'resets'      && <PasswordResetsTab showToast={showToast} />}
          </div>
        </main>
      </div>
    </div>
  )
}
