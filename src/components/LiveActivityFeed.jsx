import { useState, useEffect, useRef, useCallback } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────
const PHONE_PREFIXES = ['25470', '25471', '25472', '25473', '25474', '25475', '25476', '25477', '25478', '25479', '25410', '25411']

const recentPhones = new Set()

function generateRandomPhone(exclude = null) {
  let phone
  let attempts = 0
  do {
    const prefix = PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)]
    const mid = String(Math.floor(1000 + Math.random() * 9000))
    const last = String(Math.floor(10 + Math.random() * 90))
    phone = `${prefix}${mid}***${last}`
    attempts++
  } while ((recentPhones.has(phone) || phone === exclude) && attempts < 20)

  recentPhones.add(phone)
  if (recentPhones.size > 12) {
    const oldest = recentPhones.values().next().value
    recentPhones.delete(oldest)
  }
  return phone
}

// Generate truly random realistic amount within range
function randomInRange(min, max) {
  // Generate a number, round to nearest reasonable value
  const raw = min + Math.random() * (max - min)
  // Round to nearest 50 for clean look, but keep it random
  return Math.round(raw / 50) * 50 || Math.round(raw)
}

// ── Event definitions with realistic amount ranges ────────────────────────────
const EVENT_DEFS = [
  {
    key: 'deposit',
    weight: 22,
    color: '#22C55E',
    buildText: () => {
      const amount = randomInRange(500, 45000)
      return { text: `deposited KSh ${amount.toLocaleString()} via M-Pesa`, color: '#22C55E' }
    },
  },
  {
    key: 'withdrawal',
    weight: 20,
    color: '#60A5FA',
    buildText: () => {
      const amount = randomInRange(500, 25000)
      return { text: `requested withdrawal — KSh ${amount.toLocaleString()}`, color: '#60A5FA' }
    },
  },
  {
    key: 'approved',
    weight: 14,
    color: '#34D399',
    buildText: () => {
      const amount = randomInRange(500, 20000)
      return { text: `approved withdrawal — KSh ${amount.toLocaleString()}`, color: '#34D399' }
    },
  },
  {
    key: 'earning',
    weight: 14,
    color: '#34D399',
    buildText: () => {
      const amount = randomInRange(15, 280)
      return { text: `earned KSh ${amount} from AI Yield`, color: '#34D399' }
    },
  },
  {
    key: 'invest',
    weight: 10,
    color: '#F59E0B',
    buildText: () => {
      const amount = randomInRange(500, 20000)
      return { text: `invested KSh ${amount.toLocaleString()}`, color: '#F59E0B' }
    },
  },
  {
    key: 'claim',
    weight: 8,
    color: '#FFD700',
    buildText: () => {
      const amount = Math.random() < 0.05 ? randomInRange(500, 1200) : randomInRange(8, 35)
      return { text: `claimed daily bonus +KSh ${amount}`, color: '#FFD700' }
    },
  },
  {
    key: 'compute_loan',
    weight: 5,
    color: '#A78BFA',
    buildText: () => {
      const amount = randomInRange(500, 10000)
      return { text: `requested compute credit — KSh ${amount.toLocaleString()}`, color: '#A78BFA' }
    },
  },
  {
    key: 'login',
    weight: 4,
    color: '#38BDF8',
    buildText: () => ({ text: 'logged in', color: '#38BDF8' }),
    noAmount: true,
  },
  {
    key: 'signup',
    weight: 3,
    color: '#FB7185',
    buildText: () => ({ text: 'created an account', color: '#FB7185' }),
    noAmount: true,
  },
]

// ── Weighted pick (never same type twice in a row) ────────────────────────────
let lastEventKey = null

function pickEventType() {
  const available = EVENT_DEFS.filter(t => t.key !== lastEventKey)
  const totalWeight = available.reduce((s, t) => s + t.weight, 0)
  let r = Math.random() * totalWeight
  for (const t of available) {
    r -= t.weight
    if (r <= 0) {
      lastEventKey = t.key
      return t
    }
  }
  return available[0]
}

// ── Burst-then-slow pacing ────────────────────────────────────────────────────
function getDelay(count) {
  if (count < 3) return 800 + Math.random() * 1200   // 0.8-2s  — fast burst
  if (count < 6) return 1500 + Math.random() * 2500   // 1.5-4s — slowing
  if (count < 10) return 2500 + Math.random() * 3500  // 2.5-6s — natural
  if (count < 15) return 4000 + Math.random() * 5000  // 4-9s   — calm
  return 6000 + Math.random() * 8000                   // 6-14s  — quiet
}

// ── Quiet gap logic (sometimes nothing shows for a while) ─────────────────────
function shouldShowQuietGap(count) {
  if (count > 8 && Math.random() < 0.25) return true // 25% chance after 8 events
  return false
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LiveActivityFeed({ enabled, userPhone }) {
  const [current, setCurrent] = useState(null)
  const [isFading, setIsFading] = useState(false)
  const timeoutRef = useRef(null)
  const countRef = useRef(0)
  const hasStartedRef = useRef(false)

  const generateEntry = useCallback(() => {
    const event = pickEventType()
    // Show user's own masked number on login/signup events
    const phone = generateRandomPhone()
    const { text, color } = event.buildText()

    return {
      id: Date.now() + Math.random(),
      phone,
      text,
      color,
      actionType: event.key,
    }
  }, [])

  const scheduleNext = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    // Check for quiet gap
    if (shouldShowQuietGap(countRef.current)) {
      const gapTime = 8000 + Math.random() * 10000 // 8-18s silent
      timeoutRef.current = setTimeout(() => {
        scheduleNext()
      }, gapTime)
      return
    }

    // Burst-then-slow delay
    const delay = getDelay(countRef.current)

    timeoutRef.current = setTimeout(() => {
      const entry = generateEntry()
      setIsFading(false)
      setCurrent(entry)
      countRef.current++

      // Visible 3-5 seconds, then fade
      const visibleTime = 3000 + Math.random() * 2000
      setTimeout(() => {
        setIsFading(true)
        setTimeout(() => {
          setCurrent(null)
          setIsFading(false)
        }, 400)
      }, visibleTime)

      // Unlimited — keep going
      scheduleNext()
    }, delay)
  }, [generateEntry])

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setCurrent(null)
      setIsFading(false)
      return
    }

    // INSTANT start — 0-500ms
    if (!hasStartedRef.current) {
      hasStartedRef.current = true
      const tick = setTimeout(() => {
        scheduleNext()
      }, Math.random() * 500)

      return () => {
        clearTimeout(tick)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [enabled, scheduleNext])

  if (!enabled || !current) return null

  return (
    <div
      className={`live-activity-notification ${isFading ? 'activity-fade-out' : ''}`}
      style={{
        borderColor: current.color,
        animation: isFading ? undefined : 'activityHeartbeat 0.6s ease-out forwards',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="activity-icon-dot"
          style={{ background: current.color }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: current.color }}>●</span>{' '}
            {current.phone} {current.text}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            just now
          </p>
        </div>
      </div>
    </div>
  )
}
