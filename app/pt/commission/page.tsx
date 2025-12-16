'use client'

import { useState, useEffect } from 'react'

interface Staff {
  id: string
  name: string
  phone?: string
  position?: string
  salary?: number
  notes?: string
  isActive: boolean
  createdAt: string
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

interface CoachEarnings {
  coachName: string
  totalSessions: number
  completedSessions: number
  remainingSessions: number
  totalRevenue: number
  clients: number
}

interface CommissionResult {
  coachName: string
  monthlyIncome: number
  percentage: number
  commission: number
  gymShare: number
}

export default function CoachCommissionPage() {
  const [coaches, setCoaches] = useState<Staff[]>([])
  const [ptSessions, setPtSessions] = useState<PTSession[]>([])
  const [selectedCoach, setSelectedCoach] = useState<string>('')
  const [customIncome, setCustomIncome] = useState<string>('')
  const [useCustomIncome, setUseCustomIncome] = useState(false)
  const [result, setResult] = useState<CommissionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [coachEarnings, setCoachEarnings] = useState<CoachEarnings | null>(null)

  // تحديد الفترة الزمنية (أول يوم في الشهر الحالي إلى آخر يوم)
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const [dateFrom, setDateFrom] = useState(firstDay.toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(lastDay.toISOString().split('T')[0])

  useEffect(() => {
    fetchData()
  }, [])

  // اختيار الكوتش تلقائياً إذا كان واحد فقط (حالة الكوتش المسجل دخوله)
  useEffect(() => {
    if (coaches.length === 1 && !selectedCoach) {
      setSelectedCoach(coaches[0].name)
    }
  }, [coaches])

  const fetchData = async () => {
    try {
      // جلب الكوتشات
      const staffResponse = await fetch('/api/staff')
      const staffData: Staff[] = await staffResponse.json()
      const activeCoaches = staffData.filter(
        (staff) => staff.isActive && staff.position?.toLowerCase().includes('مدرب')
      )
      setCoaches(activeCoaches)

      // جلب جلسات PT
      const ptResponse = await fetch('/api/pt')
      const ptData: PTSession[] = await ptResponse.json()
      setPtSessions(ptData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // دالة حساب النسبة حسب الدخل الشهري
  const calculatePercentage = (income: number): number => {
    if (income < 5000) return 25
    if (income < 11000) return 30
    if (income < 15000) return 35
    if (income < 20000) return 40
    return 45
  }

  // دالة حساب أرباح الكوتش من PT
  const calculateCoachEarnings = (coachName: string, startDate: string, endDate: string): CoachEarnings => {
    // فلترة جلسات الكوتش
    const coachSessions = ptSessions.filter((session) => session.coachName === coachName)

    // فلترة حسب الفترة الزمنية
    const periodSessions = coachSessions.filter((session) => {
      if (!session.createdAt) return false
      const sessionDate = new Date(session.createdAt)
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // نهاية اليوم
      return sessionDate >= start && sessionDate <= end
    })

    // حساب الإحصائيات
    const totalSessions = periodSessions.reduce((sum, s) => sum + s.sessionsPurchased, 0)
    const remainingSessions = periodSessions.reduce((sum, s) => sum + s.sessionsRemaining, 0)
    const completedSessions = totalSessions - remainingSessions
    const totalRevenue = periodSessions.reduce(
      (sum, s) => sum + s.sessionsPurchased * s.pricePerSession,
      0
    )
    const clients = new Set(periodSessions.map((s) => s.clientName)).size

    return {
      coachName,
      totalSessions,
      completedSessions,
      remainingSessions,
      totalRevenue,
      clients,
    }
  }

  // دالة حساب التحصيل
  const handleCalculate = () => {
    if (!selectedCoach) {
      alert('⚠️ من فضلك اختر الكوتش')
      return
    }

    const coach = coaches.find((c) => c.name === selectedCoach)
    if (!coach) return

    // حساب أرباح الكوتش من PT
    const earnings = calculateCoachEarnings(selectedCoach, dateFrom, dateTo)
    setCoachEarnings(earnings)

    // تحديد الدخل (مخصص أو من PT)
    let income: number
    if (useCustomIncome && customIncome) {
      income = parseFloat(customIncome)
    } else {
      income = earnings.totalRevenue
    }

    const percentage = calculatePercentage(income)
    const commission = (income * percentage) / 100
    const gymShare = income - commission

    setResult({
      coachName: selectedCoach,
      monthlyIncome: income,
      percentage: percentage,
      commission: commission,
      gymShare: gymShare,
    })
  }

  // دالة مسح البيانات
  const handleReset = () => {
    setSelectedCoach('')
    setCustomIncome('')
    setUseCustomIncome(false)
    setResult(null)
    setCoachEarnings(null)
  }

  // دالة تحديد لون النسبة حسب المستوى
  const getPercentageBgColor = (percentage: number): string => {
    if (percentage <= 25) return 'from-orange-500 to-orange-600'
    if (percentage <= 30) return 'from-yellow-500 to-yellow-600'
    if (percentage <= 35) return 'from-blue-500 to-blue-600'
    if (percentage <= 40) return 'from-purple-500 to-purple-600'
    return 'from-green-500 to-green-600'
  }

  // إحصائيات عامة للكوتشات
  const allCoachesStats = coaches.map((coach) => {
    const earnings = calculateCoachEarnings(coach.name, dateFrom, dateTo)
    return {
      coachName: coach.name,
      earnings,
    }
  })

  return (
    <div className="container mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-5xl">💰</div>
          <div>
            <h1 className="text-4xl font-bold">حاسبة تحصيل الكوتشات</h1>
            <p className="text-gray-600 mt-1">
              احسب نسبة ومبلغ تحصيل الكوتش بناءً على دخل جلسات PT الفعلي
            </p>
          </div>
        </div>
      </div>

      {/* اختيار الفترة الزمنية */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <label className="block text-sm font-bold mb-3 text-gray-700">
          📅 اختر الفترة الزمنية لحساب التحصيل
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">من تاريخ</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* نموذج الإدخال */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span>📋</span>
            <span>بيانات الحساب</span>
          </h2>

          {loading ? (
            <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
          ) : coaches.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">😕</div>
              <p className="text-gray-600">لا يوجد كوتشات نشطين حالياً</p>
              <p className="text-sm text-gray-500 mt-2">
                قم بإضافة موظفين بوظيفة "مدرب" من صفحة الموظفين
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* اختيار الكوتش */}
              <div>
                <label className="block text-sm font-bold mb-3 text-gray-700">
                  👤 {coaches.length === 1 ? 'الكوتش' : 'اختر الكوتش'} <span className="text-red-600">*</span>
                </label>
                {coaches.length === 1 ? (
                  <div className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg text-lg font-bold text-blue-700">
                    {coaches[0].name} {coaches[0].phone && `(${coaches[0].phone})`}
                  </div>
                ) : (
                  <select
                    value={selectedCoach}
                    onChange={(e) => {
                      setSelectedCoach(e.target.value)
                      setResult(null)
                      setCoachEarnings(null)
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  >
                    <option value="">-- اختر كوتش --</option>
                    {coaches.map((coach) => (
                      <option key={coach.id} value={coach.name}>
                        {coach.name} {coach.phone && `(${coach.phone})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* خيار استخدام دخل مخصص */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomIncome}
                    onChange={(e) => setUseCustomIncome(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="text-sm font-bold text-gray-700">
                    استخدام دخل مخصص بدلاً من حساب PT التلقائي
                  </span>
                </label>
              </div>

              {/* إدخال الدخل المخصص */}
              {useCustomIncome && (
                <div>
                  <label className="block text-sm font-bold mb-3 text-gray-700">
                    💵 الدخل الشهري المخصص (جنيه مصري) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customIncome}
                    onChange={(e) => setCustomIncome(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    placeholder="مثال: 15000"
                  />
                </div>
              )}

              {/* جدول النسب */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-5">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <span>📊</span>
                  <span>جدول النسب</span>
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                    <span>أقل من 5,000 ج.م</span>
                    <span className="font-bold text-orange-600">25%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                    <span>5,000 - 10,999 ج.م</span>
                    <span className="font-bold text-yellow-600">30%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                    <span>11,000 - 14,999 ج.م</span>
                    <span className="font-bold text-blue-600">35%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                    <span>15,000 - 19,999 ج.م</span>
                    <span className="font-bold text-purple-600">40%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                    <span>20,000 ج.م أو أكثر</span>
                    <span className="font-bold text-green-600">45%</span>
                  </div>
                </div>
              </div>

              {/* أزرار التحكم */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCalculate}
                  disabled={!selectedCoach || (useCustomIncome && !customIncome)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-bold text-lg shadow-lg transform transition hover:scale-105 active:scale-95"
                >
                  ✅ احسب التحصيل
                </button>
                {result && (
                  <button
                    onClick={handleReset}
                    className="px-6 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 py-4 rounded-lg hover:from-gray-300 hover:to-gray-400 font-bold shadow-lg transform transition hover:scale-105 active:scale-95"
                  >
                    🔄 مسح
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* نتيجة الحساب */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span>📈</span>
            <span>نتيجة الحساب</span>
          </h2>

          {!result ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="text-8xl mb-6">🧮</div>
              <p className="text-gray-500 text-lg text-center">
                اختر كوتش واضغط على "احسب التحصيل"
                <br />
                لعرض النتيجة هنا
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* بطاقة الكوتش */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl">👤</div>
                  <div>
                    <p className="text-sm text-gray-600">الكوتش</p>
                    <p className="text-2xl font-bold text-indigo-900">{result.coachName}</p>
                  </div>
                </div>
              </div>

              {/* إحصائيات PT */}
              {coachEarnings && !useCustomIncome && (
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl p-5">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <span>📊</span>
                    <span>إحصائيات جلسات PT</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">إجمالي الجلسات</p>
                      <p className="text-2xl font-bold text-teal-600">
                        {coachEarnings.totalSessions}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">جلسات منتهية</p>
                      <p className="text-2xl font-bold text-green-600">
                        {coachEarnings.completedSessions}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">جلسات متبقية</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {coachEarnings.remainingSessions}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">عدد العملاء</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {coachEarnings.clients}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* الدخل الشهري */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl">💵</div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {useCustomIncome ? 'الدخل المخصص' : 'إجمالي دخل PT'}
                    </p>
                    <p className="text-3xl font-bold text-cyan-900">
                      {result.monthlyIncome.toLocaleString('ar-EG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      <span className="text-xl">ج.م</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* النسبة */}
              <div
                className={`bg-gradient-to-br ${getPercentageBgColor(
                  result.percentage
                )} text-white rounded-xl p-6 shadow-lg`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/90 text-sm mb-1">نسبة التحصيل</p>
                    <p className="text-5xl font-black">{result.percentage}%</p>
                  </div>
                  <div className="text-6xl opacity-30">📊</div>
                </div>
              </div>

              {/* المبلغ المستحق للكوتش */}
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-xl p-6 shadow-xl border-4 border-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-4xl">💰</div>
                  <div>
                    <p className="text-white/90 text-sm">المبلغ المستحق للكوتش</p>
                    <p className="text-4xl font-black">
                      {result.commission.toLocaleString('ar-EG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      <span className="text-2xl">ج.م</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t-2 border-white/30">
                  <p className="text-white/80 text-sm text-center">
                    ✨ هذا المبلغ هو {result.percentage}% من الدخل الشهري
                  </p>
                </div>
              </div>

              {/* معادلة الحساب */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-slate-300 rounded-xl p-5">
                <h3 className="font-bold text-center mb-3 text-gray-700">معادلة الحساب</h3>
                <div className="bg-white rounded-lg p-4 font-mono text-center">
                  <p className="text-lg">
                    {result.monthlyIncome.toLocaleString('ar-EG')} × {result.percentage}% ={' '}
                    <span className="font-bold text-green-600">
                      {result.commission.toLocaleString('ar-EG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ج.م
                    </span>
                  </p>
                </div>
              </div>

              {/* ملاحظة */}
              <div className="bg-amber-50 border-r-4 border-amber-500 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <p className="font-bold text-amber-800 mb-1">ملاحظة هامة</p>
                    <p className="text-sm text-amber-700">
                      هذا الحساب للعرض فقط ولا يؤثر على أي بيانات في النظام. للتنفيذ الفعلي،
                      يرجى الرجوع للإدارة المالية.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* إحصائيات إضافية */}
      {result && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">المبلغ المتبقي للجيم</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.gymShare.toLocaleString('ar-EG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  ج.م
                </p>
              </div>
              <div className="text-4xl">🏢</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">نسبة الجيم</p>
                <p className="text-2xl font-bold text-purple-600">{100 - result.percentage}%</p>
              </div>
              <div className="text-4xl">📉</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">حالة الدخل</p>
                <p className="text-lg font-bold text-green-600">
                  {result.monthlyIncome >= 20000
                    ? '🔥 ممتاز'
                    : result.monthlyIncome >= 15000
                    ? '✅ جيد جداً'
                    : result.monthlyIncome >= 10000
                    ? '👍 جيد'
                    : '💪 يحتاج تحسين'}
                </p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
          </div>
        </div>
      )}

      {/* جدول ملخص جميع الكوتشات */}
      {!loading && coaches.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span>📋</span>
            <span>
              ملخص أداء جميع الكوتشات - من {new Date(dateFrom).toLocaleDateString('ar-EG')} إلى{' '}
              {new Date(dateTo).toLocaleDateString('ar-EG')}
            </span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="px-4 py-3 text-right">الكوتش</th>
                  <th className="px-4 py-3 text-right">عدد العملاء</th>
                  <th className="px-4 py-3 text-right">إجمالي الجلسات</th>
                  <th className="px-4 py-3 text-right">جلسات منتهية</th>
                  <th className="px-4 py-3 text-right">إجمالي الدخل</th>
                  <th className="px-4 py-3 text-right">النسبة</th>
                  <th className="px-4 py-3 text-right">التحصيل المتوقع</th>
                </tr>
              </thead>
              <tbody>
                {allCoachesStats
                  .filter((stat) => stat.earnings.totalRevenue > 0)
                  .sort((a, b) => b.earnings.totalRevenue - a.earnings.totalRevenue)
                  .map((stat) => {
                    const percentage = calculatePercentage(stat.earnings.totalRevenue)
                    const commission = (stat.earnings.totalRevenue * percentage) / 100

                    return (
                      <tr key={stat.coachName} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold">{stat.coachName}</td>
                        <td className="px-4 py-3 text-center">{stat.earnings.clients}</td>
                        <td className="px-4 py-3 text-center">{stat.earnings.totalSessions}</td>
                        <td className="px-4 py-3 text-center text-green-600 font-bold">
                          {stat.earnings.completedSessions}
                        </td>
                        <td className="px-4 py-3 font-bold text-blue-600">
                          {stat.earnings.totalRevenue.toLocaleString('ar-EG', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}{' '}
                          ج.م
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-lg">{percentage}%</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-green-600">
                          {commission.toLocaleString('ar-EG', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}{' '}
                          ج.م
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
              <tfoot className="bg-gradient-to-r from-blue-50 to-purple-50 font-bold">
                <tr>
                  <td className="px-4 py-3">الإجمالي</td>
                  <td className="px-4 py-3 text-center">
                    {new Set(
                      allCoachesStats.flatMap((s) =>
                        ptSessions
                          .filter((pt) => pt.coachName === s.coachName)
                          .map((pt) => pt.clientName)
                      )
                    ).size}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {allCoachesStats.reduce((sum, s) => sum + s.earnings.totalSessions, 0)}
                  </td>
                  <td className="px-4 py-3 text-center text-green-600">
                    {allCoachesStats.reduce((sum, s) => sum + s.earnings.completedSessions, 0)}
                  </td>
                  <td className="px-4 py-3 text-blue-600">
                    {allCoachesStats
                      .reduce((sum, s) => sum + s.earnings.totalRevenue, 0)
                      .toLocaleString('ar-EG', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}{' '}
                    ج.م
                  </td>
                  <td className="px-4 py-3 text-center">-</td>
                  <td className="px-4 py-3 text-green-600">
                    {allCoachesStats
                      .reduce((sum, s) => {
                        const percentage = calculatePercentage(s.earnings.totalRevenue)
                        return sum + (s.earnings.totalRevenue * percentage) / 100
                      }, 0)
                      .toLocaleString('ar-EG', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}{' '}
                    ج.م
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {allCoachesStats.filter((stat) => stat.earnings.totalRevenue > 0).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-xl">لا توجد بيانات PT للشهر المحدد</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}