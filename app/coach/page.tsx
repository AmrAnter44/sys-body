'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const DAYS_OF_WEEK = [
  { key: 'Monday', label: 'الإثنين', order: 1 },
  { key: 'Tuesday', label: 'الثلاثاء', order: 2 },
  { key: 'Wednesday', label: 'الأربعاء', order: 3 },
  { key: 'Thursday', label: 'الخميس', order: 4 },
  { key: 'Friday', label: 'الجمعة', order: 5 },
  { key: 'Saturday', label: 'السبت', order: 6 },
  { key: 'Sunday', label: 'الأحد', order: 7 },
]

export default function CoachDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [completedRequests, setCompletedRequests] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')
  const [rotations, setRotations] = useState<any[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')

      if (!response.ok) {
        console.error('Authentication failed, redirecting to login')
        router.push('/login')
        return
      }

      const data = await response.json()
      console.log('User data:', data.user)
      setUser(data.user)

      // Check if user is COACH
      if (data.user.role !== 'COACH') {
        console.warn('User is not COACH, redirecting to home')
        alert('هذه الصفحة للمدربين فقط')
        router.push('/')
        return
      }
    } catch (error) {
      console.error('Error checking authentication:', error)
      router.push('/login')
    }
  }

  useEffect(() => {
    if (user?.staffId) {
      fetchRequests()
    }
  }, [user])

  const fetchRequests = async () => {
    if (!user?.staffId) return

    try {
      setLoading(true)

      // Fetch pending requests
      const pendingRes = await fetch(`/api/fitness-test-requests?coachId=${user.staffId}&status=pending`)
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json()
        setPendingRequests(pendingData)
      }

      // Fetch completed requests
      const completedRes = await fetch(`/api/fitness-test-requests?coachId=${user.staffId}&status=completed`)
      if (completedRes.ok) {
        const completedData = await completedRes.json()
        setCompletedRequests(completedData)
      }

      // Fetch rotations
      const rotationsRes = await fetch('/api/rotations')
      if (rotationsRes.ok) {
        const rotationsData = await rotationsRes.json()
        setRotations(rotationsData)
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentRequests = activeTab === 'pending' ? pendingRequests : completedRequests

  const filteredRequests = currentRequests.filter((req) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      req.member.name.toLowerCase().includes(searchLower) ||
      req.member.phone?.toLowerCase().includes(searchLower) ||
      req.member.memberNumber?.toString().includes(searchLower)
    )
  })

  const handleFillTest = (requestId: string, memberId: string, coachId: string) => {
    router.push(`/fitness-tests/new?requestId=${requestId}&memberId=${memberId}&coachId=${coachId}`)
  }

  const calculateDuration = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    return Math.round((endMinutes - startMinutes) / 60 * 10) / 10
  }

  const groupedRotations = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day.key] = rotations.filter((r) => r.dayOfWeek === day.key)
    return acc
  }, {} as Record<string, any[]>)

  const calculateTotalWeeklyHours = (): number => {
    const total = rotations.reduce((sum, rotation) => {
      return sum + calculateDuration(rotation.startTime, rotation.endTime)
    }, 0)
    return Math.round(total * 10) / 10
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">👋 مرحباً {user?.name}</h1>
              <p className="text-gray-600 mt-2">لوحة تحكم المدرب - اختبارات اللياقة</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold"
            >
              ← الرئيسية
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 ابحث عن عضو (الاسم، الهاتف، رقم العضوية)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl text-lg focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-3 rounded-lg font-bold text-lg ${
                activeTab === 'pending'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ⏳ طلبات معلقة ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-3 rounded-lg font-bold text-lg ${
                activeTab === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ✅ مكتمل ({completedRequests.length})
            </button>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">
            {activeTab === 'pending' ? '📋 طلبات معلقة' : '✅ طلبات مكتملة'} ({filteredRequests.length})
          </h2>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">
                {activeTab === 'pending' ? 'لا توجد طلبات معلقة' : 'لا توجد طلبات مكتملة'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="border-2 border-gray-200 rounded-xl p-4 hover:border-teal-500 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{request.member.name}</h3>
                      <p className="text-gray-600 text-sm">رقم العضوية: #{request.member.memberNumber}</p>
                      {request.member.phone && (
                        <p className="text-gray-600 text-sm">📱 {request.member.phone}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-2">
                        📅 {new Date(request.requestedAt).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    {activeTab === 'pending' ? (
                      <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">
                        ⏳ معلق
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                        ✅ مكتمل
                      </span>
                    )}
                  </div>

                  <div className="border-t pt-3 mt-3">
                    {activeTab === 'pending' ? (
                      <button
                        onClick={() => handleFillTest(request.id, request.memberId, request.coachId)}
                        className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 font-bold"
                      >
                        📝 ملء الاختبار
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/members/${request.memberId}`)}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-bold"
                      >
                        👁️ عرض الاختبار
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">طلبات معلقة</p>
                <p className="text-3xl font-bold text-orange-600">{pendingRequests.length}</p>
              </div>
              <div className="text-5xl">⏳</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">طلبات مكتملة</p>
                <p className="text-3xl font-bold text-green-600">{completedRequests.length}</p>
              </div>
              <div className="text-5xl">✅</div>
            </div>
          </div>
        </div>

        {/* Weekly Rotations Schedule */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">📅 جدول المناوبات الأسبوعي</h2>
            {rotations.length > 0 && (
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-gray-600 text-xs">أيام العمل</p>
                  <p className="text-xl font-bold text-blue-600">
                    {Object.keys(groupedRotations).filter((day) => groupedRotations[day].length > 0).length}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-xs">ساعات أسبوعية</p>
                  <p className="text-xl font-bold text-purple-600">{calculateTotalWeeklyHours()}</p>
                </div>
              </div>
            )}
          </div>

          {rotations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-xl text-gray-500 font-bold">لا توجد مناوبات مسجلة</p>
              <p className="text-gray-400 mt-2">تواصل مع الإدارة لإضافة جدولك</p>
            </div>
          ) : (
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day.key}
                  className={`border-2 rounded-xl p-4 transition-all ${
                    groupedRotations[day.key]?.length > 0
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">{day.label}</h3>
                    {groupedRotations[day.key]?.length > 0 ? (
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        ✅ مجدول
                      </span>
                    ) : (
                      <span className="bg-gray-300 text-gray-600 px-3 py-1 rounded-full text-sm font-bold">
                        راحة
                      </span>
                    )}
                  </div>

                  {groupedRotations[day.key]?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {groupedRotations[day.key].map((rotation) => (
                        <div
                          key={rotation.id}
                          className="bg-white border-2 border-blue-400 p-3 rounded-lg flex items-center gap-3 shadow-sm"
                        >
                          <div className="text-2xl">🕒</div>
                          <div>
                            <p className="font-bold text-base text-blue-700">
                              {rotation.startTime} - {rotation.endTime}
                            </p>
                            <p className="text-xs text-gray-600">
                              {calculateDuration(rotation.startTime, rotation.endTime)} ساعات
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
