export default function PlanStats({ planName }) {
  // Realistic node counts per plan
  const nodeStats = {
    'Starter': { nodes: 2847, uptime: 99.87 },
    'Cloud GPU Rig (RTX 4090)': { nodes: 1243, uptime: 99.92 },
    'AI Server Cluster (A100)': { nodes: 567, uptime: 99.95 }
  }

  const stats = nodeStats[planName] || { nodes: 1000, uptime: 99.9 }

  return (
    <div className="grid grid-cols-2 gap-3 my-3 text-sm">
      <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Active Nodes</div>
        <div className="text-lg font-bold text-green-400">{stats.nodes.toLocaleString()}</div>
        <div className="text-[10px] text-gray-500">Running this plan</div>
      </div>
      <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Network Uptime</div>
        <div className="text-lg font-bold text-blue-400">{stats.uptime}%</div>
        <div className="text-[10px] text-gray-500">Last 30 days</div>
      </div>
    </div>
  )
}
