import { useState, useEffect, useRef, useCallback } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────
const PHONE_PREFIXES = ['25470', '25471', '25472', '25473', '25474', '25475', '25476', '25477', '25478', '25479', '25410', '25411']

const RECENT_PHONES_MAX = 50 // larger pool = less repetition
const recentPhones = new Set()

function generateRandomPhone() {
  let phone
  let attempts = 0
  do {
    const prefix = PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)]
    const mid = String(Math.floor(1000 + Math.random() * 9000))
    const last = String(Math.floor(10 + Math.random() * 90))
    phone = `${prefix}${mid}***${last}`
    attempts++
  } while (recentPhones.has(phone) && attempts < 30)

  recentPhones.add(phone)
  if (recentPhones.size > RECENT_PHONES_MAX) {
    const oldest = recentPhones.values().next().value
    recentPhones.delete(oldest)
  }
  return phone
}

function randomInRange(min, max) {
  const raw = min + Math.random() * (max - min)
  return Math.round(raw / 50) * 50 || Math.round(raw)
}

// ── INVESTMENT PLANS (exact match to platform) ────────────────────────────────
const INVESTMENT_PLANS = [
  { name: 'Micro-AI Node (V1)', min: 200, max: 200, icon: '⚡' },
  { name: 'Cloud GPU Rig (RTX 4090)', min: 2000, max: 2000, icon: '🔵' },
  { name: 'H100 Tensor Core', min: 15000, max: 15000, icon: '🟢' },
  { name: 'Deep Learning Center', min: 4000, max: 4000, icon: '🔷' },
]

function pickInvestmentPlan() {
  const plan = INVESTMENT_PLANS[Math.floor(Math.random() * INVESTMENT_PLANS.length)]
  return plan
}

// ── WORKLOADS (match platform) ────────────────────────────────────────────────
const WORKLOADS = ['Healthcare AI', 'Finance AI', 'Autonomous Systems', 'Retail AI', 'NLP AI', 'Climate AI']

function pickWorkload() {
  return WORKLOADS[Math.floor(Math.random() * WORKLOADS.length)]
}

// ── Event definitions — wide variety, platform-matched ────────────────────────
const EVENT_DEFS = [
  {
    key: 'short_term_deploy',
    weight: 25,
    color: '#60A5FA',
    buildText: () => {
      const plans = ['24h Quick Burst', '3D Standard Deploy', '7D Extended Run']
      const plan = plans[Math.floor(Math.random() * plans.length)]
      return { text: `deployed ${plan} node`, color: '#60A5FA' }
    },
  },
  {
    key: 'short_term_payout',
    weight: 20,
    color: '#34D399',
    buildText: () => {
      const amount = randomInRange(3605, 4130)
      return { text: `completed short-term run — KSh ${amount.toLocaleString()} credited`, color: '#34D399' }
    },
  },
  {
    key: 'deposit',
    weight: 18,
    color: '#22C55E',
    buildText: () => {
      const amount = randomInRange(200, 50000)
      return { text: `deposited KSh ${amount.toLocaleString()} via M-Pesa`, color: '#22C55E' }
    },
  },
  {
    key: 'withdrawal_requested',
    weight: 15,
    color: '#60A5FA',
    buildText: () => {
      const amount = randomInRange(500, 30000)
      return { text: `requested withdrawal — KSh ${amount.toLocaleString()}`, color: '#60A5FA' }
    },
  },
  {
    key: 'withdrawal_approved',
    weight: 12,
    color: '#34D399',
    buildText: () => {
      const amount = randomInRange(500, 25000)
      return { text: `approved withdrawal — KSh ${amount.toLocaleString()}`, color: '#34D399' }
    },
  },
  {
    key: 'invest',
    weight: 14,
    color: '#F59E0B',
    buildText: () => {
      const plan = pickInvestmentPlan()
      const workload = pickWorkload()
      return { text: `invested in ${plan.name} (${workload})`, color: '#F59E0B' }
    },
  },
  {
    key: 'daily_yield',
    weight: 12,
    color: '#34D399',
    buildText: () => {
      const amount = randomInRange(6, 450)
      return { text: `earned AI compute yield +KSh ${amount}`, color: '#34D399' }
    },
  },
  {
    key: 'bonus_claim',
    weight: 10,
    color: '#FFD700',
    buildText: () => {
      const amount = Math.random() < 0.15 ? randomInRange(100, 800) : randomInRange(8, 50)
      return { text: `claimed daily login bonus +KSh ${amount}`, color: '#FFD700' }
    },
  },
  {
    key: 'spin_win',
    weight: 8,
    color: '#A78BFA',
    buildText: () => {
      const prizes = [100, 250, 500, 1000, 2000, 3500, 5000]
      const amount = prizes[Math.floor(Math.random() * prizes.length)]
      return { text: `won KSh ${amount.toLocaleString()} from Lucky Spin`, color: '#A78BFA' }
    },
  },
  {
    key: 'compute_cycle',
    weight: 10,
    color: '#38BDF8',
    buildText: () => {
      const cycles = ['completed 24h compute cycle', 'executed daily AI workload', 'processed batch inference jobs']
      const cycle = cycles[Math.floor(Math.random() * cycles.length)]
      return { text: `${cycle}`, color: '#38BDF8' }
    },
  },
  {
    key: 'referral_earned',
    weight: 7,
    color: '#FB923C',
    buildText: () => {
      const amount = randomInRange(20, 1500)
      const tier = Math.random() < 0.75 ? 'L1' : 'L2'
      return { text: `earned ${tier} referral commission +KSh ${amount.toLocaleString()}`, color: '#FB923C' }
    },
  },
  {
    key: 'promo_redeemed',
    weight: 5,
    color: '#F472B6',
    buildText: () => {
      const amount = randomInRange(100, 2000)
      return { text: `redeemed promo code +KSh ${amount.toLocaleString()}`, color: '#F472B6' }
    },
  },
  {
    key: 'compute_credit',
    weight: 5,
    color: '#818CF8',
    buildText: () => {
      const amount = randomInRange(500, 50000)
      return { text: `requested compute credit — KSh ${amount.toLocaleString()}`, color: '#818CF8' }
    },
  },
  {
    key: 'login',
    weight: 4,
    color: '#38BDF8',
    buildText: () => ({ text: 'logged in', color: '#38BDF8', noAmount: true }),
  },
  {
    key: 'signup',
    weight: 3,
    color: '#FB7185',
    buildText: () => ({ text: 'joined the network', color: '#FB7185', noAmount: true }),
  },
  {
    key: 'bonus_transfer',
    weight: 3,
    color: '#2DD4BF',
    buildText: () => {
      const amount = randomInRange(500, 10000)
      return { text: `transferred bonus to balance — KSh ${amount.toLocaleString()}`, color: '#2DD4BF' }
    },
  },
]

