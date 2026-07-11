import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAllDeposits, approveDeposit, rejectDeposit } from '../lib/db'

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState('pending')

  const adminPhone = import.meta.env.VITE_ADMIN_PHONE
  const isAdmin = user && adminPhone && user.phone === adminPhone

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (!isAdmin) { navigate('/dashboard'); return }
    fetchDeposits()
  }, [user])

  async function fetchDeposits() {
    setLoading(true)
    try {
      const all = await getAllDeposits()
      setDeposits(all)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleApprove(dep) {
    try {
      await approveDeposit(dep.id, dep.user_phone, dep.amount)
      showToast('Deposit approved and balance credited!')
      fetchDeposits()
    } catch (e) {
      showToast('Error: ' + e.message)
    }
  }

  async function handleReject(dep) {
    try {
      await rejectDeposit(dep.id)
      showToast('Deposit rejected.')
      fetchDeposits()
    } catch (e) {
      showToast('Error: ' + e.message)
    }
  }

  const filtered = deposits.filter(d => d.status === tab)

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-8 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-800 border border-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">Manage deposit approvals</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary text-sm py-2 px-4"
        >
          Back
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {['pending', 'approved', 'rejected'].map(s => (
          <div key={s} className="card text-center">
            <p className={`text-xl font-black ${s === 'approved' ? 'text-green-400' : s === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
              {deposits.filter(d => d.status === s).length}
            </p>
            <p className="text-gray-400 text-xs capitalize">{s}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 p-1 rounded-xl mb-6">
        {['pending', 'approved', 'rejected'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
              tab === t ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow' : 'text-gray-400'
            }`}
          >
            {t} ({deposits.filter(d => d.status === t).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400">No {tab} deposits</p>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={fetchDeposits}
            className="text-xs text-gray-400 hover:text-white mb-2"
          >
            Refresh
          </button>
          {filtered.map(dep => (
            <div key={dep.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-lg text-green-400">KSh {Number(dep.amount).toLocaleString()}</p>
                  <p className="text-sm font-medium">{dep.users?.name || 'Unknown'}</p>
                  <p className="text-gray-400 text-xs">{dep.user_phone}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(dep.created_at).toLocaleString('en-KE', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  {dep.checkout_id && (
                    <p className="text-gray-600 text-xs mt-1 font-mono truncate max-w-xs">ID: {dep.checkout_id}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${
                  dep.status === 'approved' ? 'bg-green-900/60 text-green-400' :
                  dep.status === 'rejected' ? 'bg-red-900/60 text-red-400' :
                  'bg-yellow-900/60 text-yellow-400'
                }`}>
                  {dep.status}
                </span>
              </div>

              {dep.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReject(dep)}
                    className="btn-secondary flex-1 text-sm py-2"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(dep)}
                    className="flex-1 text-sm py-2 rounded-xl font-semibold bg-green-700 hover:bg-green-600 text-white transition-all"
                  >
                    Approve & Credit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
