import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getUserNotifications, markNotificationRead, markAllNotificationsRead, deleteUserNotification } from '../lib/db'

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

const TYPE_STYLES = {
  info:    { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  icon: '📢', dot: '#3b82f6' },
  success: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', icon: '✅', dot: '#10b981' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: '⚠️', dot: '#f59e0b' },
  promo:   { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', icon: '🎁', dot: '#8b5cf6' },
  alert:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  icon: '🔔', dot: '#ef4444' },
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    if (!user?.phone) return
    setLoading(true)
    try {
      const data = await getUserNotifications(user.phone)
      setNotifications(data)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [user?.phone])

  useEffect(() => { load() }, [load])

  async function handleMarkRead(id) {
    await markNotificationRead(id).catch(() => {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function handleMarkAllRead() {
    if (!user?.phone) return
    await markAllNotificationsRead(user.phone).catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function handleDelete(id) {
    await deleteUserNotification(id).catch(() => {})
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'read') return n.is_read
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div
      className="min-h-screen pb-28 md:pb-8 md:pt-20"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white transition-colors"
              style={{ background: 'var(--bg-input)' }}
              title="Refresh"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'all',    label: 'All',    count: notifications.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'read',   label: 'Read',   count: notifications.length - unreadCount },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === f.key ? 'text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
              style={{
                background: filter === f.key
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'var(--bg-input)',
              }}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${filter === f.key ? 'bg-white/20' : 'bg-white/10'}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Notification list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'var(--bg-input)' }}>
              🔔
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1">
                {filter === 'unread' ? 'All caught up!' : 'No notifications'}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {filter === 'unread' ? 'You have no unread notifications.' : 'Notifications from admin will appear here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => {
              const style = TYPE_STYLES[n.type] || TYPE_STYLES.info
              return (
                <div
                  key={n.id}
                  className="rounded-2xl p-4 transition-all duration-200 hover:scale-[1.01] cursor-pointer"
                  style={{
                    background: n.is_read ? 'var(--bg-surface)' : style.bg,
                    border: `1px solid ${n.is_read ? 'var(--border)' : style.border}`,
                  }}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: n.is_read ? 'var(--bg-input)' : `${style.bg}` }}
                    >
                      {n.icon || style.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {n.title && (
                            <p className="font-bold text-sm mb-0.5">{n.title}</p>
                          )}
                          <p className="text-sm leading-relaxed" style={{ color: n.is_read ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                            {n.message}
                          </p>
                        </div>
                        {/* Delete button */}
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(n.id) }}
                          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {timeAgo(n.created_at)}
                        </span>
                        {!n.is_read && (
                          <span
                            className="flex items-center gap-1 text-[10px] font-semibold"
                            style={{ color: style.dot }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: style.dot }} />
                            New
                          </span>
                        )}
                        {n.type && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize"
                            style={{ background: `${style.dot}22`, color: style.dot }}
                          >
                            {n.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
