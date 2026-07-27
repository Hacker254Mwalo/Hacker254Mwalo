import React, { useState, useEffect } from 'react'
import { getWhatsAppSettings } from '../lib/db'

export default function WelcomeBanner() {
  const [message, setMessage] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Fetch welcome message settings from app_settings
    getWhatsAppSettings()
      .then(settings => {
        if (settings && (settings.welcome_message_enabled === 'true' || settings.welcome_message_enabled === true) && settings.welcome_message_text) {
          setEnabled(true)
          setMessage(settings.welcome_message_text)
        }
      })
      .catch(err => console.error('Error fetching welcome message:', err))
  }, [])

  useEffect(() => {
    if (enabled && message && !dismissed) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, 15000) // Auto-dismiss after 15 seconds
      return () => clearTimeout(timer)
    }
  }, [enabled, message, dismissed])

  const handleDismiss = () => {
    // We remove the session storage check to ensure it shows on every login/refresh as requested
    setDismissed(true)
  }

  if (dismissed || !enabled || !message) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[100] p-4 animate-slideDown">
      <div className="max-w-lg mx-auto bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white p-5 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-md relative overflow-hidden group">
        {/* Animated background pulse */}
        <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
        
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl animate-bounce">
              💰
            </div>
            <button 
              onClick={handleDismiss}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <p className="text-sm md:text-base font-bold leading-snug drop-shadow-md">
            {message}
          </p>
          
          <div className="flex items-center justify-end gap-3 mt-1">
            <button
              onClick={handleDismiss}
              className="px-6 py-2 bg-white text-indigo-600 font-black rounded-xl hover:bg-indigo-50 transition-all active:scale-95 text-xs uppercase tracking-wider shadow-lg"
            >
              Got it!
            </button>
          </div>
        </div>
        
        {/* Progress bar for 3s timer */}
        <div className="absolute bottom-0 left-0 h-1 bg-white/40 animate-shrinkWidth" style={{ width: '100%' }} />
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-slideDown { animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-shrinkWidth { animation: shrinkWidth 15s linear forwards; }
      `}} />
    </div>
  )
}
