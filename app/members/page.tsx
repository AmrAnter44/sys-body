// app/members/page.tsx - إصلاح الأرقام العشرية
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '../../hooks/usePermissions'
import PermissionDenied from '../../components/PermissionDenied'
import MemberForm from '../../components/MemberForm'
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

  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const [searchId, setSearchId] = useState('')
  const [searchName, setSearchName] = useState('')
  const [searchPhone, setSearchPhone] = useState('')

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'expiring-soon' | 'has-remaining'>('all')
  const [specificDate, setSpecificDate] = useState('')

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
  }, [searchId, searchName, searchPhone, filterStatus, specificDate, members])

  const handleViewDetails = (memberId: string) => {
    router.push(`/members/${memberId}`)
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">إدارة الأعضاء</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'إخفاء النموذج' : 'إضافة عضو جديد'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">إضافة عضو جديد</h2>
          <MemberForm onSuccess={() => {
            fetchMembers()
            setShowForm(false)
          }} />
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
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                {Array.isArray(filteredMembers) && filteredMembers.map((member) => {
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

          {filteredMembers.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
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
        </div>
      )}
    </div>
  )
}