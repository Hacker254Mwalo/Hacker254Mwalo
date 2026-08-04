export default function PlanCertifications() {
  const certifications = [
    { 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      ), 
      label: 'ISO 27001', 
      desc: 'Information Security',
      color: 'text-blue-400'
    },
    { 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <path d="M9 12l2 2 4-4"></path>
        </svg>
      ), 
      label: 'SOC 2 Type II', 
      desc: 'Compliance Verified',
      color: 'text-emerald-400'
    },
    { 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      ), 
      label: 'GDPR Ready', 
      desc: 'Data Protection',
      color: 'text-indigo-400'
    },
    { 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7"></circle>
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
        </svg>
      ), 
      label: '99.9% SLA', 
      desc: 'Uptime Guarantee',
      color: 'text-yellow-400'
    }
  ]

  return (
    <div className="grid grid-cols-4 gap-2 my-6">
      {certifications.map((cert, i) => (
        <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-900/40 border border-white/5 hover:border-blue-500/30 hover:bg-gray-800/60 transition-all duration-300 group">
          <div className={`${cert.color} opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform`}>
            {cert.icon}
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-white uppercase tracking-tighter">{cert.label}</span>
            <span className="text-[7px] text-gray-500 font-medium uppercase tracking-widest">{cert.desc}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
