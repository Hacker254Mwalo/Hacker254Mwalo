import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  getAllDeposits, approveDeposit, rejectDeposit,
  getAllWithdrawals, approveWithdrawal, rejectWithdrawal,
  getAllLoans, approveLoan, rejectLoan,
  getAllUsers, adminSetBalance, adminSetBonusBalance,
  getKeywords, createKeyword, toggleKeyword,
  getAllSupportThreads, sendSupportMessage,
  getPasswordResetRequests, updatePasswordResetRequest, adminResetPassword,
} from '../lib/db'

// ── Shared helpers ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:  'bg-yellow-900/60 text-yellow-400',
    approved: 'bg-green-900/60 text-green-400',
    rejected: 'bg-red-900/60 text-red-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${map[status] || 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  )
}

function fmtDate(ts) {
  return ts ? new Date(ts).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
}

// ── Deposits Tab ──────────────────────────────────────────────────────────────
function DepositsTab({ showToast }) {
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')

  async function load() {
    setLoading(true)
    try { setDeposits(await getAllDeposits()) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleApprove(dep) {
    try { await approveDeposit(dep.id, dep.user_phone, dep.amount); showToast('✅ Deposit approved!'); load() }
    catch (e) { showToast('❌ ' + e.message) }
  }
  async function handleReject(dep) {
    try { await rejectDeposit(dep.id); showToast('Deposit rejected.'); load() }
    catch (e) { showToast('❌ ' + e.message) }
  }

  const tabs = ['pending', 'approved', 'rejected']
  const filtered = deposits.filter(d => d.status === tab)

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {tabs.map(s => (
          <div key={s} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className={`text-xl font-black ${s === 'approved' ? 'text-green-400' : s === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
              {deposits.filter(d => d.status === s).length}
            </p>
            <p className="text-gray-500 text-xs capitalize">{s}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-800 p-1 rounded-xl mb-5">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${tab === t ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow' : 'text-gray-400'}`}>
            {t} ({deposits.filter(d => d.status === t).length})
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty text={`No ${tab} deposits`} /> : (
        <div className="space-y-3">
          {filtered.map(dep => (
            <div key={dep.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-green-400">KSh {Number(dep.amount).toLocaleString()}</p>
                  <p className="text-sm font-medium">{dep.users?.name || 'Unknown'}</p>
                  <p className="text-gray-400 text-xs">{dep.user_phone}</p>
                  <p className="text-gray-500 text-xs mt-1">{fmtDate(dep.created_at)}</p>
                </div>
                <StatusBadge status={dep.status} />
              </div>
              {dep.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleReject(dep)} className="btn-secondary flex-1 text-xs py-2">Reject</button>
                  <button onClick={() => handleApprove(dep)} className="flex-1 text-xs py-2 rounded-xl font-semibold bg-green-700 hover:bg-green-600 text-white transition-all">Approve & Credit</button>
                </div>
              )}
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
  const [tab, setTab] = useState('pending')

  async function load() {
    setLoading(true)
    try { setWithdrawals(await getAllWithdrawals()) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleApprove(w) {
    try { await approveWithdrawal(w.id); showToast('✅ Withdrawal approved!'); load() }
    catch (e) { showToast('❌ ' + e.message) }
  }
  async function handleReject(w) {
    try { await rejectWithdrawal(w.id, w.user_phone, w.amount); showToast('Withdrawal rejected & refunded.'); load() }
    catch (e) { showToast('❌ ' + e.message) }
  }

  const tabs = ['pending', 'approved', 'rejected']
  const filtered = withdrawals.filter(w => w.status === tab)

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {tabs.map(s => (
          <div key={s} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className={`text-xl font-black ${s === 'approved' ? 'text-green-400' : s === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
              {withdrawals.filter(w => w.status === s).length}
            </p>
            <p className="text-gray-500 text-xs capitalize">{s}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-800 p-1 rounded-xl mb-5">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${tab === t ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow' : 'text-gray-400'}`}>
            {t} ({withdrawals.filter(w => w.status === t).length})
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty text={`No ${tab} withdrawals`} /> : (
        <div className="space-y-3">
          {filtered.map(w => (
            <div key={w.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-red-400">KSh {Number(w.amount).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Net: KSh {Number(w.net_amount || w.amount).toLocaleString()} · Fee: KSh {Number(w.fee || 0).toLocaleString()}</p>
                  <p className="text-sm font-medium mt-1">{w.users?.name || 'Unknown'}</p>
                  <p className="text-gray-400 text-xs">{w.user_phone}</p>
                  <p className="text-gray-500 text-xs">→ {w.mpesa_phone}</p>
                  <p className="text-gray-500 text-xs mt-1">{fmtDate(w.created_at)}</p>
                </div>
                <StatusBadge status={w.status} />
              </div>
              {w.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleReject(w)} className="btn-secondary flex-1 text-xs py-2">Reject & Refund</button>
                  <button onClick={() => handleApprove(w)} className="flex-1 text-xs py-2 rounded-xl font-semibold bg-green-700 hover:bg-green-600 text-white transition-all">Mark Paid</button>
                </div>
              )}
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
  const [tab, setTab] = useState('pending')

  async function load() {
    setLoading(true)
    try { setLoans(await getAllLoans()) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleApprove(loan) {
    try { await approveLoan(loan.id, loan.user_phone, loan.amount); showToast('✅ Loan approved & disbursed!'); load() }
    catch (e) { showToast('❌ ' + e.message) }
  }
  async function handleReject(loan) {
    try { await rejectLoan(loan.id); showToast('Loan rejected.'); load() }
    catch (e) { showToast('❌ ' + e.message) }
  }

  const tabs = ['pending', 'approved', 'rejected']
  const filtered = loans.filter(l => l.status === tab)

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {tabs.map(s => (
          <div key={s} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className={`text-xl font-black ${s === 'approved' ? 'text-green-400' : s === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
              {loans.filter(l => l.status === s).length}
            </p>
            <p className="text-gray-500 text-xs capitalize">{s}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-800 p-1 rounded-xl mb-5">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${tab === t ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow' : 'text-gray-400'}`}>
            {t} ({loans.filter(l => l.status === t).length})
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty text={`No ${tab} loans`} /> : (
        <div className="space-y-3">
          {filtered.map(loan => (
            <div key={loan.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-purple-400">KSh {Number(loan.amount).toLocaleString()}</p>
                  {loan.purpose && <p className="text-gray-400 text-xs italic">"{loan.purpose}"</p>}
                  <p className="text-sm font-medium mt-1">{loan.users?.name || loan.user_phone}</p>
                  <p className="text-gray-400 text-xs">{loan.user_phone}</p>
                  <p className="text-gray-500 text-xs mt-1">{fmtDate(loan.created_at)}</p>
                </div>
                <StatusBadge status={loan.status} />
              </div>
              {loan.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleReject(loan)} className="btn-secondary flex-1 text-xs py-2">Reject</button>
                  <button onClick={() => handleApprove(loan)} className="flex-1 text-xs py-2 rounded-xl font-semibold bg-purple-700 hover:bg-purple-600 text-white transition-all">Approve & Disburse</button>
                </div>
              )}
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
  const [editing, setEditing] = useState(null) // { phone, field: 'balance'|'bonus_balance', value }

  async function load() {
    setLoading(true)
    try { setUsers(await getAllUsers()) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || '').includes(search)
  )

  async function saveEdit() {
    if (!editing) return
    try {
      if (editing.field === 'balance') {
        await adminSetBalance(editing.phone, Number(editing.value))
      } else {
        await adminSetBonusBalance(editing.phone, Number(editing.value))
      }
      showToast('✅ Updated successfully!')
      setEditing(null)
      load()
    } catch (e) { showToast('❌ ' + e.message) }
  }

  return (
    <div>
      <input
        className="input-field mb-5"
        placeholder="🔍 Search by name or phone..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="card max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-1">Edit {editing.field === 'balance' ? 'Balance' : 'Bonus Balance'}</h3>
            <p className="text-gray-400 text-xs mb-3">{editing.phone}</p>
            <input
              className="input-field mb-4"
              type="number"
              min="0"
              value={editing.value}
              onChange={e => setEditing(prev => ({ ...prev, value: e.target.value }))}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
              <button onClick={saveEdit} className="btn-primary flex-1 text-sm py-2">Save</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty text="No users found" /> : (
        <div className="space-y-3">
          {filtered.map(u => (
            <div key={u.phone} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-gray-400 text-xs">{u.phone}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Joined {fmtDate(u.created_at)}</p>
                </div>
                {u.is_admin && <span className="text-xs bg-red-900/60 text-red-400 px-2 py-0.5 rounded-full">Admin</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEditing({ phone: u.phone, field: 'balance', value: u.balance || 0 })}
                  className="bg-gray-800 hover:bg-gray-700 rounded-xl p-3 text-left transition-colors"
                >
                  <p className="text-green-400 font-bold text-sm">KSh {Number(u.balance || 0).toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">Balance ✏️</p>
                </button>
                <button
                  onClick={() => setEditing({ phone: u.phone, field: 'bonus_balance', value: u.bonus_balance || 0 })}
                  className="bg-gray-800 hover:bg-gray-700 rounded-xl p-3 text-left transition-colors"
                >
                  <p className="text-yellow-400 font-bold text-sm">KSh {Number(u.bonus_balance || 0).toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">Bonus ✏️</p>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Keywords Tab ──────────────────────────────────────────────────────────────
function KeywordsTab({ showToast }) {
  const [keywords, setKeywords] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ code: '', minBonus: 50, maxBonus: 500, maxClaims: 5 })
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try { setKeywords(await getKeywords()) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.code.trim()) return
    setCreating(true)
    try {
      await createKeyword({ code: form.code.trim(), minBonus: Number(form.minBonus), maxBonus: Number(form.maxBonus), maxClaims: Number(form.maxClaims) })
      showToast('✅ Keyword created!')
      setForm({ code: '', minBonus: 50, maxBonus: 500, maxClaims: 5 })
      load()
    } catch (e) { showToast('❌ ' + e.message) }
    setCreating(false)
  }

  async function handleToggle(kw) {
    try { await toggleKeyword(kw.id, !kw.active); load() }
    catch (e) { showToast('❌ ' + e.message) }
  }

  return (
    <div>
      {/* Create form */}
      <form onSubmit={handleCreate} className="card mb-5 space-y-3">
        <p className="font-semibold text-sm">Create New Keyword</p>
        <input
          className="input-field font-mono uppercase"
          placeholder="Code (e.g. BONUS2024)"
          value={form.code}
          onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
          required
        />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Min Bonus (KSh)</label>
            <input className="input-field" type="number" min="1" value={form.minBonus}
              onChange={e => setForm(f => ({ ...f, minBonus: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Max Bonus (KSh)</label>
            <input className="input-field" type="number" min="1" value={form.maxBonus}
              onChange={e => setForm(f => ({ ...f, maxBonus: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Max Claims</label>
            <input className="input-field" type="number" min="1" max="1000" value={form.maxClaims}
              onChange={e => setForm(f => ({ ...f, maxClaims: e.target.value }))} />
          </div>
        </div>
        <button type="submit" disabled={creating} className="btn-primary w-full text-sm py-2.5">
          {creating ? 'Creating...' : '+ Create Keyword'}
        </button>
      </form>

      {loading ? <Spinner /> : keywords.length === 0 ? <Empty text="No keywords yet" /> : (
        <div className="space-y-3">
          {keywords.map(kw => (
            <div key={kw.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono font-bold text-lg tracking-widest">{kw.code}</p>
                <button
                  onClick={() => handleToggle(kw)}
                  className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${kw.active ? 'bg-green-800 text-green-300 hover:bg-green-700' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                  {kw.active ? 'Active' : 'Inactive'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-yellow-400 font-bold">KSh {kw.min_bonus}–{kw.max_bonus}</p>
                  <p className="text-gray-500">Bonus Range</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-blue-400 font-bold">{kw.claim_count} / {kw.max_claims}</p>
                  <p className="text-gray-500">Claims</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-gray-300 font-medium">{fmtDate(kw.created_at)}</p>
                  <p className="text-gray-500">Created</p>
                </div>
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

  async function loadThreads() {
    setLoading(true)
    try { setThreads(await getAllSupportThreads()) } catch {}
    setLoading(false)
  }
  useEffect(() => { loadThreads() }, [])

  // Refresh threads periodically when not using Supabase realtime
  useEffect(() => {
    if (isSupabaseConfigured) return
    const interval = setInterval(loadThreads, 5000)
    return () => clearInterval(interval)
  }, [])

  // Load messages for selected thread and subscribe to realtime
  useEffect(() => {
    if (!activePhone) return
    const thread = threads.find(t => t.userPhone === activePhone)
    if (thread) setMessages(thread.messages)

    if (!isSupabaseConfigured) return
    const channel = supabase
      .channel(`support-admin-${activePhone}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'support_messages',
        filter: `user_phone=eq.${activePhone}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [activePhone, threads])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!reply.trim() || !activePhone) return
    setSending(true)
    try {
      await sendSupportMessage(activePhone, reply.trim(), 'admin')
      setMessages(prev => [...prev, { user_phone: activePhone, message: reply.trim(), sender_type: 'admin', created_at: new Date().toISOString() }])
      setReply('')
      if (!isSupabaseConfigured) loadThreads()
    } catch (er) { showToast('❌ ' + er.message) }
    setSending(false)
  }

  return (
    <div className="flex gap-4 h-[520px]">
      {/* Thread list */}
      <div className="w-44 flex-shrink-0 overflow-y-auto space-y-2">
        {loading ? <Spinner /> : threads.length === 0 ? <p className="text-gray-500 text-xs text-center pt-4">No messages yet</p> : (
          threads.map(t => (
            <button key={t.userPhone}
              onClick={() => setActivePhone(t.userPhone)}
              className={`w-full text-left rounded-xl p-3 transition-all ${activePhone === t.userPhone ? 'bg-red-900/30 border border-red-800' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              <p className="text-xs font-semibold truncate">{t.userPhone}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{t.messages?.[t.messages.length - 1]?.message || ''}</p>
            </button>
          ))
        )}
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {!activePhone ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center text-xs font-bold">
                {activePhone.slice(-2)}
              </div>
              <p className="text-sm font-semibold">{activePhone}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${m.sender_type === 'admin' ? 'bg-gradient-to-r from-red-700 to-pink-700 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none'}`}>
                    <p>{m.message}</p>
                    <p className={`text-xs mt-1 ${m.sender_type === 'admin' ? 'text-red-200' : 'text-gray-500'}`}>
                      {new Date(m.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="border-t border-gray-800 p-3 flex gap-2">
              <input
                className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                placeholder="Type a reply..."
                value={reply}
                onChange={e => setReply(e.target.value)}
              />
              <button type="submit" disabled={sending || !reply.trim()} className="btn-primary text-sm py-2 px-4">
                {sending ? '...' : 'Send'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── Password Resets Tab ────────────────────────────────────────────────────────
function PasswordResetsTab({ showToast }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(null)
  const [tempPin, setTempPin] = useState('')

  async function load() {
    setLoading(true)
    try { setRequests(await getPasswordResetRequests()) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleReset(req) {
    if (!tempPin || tempPin.length < 4) { showToast('Enter a valid temporary PIN (4–6 digits)'); return }
    setResetting(req.id)
    try {
      await adminResetPassword(req.user_phone, tempPin)
      await updatePasswordResetRequest(req.id, { status: 'completed', completed_at: new Date().toISOString() })
      showToast('✅ Temporary password set. User has been notified via SMS.')
      setTempPin('')
      load()
    } catch (e) { showToast('❌ ' + e.message) }
    setResetting(false)
  }

  const pending = requests.filter(r => r.status === 'pending')
  const completed = requests.filter(r => r.status === 'completed')

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-yellow-400">{pending.length}</p>
          <p className="text-gray-500 text-xs">Pending</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-green-400">{completed.length}</p>
          <p className="text-gray-500 text-xs">Completed</p>
        </div>
      </div>

      {loading ? <Spinner /> : pending.length === 0 && completed.length === 0 ? <Empty text="No password reset requests yet" /> : (
        <div className="space-y-3">
          {pending.map(req => (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-yellow-400">{req.user_phone}</p>
                  <p className="text-gray-500 text-xs mt-1">{fmtDate(req.created_at)}</p>
                </div>
                <span className="text-xs bg-yellow-900/60 text-yellow-400 px-2 py-0.5 rounded-full font-medium">Pending</span>
              </div>
              {resetting === req.id ? (
                <div className="space-y-2">
                  <input
                    className="input-field"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter temporary PIN (4–6 digits)"
                    value={tempPin}
                    onChange={e => setTempPin(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setResetting(null); setTempPin('') }} className="btn-secondary flex-1 text-xs py-2">Cancel</button>
                    <button onClick={() => handleReset(req)} className="btn-primary flex-1 text-xs py-2">Set & Notify</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setResetting(req.id)} className="w-full text-xs py-2 rounded-xl font-semibold bg-yellow-700 hover:bg-yellow-600 text-white transition-all">
                  Reset Password
                </button>
              )}
            </div>
          ))}
          {completed.map(req => (
            <div key={req.id} className="card opacity-60">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-bold text-green-400">{req.user_phone}</p>
                  <p className="text-gray-500 text-xs mt-1">{fmtDate(req.created_at)}</p>
                </div>
                <span className="text-xs bg-green-900/60 text-green-400 px-2 py-0.5 rounded-full font-medium">Completed</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared UI primitives ──────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="text-center py-12">
      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      <p className="text-gray-500 text-xs">Loading...</p>
    </div>
  )
}
function Empty({ text }) {
  return <div className="card text-center py-12"><p className="text-gray-500 text-sm">{text}</p></div>
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'deposits',    label: '💰 Deposits' },
  { id: 'withdrawals', label: '💸 Withdrawals' },
  { id: 'loans',       label: '🏦 Loans' },
  { id: 'users',       label: '👥 Users' },
  { id: 'keywords',    label: '🎟️ Keywords' },
  { id: 'support',     label: '💬 Support' },
  { id: 'password-resets', label: '🔑 Passwords' },
]

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('deposits')
  const [toast, setToast] = useState('')

  const adminPhone = import.meta.env.VITE_ADMIN_PHONE
  const isAdmin = user && adminPhone && user.phone === adminPhone

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (!isAdmin) { navigate('/dashboard') }
  }, [user])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-950 pb-10">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black">⚙️ Admin Dashboard</h1>
          <p className="text-gray-500 text-xs">Dumiropay Control Centre</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary text-xs py-1.5 px-3">← Back</button>
      </div>

      {/* Tab bar — horizontally scrollable on mobile */}
      <div className="overflow-x-auto px-4 pt-4 pb-2">
        <div className="flex gap-2 min-w-max">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${tab === t.id ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4 max-w-2xl mx-auto">
        {tab === 'deposits'    && <DepositsTab    showToast={showToast} />}
        {tab === 'withdrawals' && <WithdrawalsTab showToast={showToast} />}
        {tab === 'loans'       && <LoansTab       showToast={showToast} />}
        {tab === 'users'       && <UsersTab       showToast={showToast} />}
        {tab === 'keywords'    && <KeywordsTab    showToast={showToast} />}
        {tab === 'support'     && <SupportTab     showToast={showToast} />}
        {tab === 'password-resets' && <PasswordResetsTab showToast={showToast} />}
      </div>
    </div>
  )
}

