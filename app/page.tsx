// app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  const [stats, setStats] = useState({
    members: 0,
    activePT: 0,
    todayRevenue: 0,
    totalReceipts: 0,
    currentlyInside: 0,
    todayCheckIns: 0,
  })

  const [revenueChartData, setRevenueChartData] = useState<any[]>([])
  const [attendanceChartData, setAttendanceChartData] = useState<any[]>([])
  const [receiptTypesData, setReceiptTypesData] = useState<any[]>([])

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
      const receiptsRes = await fetch('/api/receipts')
      const receipts = await receiptsRes.json()

      // 🆕 جلب إحصائيات الحضور
      const currentRes = await fetch('/api/member-checkin/current')
      const currentData = await currentRes.json()

      const statsRes = await fetch('/api/member-checkin/stats')
      const statsData = await statsRes.json()

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
        currentlyInside: currentData.count || 0,
        todayCheckIns: statsData.stats?.totalCheckIns || 0,
      })

      // 📊 تجهيز بيانات جراف الإيرادات (آخر 7 أيام)
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
        const dateKey = date.toDateString()

        const dayReceipts = receipts.filter((r: any) => {
          return new Date(r.createdAt).toDateString() === dateKey
        })
        const dayRevenue = dayReceipts.reduce((sum: number, r: any) => sum + r.amount, 0)

        last7Days.push({
          date: dateStr,
          إيرادات: dayRevenue
        })
      }
      setRevenueChartData(last7Days)

      // 📊 تجهيز بيانات جراف الحضور (آخر 7 أيام)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 6)
      const endDate = new Date()

      const historyRes = await fetch(`/api/member-checkin/history?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`)
      const historyData = await historyRes.json()

      if (historyData.stats?.dailyStats) {
        const formattedData = historyData.stats.dailyStats.map((item: any) => ({
          date: new Date(item.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
          حضور: item.count
        }))
        setAttendanceChartData(formattedData)
      }

      // 📊 تجهيز بيانات أنواع الإيصالات
      const typeGroups: any = {}
      receipts.forEach((r: any) => {
        const type = r.type || 'أخرى'
        if (!typeGroups[type]) {
          typeGroups[type] = 0
        }
        typeGroups[type] += r.amount
      })

      const pieData = Object.entries(typeGroups).map(([name, value]) => ({
        name,
        value: value as number
      }))
      setReceiptTypesData(pieData)

    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleLogout = async () => {
    if (!confirm('هل تريد تسجيل الخروج؟')) return

    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

        {/* 🆕 إحصائيات الحضور */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg shadow-md border-2 border-green-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-sm font-semibold">موجودين الآن</p>
              <p className="text-3xl font-bold text-green-800">{stats.currentlyInside}</p>
            </div>
            <div className="text-4xl">🏋️</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg shadow-md border-2 border-blue-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-semibold">حضور اليوم</p>
              <p className="text-3xl font-bold text-blue-800">{stats.todayCheckIns}</p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>
      </div>

      {/* 📊 الجرافات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* جراف الإيرادات */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">💰 الإيرادات - آخر 7 أيام</h2>
          </div>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="إيرادات"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              جاري تحميل البيانات...
            </div>
          )}
        </div>

        {/* جراف الحضور */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">🏋️ حضور الأعضاء - آخر 7 أيام</h2>
          </div>
          {attendanceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar
                  dataKey="حضور"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              جاري تحميل البيانات...
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 mt-4"
      >
        🚪 تسجيل الخروج
      </button>
    </div>
    
  )
}