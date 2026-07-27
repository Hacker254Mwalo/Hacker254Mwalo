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

const KENYAN_LAST_INITIALS = [
  'M', 'K', 'O', 'N', 'W', 'A', 'G', 'S', 'L', 'B',
  'T', 'R', 'C', 'F', 'H', 'E', 'D', 'J', 'P', 'V',
]

const WITHDRAWAL_AMOUNTS = [500, 600, 950, 1200, 2700, 3500, 4500, 6000, 8700, 12000, 9000]
const EARNING_AMOUNTS = [19, 20, 50, 99, 100, 250]
const BONUS_AMOUNTS = [8, 9, 12, 19, 20]
const BIG_BONUS = [500, 800, 1200]

// Weighted random — smaller amounts appear more often (realistic distribution)
function weightedRandom(weights) {
  const total = weights.reduce((s, w) => s + w.weight, 0)
  let r = Math.random() * total
  for (const item of weights) {
    r -= item.weight
    if (r <= 0) return item.value
  }
  return weights[0].value
}

// ── Random data generators ────────────────────────────────────────────────────
function randomPhone() {
  const prefixes = ['070', '071', '072', '073', '074', '075', '076', '077', '078', '079']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const mid = String(Math.floor(100 + Math.random() * 900))
  const last = String(Math.floor(10 + Math.random() * 90))
  return `${prefix}${mid}***${last}`
}

function randomName() {
  const first = KENYAN_FIRST_NAMES[Math.floor(Math.random() * KENYAN_FIRST_NAMES.length)]
  const last = KENYAN_LAST_INITIALS[Math.floor(Math.random() * KENYAN_LAST_INITIALS.length)]
  return `${first} ${last}***`
}

// Generate a realistic activity entry
function generateEntry() {
  const typeRoll = Math.random()
  let actionType, amount, description, color

  if (typeRoll < 0.40) {
    // 40% — Earning from AI Yield
    amount = weightedRandom(EARNING_AMOUNTS.map(v => ({ value: v, weight: v <= 50 ? 4 : 2 })))
    actionType = 'earning'
    description = `earned KSh ${amount} from AI Yield`
    color = '#34D399' // green
  } else if (typeRoll < 0.75) {
    // 35% — Withdrawal
    amount = weightedRandom(WITHDRAWAL_AMOUNTS.map(v => ({ value: v, weight: v <= 1200 ? 5 : v <= 4500 ? 3 : 1 })))
    actionType = 'withdrawal'
    description = `requested withdrawal — KSh ${amount.toLocaleString()}`
    color = '#60A5FA' // blue
  } else {
    // 25% — Daily bonus claim
    const isBigBonus = Math.random() < 0.05 // 5% chance of big bonus
    amount = isBigBonus
      ? BIG_BONUS[Math.floor(Math.random() * BIG_BONUS.length)]
      : weightedRandom(BONUS_AMOUNTS.map(v => ({ value: v, weight: 3 })))
    actionType = 'bonus'
    description = `claimed daily login +KSh ${amount}`
    color = '#FFD700' // gold
  }

  return {
    id: Date.now() + Math.random(),
    phone: randomPhone(),
    description,
    amount,
    color,
    actionType,
    createdAt: new Date(),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LiveActivityFeed({ enabled }) {
  const [entries, setEntries] = useState([])
  const [current, setCurrent] = useState(null)
  const timeoutRef = useRef(null)
  const countRef = useRef(0)
  const MAX_PER_HOUR = 8

  const scheduleNext = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    // Rate limiting: max 8 per hour
    if (countRef.current >= MAX_PER_HOUR) {
      // Wait 10 minutes then reset counter
      timeoutRef.current = setTimeout(() => {
        countRef.current = 0
        scheduleNext()
      }, 10 * 60 * 1000)
      return
    }

    // Random interval 6-15 seconds
    const delay = 6000 + Math.random() * 9000

    timeoutRef.current = setTimeout(() => {
      const entry = generateEntry()
      setCurrent(entry)
      setEntries(prev => [...prev, entry])
      countRef.current++

      // Fade out after random 3-6 seconds
      const visibleTime = 3000 + Math.random() * 3000
      setTimeout(() => {
        setCurrent(null)
      }, visibleTime)

      // Schedule next
      scheduleNext()
    }, delay)
  }, [])

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setCurrent(null)
      return
    }

    // Small initial delay before first notification appears
    const initialDelay = setTimeout(() => {
      scheduleNext()
    }, 4000 + Math.random() * 6000)

    return () => {
      clearTimeout(initialDelay)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [enabled, scheduleNext])

  if (!enabled || !current) return null

  return (
    <div
      className="live-activity-notification"
      style={{
        borderColor: current.color,
        animation: 'activityHeartbeat 0.6s ease-out forwards',
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
            {current.phone} {current.description}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            just now
          </p>
        </div>
      </div>
    </div>
  )
}