// ── Smart weighted pick — prevents repetition of same type AND same phone ─────
let lastEventKey = null
let lastPhone = null

function pickEventType() {
  // Filter out last type to prevent obvious repetition
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

// ── Truly random delay — no burst pattern, natural flow ──────────────────────
function getRandomDelay() {
  // Faster rhythm for "unlimited flow" feel: 1-4 seconds
  return 1200 + Math.random() * 2800
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LiveActivityFeed({ enabled, userPhone }) {
  const [current, setCurrent] = useState(null)
  const [isFading, setIsFading] = useState(false)
  const timeoutRef = useRef(null)
  const hasStartedRef = useRef(false)

  const generateEntry = useCallback(() => {
    const event = pickEventType()
    // Try to avoid same phone appearing twice in a row
    let phone
    let attempts = 0
    do {
      phone = generateRandomPhone()
      attempts++
    } while (phone === lastPhone && attempts < 5)
    lastPhone = phone

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

    const delay = getRandomDelay()

    timeoutRef.current = setTimeout(() => {
      const entry = generateEntry()
      setIsFading(false)
      setCurrent(entry)

      // Visible 3-6 seconds, then fade out
      const visibleTime = 3000 + Math.random() * 3000
      setTimeout(() => {
        setIsFading(true)
        setTimeout(() => {
          setCurrent(null)
          setIsFading(false)
        }, 400)
      }, visibleTime)

      // Unlimited — never stops
      scheduleNext()
    }, delay)
  }, [generateEntry])

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setCurrent(null)
      setIsFading(false)
      hasStartedRef.current = false
      return
    }

    // Start immediately — no burst, steady from the start
    if (!hasStartedRef.current) {
      hasStartedRef.current = true
      const tick = setTimeout(() => {
        scheduleNext()
      }, 500)

      return () => {
        clearTimeout(tick)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [enabled, scheduleNext])

  if (!enabled) return null

  if (!current) {
    return (
      <div className="live-activity-notification" style={{
        borderColor: 'rgba(148, 163, 184, 0.4)',
      }}>
        <div className="flex items-center gap-2">
          <span className="activity-icon-dot" style={{ background: '#94A3B8', animation: 'pulse 2s infinite' }} />
          <p className="text-[10px]" style={{ color: '#94A3B8' }}>Live activity stream — no recent actions</p>
        </div>
      </div>
    )
  }

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
