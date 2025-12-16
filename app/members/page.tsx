// app/members/page.tsx - إصلاح الأرقام العشرية
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '../../hooks/usePermissions'
import PermissionDenied from '../../components/PermissionDenied'
import MemberForm from '../../components/MemberForm'
import { useAdminDate } from '../../contexts/AdminDateContext'
import { formatDateYMD, calculateRemainingDays } from '../../lib/dateFormatter'

interface Member {
  id: string
  memberNumber: number
  name: string
  phone: string
  profileImage?: string | null
  inBodyScans: number
  invitations: number
  subscriptionPrice: number
  remainingAmount: number
  notes?: string
  isActive: boolean
  startDate?: string
  expiryDate?: string
  createdAt: string
}

export default function MembersPage() {
  const router = useRouter()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const { customCreatedAt } = useAdminDate()

  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  // سجل الحضور
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceSummary, setAttendanceSummary] = useState<any[]>([])
  const [attendanceStartDate, setAttendanceStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30) // آخر 30 يوم
    return date.toISOString().split('T')[0]
  })
  const [attendanceEndDate, setAttendanceEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [searchId, setSearchId] = useState('')
  const [searchName, setSearchName] = useState('')
  const [searchPhone, setSearchPhone] = useState('')

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'expiring-soon' | 'has-remaining'>('all')
  const [specificDate, setSpecificDate] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members')

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (response.status === 403) {
        return
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        // ✅ تحويل كل الأرقام لـ integers
        const cleanedMembers = data.map(member => ({
          ...member,
          memberNumber: parseInt(member.memberNumber?.toString() || '0'),
          inBodyScans: parseInt(member.inBodyScans?.toString() || '0'),
          invitations: parseInt(member.invitations?.toString() || '0'),
          subscriptionPrice: parseInt(member.subscriptionPrice?.toString() || '0'),
          remainingAmount: parseInt(member.remainingAmount?.toString() || '0')
        }))

        setMembers(cleanedMembers)
        setFilteredMembers(cleanedMembers)
      } else {
        console.error('Invalid data format:', data)
        setMembers([])
        setFilteredMembers([])
      }
    } catch (error) {
      console.error('Error fetching members:', error)
      setMembers([])
      setFilteredMembers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceSummary = async () => {
    setAttendanceLoading(true)
    try {
      const response = await fetch(
        `/api/members/attendance-summary?startDate=${attendanceStartDate}&endDate=${attendanceEndDate}`
      )
      const data = await response.json()

      if (data.success) {
        setAttendanceSummary(data.summary || [])
      } else {
        console.error('Error fetching attendance summary')
        setAttendanceSummary([])
      }
    } catch (error) {
      console.error('Error fetching attendance summary:', error)
      setAttendanceSummary([])
    } finally {
      setAttendanceLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    let filtered = members

    if (searchId || searchName || searchPhone) {
      filtered = filtered.filter((member) => {
        // ✅ بحث دقيق برقم العضوية (exact match)
        const idMatch = searchId
          ? member.memberNumber === parseInt(searchId) || member.memberNumber.toString() === searchId
          : true

        const nameMatch = searchName
          ? member.name.toLowerCase().includes(searchName.toLowerCase())
          : true

        const phoneMatch = searchPhone
          ? member.phone.includes(searchPhone)
          : true

        return idMatch && nameMatch && phoneMatch
      })
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((member) => {
        const isExpired = member.expiryDate ? new Date(member.expiryDate) < new Date() : false
        const daysRemaining = calculateRemainingDays(member.expiryDate)
        const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7

        if (filterStatus === 'expired') {
          return isExpired
        } else if (filterStatus === 'expiring-soon') {
          return isExpiringSoon
        } else if (filterStatus === 'active') {
          return member.isActive && !isExpired
        } else if (filterStatus === 'has-remaining') {
          return member.remainingAmount > 0
        }
        return true
      })
    }

    if (specificDate) {
      filtered = filtered.filter((member) => {
        if (!member.expiryDate) return false
        const expiryDate = new Date(member.expiryDate)
        const selectedDate = new Date(specificDate)
        
        return (
          expiryDate.getFullYear() === selectedDate.getFullYear() &&
          expiryDate.getMonth() === selectedDate.getMonth() &&
          expiryDate.getDate() === selectedDate.getDate()
        )
      })
    }

    setFilteredMembers(filtered)
    setCurrentPage(1) // إعادة تعيين الصفحة للأولى عند الفلترة
  }, [searchId, searchName, searchPhone, filterStatus, specificDate, members])

  // حساب الصفحات
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMembers = filteredMembers.slice(startIndex, endIndex)

  const handleViewDetails = (memberId: string) => {
    router.push(`/members/${memberId}`)
  }

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearSearch = () => {
    setSearchId('')
    setSearchName('')
    setSearchPhone('')
  }

  const clearAllFilters = () => {
    setSearchId('')
    setSearchName('')
    setSearchPhone('')
    setFilterStatus('all')
    setSpecificDate('')
  }

  const stats = {
    total: members.length,
    active: members.filter(m => {
      const isExpired = m.expiryDate ? new Date(m.expiryDate) < new Date() : false
      return m.isActive && !isExpired
    }).length,
    expired: members.filter(m => {
      return m.expiryDate ? new Date(m.expiryDate) < new Date() : false
    }).length,
    expiringSoon: members.filter(m => {
      const daysRemaining = calculateRemainingDays(m.expiryDate)
      return daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7
    }).length,
    hasRemaining: members.filter(m => m.remainingAmount > 0).length
  }

  // ✅ التحقق من الصلاحيات
  if (permissionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    )
  }

  if (!hasPermission('canViewMembers')) {
    return <PermissionDenied message="ليس لديك صلاحية عرض الأعضاء" />
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold">إدارة الأعضاء</h1>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowAttendanceModal(true)
              fetchAttendanceSummary()
            }}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <span>📊</span>
            <span>سجل الحضور</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'إخفاء النموذج' : 'إضافة عضو جديد'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">إضافة عضو جديد</h2>
          <MemberForm
            onSuccess={() => {
              fetchMembers()
              setShowForm(false)
            }}
            customCreatedAt={customCreatedAt}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-lg">
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-sm opacity-90">إجمالي الأعضاء</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow-lg">
          <div className="text-3xl font-bold">{stats.active}</div>
          <div className="text-sm opacity-90">أعضاء نشطين</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl shadow-lg">
          <div className="text-3xl font-bold">{stats.expiringSoon}</div>
          <div className="text-sm opacity-90">ينتهي قريباً (7 أيام)</div>
        </div>
        
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-4 rounded-xl shadow-lg">
          <div className="text-3xl font-bold">{stats.expired}</div>
          <div className="text-sm opacity-90">منتهي الاشتراك</div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-4 rounded-xl shadow-lg">
          <div className="text-3xl font-bold">{stats.hasRemaining}</div>
          <div className="text-sm opacity-90">عليهم متبقي</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-6 border-2 border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>🎯</span>
            <span>فلاتر سريعة</span>
          </h3>
          {(filterStatus !== 'all' || specificDate) && (
            <button
              onClick={() => {
                setFilterStatus('all')
                setSpecificDate('')
              }}
              className="bg-purple-100 text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-200 text-sm font-medium"
            >
              ✖️ مسح الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-3 rounded-lg font-medium transition ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 الكل ({stats.total})
          </button>

          <button
            onClick={() => setFilterStatus('active')}
            className={`px-4 py-3 rounded-lg font-medium transition ${
              filterStatus === 'active'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ✅ نشط ({stats.active})
          </button>

          <button
            onClick={() => setFilterStatus('expiring-soon')}
            className={`px-4 py-3 rounded-lg font-medium transition ${
              filterStatus === 'expiring-soon'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⚠️ ينتهي قريباً ({stats.expiringSoon})
          </button>

          <button
            onClick={() => setFilterStatus('expired')}
            className={`px-4 py-3 rounded-lg font-medium transition ${
              filterStatus === 'expired'
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ❌ منتهي ({stats.expired})
          </button>

          <button
            onClick={() => setFilterStatus('has-remaining')}
            className={`px-4 py-3 rounded-lg font-medium transition ${
              filterStatus === 'has-remaining'
                ? 'bg-yellow-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💰 عليهم متبقي ({stats.hasRemaining})
          </button>
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-2">
            📅 فلتر حسب تاريخ انتهاء معين
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="flex-1 px-3 py-2 md:px-4 md:py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition"
            />
            {specificDate && (
              <button
                onClick={() => setSpecificDate('')}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                ✖️
              </button>
            )}
          </div>
          {specificDate && (
            <p className="text-sm text-purple-600 mt-2">
              🔍 عرض الأعضاء الذين ينتهي اشتراكهم في: {new Date(specificDate).toLocaleDateString('ar-EG')}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-6 border-2 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>🔍</span>
            <span>بحث مباشر</span>
          </h3>
          {(searchId || searchName || searchPhone) && (
            <button
              onClick={clearSearch}
              className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 text-sm font-medium"
            >
              ✖️ مسح البحث
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">رقم العضوية (ID)</label>
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full px-3 py-2 md:px-4 md:py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition"
              placeholder="ابحث برقم العضوية..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">الاسم</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full px-3 py-2 md:px-4 md:py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition"
              placeholder="ابحث بالاسم..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="w-full px-3 py-2 md:px-4 md:py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition"
              placeholder="ابحث برقم الهاتف..."
            />
          </div>
        </div>

        {(searchId || searchName || searchPhone) && (
          <div className="mt-4 text-center">
            <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium">
              📊 عرض {filteredMembers.length} من {members.length} عضو
            </span>
          </div>
        )}
      </div>

      {(searchId || searchName || searchPhone || filterStatus !== 'all' || specificDate) && (
        <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-xl mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔎</span>
            <div>
              <p className="font-bold text-yellow-800">الفلاتر نشطة</p>
              <p className="text-sm text-yellow-700">عرض {filteredMembers.length} من {members.length} عضو</p>
            </div>
          </div>
          <button
            onClick={clearAllFilters}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 font-medium"
          >
            🗑️ مسح جميع الفلاتر
          </button>
        </div>
      )}

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
                    <th className="px-4 py-3 text-right">الصورة</th>
                    <th className="px-4 py-3 text-right">رقم العضوية</th>
                    <th className="px-4 py-3 text-right">الاسم</th>
                    <th className="px-4 py-3 text-right">الهاتف</th>
                    <th className="px-4 py-3 text-right">InBody</th>
                    <th className="px-4 py-3 text-right">دعوات</th>
                    <th className="px-4 py-3 text-right">السعر</th>
                    <th className="px-4 py-3 text-right">المتبقي</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                    <th className="px-4 py-3 text-right">تاريخ البداية</th>
                    <th className="px-4 py-3 text-right">تاريخ الانتهاء</th>
                    <th className="px-4 py-3 text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(currentMembers) && currentMembers.map((member) => {
                    const isExpired = member.expiryDate ? new Date(member.expiryDate) < new Date() : false
                    const daysRemaining = calculateRemainingDays(member.expiryDate)
                    const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7

                    return (
                      <tr key={member.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                            {member.profileImage ? (
                              <img
                                src={member.profileImage}
                                alt={member.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-bold text-blue-600">#{member.memberNumber}</td>
                        <td className="px-4 py-3">{member.name}</td>
                        <td className="px-4 py-3">{member.phone}</td>
                        <td className="px-4 py-3">{member.inBodyScans}</td>
                        <td className="px-4 py-3">{member.invitations}</td>
                        <td className="px-4 py-3">{member.subscriptionPrice} ج.م</td>
                        <td className="px-4 py-3 text-red-600">{member.remainingAmount} ج.م</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-sm ${
                            member.isActive && !isExpired ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {member.isActive && !isExpired ? 'نشط' : 'منتهي'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700 font-mono">
                            {formatDateYMD(member.startDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {member.expiryDate ? (
                            <div>
                              <span className={`font-mono ${isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-orange-600 font-bold' : ''}`}>
                                {formatDateYMD(member.expiryDate)}
                              </span>
                              {daysRemaining !== null && daysRemaining > 0 && (
                                <p className={`text-xs ${isExpiringSoon ? 'text-orange-600' : 'text-gray-500'}`}>
                                  {isExpiringSoon && '⚠️ '} باقي {daysRemaining} يوم
                                </p>
                              )}
                              {isExpired && daysRemaining !== null && (
                                <p className="text-xs text-red-600">
                                  ❌ منتهي منذ {Math.abs(daysRemaining)} يوم
                                </p>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleViewDetails(member.id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition shadow-md hover:shadow-lg font-medium"
                          >
                            👁️ عرض التفاصيل
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile/Tablet Cards - Hidden on desktop */}
          <div className="lg:hidden space-y-3">
            {Array.isArray(currentMembers) && currentMembers.map((member) => {
              const isExpired = member.expiryDate ? new Date(member.expiryDate) < new Date() : false
              const daysRemaining = calculateRemainingDays(member.expiryDate)
              const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7

              return (
                <div key={member.id} className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-gray-200 hover:shadow-lg transition">
                  {/* Header with Image and Member Number */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-white shadow-lg bg-gray-100 flex-shrink-0">
                        {member.profileImage ? (
                          <img
                            src={member.profileImage}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xl font-bold text-white mb-1">#{member.memberNumber}</div>
                        <div className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          member.isActive && !isExpired ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {member.isActive && !isExpired ? '✓ نشط' : '✕ منتهي'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 space-y-2.5">
                    {/* Name */}
                    <div className="pb-2.5 border-b-2 border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">👤</span>
                        <span className="text-xs text-gray-500 font-semibold">الاسم</span>
                      </div>
                      <div className="text-base font-bold text-gray-800">{member.name}</div>
                    </div>

                    {/* Phone */}
                    <div className="pb-2.5 border-b-2 border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">📱</span>
                        <span className="text-xs text-gray-500 font-semibold">الهاتف</span>
                      </div>
                      <div className="text-base font-mono text-gray-800 direction-ltr text-right">{member.phone}</div>
                    </div>

                    {/* Services Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm">📊</span>
                          <span className="text-xs text-purple-700 font-semibold">InBody</span>
                        </div>
                        <div className="text-lg font-bold text-purple-600">{member.inBodyScans}</div>
                      </div>
                      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm">🎫</span>
                          <span className="text-xs text-orange-700 font-semibold">دعوات</span>
                        </div>
                        <div className="text-lg font-bold text-orange-600">{member.invitations}</div>
                      </div>
                    </div>

                    {/* Price Info */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm">💰</span>
                          <span className="text-xs text-green-700 font-semibold">السعر</span>
                        </div>
                        <div className="text-base font-bold text-green-600">{member.subscriptionPrice} ج.م</div>
                      </div>
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm">⚠️</span>
                          <span className="text-xs text-red-700 font-semibold">المتبقي</span>
                        </div>
                        <div className="text-base font-bold text-red-600">{member.remainingAmount} ج.م</div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="space-y-1.5 pt-1">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">📅</span>
                          <span className="text-xs text-blue-700 font-semibold">تاريخ البداية</span>
                        </div>
                        <div className="text-sm font-mono text-gray-700">{formatDateYMD(member.startDate)}</div>
                      </div>

                      {member.expiryDate && (
                        <div className={`border-2 rounded-lg p-2.5 ${
                          isExpired ? 'bg-red-50 border-red-300' : isExpiringSoon ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{isExpired ? '❌' : isExpiringSoon ? '⚠️' : '📅'}</span>
                            <span className={`text-xs font-semibold ${
                              isExpired ? 'text-red-700' : isExpiringSoon ? 'text-orange-700' : 'text-gray-700'
                            }`}>تاريخ الانتهاء</span>
                          </div>
                          <div className={`text-sm font-mono font-bold ${
                            isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-gray-700'
                          }`}>
                            {formatDateYMD(member.expiryDate)}
                          </div>
                          {daysRemaining !== null && daysRemaining > 0 && (
                            <div className={`text-xs mt-1 font-semibold ${isExpiringSoon ? 'text-orange-700' : 'text-gray-600'}`}>
                              {isExpiringSoon && '⚠️ '} باقي {daysRemaining} يوم
                            </div>
                          )}
                          {isExpired && daysRemaining !== null && (
                            <div className="text-xs mt-1 font-semibold text-red-700">
                              ❌ منتهي منذ {Math.abs(daysRemaining)} يوم
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleViewDetails(member.id)}
                      className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm hover:bg-blue-700 transition shadow-md hover:shadow-lg font-bold mt-1.5"
                    >
                      👁️ عرض التفاصيل
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {!loading && filteredMembers.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                {/* معلومات الصفحة */}
                <div className="text-sm text-gray-600">
                  عرض {startIndex + 1} إلى {Math.min(endIndex, filteredMembers.length)} من {filteredMembers.length} عضو
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

      {filteredMembers.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
          {(searchId || searchName || searchPhone || filterStatus !== 'all' || specificDate) ? (
            <>
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl">لا توجد نتائج مطابقة للبحث</p>
              <button
                onClick={clearAllFilters}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                مسح جميع الفلاتر
              </button>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">📋</div>
              <p className="text-xl">لا يوجد أعضاء حالياً</p>
            </>
          )}
        </div>
      )}

      {/* Modal سجل الحضور */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📊</span>
                <h2 className="text-2xl font-bold">سجل حضور الأعضاء</h2>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="text-white hover:bg-white hover:text-green-600 rounded-full w-10 h-10 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Filters */}
            <div className="p-6 bg-gray-50 border-b">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">من تاريخ</label>
                  <input
                    type="date"
                    value={attendanceStartDate}
                    onChange={(e) => setAttendanceStartDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">إلى تاريخ</label>
                  <input
                    type="date"
                    value={attendanceEndDate}
                    onChange={(e) => setAttendanceEndDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchAttendanceSummary}
                    disabled={attendanceLoading}
                    className="w-full bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold"
                  >
                    {attendanceLoading ? 'جاري التحميل...' : 'تطبيق الفلتر'}
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {attendanceLoading ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-gray-600">جاري تحميل البيانات...</p>
                </div>
              ) : attendanceSummary.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-xl text-gray-600">لا توجد سجلات حضور في هذه الفترة</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between bg-blue-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">عدد الأعضاء الذين حضروا</p>
                      <p className="text-3xl font-bold text-blue-600">{attendanceSummary.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">إجمالي مرات الحضور</p>
                      <p className="text-3xl font-bold text-green-600">
                        {attendanceSummary.reduce((sum, item) => sum + item.count, 0)}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-right">الترتيب</th>
                          <th className="px-4 py-3 text-right">رقم العضوية</th>
                          <th className="px-4 py-3 text-right">الاسم</th>
                          <th className="px-4 py-3 text-right">رقم الهاتف</th>
                          <th className="px-4 py-3 text-right">عدد مرات الحضور</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceSummary.map((item, index) => (
                          <tr key={item.member?.id || index} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="font-bold text-lg">
                                {index === 0 && '🥇'}
                                {index === 1 && '🥈'}
                                {index === 2 && '🥉'}
                                {index > 2 && `#${index + 1}`}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-blue-600 font-bold">
                              #{item.member?.memberNumber || '-'}
                            </td>
                            <td className="px-4 py-3 font-semibold">{item.member?.name || 'غير معروف'}</td>
                            <td className="px-4 py-3 font-mono">{item.member?.phone || '-'}</td>
                            <td className="px-4 py-3">
                              <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold text-xl">
                                {item.count}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}