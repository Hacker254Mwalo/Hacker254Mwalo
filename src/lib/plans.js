export const DAILY_RATE = 0.03 // 3% daily base rate
export const DURATION_DAYS = 60

// ── Workload Multipliers (Realistic AI Compute Yields) ──────────────────
export const WORKLOAD_MULTIPLIERS = {
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare AI',
    description: 'Medical imaging & drug discovery',
    multiplier: 0.7, // ~2.1% daily (stable, predictable)
    icon: '🏥',
    status: 'Processing MRI Scan Data',
    tempRange: [80, 92],
    powerRange: [85, 95],
    networkRange: [2, 5],
  },
  finance: {
    id: 'finance',
    name: 'Finance AI',
    description: 'High-frequency trading models',
    multiplier: 1.25, // ~3.75% daily (high risk/reward)
    icon: '📊',
    status: 'Executing Trading Algorithm',
    tempRange: [55, 70],
    powerRange: [70, 85],
    networkRange: [8, 10],
  },
  autonomous: {
    id: 'autonomous',
    name: 'Autonomous AI',
    description: 'Real-time LIDAR & self-driving',
    multiplier: 0.95, // ~2.85% daily (high throughput)
    icon: '🚗',
    status: 'Processing LIDAR Point Cloud',
    tempRange: [65, 80],
    powerRange: [80, 90],
    networkRange: [5, 8],
  },
}

// ── Global Compute Demand (for realism) ──────────────────────────────────
export const GLOBAL_DEMAND_TIERS = [
  { min: 90, label: 'Critical', color: 'text-red-400' },
  { min: 75, label: 'High', color: 'text-yellow-400' },
  { min: 50, label: 'Moderate', color: 'text-green-400' },
  { min: 0, label: 'Low', color: 'text-blue-400' },
]

export function getDemandTier(percentage) {
  return GLOBAL_DEMAND_TIERS.find(t => percentage >= t.min) || GLOBAL_DEMAND_TIERS[GLOBAL_DEMAND_TIERS.length - 1]
}

export function getWorkloadYield(amount, workloadId) {
  const w = WORKLOAD_MULTIPLIERS[workloadId] || { multiplier: 1 }
  return Math.floor(amount * DAILY_RATE * w.multiplier)
}

export function getWorkloadTotalReturn(amount, workloadId) {
  const w = WORKLOAD_MULTIPLIERS[workloadId] || { multiplier: 1 }
  return Math.floor(amount * DAILY_RATE * w.multiplier * DURATION_DAYS)
}
export const LOGIN_BONUS = 50
export const WITHDRAWAL_FEE = 0.08
export const REF_L1 = 0.10
export const REF_L2 = 0.04
export const MPESA_PAYBILL = '4091165'

