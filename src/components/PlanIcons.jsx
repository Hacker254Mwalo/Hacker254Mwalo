import React from 'react'

export function MicroNodeIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="micro-g1" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
        <filter id="micro-glow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect x="12" y="16" width="40" height="32" rx="4" fill="url(#micro-g1)" opacity="0.9" />
      <rect x="12" y="16" width="40" height="32" rx="4" stroke="#d1d5db" strokeWidth="1" fill="none" />
      <rect x="20" y="22" width="10" height="20" rx="2" fill="#e5e7eb" opacity="0.5" />
      <rect x="34" y="22" width="10" height="20" rx="2" fill="#e5e7eb" opacity="0.3" />
      <circle cx="25" cy="32" r="2" fill="#9ca3af" filter="url(#micro-glow)" />
      <circle cx="39" cy="32" r="2" fill="#9ca3af" opacity="0.6" />
      <line x1="12" y1="36" x2="52" y2="36" stroke="#d1d5db" strokeWidth="0.75" opacity="0.5" />
      <circle cx="16" cy="52" r="3" fill="#d1d5db" opacity="0.8" />
      <circle cx="28" cy="52" r="3" fill="#d1d5db" opacity="0.6" />
      <circle cx="40" cy="52" r="3" fill="#d1d5db" opacity="0.4" />
      <line x1="20" y1="48" x2="20" y2="49" stroke="#9ca3af" strokeWidth="1.5" />
      <line x1="32" y1="48" x2="32" y2="49" stroke="#9ca3af" strokeWidth="1.5" />
      <line x1="44" y1="48" x2="44" y2="49" stroke="#9ca3af" strokeWidth="1.5" />
    </svg>
  )
}

export function GPUChipIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gpu-g1" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <filter id="gpu-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect x="18" y="18" width="28" height="28" rx="3" fill="url(#gpu-g1)" opacity="0.85" />
      <rect x="18" y="18" width="28" height="28" rx="3" stroke="#60a5fa" strokeWidth="1.5" />
      <rect x="24" y="24" width="16" height="16" rx="2" fill="#1e3a5f" opacity="0.7" />
      <rect x="28" y="28" width="8" height="8" rx="1" fill="#60a5fa" opacity="0.6" filter="url(#gpu-glow)" />
      {/* Pins top */}
      <rect x="22" y="8" width="4" height="10" rx="1" fill="#3b82f6" />
      <rect x="30" y="8" width="4" height="10" rx="1" fill="#3b82f6" />
      <rect x="38" y="8" width="4" height="10" rx="1" fill="#3b82f6" />
      {/* Pins bottom */}
      <rect x="22" y="46" width="4" height="10" rx="1" fill="#3b82f6" />
      <rect x="30" y="46" width="4" height="10" rx="1" fill="#3b82f6" />
      <rect x="38" y="46" width="4" height="10" rx="1" fill="#3b82f6" />
      {/* Pins left */}
      <rect x="8" y="22" width="10" height="4" rx="1" fill="#3b82f6" />
      <rect x="8" y="30" width="10" height="4" rx="1" fill="#3b82f6" />
      <rect x="8" y="38" width="10" height="4" rx="1" fill="#3b82f6" />
      {/* Pins right */}
      <rect x="46" y="22" width="10" height="4" rx="1" fill="#3b82f6" />
      <rect x="46" y="30" width="10" height="4" rx="1" fill="#3b82f6" />
      <rect x="46" y="38" width="10" height="4" rx="1" fill="#3b82f6" />
      {/* Corner accents */}
      <circle cx="22" cy="22" r="2" fill="#93c5fd" filter="url(#gpu-glow)" />
      <circle cx="42" cy="22" r="2" fill="#93c5fd" filter="url(#gpu-glow)" />
      <circle cx="22" cy="42" r="2" fill="#93c5fd" filter="url(#gpu-glow)" />
      <circle cx="42" cy="42" r="2" fill="#93c5fd" filter="url(#gpu-glow)" />
    </svg>
  )
}

