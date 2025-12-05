'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '../../hooks/usePermissions'
import PermissionDenied from '../../components/PermissionDenied'
import { formatDateYMD } from '../../lib/dateFormatter'
import { useConfirm } from '../../hooks/useConfirm'
import ConfirmDialog from '../../components/ConfirmDialog'

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
  qrCode?: string
  qrCodeImage?: string
}

export default function PTPage() {
  const router = useRouter()
  const { hasPermission, loading: permissionsLoading, user } = usePermissions()
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirm()

  const [sessions, setSessions] = useState<PTSession[]>([])
  const [coaches, setCoaches] = useState<Staff[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingSession, setEditingSession] = useState<PTSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [coachesLoading, setCoachesLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState<PTSession | null>(null)

  const [formData, setFormData] = useState({
    ptNumber: '',
    clientName: '',
    phone: '',
    sessionsPurchased: 8,
    coachName: '',
    pricePerSession: 0,
    totalPrice: 0,
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
      totalPrice: 0,
      startDate: formatDateYMD(new Date()),
      expiryDate: '',
      paymentMethod: 'cash',
      staffName: user?.name || '',
    })
    setEditingSession(null)
    setShowForm(false)
  }

  // دالة لتحديث السعر الإجمالي عند تغيير سعر الحصة أو عدد الحصص
  const handlePricePerSessionChange = (value: number) => {
    const totalPrice = value * formData.sessionsPurchased
    setFormData({ ...formData, pricePerSession: value, totalPrice })
  }

  // دالة لتحديث سعر الحصة عند تغيير السعر الإجمالي
  const handleTotalPriceChange = (value: number) => {
    const pricePerSession = formData.sessionsPurchased > 0 ? value / formData.sessionsPurchased : 0
    setFormData({ ...formData, totalPrice: value, pricePerSession })
  }

  // دالة لتحديث عدد الحصص وإعادة حساب الأسعار
  const handleSessionsChange = (value: number) => {
    const pricePerSession = value > 0 ? formData.totalPrice / value : 0
    setFormData({ ...formData, sessionsPurchased: value, pricePerSession })
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
    const totalPrice = session.sessionsPurchased * session.pricePerSession
    setFormData({
      ptNumber: session.ptNumber.toString(),
      clientName: session.clientName,
      phone: session.phone,
      sessionsPurchased: session.sessionsPurchased,
      coachName: session.coachName,
      pricePerSession: session.pricePerSession,
      totalPrice: totalPrice,
      startDate: session.startDate ? formatDateYMD(session.startDate) : '',
      expiryDate: session.expiryDate ? formatDateYMD(session.expiryDate) : '',
      paymentMethod: 'cash',
      staffName: user?.name || '',
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
    const confirmed = await confirm({
      title: '⚠️ حذف اشتراك PT',
      message: `هل أنت متأكد من حذف اشتراك PT رقم ${ptNumber}؟\nسيتم حذف جميع الجلسات المرتبطة به!\nلا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'نعم، احذف',
      cancelText: 'إلغاء',
      type: 'danger'
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/pt?ptNumber=${ptNumber}`, { method: 'DELETE' })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'فشل حذف الاشتراك')
      }

      setMessage('✅ تم حذف اشتراك PT بنجاح')
      fetchSessions()
    } catch (error: any) {
      console.error('Error:', error)
      setMessage(`❌ ${error.message || 'حدث خطأ في الحذف'}`)
    }
    setTimeout(() => setMessage(''), 3000)
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

  const isCoach = user?.role === 'COACH'

  return (
    <div className="container mx-auto p-4 sm:p-6" dir="rtl">
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">💪 إدارة جلسات PT</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {isCoach ? 'عرض جلسات التدريب الشخصي' : 'إضافة وتعديل وحذف جلسات التدريب الشخصي'}
          </p>
        </div>
        {!isCoach && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/pt/commission')}
              className="flex-1 min-w-[140px] sm:flex-none bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 sm:px-6 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <span>💰</span>
              <span>حاسبة التحصيل</span>
            </button>
            <button
              onClick={() => router.push('/pt/sessions/history')}
              className="flex-1 min-w-[140px] sm:flex-none bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-3 sm:px-6 py-2 rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <span>📊</span>
              <span>سجل الحضور</span>
            </button>
            <button
              onClick={() => {
                resetForm()
                setShowForm(!showForm)
              }}
              className="w-full sm:w-auto bg-blue-600 text-white px-3 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {showForm ? 'إخفاء النموذج' : '➕ إضافة جلسة PT جديدة'}
            </button>
          </div>
        )}
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

      {!isCoach && showForm && (
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
                  onChange={(e) => handleSessionsChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="8"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  السعر الإجمالي (ج.م) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.totalPrice}
                  onChange={(e) => handleTotalPriceChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg bg-yellow-50 border-yellow-300"
                  placeholder="1600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  سعر الجلسة (تلقائي)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pricePerSession}
                  onChange={(e) => handlePricePerSessionChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  placeholder="200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 يتم حسابه تلقائياً من الإجمالي ÷ عدد الجلسات
                </p>
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

            {formData.sessionsPurchased > 0 && formData.totalPrice > 0 && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">💰 الإجمالي النهائي:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formData.totalPrice.toFixed(2)} ج.م
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
                  <span>سعر الجلسة الواحدة:</span>
                  <span className="font-semibold">
                    {formData.pricePerSession.toFixed(2)} ج.م
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
        <>
          {/* Desktop Table - Hidden on mobile/tablet */}
          <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
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
                    {!isCoach && <th className="px-4 py-3 text-right">إجراءات</th>}
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
                        {!isCoach && (
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
                              {session.qrCode && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedSession(session)
                                      setShowQRModal(true)
                                    }}
                                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 flex items-center gap-1"
                                    title="عرض Barcode"
                                  >
                                    🔢 Barcode
                                  </button>
                                  <button
                                    onClick={() => {
                                      const checkInUrl = `${window.location.origin}/pt/check-in`
                                      const text = `مرحباً ${session.clientName}! 👋\n\nBarcode الخاص باشتراك PT:\n${session.qrCode}\n\n✅ لتسجيل حضورك:\n${checkInUrl}\n\nالصق الكود لتسجيل الحضور تلقائياً!\n\nالحصص المتبقية: ${session.sessionsRemaining} من ${session.sessionsPurchased}\nالكوتش: ${session.coachName}\n\nبالتوفيق! 🏋️`
                                      const phone = session.phone.startsWith('0') ? '2' + session.phone : session.phone
                                      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
                                      window.open(whatsappUrl, '_blank')
                                    }}
                                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 flex items-center gap-1"
                                    title="إرسال عبر WhatsApp"
                                  >
                                    💬 واتس
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDelete(session.ptNumber)}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1"
                                title="حذف الاشتراك"
                              >
                                🗑️ حذف
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile/Tablet Cards - Hidden on desktop */}
          <div className="lg:hidden space-y-3">
            {filteredSessions.map((session) => {
              const isExpiringSoon =
                session.expiryDate &&
                new Date(session.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              const isExpired = session.expiryDate && new Date(session.expiryDate) < new Date()

              return (
                <div
                  key={session.ptNumber}
                  className={`bg-white rounded-xl shadow-md overflow-hidden border-2 hover:shadow-lg transition ${
                    isExpired ? 'border-red-300 bg-red-50' : isExpiringSoon ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                  }`}
                >
                  {/* Header */}
                  <div className={`p-2.5 ${isExpired ? 'bg-red-600' : isExpiringSoon ? 'bg-orange-600' : 'bg-gradient-to-r from-purple-600 to-purple-700'}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold text-white">#{session.ptNumber}</div>
                      <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        session.sessionsRemaining === 0 ? 'bg-red-500' : session.sessionsRemaining <= 3 ? 'bg-orange-500' : 'bg-green-500'
                      } text-white`}>
                        {session.sessionsRemaining} / {session.sessionsPurchased} حصة
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 space-y-2.5">
                    {/* Client Info */}
                    <div className="pb-2.5 border-b-2 border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">👤</span>
                        <span className="text-xs text-gray-500 font-semibold">العميل</span>
                      </div>
                      <div className="text-base font-bold text-gray-800">{session.clientName}</div>
                      <div className="text-sm font-mono text-gray-600 mt-1">{session.phone}</div>
                    </div>

                    {/* Coach */}
                    <div className="pb-2.5 border-b-2 border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">🏋️</span>
                        <span className="text-xs text-gray-500 font-semibold">الكوتش</span>
                      </div>
                      <div className="text-base font-bold text-gray-800">{session.coachName}</div>
                    </div>

                    {/* Price Info */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm">💰</span>
                          <span className="text-xs text-blue-700 font-semibold">السعر/حصة</span>
                        </div>
                        <div className="text-base font-bold text-blue-600">{session.pricePerSession} ج.م</div>
                      </div>
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm">💵</span>
                          <span className="text-xs text-green-700 font-semibold">الإجمالي</span>
                        </div>
                        <div className="text-base font-bold text-green-600">
                          {(session.sessionsPurchased * session.pricePerSession).toFixed(0)} ج.م
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    {(session.startDate || session.expiryDate) && (
                      <div className={`border-2 rounded-lg p-2.5 ${
                        isExpired ? 'bg-red-50 border-red-300' : isExpiringSoon ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">📅</span>
                          <span className={`text-xs font-semibold ${
                            isExpired ? 'text-red-700' : isExpiringSoon ? 'text-orange-700' : 'text-gray-700'
                          }`}>الفترة</span>
                        </div>
                        <div className="space-y-1 text-xs font-mono">
                          {session.startDate && (
                            <div className="text-gray-700">من: {formatDateYMD(session.startDate)}</div>
                          )}
                          {session.expiryDate && (
                            <div className={isExpired ? 'text-red-600 font-bold' : 'text-gray-700'}>
                              إلى: {formatDateYMD(session.expiryDate)}
                            </div>
                          )}
                          {isExpired && (
                            <div className="text-red-600 font-bold">❌ منتهية</div>
                          )}
                          {!isExpired && isExpiringSoon && (
                            <div className="text-orange-600 font-bold">⚠️ قريبة الانتهاء</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {!isCoach && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleRegisterSession(session)}
                          disabled={session.sessionsRemaining === 0}
                          className="bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-1"
                        >
                          <span>✅</span>
                          <span>حضور</span>
                        </button>
                        <button
                          onClick={() => handleRenew(session)}
                          className="bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700 font-bold flex items-center justify-center gap-1"
                        >
                          <span>🔄</span>
                          <span>تجديد</span>
                        </button>
                        {session.qrCode && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedSession(session)
                                setShowQRModal(true)
                              }}
                              className="bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600 font-bold flex items-center justify-center gap-1"
                            >
                              <span>🔢</span>
                              <span>Barcode</span>
                            </button>
                            <button
                              onClick={() => {
                                const checkInUrl = `${window.location.origin}/pt/check-in`
                                const text = `مرحباً ${session.clientName}! 👋\n\nBarcode الخاص باشتراك PT:\n${session.qrCode}\n\n✅ لتسجيل حضورك:\n${checkInUrl}\n\nالصق الكود لتسجيل الحضور تلقائياً!\n\nالحصص المتبقية: ${session.sessionsRemaining} من ${session.sessionsPurchased}\nالكوتش: ${session.coachName}\n\nبالتوفيق! 🏋️`
                                const phone = session.phone.startsWith('0') ? '2' + session.phone : session.phone
                                const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
                                window.open(whatsappUrl, '_blank')
                              }}
                              className="bg-green-500 text-white py-2 rounded-lg text-sm hover:bg-green-600 font-bold flex items-center justify-center gap-1"
                            >
                              <span>💬</span>
                              <span>واتس</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(session.ptNumber)}
                          className="bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700 font-bold flex items-center justify-center gap-1 col-span-2"
                        >
                          <span>🗑️</span>
                          <span>حذف الاشتراك</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredSessions.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-xl">{searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد جلسات PT حالياً'}</p>
            </div>
          )}
        </>
      )}

      {/* Barcode Modal */}
      {showQRModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">📱 Barcode - {selectedSession.clientName}</h2>
              <button
                onClick={() => {
                  setShowQRModal(false)
                  setSelectedSession(null)
                }}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* معلومات الاشتراك */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">رقم PT:</span>
                    <span className="font-bold mr-2">#{selectedSession.ptNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">الكوتش:</span>
                    <span className="font-bold mr-2">{selectedSession.coachName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">الحصص المتبقية:</span>
                    <span className="font-bold mr-2 text-green-600">
                      {selectedSession.sessionsRemaining} / {selectedSession.sessionsPurchased}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">الهاتف:</span>
                    <span className="font-bold mr-2">{selectedSession.phone}</span>
                  </div>
                </div>
              </div>

              {/* Barcode Image */}
              {selectedSession.qrCodeImage ? (
                <div className="flex flex-col items-center bg-white border-2 border-gray-200 rounded-lg p-6">
                  <img
                    src={selectedSession.qrCodeImage}
                    alt="Barcode"
                    className="w-full max-w-md h-auto"
                  />
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    امسح هذا الكود لتسجيل الحضور
                  </p>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-6 text-center">
                  <p className="text-gray-500">⚠️ لا توجد صورة Barcode</p>
                </div>
              )}

              {/* Barcode Text */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم PT (الكود):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedSession.qrCode}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border-2 border-gray-300 rounded-lg font-mono text-sm"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedSession.qrCode || '')
                      setMessage('✅ تم نسخ الكود!')
                      setTimeout(() => setMessage(''), 2000)
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium"
                  >
                    📋 نسخ
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                {/* زر تحميل Barcode */}
                <button
                  onClick={() => {
                    if (!selectedSession.qrCodeImage) return

                    // تحويل base64 إلى blob
                    const link = document.createElement('a')
                    link.href = selectedSession.qrCodeImage
                    link.download = `PT_${selectedSession.ptNumber}_${selectedSession.clientName}_QR.png`
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)

                    setMessage('✅ تم تحميل Barcode!')
                    setTimeout(() => setMessage(''), 2000)
                  }}
                  className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center gap-2"
                >
                  <span>📥</span>
                  <span>تحميل QR</span>
                </button>

                {/* زر مشاركة Barcode (للموبايل) */}
                <button
                  onClick={async () => {
                    if (!selectedSession.qrCodeImage) return

                    try {
                      // تحويل base64 إلى blob
                      const response = await fetch(selectedSession.qrCodeImage)
                      const blob = await response.blob()
                      const file = new File([blob], `PT_QR_${selectedSession.clientName}.png`, { type: 'image/png' })

                      // استخدام Share API
                      if (navigator.share && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                          title: `Barcode - ${selectedSession.clientName}`,
                          text: `Barcode لـ ${selectedSession.clientName}\nالحصص المتبقية: ${selectedSession.sessionsRemaining}/${selectedSession.sessionsPurchased}\nالكوتش: ${selectedSession.coachName}`,
                          files: [file]
                        })
                        setMessage('✅ تم المشاركة!')
                      } else {
                        // Fallback: تحميل الصورة
                        const link = document.createElement('a')
                        link.href = selectedSession.qrCodeImage
                        link.download = `PT_${selectedSession.ptNumber}_QR.png`
                        link.click()
                        setMessage('✅ تم تحميل Barcode (المشاركة غير مدعومة)')
                      }
                      setTimeout(() => setMessage(''), 2000)
                    } catch (error) {
                      console.error('Share error:', error)
                      setMessage('⚠️ فشلت المشاركة - حاول التحميل')
                      setTimeout(() => setMessage(''), 3000)
                    }
                  }}
                  className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold flex items-center justify-center gap-2"
                >
                  <span>📤</span>
                  <span>مشاركة QR</span>
                </button>

                {/* زر إرسال رابط واتساب */}
                <button
                  onClick={() => {
                    const checkInUrl = `${window.location.origin}/pt/check-in`
                    const text = `مرحباً ${selectedSession.clientName}! 👋\n\n✅ لتسجيل حضور PT:\n${checkInUrl}\n\nالحصص المتبقية: ${selectedSession.sessionsRemaining} من ${selectedSession.sessionsPurchased}\nالكوتش: ${selectedSession.coachName}\n\nبالتوفيق! 🏋️`
                    const phone = selectedSession.phone.startsWith('0') ? '2' + selectedSession.phone : selectedSession.phone
                    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
                    window.open(whatsappUrl, '_blank')
                  }}
                  className="col-span-2 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-bold flex items-center justify-center gap-2"
                >
                  <span>💬</span>
                  <span>إرسال رابط واتساب</span>
                </button>
              </div>

              <div className="bg-blue-50 border-r-4 border-blue-500 p-3 rounded">
                <p className="text-xs text-blue-800">
                  <strong>💡 ملاحظة:</strong> Barcode صالح لجميع حصص هذا الاشتراك. يُستخدم لتسجيل الحضور عند الكوتش.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        type={options.type}
      />
    </div>
  )
}