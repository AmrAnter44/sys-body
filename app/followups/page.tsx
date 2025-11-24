'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePermissions } from '../../hooks/usePermissions'
import PermissionDenied from '../../components/PermissionDenied'

interface Visitor {
  id: string
  name: string
  phone: string
  source: string
  status: string
}

interface FollowUp {
  id: string
  notes: string
  contacted: boolean
  nextFollowUpDate?: string
  result?: string
  salesName?: string
  createdAt: string
  visitor: Visitor
}

interface Member {
  id: string
  phone: string
  name: string
  membershipStatus: string
}

export default function FollowUpsPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions()

  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedVisitorId, setSelectedVisitorId] = useState<string>('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [resultFilter, setResultFilter] = useState('all')
  const [contactedFilter, setContactedFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all') // all, overdue, today, upcoming

  const [formData, setFormData] = useState({
    visitorId: '',
    notes: '',
    contacted: false,
    nextFollowUpDate: '',
    result: '',
    salesName: '',
  })

  const fetchFollowUps = async () => {
    try {
      const response = await fetch('/api/visitors/followups')
      const data = await response.json()
      setFollowUps(data || [])
      console.log('📝 عدد المتابعات:', (data || []).length)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVisitors = async () => {
    try {
      const response = await fetch('/api/visitors')
      const data = await response.json()
      setVisitors(data.visitors || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members')
      const data = await response.json()
      // جلب الأعضاء النشطين فقط
      const activeMembers = (data || []).filter((m: Member) => m.membershipStatus === 'active')
      setMembers(activeMembers)
      console.log('📊 عدد الأعضاء النشطين:', activeMembers.length)
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  // تنظيف رقم التليفون لتوحيد الصيغة
  const normalizePhone = (phone: string) => {
    if (!phone) return ''

    // إزالة كل المسافات والرموز الخاصة
    let normalized = phone.replace(/[\s\-\(\)\+]/g, '').trim()

    // إزالة كود الدولة إذا موجود (2 أو 002 أو +2)
    if (normalized.startsWith('2')) {
      normalized = normalized.substring(1)
    }

    // إزالة الصفر البادئ
    if (normalized.startsWith('0')) {
      normalized = normalized.substring(1)
    }

    return normalized
  }

  // التحقق من أن الزائر أصبح عضو
  const isVisitorAMember = (phone: string) => {
    const normalizedVisitorPhone = normalizePhone(phone)

    // البحث عن العضو
    const matchedMember = members.find(member => {
      const normalizedMemberPhone = normalizePhone(member.phone)
      return normalizedMemberPhone === normalizedVisitorPhone
    })

    // للتأكد من المقارنة (فقط للـ debugging)
    if (matchedMember) {
      console.log('✅ تم العثور على عضو:', {
        originalPhone: phone,
        normalizedPhone: normalizedVisitorPhone,
        memberName: matchedMember.name,
        memberStatus: matchedMember.membershipStatus
      })
    }

    return !!matchedMember
  }

  useEffect(() => {
    fetchFollowUps()
    fetchVisitors()
    fetchMembers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/visitors/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setFormData({ visitorId: '', notes: '', contacted: false, nextFollowUpDate: '', result: '', salesName: '' })
        setMessage('✅ تم إضافة المتابعة بنجاح!')
        setTimeout(() => setMessage(''), 3000)
        fetchFollowUps()
        setShowForm(false)
        setSelectedVisitorId('')
      } else {
        const data = await response.json()
        setMessage(`❌ ${data.error || 'فشل إضافة المتابعة'}`)
      }
    } catch (error) {
      console.error(error)
      setMessage('❌ حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const openQuickFollowUp = (visitor: Visitor) => {
    setSelectedVisitorId(visitor.id)
    setFormData({
      visitorId: visitor.id,
      notes: '',
      contacted: false,
      nextFollowUpDate: '',
      result: '',
      salesName: '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // حساب أولوية المتابعة
  const getFollowUpPriority = (followUp: FollowUp) => {
    if (!followUp.nextFollowUpDate) return 'none'

    const nextDate = new Date(followUp.nextFollowUpDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    nextDate.setHours(0, 0, 0, 0)

    if (nextDate < today) return 'overdue' // متأخر
    if (nextDate.getTime() === today.getTime()) return 'today' // اليوم
    return 'upcoming' // قادم
  }

  // فلترة النتائج
  const filteredFollowUps = followUps
    .filter(fu => {
      const matchesSearch =
        fu.visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fu.visitor.phone.includes(searchTerm) ||
        fu.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fu.salesName && fu.salesName.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesResult = resultFilter === 'all' || fu.result === resultFilter
      const matchesContacted = contactedFilter === 'all' ||
        (contactedFilter === 'contacted' && fu.contacted) ||
        (contactedFilter === 'not-contacted' && !fu.contacted)

      const priority = getFollowUpPriority(fu)
      const matchesPriority = priorityFilter === 'all' || priority === priorityFilter

      return matchesSearch && matchesResult && matchesContacted && matchesPriority
    })
    .sort((a, b) => {
      // ترتيب: الأعضاء في الأسفل، غير الأعضاء في الأعلى
      const aIsMember = isVisitorAMember(a.visitor.phone)
      const bIsMember = isVisitorAMember(b.visitor.phone)

      if (aIsMember && !bIsMember) return 1  // a عضو، يروح للأسفل
      if (!aIsMember && bIsMember) return -1 // b عضو، يروح للأسفل
      return 0 // نفس الترتيب
    })

  const getResultBadge = (result?: string) => {
    const badges = {
      interested: 'bg-green-100 text-green-800',
      'not-interested': 'bg-red-100 text-red-800',
      postponed: 'bg-yellow-100 text-yellow-800',
      subscribed: 'bg-blue-100 text-blue-800',
    }
    const labels = {
      interested: 'مهتم',
      'not-interested': 'غير مهتم',
      postponed: 'مؤجل',
      subscribed: 'اشترك',
    }
    if (!result) return <span className="text-gray-400">-</span>
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[result as keyof typeof badges] || 'bg-gray-100 text-gray-800'}`}>
        {labels[result as keyof typeof labels] || result}
      </span>
    )
  }

  const getSourceLabel = (source: string) => {
    const labels = {
      'walk-in': 'زيارة مباشرة',
      'invitation': '🎁 دعوة (يوم استخدام)',
      'member-invitation': '👥 دعوة من عضو',
      'facebook': 'فيسبوك',
      'instagram': 'إنستجرام',
      'friend': 'صديق',
      'other': 'أخرى',
    }
    return labels[source as keyof typeof labels] || source
  }

  const getPriorityBadge = (followUp: FollowUp) => {
    const priority = getFollowUpPriority(followUp)

    if (priority === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
          🔥 متأخر
        </span>
      )
    }
    if (priority === 'today') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
          ⚡ اليوم
        </span>
      )
    }
    if (priority === 'upcoming') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          📅 قادم
        </span>
      )
    }
    return null
  }

  const getTodayFollowUps = () => {
    return followUps.filter(fu => getFollowUpPriority(fu) === 'today').length
  }

  const getOverdueFollowUps = () => {
    return followUps.filter(fu => getFollowUpPriority(fu) === 'overdue').length
  }

  const getContactedToday = () => {
    const today = new Date().toDateString()
    return followUps.filter(fu =>
      fu.contacted && new Date(fu.createdAt).toDateString() === today
    ).length
  }

  const getConvertedToMembers = () => {
    return followUps.filter(fu => isVisitorAMember(fu.visitor.phone)).length
  }

  // ✅ التحقق من الصلاحيات
  if (permissionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    )
  }

  if (!hasPermission('canViewFollowUps')) {
    return <PermissionDenied message="ليس لديك صلاحية عرض المتابعات" />
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span>📝</span>
              <span>إدارة المتابعات - Sales</span>
            </h1>
            <p className="text-gray-600 mt-2">تتبع ومتابعة الزوار والعملاء المحتملين</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm)
              setSelectedVisitorId('')
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-lg"
          >
            {showForm ? '❌ إغلاق' : '➕ متابعة جديدة'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5 shadow-lg">
            <p className="text-sm opacity-90 mb-1">إجمالي المتابعات</p>
            <p className="text-4xl font-bold">{followUps.length}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-5 shadow-lg">
            <p className="text-sm opacity-90 mb-1 flex items-center gap-1">
              🔥 متابعات متأخرة
            </p>
            <p className="text-4xl font-bold">{getOverdueFollowUps()}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-5 shadow-lg">
            <p className="text-sm opacity-90 mb-1 flex items-center gap-1">
              ⚡ متابعات اليوم
            </p>
            <p className="text-4xl font-bold">{getTodayFollowUps()}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-5 shadow-lg">
            <p className="text-sm opacity-90 mb-1">تم التواصل اليوم</p>
            <p className="text-4xl font-bold">{getContactedToday()}</p>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg font-medium ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Add Follow-Up Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-2 border-blue-500">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>📝</span>
            <span>إضافة متابعة جديدة</span>
            {selectedVisitorId && (
              <span className="text-sm text-blue-600">
                ({visitors.find(v => v.id === selectedVisitorId)?.name})
              </span>
            )}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">الزائر *</label>
                <select
                  required
                  value={formData.visitorId}
                  onChange={(e) => setFormData({ ...formData, visitorId: e.target.value })}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر زائر</option>
                  {visitors.map(visitor => (
                    <option key={visitor.id} value={visitor.id}>
                      {visitor.name} - {visitor.phone} ({getSourceLabel(visitor.source)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">اسم البائع *</label>
                <input
                  type="text"
                  required
                  value={formData.salesName}
                  onChange={(e) => setFormData({ ...formData, salesName: e.target.value })}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="من الذي قام بالمتابعة؟"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ملاحظات المتابعة *</label>
              <textarea
                required
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="ماذا حدث في هذه المتابعة؟"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.contacted}
                    onChange={(e) => setFormData({ ...formData, contacted: e.target.checked })}
                    className="rounded w-4 h-4"
                  />
                  <span className="text-sm font-medium">تم التواصل</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">النتيجة</label>
                <select
                  value={formData.result}
                  onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- اختر --</option>
                  <option value="interested">✅ مهتم</option>
                  <option value="not-interested">❌ غير مهتم</option>
                  <option value="postponed">⏸️ مؤجل</option>
                  <option value="subscribed">🎉 اشترك</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">متابعة قادمة</label>
                <input
                  type="date"
                  value={formData.nextFollowUpDate}
                  onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {loading ? 'جاري الحفظ...' : '✅ حفظ المتابعة'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">🔍 بحث</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ابحث باسم الزائر، رقم الهاتف، أو البائع..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">📊 الأولوية</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">الكل</option>
              <option value="overdue">🔥 متأخر</option>
              <option value="today">⚡ اليوم</option>
              <option value="upcoming">📅 قادم</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">📈 النتيجة</label>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">الكل</option>
              <option value="interested">✅ مهتم</option>
              <option value="not-interested">❌ غير مهتم</option>
              <option value="postponed">⏸️ مؤجل</option>
              <option value="subscribed">🎉 اشترك</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">📞 التواصل</label>
            <select
              value={contactedFilter}
              onChange={(e) => setContactedFilter(e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">الكل</option>
              <option value="contacted">✅ تم التواصل</option>
              <option value="not-contacted">❌ لم يتم التواصل</option>
            </select>
          </div>
        </div>
      </div>

      {/* Follow-Ups Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">جاري التحميل...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-right">الأولوية</th>
                  <th className="px-4 py-3 text-right">الزائر</th>
                  <th className="px-4 py-3 text-right">الهاتف</th>
                  <th className="px-4 py-3 text-right">المصدر</th>
                  <th className="px-4 py-3 text-right">البائع</th>
                  <th className="px-4 py-3 text-right">ملاحظات</th>
                  <th className="px-4 py-3 text-right">النتيجة</th>
                  <th className="px-4 py-3 text-right">المتابعة القادمة</th>
                  <th className="px-4 py-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredFollowUps.map((followUp) => {
                  const isMember = isVisitorAMember(followUp.visitor.phone)
                  return (
                  <tr
                    key={followUp.id}
                    className={`border-t transition-colors ${
                      isMember
                        ? 'bg-green-50 hover:bg-green-100'
                        : 'hover:bg-blue-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      {getPriorityBadge(followUp)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${isMember ? 'text-green-700' : 'text-gray-900'}`}>
                            {followUp.visitor.name}
                          </p>
                          {isMember && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white">
                              ✓ عضو
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {followUp.contacted ? (
                            <span className="text-green-600">✅ تم التواصل</span>
                          ) : (
                            <span className="text-orange-600">⏳ لم يتم التواصل</span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://wa.me/2${followUp.visitor.phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium text-sm transition-colors ${
                          isMember
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        <span>💬</span>
                        <span>{followUp.visitor.phone}</span>
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`${
                        followUp.visitor.source === 'invitation'
                          ? 'bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium'
                          : followUp.visitor.source === 'member-invitation'
                          ? 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium'
                          : 'text-gray-600'
                      }`}>
                        {getSourceLabel(followUp.visitor.source)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {followUp.salesName ? (
                        <span className="text-orange-600 font-semibold flex items-center gap-1">
                          <span>👤</span>
                          <span>{followUp.salesName}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-700 max-w-xs" title={followUp.notes}>
                          {followUp.notes.length > 50 ? followUp.notes.substring(0, 50) + '...' : followUp.notes}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(followUp.createdAt).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getResultBadge(followUp.result)}
                    </td>
                    <td className="px-4 py-3">
                      {followUp.nextFollowUpDate ? (
                        <span className="text-sm font-medium">
                          {new Date(followUp.nextFollowUpDate).toLocaleDateString('ar-EG')}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!isMember && (
                          <button
                            onClick={() => openQuickFollowUp(followUp.visitor)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded bg-blue-50 hover:bg-blue-100"
                            title="إضافة متابعة جديدة"
                          >
                            ➕ متابعة
                          </button>
                        )}
                        {isMember && (
                          <span className="text-green-700 text-sm font-bold px-3 py-1">
                            ✅ تم الاشتراك
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                )}
              </tbody>
            </table>
          </div>

          {filteredFollowUps.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm || resultFilter !== 'all' || contactedFilter !== 'all' || priorityFilter !== 'all' ? (
                <>
                  <div className="text-5xl mb-3">🔍</div>
                  <p>لا توجد نتائج تطابق البحث</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">📝</div>
                  <p>لا توجد متابعات مسجلة حتى الآن</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    ➕ إضافة أول متابعة
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Success Rate - الزوار اللي اشتركوا */}
      <div className="mt-6 bg-gradient-to-br from-green-500 to-green-600 border-r-4 border-green-700 p-6 rounded-xl shadow-lg">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-xl">
          <span>🎯</span>
          <span>معدل النجاح - الزوار اللي تحولوا لأعضاء</span>
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/90 backdrop-blur p-5 rounded-lg shadow-md">
            <p className="text-sm text-gray-600 font-medium mb-1">إجمالي المتابعات</p>
            <p className="text-4xl font-bold text-gray-900">{followUps.length}</p>
          </div>
          <div className="bg-white/90 backdrop-blur p-5 rounded-lg shadow-md">
            <p className="text-sm text-gray-600 font-medium mb-1">تحولوا لأعضاء ✓</p>
            <p className="text-4xl font-bold text-green-600">{getConvertedToMembers()}</p>
          </div>
          <div className="bg-white/90 backdrop-blur p-5 rounded-lg shadow-md">
            <p className="text-sm text-gray-600 font-medium mb-1">نسبة التحويل</p>
            <p className="text-4xl font-bold text-blue-600">
              {followUps.length > 0
                ? ((getConvertedToMembers() / followUps.length) * 100).toFixed(1)
                : '0'}%
            </p>
          </div>
        </div>
        <p className="text-sm text-white mt-4 bg-green-700/30 p-3 rounded-lg">
          💡 <strong>ملاحظة:</strong> السطور باللون الأخضر تشير إلى الزوار اللي اشتركوا وأصبحوا أعضاء نشطين في الجيم
        </p>
      </div>

      {/* Quick Tips for Sales */}
      <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-r-4 border-blue-500 p-5 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
          <span>💡</span>
          <span>نصائح سريعة لفريق المبيعات</span>
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 🔥 <strong>المتابعات المتأخرة:</strong> ابدأ بها أولاً - العميل قد يكون قرر بالفعل</li>
          <li>• ⚡ <strong>متابعات اليوم:</strong> تواصل الآن للحصول على أفضل نتائج</li>
          <li>• 💬 <strong>زر WhatsApp:</strong> اضغط على رقم الهاتف للتواصل السريع</li>
          <li>• 🎁 <strong>الدعوات:</strong> العملاء من دعوات الأعضاء لديهم فرصة أعلى للاشتراك</li>
          <li>• ✅ <strong>السطور الخضراء:</strong> زوار نجحت متابعتهم واشتركوا بالفعل - تعلم من أسلوب المتابعة معهم!</li>
        </ul>
      </div>
    </div>
  )
}
