import { useEffect, useState } from 'react'

export default function SmartNotifications({ userPhone }) {
  const [notifications, setNotifications] = useState([])
  const [visibleNotifications, setVisibleNotifications] = useState([])
  
  useEffect(() => {
    // Generate realistic notifications
    const generateNotification = () => {
      const types = [
        { type: 'milestone', icon: '🎉', title: 'Milestone Reached!', message: 'You earned KSh 10,000 today!', color: 'bg-green-900' },
        { type: 'workload_switch', icon: '🔄', title: 'Workload Updated', message: 'Switched to Finance workload (+25% yield)', color: 'bg-blue-900' },
        { type: 'optimization', icon: '✅', title: 'Optimization Complete', message: 'Node efficiency improved to 98%', color: 'bg-emerald-900' },
        { type: 'network_alert', icon: '📡', title: 'Network Status', message: 'Global network load: 78%', color: 'bg-yellow-900' },
        { type: 'yield_milestone', icon: '💰', title: 'Yield Target Hit', message: 'Earned 50% of daily target', color: 'bg-purple-900' }
      ]
      
      return types[Math.floor(Math.random() * types.length)]
    }
    
    // Show notifications periodically
    const interval = setInterval(() => {
      const newNotif = generateNotification()
      setNotifications(prev => [...prev, { ...newNotif, id: Date.now() }])
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotif.id))
      }, 5000)
    }, 12000) // New notification every 12 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="fixed top-20 right-4 z-40 space-y-2 max-w-sm">
      {notifications.map(notif => (
        <div
          key={notif.id}
          className={`${notif.color} border border-opacity-50 rounded-lg p-3 text-white text-sm animate-slideDown shadow-lg`}
          style={{
            animation: 'slideDown 0.3s ease forwards, fadeOut 0.5s ease 4.5s forwards'
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{notif.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-xs">{notif.title}</p>
              <p className="text-xs opacity-90">{notif.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
