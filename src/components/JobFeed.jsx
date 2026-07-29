import { useState, useEffect, useRef } from 'react'

const JOB_TYPES = [
  { type: 'Medical Image Scan', cat: 'Healthcare AI', client: 'Tumaini Health' },
  { type: 'Trading Model Training', cat: 'Finance AI', client: 'JPMorgan Chase' },
  { type: 'Fraud Detection Batch', cat: 'Finance AI', client: 'NCBA Bank' },
  { type: 'Product Categorization', cat: 'Retail AI', client: 'Samsung' },
  { type: 'Language Model Fine-tuning', cat: 'NLP AI', client: 'Safaricom PLC' },
  { type: 'Risk Assessment Model', cat: 'Finance AI', client: 'KCB Group' },
  { type: 'Pathology Image Analysis', cat: 'Healthcare AI', client: 'KPMG Kenya' },
  { type: 'Speech Recognition Training', cat: 'NLP AI', client: 'Airtel Africa' },
  { type: 'Weather Prediction Model', cat: 'Climate AI', client: 'Kenya Power' },
  { type: 'Document OCR Processing', cat: 'Enterprise AI', client: 'Equity Bank' }
]

export default function JobFeed({ isActive, nodeId }) {
  const [jobs, setJobs] = useState([])
  const timerRef = useRef(null)

  useEffect(() => {
    if (!isActive) return

    const generateJob = () => {
      const template = JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)]
      const newJob = {
        id: Math.random().toString(36).substring(7),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        ...template
      }
      setJobs(prev => [newJob, ...prev].slice(0, 3))
      
      const nextDelay = Math.random() * 15000 + 5000 // 5-20 seconds
      timerRef.current = setTimeout(generateJob, nextDelay)
    }

    generateJob()
    return () => clearTimeout(timerRef.current)
  }, [isActive])

  if (!isActive) return null

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Live Job Feed</span>
        <span className="flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
      </div>
      <div className="space-y-2">
        {jobs.length === 0 ? (
          <div className="text-[10px] text-gray-600 font-mono italic">Initializing job queue...</div>
        ) : (
          jobs.map(job => (
            <div key={job.id} className="text-[10px] font-mono flex items-start space-x-2 animate-fadeIn">
              <span className="text-emerald-500/70">[{job.time}]</span>
              <div className="flex-1">
                <span className="text-gray-300">Processing </span>
                <span className="text-blue-400">{job.type}</span>
                <span className="text-gray-500"> for </span>
                <span className="text-emerald-400">{job.client}</span>
              </div>
            </div>
          ))
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
