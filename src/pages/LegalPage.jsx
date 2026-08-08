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
          Dumiropay Global Infrastructure · Effective August 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          {/* Platform Overview */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Platform Overview</h2>
            <p>
              Dumiropay provides a decentralized GPU compute network. By accessing our infrastructure,
              you agree to operate within the parameters of our node distribution network. Our system is
              designed for high-performance AI inference and training workloads.
            </p>
          </section>

          {/* Long-Term Node Terms */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Long-Term Node Terms (60-Day Cycle)</h2>
            <div className="space-y-3 ml-4 border-l-2 border-cyan-500/30 pl-4">
              <p>
                <span className="text-cyan-400 font-bold">Contract Duration:</span> All long-term node
                plans operate on a fixed 60-day cycle. Capital is committed for the full cycle duration
                and cannot be withdrawn mid-cycle.
              </p>
              <p>
                <span className="text-cyan-400 font-bold">Daily Settlement:</span> Compute yield accrues
                daily at rates determined by the selected AI workload type (Healthcare, Finance, or
                Autonomous). Yields are credited to your node balance every 24 hours.
              </p>
              <p>
                <span className="text-cyan-400 font-bold">Minimum Entry:</span> KSh 200 for the
                Micro-AI Node (V1). Higher tiers require proportionally larger allocations as listed
                on the Plans page.
              </p>
              <p>
                <span className="text-cyan-400 font-bold">Withdrawal:</span> Funds plus accumulated
                yield become withdrawable upon completion of the 60-day cycle. Early withdrawal is not
                available for long-term contracts.
              </p>
              <p>
                <span className="text-cyan-400 font-bold">Workload Multipliers:</span> Yield rates vary
                by workload type: Healthcare AI (0.7×), Finance AI (1.25×), Autonomous AI (0.95×). The
                default base rate is 3% daily.
              </p>
            </div>
          </section>

          {/* Short-Term Node Terms */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Short-Term Node Terms (24h–7d Cycle)</h2>
            <div className="space-y-3 ml-4 border-l-2 border-emerald-500/30 pl-4">
              <p>
                <span className="text-emerald-400 font-bold">Cycle Duration:</span> Short-term plans
                operate on 24-hour, 72-hour, or 168-hour (7-day) cycles. Each cycle is independent and
                self-contained.
              </p>
              <p>
                <span className="text-emerald-400 font-bold">Instant Settlement:</span> Upon cycle
                completion, your full return (capital + yield) is credited immediately to your
                available balance. No waiting period.
              </p>
              <p>
                <span className="text-emerald-400 font-bold">Minimum Entry:</span> KSh 3,500 for all
                short-term plans. Maximum single allocation is KSh 75,000 per cycle.
              </p>
              <p>
                <span className="text-emerald-400 font-bold">Yield Rates:</span> 24h Rapid Inference
                (3%), 3D Neural Cluster (8%), 7D Enterprise Backbone (18%). Rates are fixed at the
                time of provisioning.
              </p>
              <p>
                <span className="text-emerald-400 font-bold">No Lock-Up:</span> Your capital is only
                committed for the duration of the selected cycle. After settlement, funds are fully
                available for reinvestment or withdrawal.
              </p>
            </div>
          </section>

          {/* Node Operation & Yield */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Node Operation &amp; Yield</h2>
            <p>
              Participants allocate compute credits to provision GPU nodes. Yields are generated based
              on real-world compute demand from our enterprise AI partners. All returns are subject to
              network uptime and compute contract completion. Yield rates may fluctuate based on global
              AI compute demand.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Data Security &amp; Privacy</h2>
            <p>
              We employ military-grade encryption for all user data and transaction logs. We do not
              share personal information with third parties except as required for M-Pesa settlement
              and regulatory compliance within the Republic of Kenya. Phone numbers are used as the
              primary account identifier.
            </p>
          </section>

          {/* Risk Disclosure */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Risk Disclosure</h2>
            <p>
              As with any high-tech infrastructure, node operation involves technical risks. Dumiropay
              guarantees 99.9% uptime but is not liable for external network interruptions or hardware
              failures beyond our primary datacenter control. Compute yield depends on enterprise
              demand and may vary from projected returns.
            </p>
          </section>

          {/* Withdrawal Terms */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Withdrawal &amp; Settlement</h2>
            <p>
              Withdrawals are processed via M-Pesa PayBill {isTerms ? '4091165' : 'registered number'}.
              A withdrawal fee of 8% applies to all outgoing transfers. Processing time is typically
              within 24 hours of request. Minimum withdrawal amount is KSh 500.
            </p>
          </section>

          {/* Referral Terms */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Referral Program</h2>
            <p>
              Referral commissions are paid at 10% for Level 1 (direct referrals) and 4% for Level 2
              (referrals of referrals). Commissions are credited upon your referral's first successful
              node activation.
            </p>
          </section>

          {/* Footer */}
          <section className="pt-8 border-t border-gray-800">
            <p className="italic opacity-60">
              For further inquiries regarding our institutional compliance, please contact our legal
              department at legal@dumiropay.space.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
