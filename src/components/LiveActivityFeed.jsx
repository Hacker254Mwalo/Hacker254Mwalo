import { useState, useEffect, useRef, useCallback } from 'react'

// ── Realistic data pools ──────────────────────────────────────────────────────
const KENYAN_FIRST_NAMES = [
  'Grace', 'Peter', 'James', 'Mary', 'John', 'Jane', 'David', 'Sarah',
  'Michael', 'Ann', 'Joseph', 'Lucy', 'Daniel', 'Ruth', 'Samuel', 'Faith',
  'Patrick', 'Esther', 'George', 'Agnes', 'Simon', 'Martha', 'Francis', 'Dorothy',
  'Emmanuel', 'Catherine', 'Isaac', 'Diana', 'Felix', 'Rebecca', 'Moses', 'Hannah',
  'Stephen', 'Naomi', 'Timothy', 'Joan', 'Brian', 'Susan', 'Kevin', 'Alice',
  'Vincent', 'Christine', 'Eric', 'Julia', 'Nelson', 'Evelyn', 'Dennis', 'Pauline',
  'Allan', 'Miriam', 'Collins', 'Violet', 'Gideon', 'Tabitha', 'Hillary', 'Joyce',
]

// Withdrawal amounts: mostly 1000-25000
const WITHDRAWAL_AMOUNTS = [1000, 1200, 1500, 1800, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7000, 8000, 10000, 12000, 15000, 18000, 20000, 25000]

// Earning amounts (AI Yield daily)
const EARNING_AMOUNTS = [19, 20, 25, 30, 50, 75, 99, 100, 120, 150, 200, 250]

// Bonus claim amounts
const BONUS_AMOUNTS = [8, 9, 12, 15, 19, 20, 25, 30]
const BIG_BONUS = [500, 800, 1000, 1200]

// ── Phone number generator: starts with 2547 or 2541 ─────────────────────────
function randomPhone() {
  const prefixes = ['25470', '25471', '25472', '25473', '25474', '25475', '25476', '25477', '25478', '25479', '25410', '25411']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const mid = String(Math.floor(1000 + Math.random() * 9000))
  const last = String(Math.floor(10 + Math.random() * 90))
  return `${prefix}${mid}***${last}`
}

// ── Notification types that cycle through ─────────────────────────────────────
const NOTIFICATION_TYPES = [
  // claim
  {
    type: 'claim',
    label: 'claimed daily bonus',
    color: '#FFD700',
    generateAmount: () => {
      const isBig = Math.random() < 0.05
      if (isBig) return BIG_BONUS[Math.floor(Math.random() * BIG_BONUS.length)]
      return BONUS_AMOUNTS[Math.floor(Math.random() * BONUS_AMOUNTS.length)]
    },
    format: (phone, amount) => ({ phone, text: `claimed daily bonus +KSh ${amount}`, color: '#FFD700' }),
  },
  // withdrawal
  {
    type: 'withdrawal',
    label: 'requested withdrawal',
    color: '#60A5FA',
    generateAmount: () => {
      // Mostly 1000-25000
      return WITHDRAWAL_AMOUNTS[Math.floor(Math.random() * WITHDRAWAL_AMOUNTS.length)]
    },
    format: (phone, amount) => ({ phone, text: `requested withdrawal — KSh ${amount.toLocaleString()}`, color: '#60A5FA' }),
  },
  // compute loan
  {
    type: 'compute_loan',
    label: 'requested compute loan',
    color: '#A78BFA',
    generateAmount: () => {
      const amounts = [500, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000]
      return amounts[Math.floor(Math.random() * amounts.length)]
    },
    format: (phone, amount) => ({ phone, text: `requested compute credit — KSh ${amount.toLocaleString()}`, color: '#A78BFA' }),
  },
  // earning (AI Yield)
  {
    type: 'earning',
    label: 'earned from AI Yield',
    color: '#34D399',
    generateAmount: () => EARNING_AMOUNTS[Math.floor(Math.random() * EARNING_AMOUNTS.length)],
    format: (phone, amount) => ({ phone, text: `earned KSh ${amount} from AI Yield`, color: '#34D399' }),
  },
  // random approved
  {
    type: 'approved',
    label: 'approved',
    color: '#34D399',
    generateAmount: () => {
      // Approved deposit or withdrawal — realistic amounts
      const amounts = [1000, 2000, 3000, 5000, 7000, 10000, 15000, 20000]
      return amounts[Math.floor(Math.random() * amounts.length)]
    },
    format: (phone, amount) => ({ phone, text: `approved withdrawal — KSh ${amount.toLocaleString()}`, color: '#34D399' }),
  },
  // investment
  {
    type: 'investment',
    label: 'invested',
    color: '#F59E0B',
    generateAmount: () => {
      const amounts = [500, 1000, 2000, 3000, 5000, 7000, 10000, 15000]
      return amounts[Math.floor(Math.random() * amounts.length)]
    },
    format: (phone, amount) => ({ phone, text: `invested KSh ${amount.toLocaleString()}`, color: '#F59E0B' }),
  },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function LiveActivityFeed({ enabled }) {
  const [current, setCurrent] = useState(null)
  const [isFading, setIsFading] = useState(false)
  const timeoutRef = useRef(null)
  const countRef = useRef(0)
  const cycleIndexRef = useRef(0)
  const MAX_PER_SESSION = 10

  const generateEntry = useCallback(() => {
    // Cycle through notification types one at a time
    const typeDef = NOTIFICATION_TYPES[cycleIndexRef.current % NOTIFICATION_TYPES.length]
    cycleIndexRef.current++

    const phone = randomPhone()
    const amount = typeDef.generateAmount()
    const formatted = typeDef.format(phone, amount)

    return {
      id: Date.now() + Math.random(),
      ...formatted,
      actionType: typeDef.type,
    }
  }, [])

  const scheduleNext = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    // Hard stop after 10 notifications per session
    if (countRef.current >= MAX_PER_SESSION) {
      // Completely stop — no more notifications this session
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      return
    }

    // Random interval 5-12 seconds
    const delay = 5000 + Math.random() * 7000

    timeoutRef.current = setTimeout(() => {
      const entry = generateEntry()
      setIsFading(false)
      setCurrent(entry)
      countRef.current++

      // Visible for 4-6 seconds, then fade out
      const visibleTime = 4000 + Math.random() * 2000
      setTimeout(() => {
        setIsFading(true)
        // After fade animation completes, clear
        setTimeout(() => {
          setCurrent(null)
          setIsFading(false)
        }, 400)
      }, visibleTime)

      // Schedule next
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

    // Small initial delay
    const initialDelay = setTimeout(() => {
      scheduleNext()
    }, 3000 + Math.random() * 5000)

    return () => {
      clearTimeout(initialDelay)
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
