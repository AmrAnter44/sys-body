// app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  const [stats, setStats] = useState({
    members: 0,
    activePT: 0,
    todayRevenue: 0,
    totalReceipts: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        fetchStats()
      } else {
        // لو مش مسجل دخول، يروح على صفحة اللوجن
        router.push('/login')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // جلب الأعضاء
      const membersRes = await fetch('/api/members')
      const members = await membersRes.json()
      
      // جلب جلسات PT
      const ptRes = await fetch('/api/pt')
      const ptSessions = await ptRes.json()
      
      // جلب الإيصالات
      const receiptsRes = await fetch('/api/receipts?limit=100')
      const receipts = await receiptsRes.json()
      
      // حساب إيرادات اليوم
      const today = new Date().toDateString()
      const todayReceipts = receipts.filter((r: any) => {
        return new Date(r.createdAt).toDateString() === today
      })
      const todayRevenue = todayReceipts.reduce((sum: number, r: any) => sum + r.amount, 0)
      
      // حساب PT النشطة
      const activePT = ptSessions.filter((pt: any) => pt.sessionsRemaining > 0).length
      
      setStats({
        members: Array.isArray(members) ? members.length : 0,
        activePT,
        todayRevenue,
        totalReceipts: receipts.length,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleLogout = async () => {
  if (!confirm('هل تريد تسجيل الخروج؟')) return
  
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/login'
}


  const modules = [
    {
      title: 'الأعضاء',
      icon: '👥',
      description: 'إدارة اشتراكات الأعضاء والإيصالات',
      href: '/members',
      color: 'bg-blue-500',
    },
    {
      title: 'التدريب الشخصي',
      icon: '💪',
      description: 'متابعة جلسات المدربين الشخصيين',
      href: '/pt',
      color: 'bg-green-500',
    },
    {
      title: 'يوم استخدام / InBody',
      icon: '📊',
      description: 'إدارة الزيارات اليومية وفحوصات InBody',
      href: '/dayuse',
      color: 'bg-purple-500',
    },
    {
      title: 'الزوار',
      icon: '🚶',
      description: 'تسجيل معلومات الزوار المحتملين',
      href: '/visitors',
      color: 'bg-orange-500',
    },
    {
      title: 'الإيصالات',
      icon: '🧾',
      description: 'متابعة جميع الإيصالات الصادرة',
      href: '/receipts',
      color: 'bg-indigo-500',
    },
    {
      title: 'سجل الدعوات',
      icon: '🎟️',
      description: 'متابعة جميع دعوات الأعضاء المستخدمة',
      href: '/invitations',
      color: 'bg-pink-500',
    },
  ]

  // لو لسه بيتحقق من الـ Authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⏳</div>
          <p className="text-xl text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">مرحباً {user?.name} 👋</h1>
          <p className="text-gray-600">نظام شامل وسريع لإدارة جميع عمليات الصالة الرياضية</p>
        </div>
        
        {user?.role === 'ADMIN' && (
          <Link
            href="/admin/users"
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-bold flex items-center gap-2"
          >
            <span>👑</span>
            <span>إدارة المستخدمين</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">إجمالي الأعضاء</p>
              <p className="text-3xl font-bold">{stats.members}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>
        

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">جلسات PT النشطة</p>
              <p className="text-3xl font-bold">{stats.activePT}</p>
            </div>
            <div className="text-4xl">💪</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">إيرادات اليوم</p>
              <p className="text-3xl font-bold">{stats.todayRevenue.toFixed(0)}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">إجمالي الإيصالات</p>
              <p className="text-3xl font-bold">{stats.totalReceipts}</p>
            </div>
            <div className="text-4xl">🧾</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition transform hover:scale-105"
          >
            <div className={`${module.color} w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4`}>
              {module.icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{module.title}</h3>
            <p className="text-gray-600">{module.description}</p>
          </Link>
        ))}
      </div>

<button
  onClick={handleLogout}
  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 mt-20"
>
  🚪 تسجيل الخروج
</button>
    </div>
    
  )
}