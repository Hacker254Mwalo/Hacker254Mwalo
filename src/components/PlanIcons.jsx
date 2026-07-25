import React from 'react'

export function MicroNodeIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="12" width="32" height="24" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="14" y="18" width="8" height="12" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="26" y="18" width="8" height="12" rx="1" fill="currentColor" opacity="0.4" />
      <line x1="8" y1="30" x2="40" y2="30" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="12" cy="36" r="2" fill="currentColor" />
      <circle cx="20" cy="36" r="2" fill="currentColor" />
      <circle cx="28" cy="36" r="2" fill="currentColor" />
      <circle cx="36" cy="36" r="2" fill="currentColor" />
    </svg>
  )
}

export function GPUChipIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="14" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="19" y="19" width="10" height="10" rx="1" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1" />
      <line x1="14" y1="8" x2="14" y2="14" stroke="currentColor" strokeWidth="2" />
      <line x1="22" y1="8" x2="22" y2="14" stroke="currentColor" strokeWidth="2" />
      <line x1="30" y1="8" x2="30" y2="14" stroke="currentColor" strokeWidth="2" />
      <line x1="38" y1="8" x2="38" y2="14" stroke="currentColor" strokeWidth="2" />
      <line x1="14" y1="34" x2="14" y2="40" stroke="currentColor" strokeWidth="2" />
      <line x1="22" y1="34" x2="22" y2="40" stroke="currentColor" strokeWidth="2" />
      <line x1="30" y1="34" x2="30" y2="40" stroke="currentColor" strokeWidth="2" />
      <line x1="38" y1="34" x2="38" y2="40" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="22" x2="14" y2="22" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="30" x2="14" y2="30" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="38" x2="14" y2="38" stroke="currentColor" strokeWidth="2" />
      <line x1="34" y1="14" x2="40" y2="14" stroke="currentColor" strokeWidth="2" />
      <line x1="34" y1="22" x2="40" y2="22" stroke="currentColor" strokeWidth="2" />
      <line x1="34" y1="30" x2="40" y2="30" stroke="currentColor" strokeWidth="2" />
      <line x1="34" y1="38" x2="40" y2="38" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export function ServerClusterIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="4" width="36" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.2" />
      <rect x="6" y="16" width="36" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.2" />
      <rect x="6" y="28" width="36" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.2" />
      <rect x="6" y="40" width="36" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.2" />
      <circle cx="12" cy="8" r="2" fill="currentColor" opacity="0.8" />
      <circle cx="12" cy="20" r="2" fill="currentColor" opacity="0.8" />
      <circle cx="12" cy="32" r="2" fill="currentColor" opacity="0.8" />
      <line x1="20" y1="8" x2="36" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="20" y1="20" x2="36" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="20" y1="32" x2="36" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  )
}

export function TensorCoreIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="24,4 44,16 44,32 24,44 4,32 4,16" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.1" />
      <polygon points="24,10 38,18 38,30 24,38 10,30 10,18" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.15" />
      <polygon points="24,16 32,20 32,28 24,32 16,28 16,20" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="24" cy="24" r="3" fill="currentColor" />
      <line x1="24" y1="4" x2="24" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="24" y1="38" x2="24" y2="44" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export function DataCenterIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="10" width="16" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
      <rect x="28" y="10" width="16" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
      <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="4" y1="24" x2="20" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="4" y1="30" x2="20" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="28" y1="18" x2="44" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="28" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="28" y1="30" x2="44" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <circle cx="8" cy="14" r="1.5" fill="currentColor" opacity="0.8" />
      <circle cx="8" cy="20" r="1.5" fill="currentColor" opacity="0.8" />
      <circle cx="8" cy="26" r="1.5" fill="currentColor" opacity="0.8" />
      <circle cx="32" cy="14" r="1.5" fill="currentColor" opacity="0.8" />
      <circle cx="32" cy="20" r="1.5" fill="currentColor" opacity="0.8" />
      <circle cx="32" cy="26" r="1.5" fill="currentColor" opacity="0.8" />
      <line x1="20" y1="38" x2="28" y2="38" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <line x1="20" y1="10" x2="28" y2="10" stroke="currentColor" strokeWidth="2" opacity="0.6" />
    </svg>
  )
}

