'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Staff {
  id: string
  staffCode: number
  name: string
  position?: string
}

interface Attendance {
  id: string
  staffId: string
  staff: Staff
  checkIn: string
  checkOut: string | null
  duration: number | null
  createdAt: string
}

export default function AttendanceReportPage() {
  const router = useRouter()
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [dateRange, setDateRange] = useState<'today' | 'custom'>('today')

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      let url = '/api/attendance?'
      
      if (dateRange === 'today') {
        url += 'today=true'
      } else if (selectedDate) {
        url += `date=${selectedDate}`
      }
      
      if (selectedStaff) {
        url += `&staffId=${selectedStaff}`
      }

      const response = await fetch(url)
      const data = await response.json()
      setAttendance(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff')
      const data = await response.json()
      setStaff(data.filter((s: any) => s.isActive))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    fetchAttendance()
  }, [selectedDate, selectedStaff, dateRange])

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    const start = new Date(checkIn)
    const end = checkOut ? new Date(checkOut) : new Date()
    const diffMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return { hours, minutes, total: diffMinutes }
  }

  const totalHoursWorked = attendance.reduce((sum, att) => {
    if (att.duration) {
      return sum + att.duration
    } else if (att.checkIn) {
      const duration = calculateDuration(att.checkIn, att.checkOut)
      return sum + duration.total
    }
    return sum
  }, 0)

  const averageHours = attendance.length > 0 ? totalHoursWorked / attendance.length : 0

  const deleteAttendance = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return

    try {
      await fetch(`/api/attendance?id=${id}`, { method: 'DELETE' })
      fetchAttendance()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // إحصائيات حسب الموظف
  const staffStats = attendance.reduce((acc, att) => {
    const staffId = att.staffId
    if (!acc[staffId]) {
      acc[staffId] = {
        staffCode: att.staff.staffCode,
        name: att.staff.name,
        position: att.staff.position,
        totalMinutes: 0,
        sessions: 0,
      }
    }
    
    const duration = att.duration || calculateDuration(att.checkIn, att.checkOut).total
    acc[staffId].totalMinutes += duration
    acc[staffId].sessions += 1
    
    return acc
  }, {} as Record<string, { staffCode: number; name: string; position?: string; totalMinutes: number; sessions: number }>)

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">📊 تقارير الحضور والانصراف</h1>
          <p className="text-gray-600">عرض وتحليل سجلات حضور الموظفين</p>
        </div>
        <button
          onClick={() => router.push('/staff')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          ← العودة للموظفين
        </button>
      </div>

      {/* فلاتر البحث */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-blue-100">
        <h3 className="text-xl font-bold mb-4">🔍 فلاتر البحث</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold mb-2">الفترة الزمنية</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 transition"
            >
              <option value="today">اليوم</option>
              <option value="custom">تاريخ محدد</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div>
              <label className="block text-sm font-bold mb-2">التاريخ</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-2">الموظف</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 transition"
            >
              <option value="">الكل</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.staffCode} - {s.name} {s.position && `(${s.position})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* الإحصائيات العامة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
          <p className="text-blue-100 text-sm mb-1">إجمالي الحضور</p>
          <p className="text-4xl font-bold">{attendance.length}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
          <p className="text-green-100 text-sm mb-1">موجودين الآن</p>
          <p className="text-4xl font-bold">
            {attendance.filter((a) => !a.checkOut).length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <p className="text-purple-100 text-sm mb-1">إجمالي الساعات</p>
          <p className="text-3xl font-bold">
            {Math.floor(totalHoursWorked / 60)}س {totalHoursWorked % 60}د
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow-lg">
          <p className="text-orange-100 text-sm mb-1">متوسط الساعات</p>
          <p className="text-3xl font-bold">
            {Math.floor(averageHours / 60)}س {Math.floor(averageHours % 60)}د
          </p>
        </div>
      </div>

      {/* إحصائيات حسب الموظف */}
      {Object.keys(staffStats).length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">📈 إحصائيات الموظفين</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(staffStats)
              .sort(([, a], [, b]) => b.totalMinutes - a.totalMinutes)
              .map(([staffId, stats]) => (
                <div
                  key={staffId}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border-2 border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-lg">{stats.name}</h4>
                    <span className="text-sm bg-blue-500 text-white px-3 py-1 rounded-lg font-bold">
                      #{stats.staffCode}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">عدد الحضور:</span>
                      <span className="font-bold">{stats.sessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">إجمالي الساعات:</span>
                      <span className="font-bold text-green-600">
                        {Math.floor(stats.totalMinutes / 60)}س {stats.totalMinutes % 60}د
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">متوسط اليوم:</span>
                      <span className="font-bold">
                        {Math.floor(stats.totalMinutes / stats.sessions / 60)}س{' '}
                        {Math.floor((stats.totalMinutes / stats.sessions) % 60)}د
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* جدول السجلات */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">⏳</div>
              <p className="text-xl text-gray-600">جاري التحميل...</p>
            </div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-xl text-gray-600">لا توجد سجلات حضور</p>
              <p className="text-sm text-gray-500 mt-2">جرب تغيير الفلاتر</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="px-4 py-3 text-right">الرقم</th>
                  <th className="px-4 py-3 text-right">الاسم</th>
                  <th className="px-4 py-3 text-right">الوظيفة</th>
                  <th className="px-4 py-3 text-right">وقت الحضور</th>
                  <th className="px-4 py-3 text-right">وقت الانصراف</th>
                  <th className="px-4 py-3 text-right">المدة</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((att) => {
                  const duration = calculateDuration(att.checkIn, att.checkOut)
                  return (
                    <tr
                      key={att.id}
                      className={`border-t hover:bg-gray-50 transition ${
                        !att.checkOut ? 'bg-green-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-lg font-bold">
                          #{att.staff.staffCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold">{att.staff.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {att.staff.position || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-semibold">
                            {new Date(att.checkIn).toLocaleTimeString('ar-EG')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(att.checkIn).toLocaleDateString('ar-EG')}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {att.checkOut ? (
                          <div>
                            <div className="font-semibold">
                              {new Date(att.checkOut).toLocaleTimeString('ar-EG')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(att.checkOut).toLocaleDateString('ar-EG')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-orange-600 font-semibold">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-blue-600">
                          {duration.hours}س {duration.minutes}د
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            att.checkOut
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-green-500 text-white animate-pulse'
                          }`}
                        >
                          {att.checkOut ? '👋 انصرف' : '✅ موجود'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteAttendance(att.id)}
                          className="text-red-600 hover:text-red-800 font-semibold transition hover:underline"
                        >
                          🗑️ حذف
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}