export function ServerClusterIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="srv-g1" x1="0" y1="0" x2="0" y2="64">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <filter id="srv-glow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect x="6" y="6" width="52" height="12" rx="3" fill="url(#srv-g1)" opacity="0.9" />
      <rect x="6" y="22" width="52" height="12" rx="3" fill="url(#srv-g1)" opacity="0.7" />
      <rect x="6" y="38" width="52" height="12" rx="3" fill="url(#srv-g1)" opacity="0.5" />
      <rect x="6" y="54" width="52" height="6" rx="2" fill="url(#srv-g1)" opacity="0.3" />
      {/* Status LEDs */}
      <circle cx="14" cy="12" r="2.5" fill="#4ade80" filter="url(#srv-glow)" />
      <circle cx="14" cy="28" r="2.5" fill="#4ade80" filter="url(#srv-glow)" />
      <circle cx="14" cy="44" r="2.5" fill="#fbbf24" filter="url(#srv-glow)" />
      {/* Data lines */}
      <line x1="22" y1="12" x2="48" y2="12" stroke="#e2e8f0" strokeWidth="1.5" opacity="0.5" />
      <line x1="22" y1="28" x2="48" y2="28" stroke="#e2e8f0" strokeWidth="1.5" opacity="0.4" />
      <line x1="22" y1="44" x2="48" y2="44" stroke="#e2e8f0" strokeWidth="1.5" opacity="0.3" />
      {/* Blink indicator */}
      <rect x="22" y="10" width="6" height="4" rx="1" fill="#e2e8f0" opacity="0.4" />
      <rect x="30" y="10" width="6" height="4" rx="1" fill="#e2e8f0" opacity="0.3" />
      <rect x="22" y="26" width="6" height="4" rx="1" fill="#e2e8f0" opacity="0.3" />
      <rect x="30" y="26" width="6" height="4" rx="1" fill="#e2e8f0" opacity="0.2" />
      <rect x="22" y="42" width="6" height="4" rx="1" fill="#e2e8f0" opacity="0.2" />
    </svg>
  )
}

export function TensorCoreIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tensor-g1" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="tensor-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <polygon points="32,4 58,20 58,44 32,60 6,44 6,20" fill="url(#tensor-g1)" opacity="0.9" />
      <polygon points="32,4 58,20 58,44 32,60 6,44 6,20" stroke="#fde68a" strokeWidth="1.5" />
      <polygon points="32,14 48,24 48,40 32,50 16,40 16,24" stroke="#fde68a" strokeWidth="1" fill="none" opacity="0.6" />
      <polygon points="32,24 40,28 40,36 32,40 24,36 24,28" fill="#fbbf24" opacity="0.5" filter="url(#tensor-glow)" />
      <circle cx="32" cy="32" r="4" fill="#fde68a" filter="url(#tensor-glow)" />
      <circle cx="32" cy="32" r="2" fill="#fef3c7" />
      {/* Energy lines */}
      <line x1="32" y1="4" x2="32" y2="14" stroke="#fde68a" strokeWidth="1" opacity="0.7" />
      <line x1="32" y1="50" x2="32" y2="60" stroke="#fde68a" strokeWidth="1" opacity="0.7" />
      <line x1="6" y1="20" x2="16" y2="24" stroke="#fde68a" strokeWidth="1" opacity="0.5" />
      <line x1="48" y1="40" x2="58" y2="44" stroke="#fde68a" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export function DataCenterIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dc-g1" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <filter id="dc-glow"><feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {/* Left rack */}
      <rect x="6" y="10" width="22" height="44" rx="3" fill="url(#dc-g1)" opacity="0.8" />
      <rect x="6" y="10" width="22" height="44" rx="3" stroke="#67e8f9" strokeWidth="1" />
      {/* Right rack */}
      <rect x="36" y="10" width="22" height="44" rx="3" fill="url(#dc-g1)" opacity="0.6" />
      <rect x="36" y="10" width="22" height="44" rx="3" stroke="#67e8f9" strokeWidth="1" />
      {/* Connection */}
      <rect x="28" y="20" width="8" height="4" rx="1" fill="#0e7490" />
      <rect x="28" y="34" width="8" height="4" rx="1" fill="#0e7490" />
      {/* Left rack details */}
      <rect x="10" y="16" width="14" height="8" rx="1" fill="#164e63" opacity="0.6" />
      <rect x="10" y="28" width="14" height="8" rx="1" fill="#164e63" opacity="0.5" />
      <rect x="10" y="40" width="14" height="8" rx="1" fill="#164e63" opacity="0.4" />
      {/* Right rack details */}
      <rect x="40" y="16" width="14" height="8" rx="1" fill="#164e63" opacity="0.6" />
      <rect x="40" y="28" width="14" height="8" rx="1" fill="#164e63" opacity="0.5" />
      <rect x="40" y="40" width="14" height="8" rx="1" fill="#164e63" opacity="0.4" />
      {/* LEDs */}
      <circle cx="13" cy="20" r="1.5" fill="#4ade80" filter="url(#dc-glow)" />
      <circle cx="13" cy="32" r="1.5" fill="#4ade80" filter="url(#dc-glow)" />
      <circle cx="13" cy="44" r="1.5" fill="#fbbf24" filter="url(#dc-glow)" />
      <circle cx="43" cy="20" r="1.5" fill="#4ade80" filter="url(#dc-glow)" />
      <circle cx="43" cy="32" r="1.5" fill="#4ade80" filter="url(#dc-glow)" />
      <circle cx="43" cy="44" r="1.5" fill="#4ade80" filter="url(#dc-glow)" />
    </svg>
  )
}

