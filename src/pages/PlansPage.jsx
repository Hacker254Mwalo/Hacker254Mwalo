import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getInvestments, addInvestment, getUser, getShortTermInvestments } from '../lib/db'
import {
  PLANS, DAILY_RATE, DURATION_DAYS,
  WORKLOAD_MULTIPLIERS,
  getWorkloadYield, getWorkloadTotalReturn,
  kshToTokens, TOKEN_RATE,
} from '../lib/plans'
import PlanCertifications from '../components/PlanCertifications'
import DataCenterInfo from '../components/DataCenterInfo'
import EnterpriseClientWall from '../components/EnterpriseClientWall'
import { hasClaimedBonusToday, claimDailyLoginBonus, claimLuckySpin } from '../lib/db'

const PLAN_IMAGES = {
  starter: '/icons/starter.webp',
  basic: '/icons/basic.webp',
  silver: '/icons/silver.webp',
  gold: '/icons/gold.webp',
  platinum: '/icons/platinum.webp',
  diamond: '/icons/diamond.webp',
  ruby: '/icons/ruby.webp',
  emerald: '/icons/emerald.webp',
  sapphire: '/icons/sapphire.webp',
  vip: '/icons/vip.webp',
}

/* ── Loading Ritual ──────────────────────────────────────────────────── */
function LoadingRitual({ onComplete }) {
  const [stage, setStage] = useState(0)
  const messages = [
    'Connecting to GPU cluster...',
    '14 nodes active · Demand: 94.2%',
    'Your session: secure',
  ]

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 350)
    const t2 = setTimeout(() => setStage(2), 700)
    const t3 = setTimeout(() => onComplete(), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #030712 0%, #0a0e1a 100%)' }}>
      <div className="scan-line" />
      <div className="mb-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, rgba(0,180,255,0.15), rgba(0,180,255,0.05))', border: '1px solid rgba(0,180,255,0.3)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00B4FF" strokeWidth="1.5">
            <rect x="2" y="2" width="20" height="20" rx="3" />
            <path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7zM13 13h4v4h-4z" />
          </svg>
        </div>
      </div>
      <div className="space-y-2 text-center">
        {messages.map((msg, i) => (
          <p key={i} className={`text-sm transition-all duration-300 ${
            i <= stage ? 'text-green-400 opacity-100' : 'text-gray-700 opacity-30'
          }`}>
            {i <= stage && '✓ '}{msg}
          </p>
        ))}
      </div>
      <div className="mt-6 w-48 h-1 rounded-full bg-gray-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(stage + 1) * 33}%`, background: 'linear-gradient(90deg, #00B4FF, #34D399)' }} />
      </div>
    </div>
  )
}

/* ── Global Compute Demand Bar ─────────────────────────────────────────── */
function GlobalDemandBar() {
  const [demand, setDemand] = useState(87)
  const [trend, setTrend] = useState('up')

  useEffect(() => {
    const tick = () => {
      setDemand(prev => {
        const delta = (Math.random() - 0.5) * 3
        const next = Math.max(60, Math.min(99, prev + delta))
        setTrend(delta > 0 ? 'up' : 'down')
        return parseFloat(next.toFixed(1))
      })
    }
    const id = setInterval(tick, 4000)
    return () => clearInterval(id)
  }, [])

  const tier = demand >= 90 ? { label: 'Critical', color: '#ef4444' }
    : demand >= 75 ? { label: 'High', color: '#facc15' }
    : { label: 'Moderate', color: '#34d399' }

  return (
    <div className="rounded-xl px-4 py-3 mb-6 flex items-center justify-between"
      style={{ background: 'linear-gradient(135deg, rgba(10,12,30,0.95), rgba(6,8,20,0.98))', border: '1px solid rgba(0,180,255,0.12)' }}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-3 h-3 rounded-full" style={{ background: tier.color, boxShadow: `0 0 10px ${tier.color}` }} />
          <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping" style={{ background: tier.color, opacity: 0.4 }} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#00B4FF' }}>Global Compute Demand</p>
          <p className="text-lg font-black" style={{ color: tier.color }}>{demand}% — {tier.label}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>Enterprise demand driving</p>
        <p className="text-xs font-semibold" style={{ color: tier.color }}>
          {demand > 85 ? 'Premium node payouts' : demand > 70 ? 'Elevated yields active' : 'Standard yields'}
        </p>
      </div>
    </div>
  )
}

