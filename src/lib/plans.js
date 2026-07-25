export const DAILY_RATE = 0.03 // 3% daily
export const DURATION_DAYS = 90
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
    description: 'Start small with a single GPU node. Earn daily as your micro-node processes lightweight AI inference tasks on shared compute pools.',
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
    description: 'Dedicated RTX 4090 compute rig running AI model training jobs. Higher throughput means bigger daily yields from GPU compute contracts.',
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
    description: 'A cluster of A100 GPUs handling parallel AI workloads. Distributed compute across multiple nodes generates consistent high daily returns.',
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
    description: 'Premium H100 GPU array dedicated to large language model fine-tuning and inference. Tensor core acceleration delivers maximum compute yield per cycle.',
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
    description: 'Enterprise-grade datacenter rack with multiple GPU arrays running deep learning models 24/7. Continuous inference jobs and model serving generate premium daily yields.',
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
    description: 'Hybrid quantum-classical compute gateway processing complex optimization problems. Quantum advantage in AI tasks commands premium compute pricing and higher yields.',
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
    description: 'Complete pod with cooling, power, and networking. Houses dozens of GPU nodes running continuous AI training and inference pipelines. Maximum uptime, maximum yield.',
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
    description: 'Encrypted, isolated AI compute environment for high-security workloads. Premium pricing tier with guaranteed uptime SLA and priority compute scheduling.',
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
    description: 'Grid-scale AI infrastructure spanning multiple datacenters. Thousands of GPU cores processing federated learning, large-scale inference, and AI-as-a-Service workloads around the clock.',
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
    description: 'Top-tier enterprise compute allocation with dedicated capacity reservation, custom workload scheduling, and maximum priority on the compute network. The highest yield tier available.',
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