export function QuantumGateIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="q-g1" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <filter id="q-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx="32" cy="32" r="24" stroke="#a5b4fc" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.4" />
      <circle cx="32" cy="32" r="18" stroke="url(#q-g1)" strokeWidth="2" fill="url(#q-g1)" opacity="0.15" />
      <circle cx="32" cy="32" r="12" stroke="#a5b4fc" strokeWidth="1.5" fill="#4f46e5" opacity="0.2" />
      <circle cx="32" cy="32" r="6" fill="#818cf8" filter="url(#q-glow)" />
      <circle cx="32" cy="32" r="3" fill="#c7d2fe" />
      {/* Orbital nodes */}
      <circle cx="32" cy="8" r="4" fill="#a5b4fc" filter="url(#q-glow)" />
      <circle cx="32" cy="56" r="4" fill="#a5b4fc" filter="url(#q-glow)" />
      <circle cx="8" cy="32" r="4" fill="#a5b4fc" filter="url(#q-glow)" />
      <circle cx="56" cy="32" r="4" fill="#a5b4fc" filter="url(#q-glow)" />
      {/* Orbital paths */}
      <ellipse cx="32" cy="32" rx="24" ry="12" stroke="#818cf8" strokeWidth="0.75" fill="none" opacity="0.5" transform="rotate(45 32 32)" />
      <ellipse cx="32" cy="32" rx="24" ry="12" stroke="#818cf8" strokeWidth="0.75" fill="none" opacity="0.3" transform="rotate(-45 32 32)" />
    </svg>
  )
}

