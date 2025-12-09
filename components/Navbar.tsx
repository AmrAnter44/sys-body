'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import type { Permissions } from '../types/permissions'
import LinkModal from './LinkModal'
import AdminDateOverride from './AdminDateOverride'
import { useAdminDate } from '../contexts/AdminDateContext'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { hasPermission, user, isAdmin } = usePermissions()
  const { setCustomCreatedAt } = useAdminDate()
  const [quickSearchId, setQuickSearchId] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchMessage, setSearchMessage] = useState<{type: 'success' | 'error' | 'warning', text: string, staff?: any} | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const allLinks = [
    { href: '/', label: 'الرئيسية', icon: '🏠', permission: null, roleRequired: null },
    { href: '/members', label: 'الأعضاء', icon: '👥', permission: 'canViewMembers' as keyof Permissions, roleRequired: null },
    { href: '/pt', label: 'PT', icon: '💪', permission: 'canViewPT' as keyof Permissions, roleRequired: null },
    { href: '/coach/dashboard', label: 'كوتش', icon: '🏋️', permission: 'canRegisterPTAttendance' as keyof Permissions, roleRequired: 'COACH' },
    { href: '/dayuse', label: 'يوم استخدام', icon: '📊', permission: 'canViewDayUse' as keyof Permissions, roleRequired: null },
    { href: '/invitations', label: 'الدعوات', icon: '🎟️', permission: 'canViewVisitors' as keyof Permissions, roleRequired: null },
    { href: '/staff', label: 'الموظفين', icon: '👷', permission: 'canViewStaff' as keyof Permissions, roleRequired: null },
    { href: '/receipts', label: 'الإيصالات', icon: '🧾', permission: 'canViewReceipts' as keyof Permissions, roleRequired: null },
    { href: '/expenses', label: 'المصروفات', icon: '💸', permission: 'canViewExpenses' as keyof Permissions, roleRequired: null },
    { href: '/visitors', label: 'الزوار', icon: '🚶', permission: 'canViewVisitors' as keyof Permissions, roleRequired: null },
    { href: '/followups', label: 'المتابعات', icon: '📝', permission: 'canViewFollowUps' as keyof Permissions, roleRequired: null },
    { href: '/search', label: 'البحث', icon: '🔍', permission: 'canViewMembers' as keyof Permissions, roleRequired: null },
    { href: '/offers', label: 'العروض', icon: '🎁', permission: 'canAccessSettings' as keyof Permissions, roleRequired: null },
    { href: '/closing', label: 'التقفيل', icon: '💰', permission: 'canAccessClosing' as keyof Permissions, roleRequired: null },
    { href: '/attendance-report', label: 'حضور', icon: '📊', permission: 'canViewAttendance' as keyof Permissions, roleRequired: null },
  ]

  // Filter links based on permissions and role
  const links = allLinks.filter(link => {
    // Check permission
    if (link.permission && !hasPermission(link.permission)) return false

    // Check role if required
    if (link.roleRequired && user?.role !== link.roleRequired) return false

    return true
  })

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
      setSearchMessage({ type: 'error', text: '⚠️ يرجى إدخال رقم العضوية أو رقم الموظف' })
      return
    }

    setIsSearching(true)
    setSearchMessage(null)

    const inputValue = quickSearchId.trim()

    // ✅ فحص إذا كان الرقم 9 خانات أو أكثر - موظف
    if (/^\d{9,}$/.test(inputValue)) {
      const numericCode = parseInt(inputValue, 10)

      if (numericCode < 100000000) {
        playAlarmSound()
        setSearchMessage({ type: 'error', text: '❌ رقم الموظف يجب أن يكون 9 أرقام (مثال: 100000022)' })
        setQuickSearchId('')
        setTimeout(() => {
          setSearchMessage(null)
          searchInputRef.current?.focus()
        }, 3000)
        setIsSearching(false)
        return
      }

      // ✅ تحويل الرقم من 9 خانات إلى s + رقم
      // مثال: 100000022 -> s022
      const staffNumber = numericCode - 100000000
      const staffCode = `s${staffNumber.toString().padStart(3, '0')}`

      try {
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffCode }),
        })

        const data = await response.json()

        if (response.ok) {
          playSuccessSound()
          setSearchMessage({ 
            type: 'success', 
            text: data.message,
            staff: data.staff
          })
        } else {
          playAlarmSound()
          setSearchMessage({ type: 'error', text: data.error || 'فشل تسجيل الحضور' })
        }
      } catch (error) {
        console.error('Attendance error:', error)
        playAlarmSound()
        setSearchMessage({ type: 'error', text: 'حدث خطأ في تسجيل الحضور' })
      }
      
      setQuickSearchId('')
      setTimeout(() => {
        setSearchMessage(null)
        searchInputRef.current?.focus()
      }, 4000)
      setIsSearching(false)
      return
    }

    // ✅ البحث العادي عن عضو
    try {
      const res = await fetch('/api/members')
      const members = await res.json()
      
      const member = members.find((m: any) => 
        m.memberNumber !== null && m.memberNumber.toString() === inputValue
      )

      if (member) {
        const status = checkMemberStatusAndPlaySound(member)
        
        if (status === 'expired') {
          setSearchMessage({ type: 'error', text: `🚨 ${member.name} - الاشتراك منتهي!` })
        } else if (status === 'warning') {
          setSearchMessage({ type: 'warning', text: `⚠️ ${member.name} - الاشتراك قريب من الانتهاء!` })
        } else {
          setSearchMessage({ type: 'success', text: `✅ ${member.name} - الاشتراك صالح` })
        }
        
        setQuickSearchId('')
        setTimeout(() => {
          setSearchMessage(null)
          searchInputRef.current?.focus()
        }, 2000)
      } else {
        playAlarmSound()
        setSearchMessage({ type: 'error', text: `🚨 لم يتم العثور على رقم "${inputValue}"` })
        setQuickSearchId('')
        setTimeout(() => {
          setSearchMessage(null)
          searchInputRef.current?.focus()
        }, 2000)
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      'ADMIN': '👑 مدير',
      'MANAGER': '📊 مشرف',
      'STAFF': '👷 موظف',
      'COACH': '🏋️ كوتش'
    }
    return labels[role as keyof typeof labels] || role
  }

  return (
    <>
      {/* ✅ Navbar بتصميم صفين */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-2 sm:px-4">
          {/* الصف الأول: اللوجو + البحث السريع + اسم المستخدم */}
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 border-b border-white/20 lg:border-0">
            {/* Hamburger Menu + Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Hamburger Button - يظهر في الموبايل والتابلت فقط */}
              <button
                onClick={() => setShowDrawer(!showDrawer)}
                className="lg:hidden p-2 hover:bg-white/20 rounded-lg transition"
                aria-label="القائمة"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <img src='/icon.png' alt="logo" className='w-6 h-6 sm:w-8 sm:h-8'/>
              <span className="font-bold text-base sm:text-xl">X GYM</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Admin Date Override Button */}
              <AdminDateOverride
                isAdmin={isAdmin}
                onDateChange={(date) => setCustomCreatedAt(date)}
              />

              {/* User Icon with Name - Dropdown */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg hover:bg-white/30 transition"
                  >
                    <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-medium">{user.name}</span>
                    <span className="text-xs">▼</span>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <>
                      {/* Backdrop to close menu */}
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setShowUserMenu(false)}
                      />

                      {/* Menu */}
                      <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-xl overflow-hidden z-40 border-2 border-blue-500">
                        {/* User Info */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center font-bold text-lg">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold">{user.name}</p>
                              <p className="text-xs text-white/80">{user.email}</p>
                              <p className="text-xs mt-1">{getRoleLabel(user.role)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          {user.role === 'ADMIN' && (
                            <Link
                              href="/admin/users"
                              onClick={() => setShowUserMenu(false)}
                              className="px-4 py-3 text-gray-700 hover:bg-blue-50 transition flex items-center gap-2"
                            >
                              <span>👥</span>
                              <span>إدارة المستخدمين</span>
                            </Link>
                          )}

                          <button
                            onClick={handleLogout}
                            className="w-full text-right px-4 py-3 text-red-600 hover:bg-red-50 transition flex items-center gap-2 font-bold"
                          >
                            <span>🚪</span>
                            <span>تسجيل الخروج</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Link Button */}
              <button
                onClick={() => setShowLinkModal(true)}
                className="px-3 sm:px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition flex items-center gap-1 sm:gap-2 font-bold flex-shrink-0"
                title="مشاركة اللينك"
              >
                <span>🔗</span>
                <span className="hidden sm:inline text-sm">Link</span>
              </button>

              {/* Quick Search Button */}
              <button
                onClick={() => {
                  setShowSearchModal(true)
                  setSearchMessage(null)
                  setTimeout(() => searchInputRef.current?.focus(), 100)
                }}
                className="px-3 sm:px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition flex items-center gap-1 sm:gap-2 font-bold flex-shrink-0"
              >
                <span>🔍</span>
                <span className="text-sm sm:text-base">بحث</span>
                <kbd className="hidden lg:inline-block px-2 py-1 bg-white/20 rounded text-xs">Ctrl+K</kbd>
              </button>
            </div>
          </div>

          {/* الصف الثاني: روابط التنقل - يظهر في Desktop فقط */}
          <div className="hidden lg:flex lg:justify-center gap-1 py-2 lg:py-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2 py-2 rounded-lg transition-all hover:bg-white/20 text-center flex items-center justify-center gap-1 ${
                  pathname === link.href ? 'bg-white/30 font-bold' : ''
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span className="text-sm whitespace-nowrap">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile/Tablet Drawer - ينزلق من اليمين */}
      {showDrawer && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[100] lg:hidden animate-fadeIn"
            onClick={() => setShowDrawer(false)}
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-72 sm:w-80 bg-white z-[101] shadow-2xl lg:hidden animate-slideRight overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <img src='/icon.png' alt="logo" className='w-8 h-8'/>
                <span className="font-bold text-xl">القائمة</span>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation Links */}
            <div className="p-4 space-y-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setShowDrawer(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    pathname === link.href
                      ? 'bg-blue-100 text-blue-700 font-bold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-2xl">{link.icon}</span>
                  <span className="text-base">{link.label}</span>
                </Link>
              ))}
            </div>

            {/* User Info at Bottom */}
            {user && (
              <div className="p-4 border-t mt-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{user.name}</p>
                      <p className="text-xs text-gray-600">{getRoleLabel(user.role)}</p>
                    </div>
                  </div>

                  {user.role === 'ADMIN' && (
                    <Link
                      href="/admin/users"
                      onClick={() => setShowDrawer(false)}
                      className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition mb-2"
                    >
                      <span>👥</span>
                      <span className="text-sm">إدارة المستخدمين</span>
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-bold"
                  >
                    <span>🚪</span>
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

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

              {/* Instructions */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
                <p className="text-blue-800 font-bold mb-2">📝 كيفية الاستخدام:</p>
                <ul className="text-blue-700 space-y-1 text-sm">
                  <li>• <strong>للبحث عن عضو:</strong> اكتب الرقم (1-8 خانات) مباشرة (مثال: <code className="bg-white px-2 py-1 rounded">1001</code>)</li>
                  <li>• <strong>لتسجيل حضور موظف:</strong> اكتب 9 أرقام (مثال: <code className="bg-white px-2 py-1 rounded">100000022</code>)</li>
                </ul>
              </div>

              {/* Search Input */}
              <div className="mb-6">
                <div className="flex gap-3">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={quickSearchId}
                    onChange={(e) => setQuickSearchId(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    placeholder="1001 أو 100000022"
                    className="flex-1 px-4 py-3 md:px-6 md:py-4 border-4 border-blue-300 rounded-xl text-xl md:text-2xl lg:text-3xl font-bold text-center focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition text-gray-800"
                    disabled={isSearching}
                    autoFocus
                  />
                  <button
                    onClick={handleQuickSearch}
                    disabled={isSearching || !quickSearchId.trim()}
                    className="px-4 py-3 md:px-8 md:py-4 bg-blue-600 text-white text-base md:text-xl font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {isSearching ? '⏳' : '🔍'}
                  </button>
                </div>
              </div>

              {/* Message Area */}
              {searchMessage && (
                <div className={`p-6 rounded-2xl border-4 animate-slideDown ${
                  searchMessage.type === 'success' 
                    ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-500'
                    : searchMessage.type === 'warning'
                    ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-500'
                    : 'bg-gradient-to-r from-red-50 to-red-100 border-red-500'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">
                      {searchMessage.type === 'success' ? '✅' : searchMessage.type === 'warning' ? '⚠️' : '🚨'}
                    </div>
                    <div className="flex-1">
                      <p className={`text-2xl font-bold ${
                        searchMessage.type === 'success' 
                          ? 'text-green-800'
                          : searchMessage.type === 'warning'
                          ? 'text-yellow-800'
                          : 'text-red-800'
                      }`}>
                        {searchMessage.text}
                      </p>
                      {searchMessage.staff && (
                        <div className="mt-3 bg-white/50 rounded-xl p-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-gray-600">الموظف</p>
                              <p className="text-sm font-bold text-gray-800">{searchMessage.staff.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">الوظيفة</p>
                              <p className="text-sm font-bold text-gray-800">{searchMessage.staff.position || '-'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Hint */}
              <div className="mt-6 text-center text-sm text-gray-500">
                <p>💡 اضغط <kbd className="px-2 py-1 bg-gray-200 rounded">Enter</kbd> للبحث أو <kbd className="px-2 py-1 bg-gray-200 rounded">ESC</kbd> للإغلاق</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <LinkModal onClose={() => setShowLinkModal(false)} />
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
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }

        .animate-slideDown {
          animation: slideDown 0.4s ease-out;
        }

        .animate-slideRight {
          animation: slideRight 0.3s ease-out;
        }
      `}</style>
    </>
  )
}