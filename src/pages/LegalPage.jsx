import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function LegalPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isTerms = location.pathname.includes('terms')
  
  return (
    <div className="min-h-screen bg-[#030712] text-gray-300 p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-sm font-bold text-[#FFD700] hover:opacity-80 transition-opacity"
        >
          ← BACK TO PLATFORM
        </button>
        
        <h1 className="text-4xl font-black mb-2 text-white tracking-tight">
          {isTerms ? 'Terms of Service' : 'Privacy Policy'}
        </h1>
        <p className="text-xs text-[#FFD700] mb-8 font-mono tracking-widest uppercase">
          Dumiropay Global Infrastructure • Effective August 2026
        </p>
        
        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Platform Overview</h2>
            <p>
              Dumiropay provides a decentralized GPU compute network. By accessing our infrastructure, you agree to operate within the parameters of our node distribution network. Our system is designed for high-performance AI inference and training workloads.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Node Operation & Yield</h2>
            <p>
              Participants allocate compute credits to provision GPU nodes. Yields are generated based on real-world compute demand from our enterprise AI partners. All returns are subject to network uptime and compute contract completion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Data Security & Privacy</h2>
            <p>
              We employ military-grade encryption for all user data and transaction logs. We do not share personal information with third parties except as required for M-Pesa settlement and regulatory compliance within the Republic of Kenya.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Risk Disclosure</h2>
            <p>
              As with any high-tech infrastructure, node operation involves technical risks. Dumiropay guarantees 99.9% uptime but is not liable for external network interruptions or hardware failures beyond our primary datacenter control.
            </p>
          </section>

          <section className="pt-8 border-t border-gray-800">
            <p className="italic opacity-60">
              For further inquiries regarding our institutional compliance, please contact our legal department at legal@dumiropay.space.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