export function ServerPodIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pod-g1" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <filter id="pod-glow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="6" fill="url(#pod-g1)" opacity="0.85" />
      <rect x="6" y="6" width="52" height="52" rx="6" stroke="#fca5a5" strokeWidth="1.5" />
      {/* Pod doors */}
      <rect x="12" y="12" width="18" height="18" rx="2" fill="#7f1d1d" opacity="0.6" />
      <rect x="34" y="12" width="18" height="18" rx="2" fill="#7f1d1d" opacity="0.6" />
      {/* Internal servers */}
      <rect x="14" y="14" width="14" height="4" rx="1" fill="#ef4444" opacity="0.5" />
      <rect x="14" y="20" width="14" height="4" rx="1" fill="#ef4444" opacity="0.4" />
      <rect x="36" y="14" width="14" height="4" rx="1" fill="#ef4444" opacity="0.5" />
      <rect x="36" y="20" width="14" height="4" rx="1" fill="#ef4444" opacity="0.4" />
      {/* LEDs */}
      <circle cx="16" cy="16" r="1.5" fill="#4ade80" filter="url(#pod-glow)" />
      <circle cx="16" cy="22" r="1.5" fill="#4ade80" filter="url(#pod-glow)" />
      <circle cx="38" cy="16" r="1.5" fill="#4ade80" filter="url(#pod-glow)" />
      <circle cx="38" cy="22" r="1.5" fill="#fbbf24" filter="url(#pod-glow)" />
      {/* Bottom section */}
      <rect x="12" y="36" width="40" height="16" rx="2" fill="#7f1d1d" opacity="0.5" />
      <line x1="16" y1="42" x2="48" y2="42" stroke="#fca5a5" strokeWidth="0.75" opacity="0.4" />
      <line x1="16" y1="48" x2="48" y2="48" stroke="#fca5a5" strokeWidth="0.75" opacity="0.3" />
      <circle cx="16" cy="40" r="1.5" fill="#4ade80" filter="url(#pod-glow)" />
      {/* Cooling vents */}
      <line x1="30" y1="38" x2="46" y2="38" stroke="#fca5a5" strokeWidth="1" opacity="0.5" />
      <line x1="30" y1="42" x2="46" y2="42" stroke="#fca5a5" strokeWidth="1" opacity="0.4" />
      <line x1="30" y1="46" x2="46" y2="46" stroke="#fca5a5" strokeWidth="1" opacity="0.3" />
    </svg>
  )
}

export function SecureShieldIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shield-g1" x1="0" y1="0" x2="0" y2="64">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <filter id="shield-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path d="M32 4 L54 14 L54 32 C54 44 44 54 32 60 C20 54 10 44 10 32 L10 14 L32 4Z" fill="url(#shield-g1)" opacity="0.85" />
      <path d="M32 4 L54 14 L54 32 C54 44 44 54 32 60 C20 54 10 44 10 32 L10 14 L32 4Z" stroke="#86efac" strokeWidth="1.5" />
      <path d="M32 14 L44 20 L44 32 C44 40 38 46 32 50 C26 46 20 40 20 32 L20 20 L32 14Z" stroke="#bbf7d0" strokeWidth="1" fill="none" opacity="0.5" />
      {/* Lock icon inside shield */}
      <rect x="26" y="34" width="12" height="10" rx="2" fill="#15803d" stroke="#86efac" strokeWidth="1" />
      <path d="M29 34 L29 29 C29 25.5 31 23 32 23 C33 23 35 25.5 35 29 L35 34" stroke="#86efac" strokeWidth="1.5" fill="none" />
      <circle cx="32" cy="39" r="2" fill="#86efac" filter="url(#shield-glow)" />
      {/* Security accents */}
      <circle cx="20" cy="24" r="1.5" fill="#86efac" opacity="0.6" />
      <circle cx="44" cy="24" r="1.5" fill="#86efac" opacity="0.6" />
      <line x1="10" y1="14" x2="54" y2="14" stroke="#86efac" strokeWidth="0.75" opacity="0.3" />
    </svg>
  )
}

