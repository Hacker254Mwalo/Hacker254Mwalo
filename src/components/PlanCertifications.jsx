export default function PlanCertifications() {
  const certifications = [
    { icon: '🔒', label: 'ISO 27001', desc: 'Information Security' },
    { icon: '✓', label: 'SOC 2 Type II', desc: 'Compliance Verified' },
    { icon: '🛡️', label: 'GDPR Ready', desc: 'Data Protection' },
    { icon: '🏆', label: '99.9% SLA', desc: 'Uptime Guarantee' }
  ]

  return (
    <div className="grid grid-cols-4 gap-2 my-4">
      {certifications.map((cert, i) => (
        <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-blue-500/50 transition">
          <span className="text-xl">{cert.icon}</span>
          <span className="text-[10px] font-bold text-gray-300 text-center">{cert.label}</span>
          <span className="text-[8px] text-gray-500 text-center">{cert.desc}</span>
        </div>
      ))}
    </div>
  )
}
