'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '../../hooks/usePermissions'
import PermissionDenied from '../../components/PermissionDenied'
import { formatDateYMD } from '../../lib/dateFormatter'

interface Staff {
  id: string
  name: string
  phone?: string
  position?: string
  isActive: boolean
}

interface PTSession {
  ptNumber: number
  clientName: string
  phone: string
  sessionsPurchased: number
  sessionsRemaining: number
  coachName: string
  pricePerSession: number
  startDate: string | null
  expiryDate: string | null
  createdAt: string
}

export default function PTPage() {
  const router = useRouter()
  const { hasPermission, loading: permissionsLoading, user } = usePermissions()

  const [sessions, setSessions] = useState<PTSession[]>([])
  const [coaches, setCoaches] = useState<Staff[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingSession, setEditingSession] = useState<PTSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [coachesLoading, setCoachesLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    ptNumber: '',
    clientName: '',
    phone: '',
    sessionsPurchased: 8,
    coachName: '',
    pricePerSession: 0,
    startDate: formatDateYMD(new Date()),
    expiryDate: '',
    paymentMethod: 'cash' as 'cash' | 'visa' | 'instapay',
    staffName: user?.name || '',
  })

  useEffect(() => {
    fetchSessions()
    fetchCoaches()
  }, [])

  useEffect(() => {
    if (user && !formData.staffName) {
      setFormData(prev => ({ ...prev, staffName: user.name }))
    }
  }, [user])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/pt')

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (response.status === 403) {
        return
      }

      const data = await response.json()
      setSessions(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCoaches = async () => {
    try {
      const response = await fetch('/api/staff')
      const data: Staff[] = await response.json()
      const activeCoaches = data.filter(
        (staff) => staff.isActive && staff.position?.toLowerCase().includes('مدرب')
      )
      setCoaches(activeCoaches)
    } catch (error) {
      console.error('Error fetching coaches:', error)
    } finally {
      setCoachesLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      ptNumber: '',
      clientName: '',
      phone: '',
      sessionsPurchased: 8,
      coachName: '',
      pricePerSession: 0,
      startDate: formatDateYMD(new Date()),
      expiryDate: '',
      paymentMethod: 'cash',
      staffName: user?.name || '',
    })
    setEditingSession(null)
    setShowForm(false)
  }

  const calculateExpiryFromMonths = (months: number) => {
    if (!formData.startDate) return
    
    const start = new Date(formData.startDate)
    const expiry = new Date(start)
    expiry.setMonth(expiry.getMonth() + months)
    
    setFormData(prev => ({ 
      ...prev, 
      expiryDate: formatDateYMD(expiry)
    }))
  }

  const handleEdit = (session: PTSession) => {
    setFormData({
      ptNumber: session.ptNumber.toString(),
      clientName: session.clientName,
      phone: session.phone,
      sessionsPurchased: session.sessionsPurchased,
      coachName: session.coachName,
      pricePerSession: session.pricePerSession,
      startDate: session.startDate ? formatDateYMD(session.startDate) : '',
      expiryDate: session.expiryDate ? formatDateYMD(session.expiryDate) : '',
      paymentMethod: 'cash',
    })
    setEditingSession(session)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const url = '/api/pt'
      const method = editingSession ? 'PUT' : 'POST'
      const body = editingSession
        ? { ptNumber: editingSession.ptNumber, ...formData, staffName: user?.name || '' }
        : { ...formData, staffName: user?.name || '' }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(editingSession ? '✅ تم تحديث جلسة PT بنجاح!' : '✅ تم إضافة جلسة PT بنجاح!')
        setTimeout(() => setMessage(''), 3000)
        fetchSessions()
        resetForm()
      } else {
        setMessage(`❌ ${result.error || 'فشلت العملية'}`)
      }
    } catch (error) {
      console.error(error)
      setMessage('❌ حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (ptNumber: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الجلسة؟')) return

    try {
      await fetch(`/api/pt?ptNumber=${ptNumber}`, { method: 'DELETE' })
      fetchSessions()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleRenew = (session: PTSession) => {
    router.push(`/pt/renew?ptNumber=${session.ptNumber}`)
  }

  const handleRegisterSession = (session: PTSession) => {
    router.push(`/pt/sessions/register?ptNumber=${session.ptNumber}`)
  }

  const filteredSessions = sessions.filter(
    (session) =>
      session.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.coachName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.ptNumber.toString().includes(searchTerm) ||
      session.phone.includes(searchTerm)
  )

  const totalSessions = sessions.reduce((sum, s) => sum + s.sessionsPurchased, 0)
  const remainingSessions = sessions.reduce((sum, s) => sum + s.sessionsRemaining, 0)
  const activePTs = sessions.filter((s) => s.sessionsRemaining > 0).length

  // ✅ التحقق من الصلاحيات
  if (permissionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    )
  }

  if (!hasPermission('canViewPT')) {
    return <PermissionDenied message="ليس لديك صلاحية عرض جلسات PT" />
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">💪 إدارة جلسات PT</h1>
          <p className="text-gray-600">إضافة وتعديل وحذف جلسات التدريب الشخصي</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/pt/commission')}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition transform hover:scale-105 shadow-lg flex items-center gap-2"
          >
            <span>💰</span>
            <span>حاسبة التحصيل</span>
          </button>
          <button
            onClick={() => router.push('/pt/sessions/history')}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-2 rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition transform hover:scale-105 shadow-lg flex items-center gap-2"
          >
            <span>📊</span>
            <span>سجل الحضور</span>
          </button>
          <button
            onClick={() => {
              resetForm()
              setShowForm(!showForm)
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition transform hover:scale-105"
          >
            {showForm ? 'إخفاء النموذج' : '➕ إضافة جلسة PT جديدة'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message}
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg mb-6 border-2 border-blue-100">
          <h2 className="text-xl font-semibold mb-4">
            {editingSession ? 'تعديل جلسة PT' : 'إضافة جلسة PT جديدة'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  رقم ID <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  required
                  disabled={!!editingSession}
                  value={formData.ptNumber}
                  onChange={(e) => setFormData({ ...formData, ptNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                  placeholder="مثال: 1001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  اسم العميل <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="اسم العميل"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="01xxxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  اسم الكوتش <span className="text-red-600">*</span>
                </label>
                {coachesLoading ? (
                  <div className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500">
                    جاري تحميل الكوتشات...
                  </div>
                ) : coaches.length === 0 ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      value={formData.coachName}
                      onChange={(e) => setFormData({ ...formData, coachName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="اسم الكوتش"
                    />
                    <p className="text-xs text-amber-600">
                      ⚠️ لا يوجد كوتشات نشطين. يمكنك الإدخال يدوياً
                    </p>
                  </div>
                ) : (
                  <select
                    required
                    value={formData.coachName}
                    onChange={(e) => setFormData({ ...formData, coachName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="">-- اختر الكوتش --</option>
                    {coaches.map((coach) => (
                      <option key={coach.id} value={coach.name}>
                        {coach.name} {coach.phone && `(${coach.phone})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  عدد الجلسات <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.sessionsPurchased}
                  onChange={(e) =>
                    setFormData({ ...formData, sessionsPurchased: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="8"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  سعر الجلسة (ج.م) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.pricePerSession}
                  onChange={(e) =>
                    setFormData({ ...formData, pricePerSession: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  تاريخ البداية <span className="text-xs text-gray-500">(yyyy-mm-dd)</span>
                </label>
                <input
                  type="text"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                  placeholder="2025-11-18"
                  pattern="\d{4}-\d{2}-\d{2}"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  تاريخ الانتهاء <span className="text-xs text-gray-500">(yyyy-mm-dd)</span>
                </label>
                <input
                  type="text"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                  placeholder="2025-12-18"
                  pattern="\d{4}-\d{2}-\d{2}"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">⚡ إضافة سريعة:</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 6, 9, 12].map(months => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => calculateExpiryFromMonths(months)}
                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-sm transition font-medium"
                  >
                    + {months} {months === 1 ? 'شهر' : 'أشهر'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">طريقة الدفع</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentMethod: e.target.value as 'cash' | 'visa' | 'instapay',
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="cash">💵 كاش</option>
                <option value="visa">💳 فيزا</option>
                <option value="instapay">📱 انستاباي</option>
              </select>
            </div>

            {formData.sessionsPurchased > 0 && formData.pricePerSession > 0 && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">الإجمالي:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {(formData.sessionsPurchased * formData.pricePerSession).toFixed(2)} ج.م
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'جاري الحفظ...' : editingSession ? 'تحديث' : 'إضافة جلسة PT'}
              </button>
              {editingSession && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">إجمالي الجلسات</p>
              <p className="text-4xl font-bold">{totalSessions}</p>
            </div>
            <div className="text-5xl opacity-20">💪</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">الجلسات المتبقية</p>
              <p className="text-4xl font-bold">{remainingSessions}</p>
            </div>
            <div className="text-5xl opacity-20">⏳</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">PT نشطة</p>
              <p className="text-4xl font-bold">{activePTs}</p>
            </div>
            <div className="text-5xl opacity-20">🔥</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <input
          type="text"
          placeholder="🔍 ابحث برقم PT أو اسم العميل أو الكوتش أو رقم الهاتف..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border-2 rounded-lg text-lg"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right">رقم PT</th>
                  <th className="px-4 py-3 text-right">العميل</th>
                  <th className="px-4 py-3 text-right">الكوتش</th>
                  <th className="px-4 py-3 text-right">الجلسات</th>
                  <th className="px-4 py-3 text-right">السعر</th>
                  <th className="px-4 py-3 text-right">الإجمالي</th>
                  <th className="px-4 py-3 text-right">التواريخ</th>
                  <th className="px-4 py-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => {
                  const isExpiringSoon =
                    session.expiryDate &&
                    new Date(session.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  const isExpired = session.expiryDate && new Date(session.expiryDate) < new Date()

                  return (
                    <tr
                      key={session.ptNumber}
                      className={`border-t hover:bg-gray-50 ${
                        isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-bold text-blue-600">#{session.ptNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold">{session.clientName}</p>
                          <p className="text-sm text-gray-600">{session.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{session.coachName}</td>
                      <td className="px-4 py-3">
                        <div className="text-center">
                          <p
                            className={`font-bold ${
                              session.sessionsRemaining === 0
                                ? 'text-red-600'
                                : session.sessionsRemaining <= 3
                                ? 'text-orange-600'
                                : 'text-green-600'
                            }`}
                          >
                            {session.sessionsRemaining}
                          </p>
                          <p className="text-xs text-gray-500">من {session.sessionsPurchased}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{session.pricePerSession} ج.م</td>
                      <td className="px-4 py-3 font-bold text-green-600">
                        {(session.sessionsPurchased * session.pricePerSession).toFixed(0)} ج.م
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono">
                          {session.startDate && (
                            <p>من: {formatDateYMD(session.startDate)}</p>
                          )}
                          {session.expiryDate && (
                            <p className={isExpired ? 'text-red-600 font-bold' : ''}>
                              إلى: {formatDateYMD(session.expiryDate)}
                            </p>
                          )}
                          {isExpired && <p className="text-red-600 font-bold">❌ منتهية</p>}
                          {!isExpired && isExpiringSoon && (
                            <p className="text-orange-600 font-bold">⚠️ قريبة الانتهاء</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleRegisterSession(session)}
                            disabled={session.sessionsRemaining === 0}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            ✅ حضور
                          </button>
                          <button
                            onClick={() => handleRenew(session)}
                            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                          >
                            🔄 تجديد
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredSessions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد جلسات PT حالياً'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}