export function QuantumGateIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1" opacity="0.3" strokeDasharray="4 4" />
      <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.2" />
      <circle cx="24" cy="6" r="3" fill="currentColor" opacity="0.8" />
      <circle cx="24" cy="42" r="3" fill="currentColor" opacity="0.8" />
      <circle cx="6" cy="24" r="3" fill="currentColor" opacity="0.8" />
      <circle cx="42" cy="24" r="3" fill="currentColor" opacity="0.8" />
      <line x1="24" y1="6" x2="24" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <line x1="24" y1="36" x2="24" y2="42" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6" y1="24" x2="12" y2="24" stroke="currentColor" strokeWidth="1.5" />
      <line x1="36" y1="24" x2="42" y2="24" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function ServerPodIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="36" height="36" rx="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.1" />
      <rect x="10" y="10" width="12" height="14" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.15" />
      <rect x="26" y="10" width="12" height="14" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.15" />
      <rect x="10" y="28" width="28" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.15" />
      <circle cx="14" cy="15" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="14" cy="20" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="30" cy="15" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="30" cy="20" r="1.5" fill="currentColor" opacity="0.7" />
      <line x1="18" y1="15" x2="22" y2="15" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="18" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="34" y1="15" x2="38" y2="15" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="34" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="14" y1="33" x2="34" y2="33" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <circle cx="14" cy="33" r="1.5" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

export function SecureShieldIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4 L40 12 L40 26 C40 34 32 40 24 44 C16 40 8 34 8 26 L8 12 L24 4Z" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.1" />
      <path d="M24 12 L34 17 L34 26 C34 31 29 35 24 38 C19 35 14 31 14 26 L14 17 L24 12Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
      <circle cx="24" cy="25" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="24" cy="25" r="2" fill="currentColor" opacity="0.6" />
      <line x1="24" y1="20" x2="24" y2="16" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    </svg>
  )
}

export function GridScaleIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.2" />
      <rect x="19" y="4" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.2" />
      <rect x="34" y="4" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.2" />
      <rect x="4" y="19" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.2" />
      <rect x="19" y="19" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.2" />
      <rect x="34" y="19" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.2" />
      <rect x="4" y="34" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.2" />
      <rect x="19" y="34" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.2" />
      <rect x="34" y="34" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.2" />
      <circle cx="9" cy="9" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="24" cy="24" r="1.5" fill="currentColor" />
      <circle cx="39" cy="9" r="1.5" fill="currentColor" opacity="0.7" />
      <line x1="14" y1="9" x2="19" y2="9" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      <line x1="29" y1="9" x2="34" y2="9" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      <line x1="9" y1="14" x2="9" y2="19" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      <line x1="24" y1="14" x2="24" y2="19" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      <line x1="9" y1="29" x2="9" y2="34" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      <line x1="24" y1="29" x2="24" y2="34" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
    </svg>
  )
}

export function MatrixCrownIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 36 L12 18 L20 28 L24 12 L28 28 L36 18 L40 36 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.15" />
      <rect x="8" y="36" width="32" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.25" />
      <circle cx="12" cy="18" r="2.5" fill="currentColor" opacity="0.6" />
      <circle cx="24" cy="12" r="2.5" fill="currentColor" opacity="0.6" />
      <circle cx="36" cy="18" r="2.5" fill="currentColor" opacity="0.6" />
      <line x1="8" y1="36" x2="40" y2="36" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="32" r="1" fill="currentColor" opacity="0.5" />
      <circle cx="24" cy="32" r="1" fill="currentColor" opacity="0.5" />
      <circle cx="32" cy="32" r="1" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

export const PLAN_ICONS = {
  starter: MicroNodeIcon,
  basic: GPUChipIcon,
  silver: ServerClusterIcon,
  gold: TensorCoreIcon,
  platinum: DataCenterIcon,
  diamond: QuantumGateIcon,
  ruby: ServerPodIcon,
  emerald: SecureShieldIcon,
  sapphire: GridScaleIcon,
  vip: MatrixCrownIcon,
}
