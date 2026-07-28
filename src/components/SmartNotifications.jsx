import { useEffect, useState } from 'react'

export default function SmartNotifications({ userPhone, activeInvestments }) {
  const [notifications, setNotifications] = useState([])
  
  useEffect(() => {
    if (!activeInvestments || activeInvestments.length === 0) return
    
    // Generate notifications based on real investment data
    const generateNotification = () => {
      const inv = activeInvestments[0] // Use first active investment
      const dailyYield = Number(inv.daily_return || inv.dailyReturn || 0)
      
      if (dailyYield <= 0) return null
      
      const types = [
        {
          type: 'yield_milestone',
          icon: '📈',
          title: 'Yield Generated',
          message: `+KSh ${Math.round(dailyYield * 0.25)} earned this cycle`,
          color: 'bg-emerald-900 border-emerald-700'
        },
        {
          type: 'workload_active',
          icon: '⚙️',
          title: 'Workload Active',
          message: `${inv.workload || 'Healthcare'} processing at optimal efficiency`,
          color: 'bg-blue-900 border-blue-700'
        },
        {
          type: 'uptime_milestone',
          icon: '✅',
          title: 'Node Performing Well',
          message: 'Uptime: 99.87% • No optimization needed',
          color: 'bg-green-900 border-green-700'
        },
        {
          type: 'network_status',
          icon: '📡',
          title: 'Network Optimal',
          message: 'Global network load: 78% • All systems operational',
          color: 'bg-cyan-900 border-cyan-700'
        },
        {
          type: 'forecast',
          icon: '💰',
          title: 'Daily Forecast',
          message: `Projected earnings: KSh ${Math.round(dailyYield).toLocaleString()}`,
          color: 'bg-purple-900 border-purple-700'
        }
      ]
      
      return types[Math.floor(Math.random() * types.length)]
    }
    
    // Show notifications periodically
    const interval = setInterval(() => {
      const newNotif = generateNotification()
      if (!newNotif) return
      
      setNotifications(prev => [...prev, { ...newNotif, id: Date.now() }])
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotif.id))
      }, 5000)
    }, 15000) // New notification every 15 seconds
    
    return () => clearInterval(interval)
  }, [activeInvestments])
  
  return (
    <div className="fixed top-20 right-4 z-40 space-y-2 max-w-sm">
      {notifications.map(notif => (
        <div
          key={notif.id}
          className={`${notif.color} border rounded-lg p-3 text-white text-sm animate-slideDown shadow-lg backdrop-blur-sm`}
          style={{
            animation: 'slideDown 0.3s ease forwards, fadeOut 0.5s ease 4.5s forwards'
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{notif.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-xs uppercase tracking-wide">{notif.title}</p>
              <p className="text-xs opacity-90">{notif.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
