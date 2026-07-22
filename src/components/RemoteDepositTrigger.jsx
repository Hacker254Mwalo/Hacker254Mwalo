import { useState } from 'react'

export default function RemoteDepositTrigger({ showToast }) {
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePushPrompt(e) {
    e.preventDefault()
    if (!phone.trim() || !amount.trim()) {
      showToast('Phone and amount are required', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          amount: parseInt(amount),
          userPhone: phone.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(`❌ ${data.error || data.message || 'Failed to trigger payment prompt'}`, 'error')
      } else {
        showToast(`✅ Payment prompt sent to ${phone}`, 'success')
        setPhone('')
        setAmount('')
      }
    } catch (error) {
      showToast(`❌ ${error.message || 'Failed to trigger payment prompt'}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card mb-6">
      <h4 className="font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">📱</span> Remote Deposit Trigger
      </h4>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        Remotely trigger an M-Pesa payment prompt on a client's phone (stateless — no data saved).
      </p>
      <form onSubmit={handlePushPrompt} className="space-y-3">
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
            Phone Number
          </label>
          <input
            className="w-full text-sm px-3 py-2 rounded-xl border outline-none transition-colors"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="e.g. +254712345678 or 0712345678"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
            Amount (KSh)
          </label>
          <input
            className="w-full text-sm px-3 py-2 rounded-xl border outline-none transition-colors"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="e.g. 1000"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            disabled={loading}
            min="1"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !phone.trim() || !amount.trim()}
          className="w-full py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: loading ? 'var(--bg-input)' : 'linear-gradient(135deg, #10b981, #059669)',
            color: loading ? 'var(--text-muted)' : '#fff',
          }}
        >
          {loading ? '⏳ Sending...' : '📤 Push Prompt'}
        </button>
      </form>
    </div>
  )
}
