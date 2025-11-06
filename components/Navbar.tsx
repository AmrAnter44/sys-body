'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [quickSearchId, setQuickSearchId] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchMessage, setSearchMessage] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const links = [
    { href: '/', label: 'الرئيسية', icon: '🏠' },
    { href: '/members', label: 'الأعضاء', icon: '👥' },
    { href: '/pt', label: 'PT', icon: '💪' },
    { href: '/dayuse', label: 'يوم استخدام', icon: '📊' },
    { href: '/staff', label: 'الموظفين', icon: '👷' },
    { href: '/receipts', label: 'الإيصالات', icon: '🧾' },
    { href: '/expenses', label: 'المصروفات', icon: '💸' },
    { href: '/visitors', label: 'الزوار', icon: '🚶' },
    { href: '/search', label: 'البحث', icon: '🔍' },
    { href: '/closing', label: 'التقفيل', icon: '💰' },
    { href: '/settings', label: 'الإعدادات', icon: '⚙️' },
  ]

  // Open search modal with Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearchModal(true)
        setSearchMessage(null)
        setTimeout(() => {
          searchInputRef.current?.focus()
          searchInputRef.current?.select()
        }, 100)
      }
      // ESC to close
      if (e.key === 'Escape') {
        setShowSearchModal(false)
        setQuickSearchId('')
        setSearchMessage(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const playSuccessSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      const times = [0, 0.15, 0.3]
      const frequencies = [523.25, 659.25, 783.99]
      
      times.forEach((time, index) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequencies[index], ctx.currentTime + time)
        gainNode.gain.setValueAtTime(0.8, ctx.currentTime + time)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.3)
        oscillator.start(ctx.currentTime + time)
        oscillator.stop(ctx.currentTime + time + 0.3)
      })
    } catch (error) {
      console.error('Error playing sound:', error)
    }
  }

  const playAlarmSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      const alarmPattern = [
        { freq: 2000, time: 0 },
        { freq: 600, time: 0.15 },
        { freq: 2000, time: 0.3 },
      ]
      
      alarmPattern.forEach(({ freq, time }) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.type = 'square'
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + time)
        gainNode.gain.setValueAtTime(0.9, ctx.currentTime + time)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.15)
        oscillator.start(ctx.currentTime + time)
        oscillator.stop(ctx.currentTime + time + 0.15)
      })
    } catch (error) {
      console.error('Error playing sound:', error)
    }
  }

  const playWarningSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      const times = [0, 0.2]
      const frequencies = [440, 370]
      
      times.forEach((time, index) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.type = 'triangle'
        oscillator.frequency.setValueAtTime(frequencies[index], ctx.currentTime + time)
        gainNode.gain.setValueAtTime(0.7, ctx.currentTime + time)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.25)
        oscillator.start(ctx.currentTime + time)
        oscillator.stop(ctx.currentTime + time + 0.25)
      })
    } catch (error) {
      console.error('Error playing sound:', error)
    }
  }

  const checkMemberStatusAndPlaySound = (member: any) => {
    const isActive = member.isActive
    const expiryDate = member.expiryDate ? new Date(member.expiryDate) : null
    const today = new Date()
    
    if (!isActive || (expiryDate && expiryDate < today)) {
      playAlarmSound()
      return 'expired'
    } else if (expiryDate) {
      const diffTime = expiryDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 7) {
        playWarningSound()
        return 'warning'
      } else {
        playSuccessSound()
        return 'active'
      }
    } else {
      playSuccessSound()
      return 'active'
    }
  }

  const handleQuickSearch = async () => {
    if (!quickSearchId.trim()) {
      playAlarmSound()
      setSearchMessage({ type: 'error', text: '⚠️ يرجى إدخال رقم العضوية' })
      return
    }

    setIsSearching(true)
    setSearchMessage(null)

    try {
      const res = await fetch('/api/members')
      const members = await res.json()
      
      const member = members.find((m: any) => 
        m.memberNumber !== null && m.memberNumber.toString() === quickSearchId.trim()
      )

      if (member) {
        const status = checkMemberStatusAndPlaySound(member)
        
        if (status === 'expired') {
          setSearchMessage({ type: 'error', text: `🚨 تم العثور على: ${member.name} - الاشتراك منتهي!` })
        } else if (status === 'warning') {
          setSearchMessage({ type: 'warning', text: `⚠️ تم العثور على: ${member.name} - الاشتراك قريب من الانتهاء!` })
        } else {
          setSearchMessage({ type: 'success', text: `✅ تم العثور على: ${member.name} - الاشتراك صالح` })
        }
        
        // Clear input and refocus for next search
        setQuickSearchId('')
        setTimeout(() => {
          setSearchMessage(null)
          searchInputRef.current?.focus()
        }, 1500)
      } else {
        playAlarmSound()
        setSearchMessage({ type: 'error', text: `🚨 لم يتم العثور على عضو برقم "${quickSearchId}"` })
        // Clear input and refocus for next search
        setQuickSearchId('')
        setTimeout(() => {
          setSearchMessage(null)
          searchInputRef.current?.focus()
        }, 1500)
      }
    } catch (error) {
      console.error('Quick search error:', error)
      playAlarmSound()
      setSearchMessage({ type: 'error', text: '❌ حدث خطأ في البحث' })
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuickSearch()
    }
  }

  return (
    <>
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img src='/icon.png' alt="logo" className='w-8 h-8'/>
              <span className="font-bold text-xl">X GYM</span>
            </div>
            
            {/* Quick Search Button */}
            <button
              onClick={() => {
                setShowSearchModal(true)
                setSearchMessage(null)
                setTimeout(() => searchInputRef.current?.focus(), 100)
              }}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition flex items-center gap-2 font-bold animate-pulse hover:animate-none"
              title="اضغط Ctrl+K للبحث السريع"
            >
              <span>🔍</span>
              <span className="hidden sm:inline">بحث سريع</span>
              <kbd className="hidden sm:inline-block px-2 py-1 bg-white/30 rounded text-sm font-bold border border-white/40">Ctrl+K</kbd>
            </button>
            
            {/* Navigation Links */}
            <div className="flex gap-1 overflow-x-auto">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg transition-all hover:bg-white/20 whitespace-nowrap ${
                    pathname === link.href ? 'bg-white/30 font-bold' : ''
                  }`}
                >
                  <span className="mr-1">{link.icon}</span>
                  <span className="hidden lg:inline">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Search Modal/Popup */}
      {showSearchModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-[9998] animate-fadeIn"
            onClick={() => {
              setShowSearchModal(false)
              setQuickSearchId('')
              setSearchMessage(null)
            }}
          />
          
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-2xl px-4 animate-scaleIn">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-blue-500">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-600 flex items-center gap-3">
                  <span>🔍</span>
                  <span>البحث السريع</span>
                </h2>
                <button
                  onClick={() => {
                    setShowSearchModal(false)
                    setQuickSearchId('')
                    setSearchMessage(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 text-3xl"
                >
                  ✕
                </button>
              </div>

              {/* Search Input */}
              <div className="mb-6">
                <label className="block text-lg font-bold text-gray-700 mb-3">
                  ادخل رقم العضوية
                </label>
                <div className="flex gap-3">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={quickSearchId}
                    onChange={(e) => setQuickSearchId(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    placeholder="اكتب رقم العضوية..."
                    className="flex-1 px-6 py-4 border-4 border-blue-300 rounded-xl text-3xl font-bold text-center focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition text-gray-800"
                    disabled={isSearching}
                    autoFocus
                  />
                  <button
                    onClick={handleQuickSearch}
                    disabled={isSearching || !quickSearchId.trim()}
                    className="px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {isSearching ? '⏳ جاري البحث...' : '🔍 بحث'}
                  </button>
                </div>
              </div>

              {/* Message Area */}
              {searchMessage && (
                <div className={`p-6 rounded-xl border-4 animate-slideDown ${
                  searchMessage.type === 'success' 
                    ? 'bg-green-50 border-green-500 text-green-800'
                    : searchMessage.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
                    : 'bg-red-50 border-red-500 text-red-800'
                }`}>
                  <p className="text-2xl font-bold text-center">
                    {searchMessage.text}
                  </p>
                </div>
              )}

              {/* Hint */}
              <div className="mt-6 text-center text-sm text-gray-500 bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <p className="font-bold text-lg mb-2">⌨️ اختصارات لوحة المفاتيح:</p>
                <div className="flex justify-center gap-4 flex-wrap">
                  <span>
                    <kbd className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-bold border border-blue-300">Ctrl+K</kbd>
                    <span className="mr-2">فتح البحث</span>
                  </span>
                  <span>
                    <kbd className="px-3 py-1 bg-green-100 text-green-700 rounded font-bold border border-green-300">Enter</kbd>
                    <span className="mr-2">بحث</span>
                  </span>
                  <span>
                    <kbd className="px-3 py-1 bg-red-100 text-red-700 rounded font-bold border border-red-300">ESC</kbd>
                    <span className="mr-2">إغلاق</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </>
  )
}