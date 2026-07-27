import React, { useState, useEffect } from 'react'
import { getAppSettings } from '../lib/db'

export default function WelcomeBanner() {
  const [message, setMessage] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if user has dismissed the banner
    const isDismissed = localStorage.getItem('dumiropay_welcome_dismissed') === 'true'
    setDismissed(isDismissed)

    // Fetch welcome message settings from app_settings
    getAppSettings()
      .then(settings => {
        if (settings && settings.welcome_message_enabled && settings.welcome_message_text) {
          setEnabled(true)
          setMessage(settings.welcome_message_text)
        }
      })
      .catch(err => console.error('Error fetching welcome message:', err))
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('dumiropay_welcome_dismissed', 'true')
    setDismissed(true)
  }

  if (dismissed || !enabled || !message) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-blue-900 to-purple-900 text-white p-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <p className="flex-1 text-sm md:text-base font-medium leading-relaxed">{message}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 bg-white text-blue-900 font-semibold rounded-lg hover:bg-gray-100 transition-all active:scale-95 text-sm"
          >
            OK
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all text-lg font-bold"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