export const PLANS = [
  {
    id: 'starter',
    name: 'Micro-AI Node (V1)',
    tagline: 'Entry-level GPU compute instance for beginners',
    description: 'Your KSh 200 allocation provisions a micro-GPU node on our shared compute pool. Each cycle, your node processes lightweight AI inference tasks (image classification, text analysis) for enterprise clients. The revenue generated is credited to your account as 24h compute revenue — scaling your credits automatically.',
    amount: 200,
    shareWorth: 'KSh 200',
    once: true,
    color: 'from-gray-600 to-gray-700',
    icon: '⚡',
    specs: '1x GPU Core • Shared Pool • Inference Tasks',
  },
  {
    id: 'basic',
    name: 'Cloud GPU Rig (RTX 4090)',
    tagline: 'Personal-grade GPU with high throughput',
    description: 'Your KSh 500 allocation provisions a dedicated RTX 4090 rig that handles AI model training jobs for SaaS companies. Training jobs pay premium rates — your node runs continuous batch processing, and each completed cycle generates your 24h compute revenue. Higher GPU throughput = bigger revenue every 24 hours.',
    amount: 500,
    shareWorth: 'KSh 500',
    once: true,
    color: 'from-blue-700 to-blue-800',
    icon: '🚀',
    specs: '1x RTX 4090 • Dedicated Rig • Training Jobs',
  },
  {
    id: 'silver',
    name: 'AI Server Cluster (A100)',
    tagline: 'Multi-node cluster for scalable AI workloads',
    description: 'With KSh 1,000 you provision a slot in a 4-node A100 GPU cluster. The cluster handles parallel workloads — from language model serving to computer vision pipelines. Multiple simultaneous jobs mean multiple revenue streams. Your revenue accumulates as each GPU completes its assigned compute contract.',
    amount: 1000,
    shareWorth: 'KSh 1,000',
    once: false,
    color: 'from-gray-400 to-gray-600',
    icon: '💻',
    specs: '4x A100 GPUs • Cluster Node • Parallel Workloads',
  },
  {
    id: 'gold',
    name: 'Neural Network Array (H100)',
    tagline: 'Flagship H100 tensor core processing unit',
    description: 'Your KSh 2,000 allocation provisions an 8-GPU H100 array dedicated to large language model fine-tuning. H100 tensor cores process AI workloads at 2x the speed of previous gen — meaning your node completes more contracts per cycle. Every completed contract credits your account with your 24h compute revenue.',
    amount: 2000,
    shareWorth: 'KSh 2,000',
    once: false,
    color: 'from-yellow-500 to-yellow-700',
    icon: '🔥',
    specs: '8x H100 GPUs • Tensor Cores • LLM Fine-Tuning',
  },
  {
    id: 'platinum',
    name: 'Deep Learning Center',
    tagline: 'Full-scale deep learning infrastructure',
    description: 'KSh 4,000 provisions a rack share in an enterprise datacenter running 16 GPUs 24/7. This infrastructure serves real-time AI models for enterprise clients — the kind of workload that never stops. Continuous inference jobs mean your revenue accumulates daily without interruption for the 60-day contract.',
    amount: 4000,
    shareWorth: 'KSh 4,000',
    once: false,
    color: 'from-cyan-500 to-cyan-700',
    icon: '🌐',
    specs: '16x GPUs • Datacenter Rack • 24/7 Inference',
  },
  {
    id: 'diamond',
    name: 'Quantum-AI Gateway',
    tagline: 'Next-gen quantum-accelerated AI processing',
    description: 'Your KSh 7,000 allocation provisions a hybrid quantum-classical compute gateway. Quantum processors handle complex optimization problems (portfolio risk, logistics) that classical GPUs cannot solve efficiently. Premium pricing for these specialized tasks means higher 24h revenue than standard GPU compute.',
    amount: 7000,
    shareWorth: 'KSh 7,000',
    once: false,
    color: 'from-indigo-400 to-purple-600',
    icon: '⚡',
    specs: 'Quantum + GPU Hybrid • Optimization Tasks',
  },
  {
    id: 'ruby',
    name: 'DataCenter Pod V1',
    tagline: 'Self-contained AI datacenter pod',
    description: 'KSh 10,000 provisions your slot in a self-contained datacenter pod — complete with cooling, power redundancy, and networking. Housing 32 GPUs running continuous training and inference pipelines, this pod generates revenue from multiple enterprise clients simultaneously. Maximum uptime guarantees maximum revenue accumulation.',
    amount: 10000,
    shareWorth: 'KSh 10,000',
    once: false,
    color: 'from-red-500 to-red-700',
    icon: '🏗️',
    specs: '32x GPUs • Full Pod • Continuous Pipeline',
  },
  {
    id: 'emerald',
    name: 'Sovereign AI Rig',
    tagline: 'Military-grade secure AI compute platform',
    description: 'Your KSh 20,000 allocation provisions an encrypted, isolated compute environment handling high-security AI workloads — government contracts, financial modeling, and compliance-sensitive inference. Premium tier pricing with guaranteed 99.99% uptime SLA means your revenue is protected and maximized every cycle.',
    amount: 20000,
    shareWorth: 'KSh 20,000',
    once: false,
    color: 'from-green-500 to-emerald-700',
    icon: '🛡️',
    specs: '64x GPUs • Encrypted • Priority SLA',
  },
  {
    id: 'sapphire',
    name: 'HyperScale AI Grid',
    tagline: 'Massively parallel AI compute grid',
    description: 'KSh 35,000 provisions a node in a grid-scale AI infrastructure spanning multiple datacenters. 128 GPU cores process federated learning, large-scale inference, and AI-as-a-Service workloads around the clock. Revenue streams from dozens of clients feed your revenue daily — the more clients, the higher your payout.',
    amount: 35000,
    shareWorth: 'KSh 35,000',
    once: false,
    color: 'from-blue-400 to-blue-600',
    icon: '🚀',
    specs: '128x GPUs • Multi-DC Grid • AI-as-a-Service',
  },
  {
    id: 'vip',
    name: 'Enterprise Compute Matrix',
    tagline: 'The ultimate AI compute investment tier',
    description: 'Your KSh 45,000 allocation provisions dedicated capacity reservation across our entire compute network — 256 GPU cores with custom workload scheduling and maximum priority. This means your node gets the highest-paying contracts first, every cycle. The highest revenue tier available — designed for serious operators who want maximum daily yields.',
    amount: 45000,
    shareWorth: 'KSh 45,000',
    once: false,
    color: 'from-red-500 to-pink-600',
    icon: '👑',
    specs: '256x GPUs • Dedicated Capacity • Maximum Priority',
  },
]

export function getDailyReturn(amount) {
  return Math.floor(amount * DAILY_RATE)
}

export function getTotalReturn(amount) {
  return Math.floor(amount * DAILY_RATE * DURATION_DAYS)
}
