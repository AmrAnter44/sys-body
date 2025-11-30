'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { usePermissions } from '../../hooks/usePermissions'
import PermissionDenied from '../../components/PermissionDenied'
import FollowUpForm from './FollowUpForm'

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
  expiryDate?: string
  isActive: boolean
}

export default function FollowUpsPage() {
  const { hasPermission, loading: permissionsLoading } = usePermissions()

  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [allMembers, setAllMembers] = useState<Member[]>([]) // كل الأعضاء (نشطين ومنتهيين)
  const [dayUseRecords, setDayUseRecords] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedVisitorForHistory, setSelectedVisitorForHistory] = useState<Visitor | null>(null)
  const [message, setMessage] = useState('')
  const [selectedVisitorId, setSelectedVisitorId] = useState<string>('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [resultFilter, setResultFilter] = useState('all')
  const [contactedFilter, setContactedFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // ✅ حساب الأعضاء المنتهيين
  const expiredMembers = useMemo(() => {
    const today = new Date()
    return allMembers
      .filter(m => {
        if (!m.expiryDate) return false
        const expiryDate = new Date(m.expiryDate)
        return expiryDate < today && m.isActive === false
      })
      .map(m => ({
        id: `expired-${m.id}`,
        name: `${m.name} (عضو منتهي)`,
        phone: m.phone,
        source: 'expired-member',
        status: 'expired'
      }))
  }, [allMembers])

  // ✅ دمج المتابعات الحقيقية مع الأعضاء المنتهيين + Day Use + Invitations
  const allFollowUps = useMemo(() => {
    // 1. الأعضاء المنتهيين
    const expiredFollowUps: FollowUp[] = expiredMembers.map(member => ({
      id: member.id,
      notes: 'عضو منتهي - يحتاج تجديد اشتراك',
      contacted: false,
      nextFollowUpDate: new Date().toISOString(),
      result: undefined,
      salesName: 'نظام',
      createdAt: new Date().toISOString(),
      visitor: member
    }))

    // 2. Day Use (استخدام InBody يوم واحد)
    const dayUseFollowUps: FollowUp[] = dayUseRecords.map(record => ({
      id: `dayuse-${record.id}`,
      notes: `استخدام ${record.serviceType} - فرصة للاشتراك`,
      contacted: false,
      nextFollowUpDate: new Date().toISOString(),
      result: undefined,
      salesName: record.staffName || 'نظام',
      createdAt: record.createdAt,
      visitor: {
        id: `dayuse-${record.id}`,
        name: record.name,
        phone: record.phone,
        source: 'invitation', // 🎁 استخدام يوم
        status: 'pending'
      }
    }))

    // 3. Invitations (دعوات من أعضاء)
    const invitationFollowUps: FollowUp[] = invitations.map(inv => ({
      id: `invitation-${inv.id}`,
      notes: `دعوة من عضو - ${inv.member?.name || 'عضو'}`,
      contacted: false,
      nextFollowUpDate: new Date().toISOString(),
      result: undefined,
      salesName: 'نظام',
      createdAt: inv.createdAt,
      visitor: {
        id: `invitation-${inv.id}`,
        name: inv.guestName,
        phone: inv.guestPhone,
        source: 'member-invitation', // 👥 دعوة من عضو
        status: 'pending'
      }
    }))

    return [...followUps, ...expiredFollowUps, ...dayUseFollowUps, ...invitationFollowUps]
  }, [followUps, expiredMembers, dayUseRecords, invitations])

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

      // حفظ كل الأعضاء
      setAllMembers(data || [])

      // حفظ الأعضاء النشطين فقط (isActive = true)
      const activeMembers = (data || []).filter((m: Member) => m.isActive === true)
      setMembers(activeMembers)

      // حساب الأعضاء المنتهيين
      const today = new Date()
      const expired = (data || []).filter((m: Member) => {
        if (!m.expiryDate) return false
        const expiryDate = new Date(m.expiryDate)
        return expiryDate < today && m.isActive === false
      })

      console.log('📊 إجمالي الأعضاء:', data?.length || 0)
      console.log('✅ عدد الأعضاء النشطين:', activeMembers.length)
      console.log('❌ عدد الأعضاء المنتهيين:', expired.length)
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const fetchDayUse = async () => {
    try {
      const response = await fetch('/api/dayuse')
      const data = await response.json()
      setDayUseRecords(data || [])
      console.log('🎯 عدد استخدامات InBody:', (data || []).length)
    } catch (error) {
      console.error('Error fetching day use:', error)
    }
  }

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/invitations')
      const data = await response.json()
      setInvitations(data || [])
      console.log('🎁 عدد الدعوات:', (data || []).length)
    } catch (error) {
      console.error('Error fetching invitations:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchFollowUps(),
        fetchVisitors(),
        fetchMembers(),
        fetchDayUse(),
        fetchInvitations()
      ])
    }
    loadData()
  }, [])

  const handleSubmit = async (formData: {
    visitorId: string
    salesName: string
    notes: string
    result: string
    nextFollowUpDate: string
    contacted: boolean
  }) => {
    setMessage('')

    try {
      const response = await fetch('/api/visitors/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setMessage('✅ تم إضافة المتابعة بنجاح!')
        setTimeout(() => setMessage(''), 3000)
        await fetchFollowUps()
        setShowForm(false)
        setSelectedVisitorId('')
      } else {
        const data = await response.json()
        setMessage(`❌ ${data.error || 'فشل إضافة المتابعة'}`)
      }
    } catch (error) {
      console.error(error)
      setMessage('❌ حدث خطأ')
    }
  }

  const openQuickFollowUp = (visitor: Visitor) => {
    setSelectedVisitorId(visitor.id)
    setShowForm(true)
    // لا نحتاج scroll - هيظهر كـ modal
  }

  // تنظيف رقم التليفون
  const normalizePhone = (phone: string) => {
    if (!phone) return ''
    let normalized = phone.replace(/[\s\-\(\)\+]/g, '').trim()
    if (normalized.startsWith('2')) normalized = normalized.substring(1)
    if (normalized.startsWith('0')) normalized = normalized.substring(1)
    return normalized
  }

  const openHistoryModal = (visitor: Visitor) => {
    setSelectedVisitorForHistory(visitor)
    setShowHistoryModal(true)
  }

  // Memoize history to avoid recalculation on every render
  const visitorHistory = useMemo(() => {
    if (!selectedVisitorForHistory) return []
    const normalizedPhone = normalizePhone(selectedVisitorForHistory.phone)
    return followUps.filter(fu => {
      const fuPhone = normalizePhone(fu.visitor.phone)
      return fuPhone === normalizedPhone
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [selectedVisitorForHistory, followUps])

  // التحقق من أن الزائر أصبح عضو
  const isVisitorAMember = (phone: string) => {
    const normalizedVisitorPhone = normalizePhone(phone)
    const matchedMember = members.find(member => {
      const normalizedMemberPhone = normalizePhone(member.phone)
      return normalizedMemberPhone === normalizedVisitorPhone
    })
    return !!matchedMember
  }

  // التحقق من أن العضو المنتهي جدد اشتراكه (أصبح نشط)
  const hasExpiredMemberRenewed = (phone: string) => {
    const normalizedVisitorPhone = normalizePhone(phone)
    // البحث في الأعضاء النشطين (members)
    const matchedMember = members.find(member => {
      const normalizedMemberPhone = normalizePhone(member.phone)
      return normalizedMemberPhone === normalizedVisitorPhone
    })
    return !!matchedMember
  }

  // حساب أولوية المتابعة
  const getFollowUpPriority = (followUp: FollowUp) => {
    if (!followUp.nextFollowUpDate) return 'none'

    const nextDate = new Date(followUp.nextFollowUpDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    nextDate.setHours(0, 0, 0, 0)

    if (nextDate < today) return 'overdue'
    if (nextDate.getTime() === today.getTime()) return 'today'
    return 'upcoming'
  }

  // فلترة النتائج
  const filteredFollowUps = useMemo(() => {
    return allFollowUps
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
        const aIsMember = isVisitorAMember(a.visitor.phone)
        const bIsMember = isVisitorAMember(b.visitor.phone)
        if (aIsMember && !bIsMember) return 1
        if (!aIsMember && bIsMember) return -1
        return 0
      })
  }, [allFollowUps, searchTerm, resultFilter, contactedFilter, priorityFilter])

  // إعادة تعيين الصفحة للأولى عند تغيير الفلاتر
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, resultFilter, contactedFilter, priorityFilter])

  // حساب الصفحات
  const totalPages = Math.ceil(filteredFollowUps.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentFollowUps = filteredFollowUps.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
      'expired-member': '❌ عضو منتهي (تجديد)',
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

  // Stats
  const stats = {
    total: allFollowUps.length,
    today: allFollowUps.filter(fu => getFollowUpPriority(fu) === 'today').length,
    overdue: allFollowUps.filter(fu => getFollowUpPriority(fu) === 'overdue').length,
    contactedToday: followUps.filter(fu => {
      const today = new Date().toDateString()
      return fu.contacted && new Date(fu.createdAt).toDateString() === today
    }).length,
    expiredMembers: expiredMembers.length,
    dayUse: dayUseRecords.length,
    invitations: invitations.length,
    visitors: visitors.length,
    convertedToMembers: followUps.filter(fu => isVisitorAMember(fu.visitor.phone)).length
  }

  // التحقق من الصلاحيات
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
            <p className="text-xs opacity-90 mb-1">إجمالي</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-4 shadow-lg">
            <p className="text-xs opacity-90 mb-1">🔥 متأخر</p>
            <p className="text-3xl font-bold">{stats.overdue}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-4 shadow-lg">
            <p className="text-xs opacity-90 mb-1">⚡ اليوم</p>
            <p className="text-3xl font-bold">{stats.today}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
            <p className="text-xs opacity-90 mb-1">❌ منتهيين</p>
            <p className="text-3xl font-bold">{stats.expiredMembers}</p>
          </div>
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-xl p-4 shadow-lg">
            <p className="text-xs opacity-90 mb-1">🎁 Day Use</p>
            <p className="text-3xl font-bold">{stats.dayUse}</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-xl p-4 shadow-lg">
            <p className="text-xs opacity-90 mb-1">👥 دعوات</p>
            <p className="text-3xl font-bold">{stats.invitations}</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-4 shadow-lg">
            <p className="text-xs opacity-90 mb-1">👤 زوار</p>
            <p className="text-3xl font-bold">{stats.visitors}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
            <p className="text-xs opacity-90 mb-1">✅ اتصال</p>
            <p className="text-3xl font-bold">{stats.contactedToday}</p>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg font-medium ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Add Follow-Up Form - Modal Popup (Lightweight) */}
      {showForm && (
        <FollowUpForm
          visitors={visitors}
          expiredMembers={expiredMembers}
          dayUseRecords={dayUseRecords}
          invitations={invitations}
          initialVisitorId={selectedVisitorId}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false)
            setSelectedVisitorId('')
          }}
        />
      )}

      {/* History Modal - سجل المتابعات (Lightweight) */}
      {showHistoryModal && selectedVisitorForHistory && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowHistoryModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>📋</span>
                  <span>سجل المتابعات</span>
                </h2>
                <p className="text-xs opacity-90 mt-0.5">
                  {selectedVisitorForHistory.name} - {selectedVisitorForHistory.phone}
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              {visitorHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm">لا توجد متابعات</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <p className="text-sm font-bold text-purple-900">
                      المجموع: <span className="text-2xl">{visitorHistory.length}</span>
                    </p>
                  </div>

                  {visitorHistory.map((fu, index) => (
                    <div
                      key={fu.id}
                      className={`border rounded-lg p-3 ${
                        fu.contacted ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl font-bold text-gray-400">#{visitorHistory.length - index}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(fu.createdAt).toLocaleDateString('ar-EG')}
                            </span>
                            {fu.contacted ? (
                              <span className="text-green-700 font-bold text-xs">✅ تم</span>
                            ) : (
                              <span className="text-orange-600 font-bold text-xs">⏳ لم يتم</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {fu.result && getResultBadge(fu.result)}
                          {fu.salesName && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">
                              {fu.salesName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded border border-gray-200 mb-2">
                        <p className="text-sm text-gray-800">{fu.notes}</p>
                      </div>

                      {fu.nextFollowUpDate && (
                        <div className="text-xs text-gray-600">
                          📅 القادمة: <span className="font-bold">{new Date(fu.nextFollowUpDate).toLocaleDateString('ar-EG')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
                {currentFollowUps.map((followUp) => {
                  const isMember = isVisitorAMember(followUp.visitor.phone)
                  const isExpired = followUp.visitor.source === 'expired-member'
                  const hasRenewed = isExpired && hasExpiredMemberRenewed(followUp.visitor.phone)

                  return (
                  <tr
                    key={followUp.id}
                    className={`border-t transition-colors ${
                      hasRenewed
                        ? 'bg-green-50 hover:bg-green-100'
                        : isExpired
                        ? 'bg-red-50 hover:bg-red-100'
                        : isMember
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
                          <p className={`font-semibold ${
                            hasRenewed ? 'text-green-700' : isExpired ? 'text-red-700' : isMember ? 'text-green-700' : 'text-gray-900'
                          }`}>
                            {followUp.visitor.name}
                          </p>
                          {hasRenewed && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white">
                              ✓ تم التجديد
                            </span>
                          )}
                          {isMember && !isExpired && (
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
                          hasRenewed
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : isExpired
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : isMember
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
                          : followUp.visitor.source === 'expired-member'
                          ? 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold'
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
                      <div className="flex gap-2 flex-wrap">
                        {hasRenewed && (
                          <span className="text-green-700 text-sm font-bold px-3 py-1">
                            ✅ تم التجديد
                          </span>
                        )}
                        {!hasRenewed && !isMember && isExpired && (
                          <button
                            onClick={() => openQuickFollowUp(followUp.visitor)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded bg-red-50 hover:bg-red-100"
                            title="إضافة متابعة للتجديد"
                          >
                            ➕ متابعة
                          </button>
                        )}
                        {!isMember && !isExpired && (
                          <button
                            onClick={() => openQuickFollowUp(followUp.visitor)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded bg-blue-50 hover:bg-blue-100"
                            title="إضافة متابعة جديدة"
                          >
                            ➕ متابعة
                          </button>
                        )}
                        {isMember && !isExpired && (
                          <span className="text-green-700 text-sm font-bold px-3 py-1">
                            ✅ تم الاشتراك
                          </span>
                        )}

                        {/* زر سجل المتابعات */}
                        <button
                          onClick={() => openHistoryModal(followUp.visitor)}
                          className="text-purple-600 hover:text-purple-800 text-sm font-medium px-3 py-1 rounded bg-purple-50 hover:bg-purple-100"
                          title="عرض سجل المتابعات"
                        >
                          📋 السجل
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredFollowUps.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                {/* معلومات الصفحة */}
                <div className="text-sm text-gray-600">
                  عرض {startIndex + 1} إلى {Math.min(endIndex, filteredFollowUps.length)} من {filteredFollowUps.length} متابعة
                </div>

                {/* عدد العناصر في الصفحة */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">عدد العناصر:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* أزرار التنقل */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      الأولى
                    </button>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      السابقة
                    </button>

                    {/* أرقام الصفحات */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-3 py-2 rounded-lg font-medium ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      التالية
                    </button>
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      الأخيرة
                    </button>
                  </div>
                )}
              </div>

              {/* معلومات إضافية */}
              <div className="mt-4 text-center text-sm text-gray-500">
                الصفحة {currentPage} من {totalPages}
              </div>
            </div>
          )}

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

      {/* Success Rate */}
      <div className="mt-6 bg-gradient-to-br from-green-500 to-green-600 border-r-4 border-green-700 p-6 rounded-xl shadow-lg">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-xl">
          <span>🎯</span>
          <span>معدل النجاح - الزوار اللي تحولوا لأعضاء</span>
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/90 backdrop-blur p-5 rounded-lg shadow-md">
            <p className="text-sm text-gray-600 font-medium mb-1">إجمالي المتابعات</p>
            <p className="text-4xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white/90 backdrop-blur p-5 rounded-lg shadow-md">
            <p className="text-sm text-gray-600 font-medium mb-1">تحولوا لأعضاء ✓</p>
            <p className="text-4xl font-bold text-green-600">{stats.convertedToMembers}</p>
          </div>
          <div className="bg-white/90 backdrop-blur p-5 rounded-lg shadow-md">
            <p className="text-sm text-gray-600 font-medium mb-1">نسبة التحويل</p>
            <p className="text-4xl font-bold text-blue-600">
              {stats.total > 0 ? ((stats.convertedToMembers / stats.total) * 100).toFixed(1) : '0'}%
            </p>
          </div>
        </div>
        <p className="text-sm text-white mt-4 bg-green-700/30 p-3 rounded-lg">
          💡 <strong>ملاحظة:</strong> السطور الخضراء = زوار أصبحوا أعضاء | السطور الحمراء = أعضاء منتهيين يحتاجون تجديد
        </p>
      </div>

      {/* Quick Tips */}
      <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-r-4 border-blue-500 p-5 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
          <span>💡</span>
          <span>نصائح سريعة لفريق المبيعات</span>
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 🔥 <strong>المتابعات المتأخرة:</strong> ابدأ بها أولاً - العميل قد يكون قرر بالفعل</li>
          <li>• ⚡ <strong>متابعات اليوم:</strong> تواصل الآن للحصول على أفضل نتائج</li>
          <li>• 💬 <strong>زر WhatsApp:</strong> اضغط على رقم الهاتف للتواصل السريع</li>
          <li>• ❌ <strong>السطور الحمراء:</strong> أعضاء منتهيين - فرصة ذهبية للتجديد!</li>
          <li>• ✅ <strong>السطور الخضراء:</strong> زوار نجحت متابعتهم - تعلم من الأسلوب!</li>
        </ul>
      </div>
    </div>
  )
}
