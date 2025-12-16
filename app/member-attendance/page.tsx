'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function MemberAttendancePage() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7) // آخر 7 أيام
    return date.toISOString().split('T')[0]
  })

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [loading, setLoading] = useState(false)
  const [currentMembers, setCurrentMembers] = useState<any[]>([])
  const [dailyStats, setDailyStats] = useState<any[]>([])
  const [topMembers, setTopMembers] = useState<any[]>([])
  const [totalCheckIns, setTotalCheckIns] = useState(0)

  useEffect(() => {
    fetchAttendanceData()
  }, [])

  const fetchAttendanceData = async () => {
    setLoading(true)
    try {
      // جلب الأعضاء الموجودين حالياً
      const currentRes = await fetch('/api/member-checkin/current')
      const currentData = await currentRes.json()
      setCurrentMembers(currentData.members || [])

      // جلب إحصائيات الفترة المحددة
      const historyRes = await fetch(`/api/member-checkin/history?startDate=${startDate}&endDate=${endDate}`)
      const historyData = await historyRes.json()

      if (historyData.stats) {
        setDailyStats(historyData.stats.dailyStats || [])
        setTopMembers(historyData.stats.topMembers || [])
        setTotalCheckIns(historyData.stats.totalCheckIns || 0)
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilter = () => {
    fetchAttendanceData()
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">📊 تقارير حضور الأعضاء</h1>

      {/* Date Range Filter */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold mb-2">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <button
              onClick={handleApplyFilter}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading ? 'جاري التحميل...' : 'تطبيق الفلتر'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg shadow-md border-2 border-green-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-sm font-semibold">موجودين الآن</p>
              <p className="text-3xl font-bold text-green-800">{currentMembers.length}</p>
            </div>
            <div className="text-4xl">🏋️</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg shadow-md border-2 border-blue-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-semibold">إجمالي الحضور</p>
              <p className="text-3xl font-bold text-blue-800">{totalCheckIns}</p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-md border-2 border-purple-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-700 text-sm font-semibold">متوسط يومي</p>
              <p className="text-3xl font-bold text-purple-800">
                {dailyStats.length > 0 ? Math.round(totalCheckIns / dailyStats.length) : 0}
              </p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>
      </div>

      {/* Daily Attendance Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-bold mb-4">📈 الحضور اليومي</h2>
        {dailyStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="عدد الحضور" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-500 py-8">
            لا توجد بيانات للفترة المحددة
          </div>
        )}
      </div>

      {/* Top Members */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-bold mb-4">🏆 الأعضاء الأكثر التزاماً</h2>
        {topMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right">الترتيب</th>
                  <th className="px-4 py-3 text-right">رقم العضوية</th>
                  <th className="px-4 py-3 text-right">الاسم</th>
                  <th className="px-4 py-3 text-right">عدد الزيارات</th>
                </tr>
              </thead>
              <tbody>
                {topMembers.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${index + 1}`}
                    </td>
                    <td className="px-4 py-3 font-mono">{item.member?.memberNumber || '-'}</td>
                    <td className="px-4 py-3 font-semibold">{item.member?.name || 'غير معروف'}</td>
                    <td className="px-4 py-3 text-blue-600 font-bold">{item.visits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            لا توجد بيانات للفترة المحددة
          </div>
        )}
      </div>

      {/* Currently Inside */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">👥 الأعضاء الموجودين حالياً</h2>
        {currentMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right">رقم العضوية</th>
                  <th className="px-4 py-3 text-right">الاسم</th>
                  <th className="px-4 py-3 text-right">رقم الهاتف</th>
                  <th className="px-4 py-3 text-right">وقت الدخول</th>
                  <th className="px-4 py-3 text-right">الخروج المتوقع</th>
                </tr>
              </thead>
              <tbody>
                {currentMembers.map((checkIn) => (
                  <tr key={checkIn.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{checkIn.member?.memberNumber || '-'}</td>
                    <td className="px-4 py-3 font-semibold">{checkIn.member?.name}</td>
                    <td className="px-4 py-3 font-mono">{checkIn.member?.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(checkIn.checkInTime).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(checkIn.expectedCheckOutTime).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            لا يوجد أعضاء في الجيم حالياً
          </div>
        )}
      </div>
    </div>
  )
}