export function GridScaleIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grid-g1" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <filter id="grid-glow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {/* Grid cells */}
      <rect x="4" y="4" width="14" height="14" rx="2" fill="url(#grid-g1)" opacity="0.7" />
      <rect x="22" y="4" width="14" height="14" rx="2" fill="url(#grid-g1)" opacity="0.5" />
      <rect x="40" y="4" width="14" height="14" rx="2" fill="url(#grid-g1)" opacity="0.3" />
      <rect x="4" y="22" width="14" height="14" rx="2" fill="url(#grid-g1)" opacity="0.5" />
      <rect x="22" y="22" width="14" height="14" rx="2" fill="url(#grid-g1)" opacity="0.9" />
      <rect x="40" y="22" width="14" height="14" rx="2" fill="url(#grid-g1)" opacity="0.5" />
      <rect x="4" y="40" width="14" height="14" rx="2" fill="url(#grid-g1)" opacity="0.3" />
      <rect x="22" y="40" width="14" height="14" rx="2" fill="url(#grid-g1)" opacity="0.5" />
      <rect x="40" y="40" width="14" height="14" rx="2" fill="url(#grid-g1)" opacity="0.7" />
      {/* Connection lines */}
      <line x1="18" y1="11" x2="22" y2="11" stroke="#93c5fd" strokeWidth="1" opacity="0.6" />
      <line x1="36" y1="11" x2="40" y2="11" stroke="#93c5fd" strokeWidth="1" opacity="0.4" />
      <line x1="11" y1="18" x2="11" y2="22" stroke="#93c5fd" strokeWidth="1" opacity="0.6" />
      <line x1="11" y1="36" x2="11" y2="40" stroke="#93c5fd" strokeWidth="1" opacity="0.4" />
      <line x1="29" y1="18" x2="29" y2="22" stroke="#93c5fd" strokeWidth="1" opacity="0.5" />
      <line x1="29" y1="36" x2="29" y2="40" stroke="#93c5fd" strokeWidth="1" opacity="0.5" />
      {/* Active node glow */}
      <circle cx="29" cy="29" r="4" fill="#60a5fa" filter="url(#grid-glow)" />
      <circle cx="29" cy="29" r="2" fill="#dbeafe" />
      {/* Node indicators */}
      <circle cx="11" cy="11" r="2" fill="#93c5fd" opacity="0.8" />
      <circle cx="47" cy="11" r="2" fill="#93c5fd" opacity="0.4" />
      <circle cx="11" cy="47" r="2" fill="#93c5fd" opacity="0.4" />
      <circle cx="47" cy="47" r="2" fill="#93c5fd" opacity="0.8" />
    </svg>
  )
}

export function MatrixCrownIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="crown-g1" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#be185d" />
        </linearGradient>
        <filter id="crown-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {/* Crown base */}
      <path d="M10 42 L16 22 L26 32 L32 14 L38 32 L48 22 L54 42 Z" fill="url(#crown-g1)" opacity="0.85" />
      <path d="M10 42 L16 22 L26 32 L32 14 L38 32 L48 22 L54 42 Z" stroke="#f9a8d4" strokeWidth="1.5" />
      {/* Crown band */}
      <rect x="10" y="42" width="44" height="6" rx="2" fill="#be185d" opacity="0.9" />
      <rect x="10" y="42" width="44" height="6" rx="2" stroke="#f9a8d4" strokeWidth="1" />
      {/* Jewels */}
      <circle cx="16" cy="22" r="3.5" fill="#ec4899" filter="url(#crown-glow)" />
      <circle cx="32" cy="14" r="4" fill="#f472b6" filter="url(#crown-glow)" />
      <circle cx="48" cy="22" r="3.5" fill="#ec4899" filter="url(#crown-glow)" />
      <circle cx="16" cy="22" r="1.5" fill="#fce7f3" />
      <circle cx="32" cy="14" r="2" fill="#fce7f3" />
      <circle cx="48" cy="22" r="1.5" fill="#fce7f3" />
      {/* Crown sparkle details */}
      <circle cx="22" cy="38" r="1" fill="#f9a8d4" opacity="0.6" />
      <circle cx="32" cy="38" r="1" fill="#f9a8d4" opacity="0.8" />
      <circle cx="42" cy="38" r="1" fill="#f9a8d4" opacity="0.6" />
      <circle cx="26" cy="45" r="1" fill="#f9a8d4" opacity="0.5" />
      <circle cx="32" cy="45" r="1" fill="#f9a8d4" opacity="0.7" />
      <circle cx="38" cy="45" r="1" fill="#f9a8d4" opacity="0.5" />
      {/* Power lines from crown */}
      <line x1="32" y1="48" x2="32" y2="56" stroke="#f9a8d4" strokeWidth="1" opacity="0.4" />
      <line x1="24" y1="48" x2="20" y2="54" stroke="#f9a8d4" strokeWidth="0.75" opacity="0.3" />
      <line x1="40" y1="48" x2="44" y2="54" stroke="#f9a8d4" strokeWidth="0.75" opacity="0.3" />
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
