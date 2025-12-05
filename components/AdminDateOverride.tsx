'use client'

import { useState, useEffect } from 'react'
import { formatDateYMD } from '../lib/dateFormatter'

interface AdminDateOverrideProps {
  isAdmin: boolean
  onDateChange: (date: Date | null) => void
}

export default function AdminDateOverride({ isAdmin, onDateChange }: AdminDateOverrideProps) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [customDate, setCustomDate] = useState(formatDateYMD(new Date()))
  const [customTime, setCustomTime] = useState('12:00')

  useEffect(() => {
    if (isEnabled && customDate) {
      // دمج التاريخ والوقت
      const [hours, minutes] = customTime.split(':')
      const dateTime = new Date(customDate)
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      onDateChange(dateTime)
    } else {
      onDateChange(null)
    }
  }, [isEnabled, customDate, customTime, onDateChange])

  if (!isAdmin) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isEnabled ? 'bg-gradient-to-r from-red-600 to-orange-600' : 'bg-gradient-to-r from-purple-600 to-blue-600'
    } text-white shadow-lg`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Toggle Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                isEnabled
                  ? 'bg-white text-red-600 hover:bg-red-50'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {isEnabled ? '🔴 تفعيل - وضع التاريخ المخصص' : '⚪ تفعيل وضع التاريخ المخصص'}
            </button>

            {isEnabled && (
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg">
                <span className="text-sm">⚠️</span>
                <span className="text-sm font-semibold">جميع العمليات ستُسجل بالتاريخ المخصص</span>
              </div>
            )}
          </div>

          {/* Date and Time Inputs */}
          {isEnabled && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold">📅 التاريخ:</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="px-3 py-1 rounded-lg text-gray-900 font-mono text-sm border-2 border-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold">🕐 الوقت:</label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="px-3 py-1 rounded-lg text-gray-900 font-mono text-sm border-2 border-white"
                />
              </div>

              <button
                onClick={() => {
                  setCustomDate(formatDateYMD(new Date()))
                  const now = new Date()
                  setCustomTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
                }}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold"
              >
                🔄 الآن
              </button>

              <button
                onClick={() => setIsEnabled(false)}
                className="px-4 py-1 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-bold"
              >
                ✖️ إيقاف
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
