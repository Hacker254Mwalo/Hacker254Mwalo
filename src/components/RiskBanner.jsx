export default function RiskBanner() {
  return (
    <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 flex gap-3">
      <span className="text-2xl flex-shrink-0">⚠️</span>
      <div>
        <p className="text-yellow-400 font-semibold text-sm">Investment Risk Disclaimer</p>
        <p className="text-yellow-300/70 text-xs mt-1 leading-relaxed">
          All investments carry risk. Past returns do not guarantee future results. Only invest funds
          you can afford to lose. Dumiropay is a demo platform — returns shown are illustrative only.
        </p>
      </div>
    </div>
  )
}