/* ── Haptic Touch Wrapper ────────────────────────────────────────────── */
function HapticButton({ children, onClick, className, disabled, style }) {
  const [shaking, setShaking] = useState(false)
  const handleClick = () => {
    if (disabled) return
    setShaking(true)
    onClick()
    setTimeout(() => setShaking(false), 350)
  }
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${className || ''} ${shaking ? 'haptic-shake' : ''}`}
      style={style}
    >
      {children}
    </button>
  )
}

/* ── Revenue Stream Simulator ─────────────────────────────────────────── */
function RevenueSimulator({ balance }) {
  const [allocation, setAllocation] = useState(2000)
  const [workload, setWorkload] = useState('finance')
  
  const daily = getWorkloadYield(allocation, workload)
  const total = getWorkloadTotalReturn(allocation, workload)
  const roi = Math.round((total / allocation - 1) * 100)
  const w = WORKLOAD_MULTIPLIERS[workload]
  
  return (
    <div className="card mb-6 p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(6,182,212,0.05) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
      <div className="absolute top-0 right-0 p-2">
        <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-tighter">Live Calculator</span>
      </div>
      
      <h3 className="text-sm font-black mb-4 uppercase tracking-wider text-emerald-400">Compute Yield Simulator</h3>
      
      <div className="space-y-6">
        {/* Allocation Slider */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="text-[10px] uppercase font-bold text-gray-400">Node Allocation Amount</label>
            <span className="text-lg font-black text-white">KSh {allocation.toLocaleString()}</span>
          </div>
          <input 
            type="range" min="200" max="100000" step="100" 
            value={allocation} 
            onChange={(e) => setAllocation(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between mt-1 text-[8px] text-gray-500 font-mono">
            <span>MIN: 200</span>
            <span>MAX: 100,000</span>
          </div>
        </div>

        {/* Workload Selector */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(WORKLOAD_MULTIPLIERS).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setWorkload(key)}
              className={`py-2 rounded-lg text-[10px] font-bold transition-all border ${
                workload === key 
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/40' 
                  : 'bg-gray-900/50 border-gray-800 text-gray-500 hover:border-gray-700'
              }`}
            >
              <span className="block text-sm mb-0.5">{info.icon}</span>
              {info.name}
            </button>
          ))}
        </div>

        {/* Result Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-xl p-3 bg-black/40 border border-white/5">
            <p className="text-[9px] uppercase text-gray-500 mb-1">Daily Yield</p>
            <p className="text-xl font-black text-emerald-400">+KSh {daily.toLocaleString()}</p>
            <p className="text-[8px] text-gray-500 mt-1">Direct to balance</p>
          </div>
          <div className="rounded-xl p-3 bg-black/40 border border-white/5">
            <p className="text-[9px] uppercase text-gray-500 mb-1">60-Day Settlement</p>
            <p className="text-xl font-black text-yellow-400">KSh {total.toLocaleString()}</p>
            <p className="text-[8px] text-gray-500 mt-1">{roi}% Net Performance</p>
          </div>
        </div>

        <div className="text-[9px] text-center text-gray-500 italic">
          "Based on current {w.name} workload demand multipliers"
        </div>
      </div>
    </div>
  )
}

/* ── Live Deployments Ticker ─────────────────────────────────────────── */
function LiveDeploymentsTicker() {
  const [count, setCount] = useState(1247)
  const [recentDeploy, setRecentDeploy] = useState({ phone: '***2384', plan: 'Cloud GPU Rig', amount: 'KSh 500', time: '2s ago' })

  useEffect(() => {
    const tick = () => {
      setCount(prev => prev + Math.floor(Math.random() * 3))
      const phones = ['***2384', '***5671', '***9012', '***4455', '***7788', '***1123', '***6699', '***3344']
      const plans = ['Micro-AI Node', 'Cloud GPU Rig', 'AI Server Cluster', 'Neural Network Array']
      const amounts = ['KSh 200', 'KSh 500', 'KSh 1,000', 'KSh 2,000']
      const times = ['1s ago', '3s ago', '5s ago', '8s ago']
      const idx = Math.floor(Math.random() * phones.length)
      setRecentDeploy({
        phone: phones[idx],
        plan: plans[Math.floor(Math.random() * plans.length)],
        amount: amounts[Math.floor(Math.random() * amounts.length)],
        time: times[Math.floor(Math.random() * times.length)],
      })
    }
    const id = setInterval(tick, 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between"
      style={{ background: 'linear-gradient(135deg, rgba(10,12,30,0.95), rgba(6,8,20,0.98))', border: '1px solid rgba(16,185,129,0.15)' }}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping bg-emerald-400 opacity-30" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#00B4FF' }}>Live Deployments</p>
          <p className="text-lg font-black text-emerald-400">{count.toLocaleString()} nodes</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[9px] text-gray-500">Latest</p>
        <p className="text-[10px] text-gray-300 font-semibold">{recentDeploy.phone} → {recentDeploy.plan} ({recentDeploy.amount})</p>
        <p className="text-[8px] text-gray-600">{recentDeploy.time}</p>
      </div>
    </div>
  )
}

/* ── How It Works Explainer ──────────────────────────────────────────── */
function HowItWorksStrip() {
  const steps = [
    { icon: '💻', label: 'Provision a Node', desc: 'Allocate capital to provision GPU compute infrastructure' },
    { icon: '⚡', label: 'AI Jobs Execute', desc: 'Enterprise clients run AI workloads on your provisioned node' },
    { icon: '💰', label: 'Compute Yield', desc: 'Yield from completed compute jobs credited to your node balance' },
    { icon: '🔄', label: 'Scale or Withdraw', desc: 'Reallocate for compound growth or withdraw yield anytime' },
  ]

  return (
    <div className="rounded-xl px-4 py-4 mb-4"
      style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(10,12,30,0.95) 100%)', border: '1px solid rgba(6,182,212,0.12)' }}>
      <p className="text-[10px] uppercase tracking-widest font-bold text-center mb-3" style={{ color: '#00B4FF' }}>How It Works</p>
      <div className="grid grid-cols-4 gap-2">
        {steps.map((step, i) => (
          <div key={i} className="text-center">
            <span className="text-xl block mb-1">{step.icon}</span>
            <p className="text-[8px] font-bold text-white uppercase tracking-tight">{step.label}</p>
            <p className="text-[7px] text-gray-500 mt-0.5 leading-tight hidden sm:block">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Spot Market CTA (visible on standard tab) ──────────────────────── */
function SpotMarketCTA({ onSwitchToSpot }) {
  return (
    <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between cursor-pointer group"
      onClick={onSwitchToSpot}
      style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(10,12,30,0.95) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
            </svg>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-tight">Spot Market Available</p>
          <p className="text-[9px] text-gray-400">24H - 7D nodes · Instant payout · No lock-up</p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition-transform">
        <span className="text-[10px] font-bold uppercase">View</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </div>
  )
}

/* ── Plan Badge Map ─────────────────────────────────────────────────────── */
const PLAN_BADGES = {
  starter: { label: 'Best Start', color: '#3b82f6' },
  basic:   { label: '🔥 Popular', color: '#f97316' },
  silver:  { label: 'Solid Pick', color: '#94a3b8' },
  gold:    { label: '⭐ Best Value', color: '#facc15' },
  platinum:{ label: 'Top Seller', color: '#06b6d4' },
  diamond: { label: 'Elite Tier', color: '#a855f7' },
  ruby:    { label: 'High Yield', color: '#ef4444' },
  emerald: { label: 'Secure', color: '#10b981' },
  sapphire:{ label: 'Premium', color: '#6366f1' },
  vip:     { label: '👑 Ultimate', color: '#ec4899' },
}

/* ── Plan Quiz ──────────────────────────────────────────────────────────── */
const SHORT_TERM_PLANS = [
  { id: 'st1', name: '24h Rapid Inference', duration: 24, rate: '3%', rateNum: 0.03, color: 'emerald', desc: 'Real-time AI inference & data validation.', resource: 'NVIDIA H100 TENSOR CORE', icon: '⚡', badge: '⚡ Fastest Payout' },
  { id: 'st2', name: '3D Neural Cluster', duration: 72, rate: '8%', rateNum: 0.08, color: 'blue', desc: 'Deep learning model validation & testing.', resource: 'MULTI-GPU CLUSTER A100', icon: '🧠', badge: '🔥 Most Popular' },
  { id: 'st3', name: '7D Enterprise Backbone', duration: 168, rate: '18%', rateNum: 0.18, color: 'purple', desc: 'Large-scale model training infrastructure.', resource: 'BARE METAL AI NODE', icon: '🏢', badge: '💎 Highest Yield' },
]

const PLAN_PATHS = {
  standard: {
    id: 'standard',
    label: 'Long-Term Node',
    eyebrow: 'Steadier setup',
    helper: '60-day cycle · fixed node tiers',
    summary: 'Best if you want a clearer entry point, fixed node pricing, and daily yield across a longer cycle.',
    bestFor: 'Stable daily earning rhythm',
    payout: 'Daily yield over a 60-day contract',
    minimum: 'Starts from KSh 200',
    accent: '#ef4444',
    glow: 'rgba(239,68,68,0.18)',
  },
  'short-term': {
    id: 'short-term',
    label: 'Short-Term Node',
    eyebrow: 'Flexible setup',
    helper: '24h–7d cycle · choose your amount',
    summary: 'Best if you want faster turnover, flexible capital sizing, and to preview payout before confirming.',
    bestFor: 'Quicker turnaround and flexibility',
    payout: 'One clear return at the end of each short run',
    minimum: 'Starts from KSh 3,500',
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.18)',
  },
}

function getPlanName(planId) {
  return [...PLANS, ...SHORT_TERM_PLANS].find(plan => plan.id === planId)?.name || planId.toUpperCase()
}

function PlanQuiz({ onResult }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [open, setOpen] = useState(false)

  const questions = [
    {
      q: 'What pace feels right for you?',
      options: [
        { label: 'Quick 24h cycle', value: 'short' },
        { label: 'A few days', value: 'mid' },
        { label: 'Longer 60-day rhythm', value: 'long' },
      ],
    },
    {
      q: "What's a comfortable starting amount?",
      options: [
        { label: 'Under KSh 2,000', value: 'low' },
        { label: 'KSh 2,000–10,000', value: 'mid' },
        { label: 'Above KSh 10,000', value: 'high' },
      ],
    },
  ]

  function pick(val) {
    const next = { ...answers, [step]: val }
    setAnswers(next)
    if (step < questions.length - 1) {
      setStep(step + 1)
    } else {
      // Determine recommendation
      const time = next[0]
      const budget = next[1]
      let tab = 'standard'
      let planId = 'gold'
      if (time === 'short') { tab = 'short-term'; planId = 'st1' }
      else if (time === 'mid') { tab = 'short-term'; planId = budget === 'low' ? 'st2' : 'st3' }
      else if (budget === 'low') planId = 'starter'
      else if (budget === 'mid') planId = 'gold'
      else planId = 'diamond'
      onResult({ tab, planId })
      setOpen(false)
      setStep(0)
      setAnswers({})
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mb-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(10,12,30,0.95) 100%)', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <span className="text-base">🧭</span>
        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-300">Need help choosing? Use the 2-step plan finder</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    )
  }

  const q = questions[step]
  return (
    <div className="mb-4 rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(10,12,30,0.98) 100%)', border: '1px solid rgba(99,102,241,0.3)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Plan Finder · Step {step + 1}/{questions.length}</p>
        <button onClick={() => { setOpen(false); setStep(0); setAnswers({}) }} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
      </div>
      <p className="text-sm font-bold text-white mb-3">{q.q}</p>
      <div className="grid grid-cols-3 gap-2">
        {q.options.map(o => (
          <button key={o.value} onClick={() => pick(o.value)}
            className="py-2.5 px-2 rounded-lg text-[10px] font-bold text-center transition-all active:scale-95 hover:border-indigo-400 text-white"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Market Data Collapsible Panel ─────────────────────────────────────── */
function MarketDataPanel({ children }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all"
        style={{ background: 'rgba(0,180,255,0.04)', border: '1px solid rgba(0,180,255,0.1)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#00B4FF' }}>Live Market Data</span>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00B4FF" strokeWidth="2.5"
          className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {expanded && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  )
}

// EnterpriseClientWall imported from component

/* ── Market Pulse ────────────────────────────────────────────────────── */
function MarketPulse() {
  const [metrics, setMetrics] = useState([
    { label: 'H100 Rate', value: 25.40, unit: '$/hr', trend: 'up', base: 25.40, variance: 1.2 },
    { label: 'AI Demand', value: 94.2, unit: '', trend: 'up', base: 94.2, variance: 2.0 },
    { label: 'KE Utilization', value: 87.1, unit: '%', trend: 'stable', base: 87.1, variance: 1.5 },
    { label: 'Training Jobs', value: 2.42, unit: 'M/day', trend: 'up', base: 2.42, variance: 0.08 },
  ])

  useEffect(() => {
    const tick = () => {
      setMetrics(prev => prev.map(m => {
        const delta = (Math.random() - 0.48) * m.variance
        const next = parseFloat(Math.max(m.base * 0.92, Math.min(m.base * 1.08, m.value + delta)).toFixed(m.unit === '$/hr' ? 2 : m.unit === 'M/day' ? 2 : 1))
        return {
          ...m,
          value: next,
          trend: delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'stable',
        }
      }))
    }
    const id = setInterval(tick, 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="rounded-xl px-4 py-3 mb-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(10,12,30,0.95), rgba(6,8,20,0.98))', border: '1px solid rgba(0,180,255,0.08)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#00B4FF' }}>Market Pulse</p>
        <p className="text-[9px] ml-auto" style={{ color: 'var(--text-muted)' }}>Live · Updates every 4s</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg px-3 py-2 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
            <div className="flex items-center justify-center gap-1">
              <p className="text-sm font-black" style={{ color: m.trend === 'up' ? '#34d399' : m.trend === 'down' ? '#f87171' : '#e2e8f0' }}>
                {m.unit === '$/hr' ? '$' : ''}{m.value}{m.unit !== '$/hr' && m.unit !== 'M/day' ? '' : ''}
              </p>
              <span className="text-[10px]">
                {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
              </span>
            </div>
            {m.unit === '$/hr' && <p className="text-[8px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.unit}</p>}
            {m.unit === 'M/day' && <p className="text-[8px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.unit}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 1A: Compute Load Bar ─────────────────────────────────────────────── */
function ComputeLoadBar({ planId }) {
  const [load, setLoad] = useState(() => 72 + Math.abs(planId.charCodeAt(0) % 20))
  useEffect(() => {
    const id = setInterval(() => {
      setLoad(prev => {
        const delta = (Math.random() - 0.45) * 4
        return Math.max(60, Math.min(99, prev + delta))
      })
    }, 3500)
    return () => clearInterval(id)
  }, [planId])
  const color = load >= 90 ? '#ef4444' : load >= 75 ? '#facc15' : '#34d399'
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Compute Load</span>
        <span className="text-[8px] font-black" style={{ color }}>{load.toFixed(0)}%</span>
      </div>
      <div className="w-full h-1 rounded-full bg-gray-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${load}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
      </div>
    </div>
  )
}

/* ── 1E: Per-plan node count ─────────────────────────────────────────── */
const PLAN_NODE_COUNTS = {
  starter: 4821, basic: 3107, silver: 2419, gold: 1853,
  platinum: 1204, diamond: 876, ruby: 542, emerald: 318, sapphire: 197, vip: 89,
}
function LiveNodeCount({ planId }) {
  const [count, setCount] = useState(PLAN_NODE_COUNTS[planId] || 500)
  useEffect(() => {
    const id = setInterval(() => {
      setCount(prev => prev + Math.floor(Math.random() * 3))
    }, 6000)
    return () => clearInterval(id)
  }, [planId])
  return (
    <div className="flex items-center gap-1 mt-1">
      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
      <span className="text-[8px] font-bold" style={{ color: 'rgba(52,211,153,0.7)' }}>{count.toLocaleString()} active nodes</span>
    </div>
  )
}

/* ── Number Wall Row ─────────────────────────────────────────────────── */
function NumberWallRow({ plan, workload, onClick, isCritical, slots }) {
  const daily = getWorkloadYield(plan.amount, workload)
  const total = getWorkloadTotalReturn(plan.amount, workload)
  const roi = Math.round((total / plan.amount - 1) * 100)
  const planImage = PLAN_IMAGES[plan.id]

  return (
    <tr
      onClick={() => onClick(plan, workload)}
      className={`transition-all duration-200 ${isCritical ? 'demand-critical' : ''}`}
      style={{ borderBottom: '1px solid rgba(31,41,55,0.4)' }}
    >
      {/* Plan Name */}
      <td className="pr-2">
        <div className="flex items-center gap-2">
          {planImage && (
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
              <img src={planImage} alt={plan.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-white">{plan.name}</p>
            <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
              {plan.specs || 'AI Compute'}
            </p>
          </div>
        </div>
      </td>

      {/* Cost */}
      <td className="text-center">
        <p className="text-sm font-black text-white">KSh {plan.amount.toLocaleString()}</p>
        <p className="text-[9px] text-gray-500">{plan.once ? 'One-time' : 'Repeatable'}</p>
      </td>

      {/* Daily Yield */}
      <td className="text-center">
        <p className="num-glow-green font-bold text-sm">KSh {daily.toLocaleString()}</p>
        <p className="text-[9px] text-gray-500">per day</p>
      </td>

      {/* 60-Day Total */}
      <td className="text-center">
        <p className="num-glow-gold font-bold text-sm">KSh {total.toLocaleString()}</p>
        <p className="text-[9px] text-gray-500">60-day</p>
      </td>

      {/* ROI */}
      <td className="text-center">
        <p className="text-cyan-400 font-bold text-sm">{roi}%</p>
      </td>

      {/* Available */}
      <td className="text-center">
        <p className={`font-bold text-sm ${isCritical ? 'num-pulse-red' : 'text-gray-300'}`}>
          {isCritical ? '🔴' : '🟢'} {slots}
        </p>
      </td>
      
      {/* Details */}
      <td className="text-center">
        <button className="text-[10px] text-blue-400 font-bold uppercase hover:underline">View Specs</button>
      </td>
    </tr>
  )
}

/* ── Confirm Modal ─────────────────────────────────────────────────────── */
/* ── Node Details Modal ───────────────────────────────────────────────── */
function NodeDetailsModal({ plan, onClose, onDeploy }) {
  if (!plan) return null;
  
  const specs = {
    'starter': { cpu: '8 Cores', gpu: 'NVIDIA T4', ram: '16GB', network: '1Gbps', storage: '100GB NVMe' },
    'basic': { cpu: '16 Cores', gpu: 'NVIDIA A10', ram: '32GB', network: '5Gbps', storage: '250GB NVMe' },
    'silver': { cpu: '32 Cores', gpu: 'NVIDIA A30', ram: '64GB', network: '10Gbps', storage: '500GB NVMe' },
    'gold': { cpu: '64 Cores', gpu: 'NVIDIA A100', ram: '128GB', network: '25Gbps', storage: '1TB NVMe' },
    'platinum': { cpu: '96 Cores', gpu: '2x NVIDIA A100', ram: '256GB', network: '50Gbps', storage: '2TB NVMe' },
    'diamond': { cpu: '128 Cores', gpu: '4x NVIDIA H100', ram: '512GB', network: '100Gbps', storage: '5TB NVMe' },
    'vip': { cpu: '256 Cores', gpu: '8x NVIDIA H100', ram: '1TB', network: '200Gbps', storage: '10TB NVMe' },
  }[plan.id] || { cpu: 'Custom', gpu: 'Enterprise Grade', ram: 'High Density', network: 'Optimized', storage: 'Redundant' };

  // 1B: ROI Timeline
  const daily = getWorkloadYield(plan.amount, 'finance')
  const milestones = [
    { day: 1, val: daily },
    { day: 15, val: daily * 15 },
    { day: 30, val: daily * 30 },
    { day: 60, val: getWorkloadTotalReturn(plan.amount, 'finance') },
  ]
  const maxVal = milestones[milestones.length - 1].val

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card max-w-sm w-full relative overflow-hidden border-blue-500/30" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"></div>
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">{plan.name}</h3>
            <p className="text-[10px] text-blue-400 font-bold font-mono uppercase">Node Specification V4.2</p>
            <LiveNodeCount planId={plan.id} />
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors">✕</button>
        </div>

        {/* 1B: ROI Timeline chart */}
        <div className="p-3 rounded-xl bg-emerald-900/10 border border-emerald-500/20 mb-4">
          <p className="text-[8px] text-emerald-400 uppercase font-bold mb-2">Revenue Timeline (Finance Workload)</p>
          <div className="flex items-end gap-2 h-14">
            {milestones.map(m => {
              const pct = Math.max(8, Math.round((m.val / maxVal) * 100))
              return (
                <div key={m.day} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[7px] font-bold text-emerald-400">KSh {m.val >= 1000 ? `${(m.val/1000).toFixed(0)}k` : m.val}</span>
                  <div className="w-full rounded-t" style={{ height: `${pct}%`, background: 'linear-gradient(0deg, #059669, #34d399)', minHeight: 4 }} />
                  <span className="text-[7px] text-gray-500">D{m.day}</span>
                </div>
              )
            })}
          </div>
          <ComputeLoadBar planId={plan.id} />
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Compute Core</p>
              <p className="text-xs font-bold text-blue-100">{specs.cpu}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Neural Engine</p>
              <p className="text-xs font-bold text-cyan-400">{specs.gpu}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Memory Matrix</p>
              <p className="text-xs font-bold text-blue-100">{specs.ram}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Network Uplink</p>
              <p className="text-xs font-bold text-blue-100">{specs.network}</p>
            </div>
          </div>
          
          <div className="p-3 rounded-xl bg-blue-900/10 border border-blue-500/20">
            <p className="text-[8px] text-blue-400 uppercase font-bold mb-1">Workload Capability</p>
            <p className="text-[10px] text-gray-300 leading-relaxed">
              {plan.description || 'Optimized for heavy AI inference, data processing, and neural network training cycles.'}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
          <button onClick={() => { onClose(); onDeploy(); }} className="liquid-gold flex-1 font-black text-xs">Provision Node</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ plan, workload, balance, onConfirm, onClose, confirming, onDeposit, amount, investments }) {
  if (!plan) return null
  // For short-term plans use the user-entered amount; for standard plans use plan.amount
  const isShortTerm = plan.id && ['st1', 'st2', 'st3'].includes(plan.id)
  const numAmount = isShortTerm ? (parseFloat(amount) || 0) : (plan.amount || 0)
  const enough = balance >= numAmount
  const baseAmount = numAmount
  const daily = getWorkloadYield(baseAmount, workload)
  const total = getWorkloadTotalReturn(baseAmount, workload)
  const roi = baseAmount > 0 ? Math.round((total / baseAmount - 1) * 100) : 0
  const planImage = PLAN_IMAGES[plan.id]
  const w = WORKLOAD_MULTIPLIERS[workload] || { multiplier: 1, icon: '⚡', name: 'Standard' }
  const alreadyUsed = plan.once && investments?.some(i => i.planId === plan.id)


  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
          {planImage && (
            <img src={planImage} alt={plan.name} className="w-8 h-8 rounded-lg object-cover border border-white/20" />
          )}
          Provision Compute Node
        </h3>
        <p className="text-[10px] mb-4 uppercase tracking-widest" style={{ color: '#00B4FF' }}>
          Workload: {w.icon} {w.name}
        </p>

        <div className="rounded-xl p-4 space-y-2 mb-4" style={{ background: 'var(--bg-elevated)' }}>
          {[
['Node Type', plan.name, ''],
	            ['Workload', `${w.icon} ${w.name}`, 'text-cyan-400'],
	            ['Yield Mult.', `${w.multiplier >= 1 ? '+' : ''}${Math.round((w.multiplier - 1) * 100)}%`, w.multiplier >= 1 ? 'text-green-400' : 'text-yellow-400'],
	            ['Node Capacity', `KSh ${numAmount.toLocaleString()}`, 'text-red-400'],
	            ['24h Compute Revenue', `KSh ${daily.toLocaleString()}`, 'text-green-400'],
	            ['Total Contract Value', `KSh ${(numAmount * (1 + parseFloat(plan.rate || 0) / 100)).toLocaleString()}`, 'text-yellow-400'],
	            ['Yield Index', `${roi}%`, 'text-cyan-400'],
          ].map(([label, value, cls]) => (
            <div key={label} className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span className={`font-semibold ${cls}`}>{value}</span>
            </div>
          ))}
          <hr style={{ borderColor: 'var(--border)' }} />
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>Your Balance</span>
            <span className={`font-semibold ${enough ? 'text-green-400' : 'text-red-400'}`}>
              KSh {balance.toLocaleString()}
            </span>
          </div>
        </div>

        <p className="text-xs mb-4 px-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {plan.description}
        </p>

        {alreadyUsed && (
          <div className="bg-yellow-900/40 border border-yellow-700 text-yellow-300 text-sm rounded-lg px-4 py-3 mb-4">
            <p className="font-semibold">Already Deployed</p>
            <p className="text-xs">This is a one-time node. You already own it and it's earning daily.</p>
          </div>
        )}

        {!enough && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
            <p className="font-semibold mb-2">Insufficient balance</p>
            <p className="text-xs mb-3">You need KSh {(numAmount - balance).toLocaleString()} more. Top up via M-Pesa to continue.</p>
            <button
              onClick={onDeposit}
              className="w-full bg-red-700 hover:bg-red-600 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              💰 Top Up Now (Min KSh 100)
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={!enough || confirming || alreadyUsed} className="btn-primary flex-1">
            {confirming ? 'Initializing...' : 'Initialize & Provision'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Quick Actions Strip ────────────────────────────────────────────────── */
function QuickActions({ user, showToast }) {
  const navigate = useNavigate()
  const [bonusLoading, setBonusLoading] = useState(false)
  const [bonusClaimed, setBonusClaimed] = useState(false)
  const [spinLoading, setSpinLoading] = useState(false)

  useEffect(() => {
    if (!user?.phone) return
    hasClaimedBonusToday(user.phone, 'login_bonus').then(setBonusClaimed).catch(() => {})
  }, [user?.phone])

  async function handleClaimBonus() {
    if (!user?.phone || bonusLoading || bonusClaimed) return
    setBonusLoading(true)
    try {
      const result = await claimDailyLoginBonus(user.phone)
      if (result?.success) {
        showToast(`✅ Claimed KSh ${(result.amount || 50).toLocaleString()} login bonus!`, 'success')
        setBonusClaimed(true)
      } else {
        showToast(result?.message || 'Already claimed today', 'error')
      }
    } catch (e) {
      showToast('Claim failed. Try again.', 'error')
    }
    setBonusLoading(false)
  }

  async function handleSpin() {
    if (!user?.phone || spinLoading) return
    setSpinLoading(true)
    try {
      const result = await claimLuckySpin(user.phone)
      if (result?.success) {
        showToast(`🎉 Won KSh ${(result.amount || 0).toLocaleString()} from Lucky Spin!`, 'success')
      } else {
        showToast(result?.message || 'Not available right now', 'error')
      }
    } catch (e) {
      showToast('Spin failed. Try again.', 'error')
    }
    setSpinLoading(false)
  }

  const actions = [
    { icon: '🎁', label: 'Claim Bonus', onClick: handleClaimBonus, disabled: bonusLoading || bonusClaimed, loading: bonusLoading, badge: bonusClaimed ? 'Done' : null },
    { icon: '🎰', label: 'Lucky Spin', onClick: handleSpin, disabled: spinLoading, loading: spinLoading, badge: null },
    { icon: '💰', label: 'Top Up', onClick: () => navigate('/profile?deposit=1'), disabled: false, loading: false, badge: null },
    { icon: '👥', label: 'Refer', onClick: () => navigate('/profile'), disabled: false, loading: false, badge: null },
    { icon: '🔑', label: 'Promo Code', onClick: () => navigate('/dashboard'), disabled: false, loading: false, badge: null },
  ]

  return (
    <div className="mb-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {actions.map(a => (
          <HapticButton
            key={a.label}
            onClick={a.onClick}
            disabled={a.disabled}
            className="relative flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all active:scale-95 hover:scale-105"
            style={{
              background: a.disabled
                ? 'var(--bg-elevated)'
                : 'linear-gradient(135deg, rgba(0,180,255,0.08), rgba(0,180,255,0.02))',
              border: a.disabled ? '1px solid var(--border)' : '1px solid rgba(0,180,255,0.15)',
            }}
          >
            <span className="text-xl">{a.icon}</span>
            <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: a.disabled ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
              {a.loading ? '...' : a.label}
            </span>
            {a.badge && (
              <span className="absolute top-1 right-1 text-[8px] px-1 py-0.5 rounded-full bg-green-600 text-white">
                {a.badge}
              </span>
            )}
          </HapticButton>
        ))}
      </div>
    </div>
  )
}

/* ── Main Plans Page ──────────────────────────────────────────────────── */
export default function PlansPage() {
  const { user, updateUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedWorkload, setSelectedWorkload] = useState('finance')
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const [confirming, setConfirming] = useState(false)
  const [investments, setInvestments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(null)
  const [selectedDetailPlan, setSelectedDetailPlan] = useState(null)
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [stickyPlan, setStickyPlan] = useState(null) // for sticky deploy CTA
  const [highlightPlanId, setHighlightPlanId] = useState(null) // quiz result highlight
  const [shortTermAmounts, setShortTermAmounts] = useState({
    st1: '',
    st2: '',
    st3: '',
  })
  const [lastPayoutTime, setLastPayoutTime] = useState('2 min ago')
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    if (!user) return
    getInvestments(user.phone || user.id).then(setInvestments).catch(() => {})
  }, [user])

  // Live last-payout timer
  useEffect(() => {
    const times = ['1 min ago', '2 min ago', '3 min ago', '38 sec ago', '1 min ago']
    let idx = 0
    const id = setInterval(() => {
      idx = (idx + 1) % times.length
      setLastPayoutTime(times[idx])
    }, 30000)
    return () => clearInterval(id)
  }, [])

  // Scroll progress tracker
  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement
      const scrolled = el.scrollTop / (el.scrollHeight - el.clientHeight)
      setScrollProgress(Math.min(1, Math.max(0, scrolled)))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLoadingComplete = useCallback(() => {
    setLoading(false)
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500)
  }

  const handleShortTermInvest = (durationHours) => {
    const plan = SHORT_TERM_PLANS.find(p => p.duration === durationHours)
    if (plan) {
      setSelectedPlan(plan)
    }
  }

  const handleQuizResult = ({ tab, planId }) => {
    setActiveTab(tab)
    setHighlightPlanId(planId)
    // scroll to plans area
    setTimeout(() => {
      const el = document.getElementById(`plan-${planId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 200)
    showToast(`✅ Recommended: ${getPlanName(planId)} · ${PLAN_PATHS[tab].label}`, 'success')
  }

    const confirmShortTermInvest = async () => {
    const amount = parseFloat(shortTermAmounts[selectedPlan.id])
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount.', 'error')
      return
    }
    if (amount < 3500) {
      showToast('Minimum amount is KSh 3,500.', 'error')
      return
    }
    if (amount > 75000) {
      showToast('Maximum amount is KSh 75,000.', 'error')
      return
    }
    if ((user?.balance || 0) < amount) {
      showToast('Insufficient balance for this node.', 'error')
      return
    }
    setConfirming(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const { data, error } = await supabase.rpc('create_short_term_investment', {
        p_user_phone: user.phone || user.id,
        p_duration_hours: selectedPlan.duration,
        p_amount: amount
      })
      if (error) throw new Error(error.message)
      // Update balance from RPC response
      if (data?.new_balance !== undefined) {
        updateUser({ balance: data.new_balance })
      } else if (refreshUser) {
        await refreshUser()
      }
      showToast('AI Node Deployed Successfully!', 'success')
      setTimeout(() => {
        setSelectedPlan(null)
        navigate('/dashboard')
      }, 1500)
    } catch (err) {
      const msg = err.message || 'Deployment failed'
      showToast(msg, 'error')
      setConfirming(false)
      // Do NOT close modal on error — keep user on the page
    } finally {
      setConfirming(false)
    }
  }

  async function confirmInvest() {
    const plan = selectedPlan
    if (!plan || !user || confirming) return
    setConfirming(true)

    const userPhone = user.phone || user.id

    try {
      const result = await addInvestment(userPhone, {
        planId: plan.id,
        planName: plan.name,
        amount: plan.amount,
        dailyReturn: getWorkloadYield(plan.amount, selectedWorkload),
        totalReturn: getWorkloadTotalReturn(plan.amount, selectedWorkload),
      })

      if (result?.new_balance !== undefined) {
        updateUser({ balance: result.new_balance })
      } else {
        const fresh = await getUser(userPhone)
        if (fresh) updateUser({ balance: fresh.balance })
      }

      const freshInvs = await getInvestments(userPhone)
      setInvestments(freshInvs)
      setIsProvisioning(true)
      setSelectedPlan(null)
    } catch (err) {
      console.error('Investment error:', err)
      showToast(`❌ ${err.message || 'Node provisioning failed. Please try again.'}`, 'error')
    }
    setConfirming(false)
  }

  function isOnceUsed(plan) {
    if (!plan.once) return false
    return investments.some(i => i.planId === plan.id)
  }

  // Simulate slot availability (fewer slots = more urgency)
  function getSlots(plan) {
    const seed = plan.amount % 7
    return Math.max(2, 12 - seed - Math.floor(Math.random() * 3))
  }

  if (loading) {
    return <LoadingRitual onComplete={handleLoadingComplete} />
  }

  // Derived sticky state for short-term: which plan has a valid entered amount
  const activeStickyPlanData = activeTab === 'short-term'
    ? SHORT_TERM_PLANS.find(p => {
        const amt = parseFloat(shortTermAmounts[p.id])
        return amt >= 3500 && amt <= 75000 && (user?.balance || 0) >= amt
      })
    : null
  const selectedPath = activeTab ? PLAN_PATHS[activeTab] : null
  const alternatePath = activeTab === 'short-term' ? PLAN_PATHS.standard : PLAN_PATHS['short-term']
  const hasSelectedPath = activeTab !== null

  return (
    <div className="pt-4 md:pt-20 pb-28 md:pb-8 px-4 max-w-2xl mx-auto relative">
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[50] h-[3px]" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div
          className="h-full transition-all duration-200"
          style={{
            width: `${scrollProgress * 100}%`,
            background: 'linear-gradient(90deg, #00B4FF, #34D399)',
            boxShadow: '0 0 8px rgba(0,180,255,0.5)',
          }}
        />
      </div>
      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          toast.type === 'error'
            ? 'bg-red-900 border-red-700 text-red-100'
            : 'bg-green-800 border-green-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {selectedPlan && (
        <ConfirmModal
          plan={selectedPlan}
          workload={selectedWorkload}
          balance={user?.balance || 0}
          onConfirm={['st1', 'st2', 'st3'].includes(selectedPlan.id) ? confirmShortTermInvest : confirmInvest}
          onClose={() => setSelectedPlan(null)}
          confirming={confirming}
          onDeposit={() => { setSelectedPlan(null); navigate("/profile?deposit=1") }}
          amount={['st1', 'st2', 'st3'].includes(selectedPlan.id) ? shortTermAmounts[selectedPlan.id] : selectedPlan.amount}
          investments={investments}
        />
      )}
      {selectedDetailPlan && (
        <NodeDetailsModal
          plan={selectedDetailPlan}
          onClose={() => setSelectedDetailPlan(null)}
          onDeploy={() => { setSelectedPlan(selectedDetailPlan); setSelectedWorkload('finance') }}
        />
      )}

      {/* ── Sticky Short-Term Deploy Bar ───────────────────────────────── */}
      {activeStickyPlanData && (
        <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className="max-w-2xl w-full pointer-events-auto">
            <div className="rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(5,150,105,0.98) 100%)', border: '1px solid rgba(16,185,129,0.4)' }}>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100/70">Ready to Deploy</p>
                <p className="text-sm font-black text-white">
                  {activeStickyPlanData.name} · KSh {parseFloat(shortTermAmounts[activeStickyPlanData.id]).toLocaleString()}
                  <span className="ml-2 text-emerald-200">→ earn KSh {Math.floor(parseFloat(shortTermAmounts[activeStickyPlanData.id]) * activeStickyPlanData.rateNum).toLocaleString()} profit</span>
                </p>
              </div>
              <button
                onClick={() => handleShortTermInvest(activeStickyPlanData.duration)}
                className="ml-3 px-4 py-2 rounded-xl bg-white text-emerald-700 text-[11px] font-black uppercase tracking-tighter whitespace-nowrap active:scale-95 transition-all shadow-lg"
              >
                Provision ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header — Rent AI, Earn Real ── */}
      <div className="mb-5 relative overflow-hidden rounded-2xl px-5 py-6 shadow-2xl" style={{ background: 'linear-gradient(160deg, #0a0e1e 0%, #0f1b2d 25%, #0d1520 50%, #111827 75%, #0a0e1e 100%)', border: '1px solid rgba(0,180,255,0.2)', boxShadow: '0 0 40px rgba(0,180,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
        {/* Floating glow orbs */}
        <div className="absolute top-[-30px] right-[-20px] w-[120px] h-[120px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, rgba(0,180,255,0.8) 0%, transparent 70%)', animation: 'float 6s ease-in-out infinite' }} />
        <div className="absolute bottom-[-40px] left-[-30px] w-[100px] h-[100px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.8) 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite reverse' }} />
        <div className="absolute top-[40%] right-[30%] w-[60px] h-[60px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.8) 0%, transparent 70%)', animation: 'float 5s ease-in-out infinite 1s' }} />
        
        {/* Animated grid overlay */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,180,255,0.3) 20px, rgba(0,180,255,0.3) 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(0,180,255,0.3) 20px, rgba(0,180,255,0.3) 21px)', animation: 'gridShift 20s linear infinite' }} />
        
        {/* Diagonal light sweep */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(0,180,255,0.5) 50%, transparent 70%)', animation: 'lightSweep 4s ease-in-out infinite' }} />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-40" />
            </div>
            <p className="text-[9px] uppercase tracking-[0.3em] font-black text-emerald-400">AI COMPUTE RENTAL PLATFORM</p>
          </div>
          <h2 className="text-[26px] font-black text-white leading-[1.15] mb-3" style={{ textShadow: '0 0 20px rgba(0,180,255,0.3)' }}>
            Rent AI Compute Power.<br />
            <span style={{ color: '#00B4FF', textShadow: '0 0 15px rgba(0,180,255,0.5)' }}>Earn While It Works.</span>
          </h2>
          <p className="text-[11px] leading-relaxed mb-4" style={{ color: 'rgba(148,163,184,0.9)' }}>
            Your provisioning credit is allocated to GPU compute resources. Enterprise AI workloads lease your allocated compute 24/7. Revenue is credited to your account in real-time as workloads execute.
          </p>
          
          {/* How it works — 3 mini steps with glass effect */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 rounded-xl px-3 py-2.5 text-center relative overflow-hidden" style={{ background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.15)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 15px rgba(0,180,255,0.05)' }}>
              <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(180deg, rgba(0,180,255,0.1) 0%, transparent 100%)' }} />
              <p className="text-[8px] font-black uppercase text-cyan-400 mb-0.5 relative z-10">1 · Deposit</p>
              <p className="text-[9px] font-bold text-white relative z-10">Allocate credit</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00B4FF" strokeWidth="2.5" className="flex-shrink-0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            <div className="flex-1 rounded-xl px-3 py-2.5 text-center relative overflow-hidden" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 15px rgba(16,185,129,0.05)' }}>
              <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.1) 0%, transparent 100%)' }} />
              <p className="text-[8px] font-black uppercase text-emerald-400 mb-0.5 relative z-10">2 · Provision</p>
              <p className="text-[9px] font-bold text-white relative z-10">AI uses your GPU</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00B4FF" strokeWidth="2.5" className="flex-shrink-0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            <div className="flex-1 rounded-xl px-3 py-2.5 text-center relative overflow-hidden" style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 15px rgba(250,204,21,0.05)' }}>
              <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(180deg, rgba(250,204,21,0.1) 0%, transparent 100%)' }} />
              <p className="text-[8px] font-black uppercase text-yellow-400 mb-0.5 relative z-10">3 · Earn</p>
              <p className="text-[9px] font-bold text-white relative z-10">Revenue credited</p>
            </div>
          </div>
        </div>
        {/* Bottom accent glow */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,180,255,0.8), rgba(16,185,129,0.8), transparent)', filter: 'blur(1px)', boxShadow: '0 0 15px rgba(0,180,255,0.4)' }} />
      </div>

      {/* ① NODE TYPE FILTER — Natural Browse Flow ─────────────────────── */}
      <div className="mb-4">
        {/* Simple tab switcher — like AWS/GCP region filter */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] uppercase tracking-widest font-bold text-gray-500 mr-2">Filter:</span>
          <button
            onClick={() => setActiveTab(null)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              activeTab === null ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Nodes
          </button>
          <button
            onClick={() => setActiveTab('standard')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
              activeTab === 'standard' ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Long-Term
          </button>
          <button
            onClick={() => setActiveTab('short-term')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
              activeTab === 'short-term' ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Short-Term
          </button>
        </div>
      </div>

      {/* ② ALLOCATION STATUS — Premium Glass ──────────────── */}
      <div className="flex items-center justify-between rounded-xl px-4 py-3.5 mb-3 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.9) 0%, rgba(0,180,255,0.03) 50%, rgba(15,23,42,0.9) 100%)', border: '1px solid rgba(0,180,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        {/* Subtle glow orb */}
        <div className="absolute top-[-10px] left-[20%] w-[60px] h-[60px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, rgba(0,180,255,0.8) 0%, transparent 70%)' }} />
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 8px rgba(0,180,255,0.5)' }} />
            <div className="absolute inset-0 w-3.5 h-3.5 rounded-full animate-ping bg-cyan-400 opacity-20" />
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-[0.2em] font-bold" style={{ color: 'rgba(0,180,255,0.7)' }}>Provisioning Credit</p>
            <p className="text-lg font-black text-white" style={{ textShadow: '0 0 10px rgba(0,180,255,0.2)' }}>
              {kshToTokens(user?.balance || 0)} CT
              <span className="text-[11px] font-bold ml-1.5" style={{ color: 'rgba(148,163,184,0.8)' }}>≈ KSh {(user?.balance || 0).toLocaleString()}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/profile?deposit=1')}
          className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all active:scale-95 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(0,180,255,0.2) 0%, rgba(0,120,200,0.1) 100%)', border: '1px solid rgba(0,180,255,0.35)', color: '#00B4FF', boxShadow: '0 0 12px rgba(0,180,255,0.15)' }}
        >
          + Allocate
        </button>
      </div>

      {/* ── Uptime Sparkline — Premium ── */}
      <div className="rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between relative overflow-hidden" style={{ background: 'rgba(10,15,30,0.8)', border: '1px solid rgba(52,211,153,0.12)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-2.5">
          <svg width="48" height="18" viewBox="0 0 48 18" className="flex-shrink-0">
            <polyline
              fill="none"
              stroke="#34D399"
              strokeWidth="1.5"
              strokeLinecap="round"
              points="0,16 4,13 8,14 12,9 16,10 20,6 24,7 28,4 32,5 36,2 40,3 44,1 48,2"
              style={{ filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.4))' }}
            />
            <polyline
              fill="rgba(52,211,153,0.1)"
              stroke="none"
              points="0,18 0,16 4,13 8,14 12,9 16,10 20,6 24,7 28,4 32,5 36,2 40,3 44,1 48,2 48,18"
            />
          </svg>
          <span className="text-[9px] font-mono font-bold" style={{ color: '#34D399' }}>Uptime 99.97%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-gray-500">24h</span>
          <div className="flex gap-0.5 items-end">
            {Array.from({length: 16}, (_, i) => (
              <div key={i} className="w-[2px] rounded-full" style={{ height: `${4 + Math.sin(i * 0.6) * 3 + 3}px`, background: `rgba(52,211,153,${0.3 + Math.sin(i * 0.4) * 0.2})` }} />
            ))}
          </div>
        </div>
      </div>

      {/* ③ PLAN QUIZ ─────────────────────────────────────────────────────── */}
      <PlanQuiz onResult={handleQuizResult} />

      {hasSelectedPath && (
        <div
          className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3"
          style={{ background: `linear-gradient(135deg, ${selectedPath.accent}14, rgba(10,12,30,0.95))`, border: `1px solid ${selectedPath.accent}33` }}
        >
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] font-black" style={{ color: selectedPath.accent }}>You selected {selectedPath.label}</p>
            <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">{selectedPath.summary}</p>
          </div>
          <button
            onClick={() => setActiveTab(alternatePath.id)}
            className="shrink-0 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] text-white bg-white/8 border border-white/10"
          >
            Switch to {alternatePath.label}
          </button>
        </div>
      )}

      {!hasSelectedPath && (
        <div className="rounded-xl px-4 py-4 mb-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)' }}>
          <p className="text-sm font-black text-white">Choose Short-Term Node or Long-Term Node first.</p>
          <p className="text-[11px] text-gray-400 mt-1">Once you choose a path, we will reveal only the matching plans so the page feels simpler and more focused.</p>
        </div>
      )}

      {/* ④ WORKLOAD SELECTOR — standard tab only, ABOVE plan list ─────── */}
      {activeTab === 'standard' && (
        <div className="rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(0,180,255,0.04)', border: '1px solid rgba(0,180,255,0.1)' }}>
          <p className="text-[9px] uppercase tracking-widest font-black mb-2.5" style={{ color: '#00B4FF' }}>
            AI Workload Type — adjusts yield multiplier for all plans below
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(WORKLOAD_MULTIPLIERS).map(w => {
              const active = selectedWorkload === w.id
              return (
                <HapticButton
                  key={w.id}
                  onClick={() => setSelectedWorkload(w.id)}
                  className={`relative rounded-xl px-2 py-2.5 text-center transition-all ${
                    active
                      ? 'border-2 border-cyan-500 shadow-lg shadow-cyan-500/10'
                      : 'border border-gray-700/50 hover:border-gray-600'
                  }`}
                  style={active ? { background: 'linear-gradient(135deg, rgba(6,182,212,0.18), rgba(59,130,246,0.1))' } : {}}
                >
                  <span className="text-lg block mb-0.5">{w.icon}</span>
                  <p className={`text-[9px] font-bold ${active ? 'text-cyan-300' : 'text-gray-300'}`}>{w.name}</p>
                  <p className={`text-[8px] mt-0.5 font-black ${w.multiplier > 1 ? 'text-green-400' : w.multiplier >= 0.95 ? 'text-blue-400' : 'text-yellow-400'}`}>
                    {w.multiplier >= 1 ? '+' : ''}{Math.round((w.multiplier - 1) * 100)}% yield
                  </p>
                  {active && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                </HapticButton>
              )
            })}
          </div>
        </div>
      )}

      {hasSelectedPath && (
        <>
          {/* ⑤ COLLAPSIBLE MARKET DATA ──────────────────────────────────────── */}
          <MarketDataPanel>
            <MarketPulse />
            <RevenueSimulator balance={user?.balance || 0} />
            <GlobalDemandBar />
            <LiveDeploymentsTicker />
          </MarketDataPanel>

          {/* How It Works */}
          <HowItWorksStrip />

          {/* Cross-tab CTA */}
          {activeTab === 'standard' && <SpotMarketCTA onSwitchToSpot={() => setActiveTab('short-term')} />}

          {/* Terms at a Glance */}
          {activeTab === 'standard' ? (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['Daily Settlement', '60-Day Contract', '0.4 CT Min (KSh 200)', 'Withdraw After Cycle'].map((term, i) => (
                <div key={i} className="rounded-lg px-2 py-2 text-center" style={{ background: 'rgba(0,180,255,0.05)', border: '1px solid rgba(0,180,255,0.1)' }}>
                  <p className="text-[8px] font-black uppercase tracking-tight text-cyan-400">{term}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['Instant Settlement', '24h–7d Cycle', '7 CT Min (KSh 3,500)', 'No Lock-Up'].map((term, i) => (
                <div key={i} className="rounded-lg px-2 py-2 text-center" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
                  <p className="text-[8px] font-black uppercase tracking-tight text-emerald-400">{term}</p>
                </div>
              ))}
            </div>
          )}

          {/* Trust signals */}
          <PlanCertifications />
          <DataCenterInfo />
          <EnterpriseClientWall />

          {/* ─────────────────────── PLANS CONTENT ─────────────────────────── */}
          {activeTab === 'standard' ? (
        <div className="rounded-xl overflow-hidden mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(10,12,30,0.95), rgba(6,8,20,0.98))', border: '1px solid rgba(0,180,255,0.12)' }}>

          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0,180,255,0.12)' }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#00B4FF' }}>Live Node Market</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Tap any row to deploy</p>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="number-wall-table">
              <thead>
                <tr>
                  <th className="text-left">Node Type</th>
                  <th>Allocation</th>
                  <th>24h Revenue</th>
                  <th>Contract Value</th>
                  <th>Yield Index</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {PLANS.map(plan => (
                  <NumberWallRow
                    key={plan.id}
                    plan={plan}
                    workload={selectedWorkload}
                    onClick={(p) => setSelectedDetailPlan(p)}
                    isCritical={plan.amount >= 15000}
                    slots={getSlots(plan)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y" style={{ borderColor: 'rgba(31,41,55,0.4)' }}>
            {PLANS.map(plan => {
              const daily = getWorkloadYield(plan.amount, selectedWorkload)
              const total = getWorkloadTotalReturn(plan.amount, selectedWorkload)
              const roi = Math.round((total / plan.amount - 1) * 100)
              const planTokens = kshToTokens(plan.amount)
              const dailyTokens = kshToTokens(daily)
              const isCritical = plan.amount >= 15000
              const isPremium = plan.amount >= 15000
              const planImage = PLAN_IMAGES[plan.id]
              const badge = PLAN_BADGES[plan.id]
              const isHighlighted = highlightPlanId === plan.id

              return (
                <div key={plan.id} id={`plan-${plan.id}`}>
                  <HapticButton
                    onClick={() => setSelectedDetailPlan(plan)}
                    className={`w-full text-left px-4 py-3 transition-all relative ${isCritical ? 'demand-critical' : ''} ${isHighlighted ? 'ring-2 ring-indigo-400 ring-inset rounded-xl' : ''} ${isPremium ? 'rounded-xl overflow-hidden' : ''}`}
                    style={isPremium ? { background: 'linear-gradient(135deg, rgba(212,175,55,0.04) 0%, rgba(10,12,30,0.98) 100%)', border: '1px solid rgba(212,175,55,0.2)' } : undefined}
                  >
                    {/* Gold premium corner badge */}
                    {isPremium && (
                      <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}>
                        <span className="text-[7px] font-black text-black uppercase tracking-tighter">VIP Node</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      {planImage && (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                          <img src={planImage} alt={plan.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-bold text-white truncate">{plan.name}</p>
                          <p className="text-sm font-black text-white flex-shrink-0">{planTokens} CT</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{plan.specs || 'AI Compute'} · Worth KSh {plan.amount.toLocaleString()}</p>
                          {badge && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: `${badge.color}22`, color: badge.color, border: `1px solid ${badge.color}44` }}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <LiveNodeCount planId={plan.id} />
                      </div>
                    </div>
                    <ComputeLoadBar planId={plan.id} />

                    <div className="flex justify-between items-center pt-2 mt-2" style={{ borderTop: '1px solid rgba(31,41,55,0.4)' }}>
                      <div className="text-center">
                        <p className="num-glow-green font-bold text-xs">{dailyTokens} CT</p>
                        <p className="text-[8px] text-gray-500">24h Rev · KSh {daily.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="num-glow-gold font-bold text-xs">{kshToTokens(total)} CT</p>
                        <p className="text-[8px] text-gray-500">Value · KSh {total.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-cyan-400 font-bold text-xs">{roi}%</p>
                        <p className="text-[8px] text-gray-500">Yield</p>
                      </div>
                      <div className="text-center min-w-[50px]">
                        <span className="text-xs">ℹ️</span>
                        <p className="text-[7px] text-blue-400 uppercase mt-0.5 font-bold">Tap to Read</p>
                      </div>
                      <div className="text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPlan(plan); setSelectedWorkload('finance') }}
                          className="liquid-gold text-[9px] font-bold px-3 py-1.5 rounded-lg text-white"
                        >
                          Deploy
                        </button>
                      </div>
                    </div>
                  </HapticButton>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ── SPOT MARKET TAB ──────────────────────────────────────────── */
        <div className="space-y-5 mb-8">
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/30 to-blue-900/20 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl shadow-emerald-900/10">
            <div className="absolute top-0 right-0 p-3">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">Live Market Active</span>
              </div>
            </div>
            <h3 className="text-emerald-400 font-black text-base mb-1.5 uppercase tracking-tight">Institutional Spot Market</h3>
            <p className="text-[11px] text-gray-300 leading-relaxed mb-3 max-w-[90%]">
              Deploy high-frequency compute nodes for immediate enterprise AI tasks.{' '}
              <span className="text-emerald-400 font-bold">Direct Capital Deployment:</span> Operates independently from long-term fleet yields.
            </p>
            <div className="flex items-center gap-4 text-[9px] font-bold text-emerald-500/80">
              {['AUTOMATIC PAYOUT', 'NO LOCK-UP PERIOD', 'INSTANT SETTLEMENT'].map(t => (
                <div key={t} className="flex items-center gap-1">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {SHORT_TERM_PLANS.map(plan => {
            const enteredAmt = parseFloat(shortTermAmounts[plan.id]) || 0
            const profit = enteredAmt > 0 ? Math.floor(enteredAmt * plan.rateNum) : 0
            const totalReturn = enteredAmt + profit
            const isHighlighted = highlightPlanId === plan.id

            const colorMap = {
              emerald: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#10b981', btn: '#059669', btnHover: '#047857' },
              blue:    { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', text: '#3b82f6', btn: '#2563eb', btnHover: '#1d4ed8' },
              purple:  { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', text: '#a855f7', btn: '#7c3aed', btnHover: '#6d28d9' },
            }[plan.color]

            return (
              <div
                key={plan.id}
                id={`plan-${plan.id}`}
                className={`group relative rounded-2xl p-5 transition-all duration-300 ${isHighlighted ? 'ring-2 ring-indigo-400' : ''}`}
                style={{ background: `linear-gradient(135deg, ${colorMap.bg} 0%, rgba(10,12,30,0.97) 100%)`, border: `1px solid ${colorMap.border}` }}
              >
                {/* Duration badge */}
                <div className="absolute top-0 right-0 flex flex-col items-end gap-1 p-3">
                  <div className="px-3 py-1 rounded-bl-xl rounded-tr-xl text-white text-[10px] font-black uppercase tracking-tighter"
                    style={{ background: colorMap.btn }}>
                    {plan.duration}H DURATION
                  </div>
                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full"
                    style={{ background: `${colorMap.text}22`, color: colorMap.text, border: `1px solid ${colorMap.text}44` }}>
                    {plan.badge}
                  </span>
                </div>

                {/* Plan header */}
                <div className="flex items-center gap-4 mb-5 pr-24">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border flex-shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-inner"
                    style={{ background: `${colorMap.text}12`, borderColor: `${colorMap.text}30` }}>
                    <span className="text-3xl">{plan.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-black text-white text-base tracking-tight">{plan.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: colorMap.text }}>{plan.resource}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-700" />
                      <span className="text-[9px] text-gray-500 font-bold uppercase">SECURE UPLINK</span>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">{plan.desc}</p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl p-3 border" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.05)' }}>
                    <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Guaranteed Yield</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-2xl font-black" style={{ color: colorMap.text }}>{plan.rate}</p>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Net</span>
                    </div>
                  </div>
                  <div className="rounded-xl p-3 border" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.05)' }}>
                    <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Node Lifecycle</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-2xl font-black text-white">{plan.duration}</p>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Hours</span>
                    </div>
                  </div>
                </div>

                {/* Amount input + live preview */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Allocation Amount</label>
                      <span className="text-[9px] text-gray-500 font-mono">Min: 3,500 · Max: 75,000</span>
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black text-sm">KSh</div>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={shortTermAmounts[plan.id]}
                        onChange={(e) => setShortTermAmounts(prev => ({ ...prev, [plan.id]: e.target.value }))}
                        className="w-full bg-black/80 rounded-xl py-3.5 pl-12 pr-4 text-base font-black text-white outline-none transition-all shadow-inner"
                        style={{ border: `1px solid ${enteredAmt >= 3500 ? colorMap.text + '66' : 'rgba(255,255,255,0.08)'}` }}
                      />
                    </div>
                  </div>

                  {/* ⑥ LIVE RETURN PREVIEW */}
                  {enteredAmt >= 3500 && enteredAmt <= 75000 && (
                    <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                      style={{ background: `${colorMap.text}0d`, border: `1px solid ${colorMap.text}33` }}>
                      <div className="text-center">
                        <p className="text-[8px] text-gray-500 uppercase font-bold">You Invest</p>
                        <p className="text-sm font-black text-white">KSh {enteredAmt.toLocaleString()}</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colorMap.text} strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      <div className="text-center">
                        <p className="text-[8px] text-gray-500 uppercase font-bold">Profit</p>
                        <p className="text-sm font-black" style={{ color: colorMap.text }}>+ KSh {profit.toLocaleString()}</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colorMap.text} strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      <div className="text-center">
                        <p className="text-[8px] text-gray-500 uppercase font-bold">Total Return</p>
                        <p className="text-sm font-black text-yellow-400">KSh {totalReturn.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleShortTermInvest(plan.duration)}
                    disabled={confirming}
                    className="w-full py-4 rounded-xl text-white text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${colorMap.btn}, ${colorMap.btnHover})`, boxShadow: `0 8px 24px ${colorMap.text}30` }}
                  >
                    {confirming ? 'Initializing...' : `Provision ${plan.name} Node`}
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 opacity-50">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Enterprise-Grade Encryption Active</p>
                </div>
              </div>
            )
          })}
        </div>
          )}

          {/* ── Footer Disclaimer ── */}
          <div className="mt-8 pt-4 border-t border-white/5 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[9px] font-mono">Last network payout: {lastPayoutTime}</p>
            </div>
            <p className="text-[9px] text-gray-600 leading-relaxed max-w-md mx-auto">
              Compute yield is based on real network demand. Past performance does not guarantee future results. 
              All plans are subject to platform terms and conditions. Dumiropay operates under Kenyan financial regulations.
            </p>
            <p className="text-[8px] text-gray-700 uppercase tracking-widest">Dumiropay Global Infrastructure · Nairobi, Kenya</p>
          </div>
        </>
      )}
    </div>
  )
}
