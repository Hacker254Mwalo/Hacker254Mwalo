import { useState, useEffect, useRef, useCallback } from 'react'

// ── Phone pool: generate unique-ish phones with smart mask ────────────────────
const PHONE_PREFIXES = ['25470', '25471', '25472', '25473', '25474', '25475', '25476', '25477', '25478', '25479', '25410', '25411']

// Track recent phones to avoid obvious repeats
const recentPhones = new Set()

function generatePhone() {
  // Find a phone that hasn't appeared in the last ~8 entries
  let phone
  do {
    const prefix = PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)]
    const mid = String(Math.floor(1000 + Math.random() * 9000))
    const last = String(Math.floor(10 + Math.random() * 90))
    phone = `${prefix}${mid}***${last}`
  } while (recentPhones.has(phone))

  recentPhones.add(phone)
  // Keep pool fresh — remove oldest if too large
  if (recentPhones.size > 8) {
    const oldest = recentPhones.values().next().value
    recentPhones.delete(oldest)
  }
  return phone
}

// ── Event types with weighted randomness ──────────────────────────────────────
const EVENT_TYPES = [
  {
    key: 'deposit',
    weight: 20, // most common — money coming in
    color: '#22C55E',
    amountRange: [500, 1000, 1200, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7000, 8000, 10000, 12000, 15000, 20000, 25000, 30000, 35000, 40000, 45000],
    label: 'deposited KSh',
    suffix: ' via M-Pesa',
  },
  {
    key: 'withdrawal',
    weight: 18,
    color: '#60A5FA',
    amountRange: [500, 600, 950, 1000, 1200, 1500, 2000, 2500, 2700, 3000, 3500, 4500, 6000, 7000, 8700, 9000, 10000, 12000, 15000, 20000, 25000],
    label: 'requested withdrawal — KSh',
    suffix: '',
  },
  {
    key: 'earning',
    weight: 16,
    color: '#34D399',
    amountRange: [19, 20, 25, 30, 50, 75, 99, 100, 120, 150, 200, 250],
    label: 'earned KSh',
    suffix: ' from AI Yield',
  },
  {
    key: 'approved',
    weight: 12,
    color: '#34D399',
    amountRange: [500, 1000, 2000, 3000, 5000, 7000, 10000, 15000, 20000],
    label: 'approved withdrawal — KSh',
    suffix: '',
  },
  {
    key: 'invest',
    weight: 10,
    color: '#F59E0B',
    amountRange: [500, 1000, 2000, 3000, 5000, 7000, 10000, 15000, 20000],
    label: 'invested KSh',
    suffix: '',
  },
  {
    key: 'claim',
    weight: 10,
    color: '#FFD700',
    amountRange: [8, 9, 12, 15, 19, 20, 25, 30],
    bigBonusRange: [500, 800, 1000, 1200],
    label: 'claimed daily bonus +KSh',
    suffix: '',
    isBigBonusRare: true,
  },
  {
    key: 'compute_loan',
    weight: 6,
    color: '#A78BFA',
    amountRange: [500, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000],
    label: 'requested compute credit — KSh',
    suffix: '',
  },
  {
    key: 'login',
    weight: 4,
    color: '#38BDF8',
    amountRange: null,
    label: 'logged in',
    suffix: '',
    noAmount: true,
  },
  {
    key: 'signup',
    weight: 4,
    color: '#FB7185',
    amountRange: null,
    label: 'created an account',
    suffix: '',
    noAmount: true,
  },
]

// ── Weighted random selection (never same type twice in a row) ────────────────
let lastEventKey = null
let lastAmountKey = null // track last phone+action combo

function pickEventType() {
  const available = EVENT_TYPES.filter(t => t.key !== lastEventKey)
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

// ── Smart amount selection (avoid same amount+type combo repeating) ───────────
const recentCombos = new Set() // "deposit:5000" to avoid repeats

function pickAmount(event) {
  if (event.noAmount) return null

  const range = event.amountRange
  const bigRange = event.bigBonusRange

  if (event.isBigBonusRare && Math.random() < 0.05) {
    return bigRange[Math.floor(Math.random() * bigRange.length)]
  }

  // Pick amount, avoid recent combos
  let amount
  const maxAttempts = 5
  for (let i = 0; i < maxAttempts; i++) {
    amount = range[Math.floor(Math.random() * range.length)]
    const comboKey = `${event.key}:${amount}`
    if (!recentCombos.has(comboKey)) break
  }
  recentCombos.add(`${event.key}:${amount}`)
  // Keep combo set fresh
  if (recentCombos.size > 15) {
    const oldest = recentCombos.values().next().value
    recentCombos.delete(oldest)
  }

  return amount
}

// ── Build notification text ───────────────────────────────────────────────────
function buildText(event, phone, amount) {
  if (event.noAmount) return { text: event.label, color: event.color }
  const formattedAmount = amount.toLocaleString()
  return {
    text: `${event.label} ${formattedAmount}${event.suffix}`,
    color: event.color,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LiveActivityFeed({ enabled }) {
  const [current, setCurrent] = useState(null)
  const [isFading, setIsFading] = useState(false)
  const timeoutRef = useRef(null)

  const generateEntry = useCallback(() => {
    const event = pickEventType()
    const phone = generatePhone()
    const amount = pickAmount(event)
    const { text, color } = buildText(event, phone, amount)

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

    // Random interval 2-5 seconds — fast but not robotic
    const delay = 2000 + Math.random() * 3000

    timeoutRef.current = setTimeout(() => {
      const entry = generateEntry()
      setIsFading(false)
      setCurrent(entry)

      // Visible 3-5 seconds, then fade out
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

    // TRULY INSTANT — no delay after login/signup
    const tick = setTimeout(() => {
      scheduleNext()
    }, Math.random() * 500)

    return () => {
      clearTimeout(tick)
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
