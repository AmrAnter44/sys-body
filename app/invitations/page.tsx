'use client'

import { useEffect, useState } from 'react'
import { formatDateYMD } from '../../lib/dateFormatter'

interface Invitation {
  id: string
  guestName: string
  guestPhone: string
  notes?: string
  createdAt: string
  member: {
    memberNumber: number
    name: string
    phone: string
  }
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/invitations')
      const data = await response.json()
      setInvitations(data)
    } catch (error) {
      console.error('Error fetching invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
  }, [])

  // إعادة تعيين الصفحة عند تغيير الفلاتر
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, dateFilter])

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدعوة؟')) return

    try {
      await fetch(`/api/invitations?id=${id}`, { method: 'DELETE' })
      fetchInvitations()
    } catch (error) {
      console.error('Error deleting invitation:', error)
    }
  }

  // فلترة النتائج
  const filteredInvitations = invitations.filter(inv => {
    const matchesSearch =
      inv.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.guestPhone.includes(searchTerm) ||
      inv.member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.member.memberNumber.toString().includes(searchTerm)

    const matchesDate = dateFilter
      ? new Date(inv.createdAt).toISOString().split('T')[0] === dateFilter
      : true

    return matchesSearch && matchesDate
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredInvitations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentInvitations = filteredInvitations.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // إحصائيات
  const stats = {
    total: invitations.length,
    today: invitations.filter(inv => 
      new Date(inv.createdAt).toDateString() === new Date().toDateString()
    ).length,
    thisWeek: invitations.filter(inv => {
      const invDate = new Date(inv.createdAt)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return invDate >= weekAgo
    }).length,
    thisMonth: invitations.filter(inv => {
      const invDate = new Date(inv.createdAt)
      return invDate.getMonth() === new Date().getMonth() &&
             invDate.getFullYear() === new Date().getFullYear()
    }).length
  }

  return (
    <div className="container mx-auto px-4 py-6 md:px-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>🎟️</span>
          <span>سجل الدعوات</span>
        </h1>
        <p className="text-gray-600 mt-2">جميع دعوات الأعضاء المستخدمة</p>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-5 shadow-lg">
          <p className="text-sm opacity-90 mb-1">إجمالي الدعوات</p>
          <p className="text-4xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-5 shadow-lg">
          <p className="text-sm opacity-90 mb-1">اليوم</p>
          <p className="text-4xl font-bold">{stats.today}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5 shadow-lg">
          <p className="text-sm opacity-90 mb-1">هذا الأسبوع</p>
          <p className="text-4xl font-bold">{stats.thisWeek}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-5 shadow-lg">
          <p className="text-sm opacity-90 mb-1">هذا الشهر</p>
          <p className="text-4xl font-bold">{stats.thisMonth}</p>
        </div>
      </div>

      {/* البحث والفلاتر */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">🔍 البحث</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم الضيف، رقم الهاتف، أو العضو..."
              className="w-full px-4 py-2 border-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">📅 تصفية بالتاريخ</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 rounded-lg"
            />
          </div>
        </div>
        {(searchTerm || dateFilter) && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setSearchTerm('')
                setDateFilter('')
              }}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg"
            >
              ✖️ مسح الفلاتر
            </button>
            <p className="text-sm text-gray-600 py-1">
              عرض {filteredInvitations.length} من {invitations.length} دعوة
            </p>
          </div>
        )}
      </div>

      {/* القائمة / البطاقات */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">جاري التحميل...</p>
        </div>
      ) : (
        <div>
          {/* Cards للموبايل */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {currentInvitations.map((invitation) => (
              <div key={invitation.id} className="bg-white rounded-lg shadow-md p-4 border-r-4 border-purple-500">
                {/* الهيدر */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {formatDateYMD(invitation.createdAt)} • {new Date(invitation.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <h3 className="font-bold text-lg text-purple-700">{invitation.guestName}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(invitation.id)}
                    className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                  >
                    🗑️ حذف
                  </button>
                </div>

                {/* التفاصيل */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">📱</span>
                    <span className="font-mono text-sm">{invitation.guestPhone}</span>
                  </div>

                  <div className="border-t pt-2">
                    <p className="text-xs text-gray-500 mb-1">العضو المستضيف:</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{invitation.member.name}</p>
                        <p className="text-xs text-gray-500">{invitation.member.phone}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold text-xs">
                        #{invitation.member.memberNumber}
                      </span>
                    </div>
                  </div>

                  {invitation.notes && (
                    <div className="border-t pt-2">
                      <p className="text-xs text-gray-500 mb-1">ملاحظات:</p>
                      <p className="text-sm text-gray-700">{invitation.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Table للشاشات الكبيرة */}
          <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-right">التاريخ</th>
                    <th className="px-4 py-3 text-right">اسم الضيف</th>
                    <th className="px-4 py-3 text-right">هاتف الضيف</th>
                    <th className="px-4 py-3 text-right">العضو المستضيف</th>
                    <th className="px-4 py-3 text-right">رقم العضوية</th>
                    <th className="px-4 py-3 text-right">ملاحظات</th>
                    <th className="px-4 py-3 text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInvitations.map((invitation) => (
                    <tr key={invitation.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-mono text-sm">
                            {formatDateYMD(invitation.createdAt)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(invitation.createdAt).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-purple-700">
                          {invitation.guestName}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono">{invitation.guestPhone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{invitation.member.name}</p>
                        <p className="text-xs text-gray-500">{invitation.member.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold text-sm">
                          #{invitation.member.memberNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {invitation.notes ? (
                          <p className="text-sm text-gray-600 max-w-xs truncate" title={invitation.notes}>
                            {invitation.notes}
                          </p>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(invitation.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {filteredInvitations.length > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 py-3 bg-gray-50 rounded-lg">
              {/* معلومات الصفحة */}
              <div className="text-sm text-gray-600">
                عرض {startIndex + 1} - {Math.min(endIndex, filteredInvitations.length)} من {filteredInvitations.length} دعوة
              </div>

              {/* أزرار التنقل */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                  title="الصفحة الأولى"
                >
                  الأولى
                </button>

                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                  title="السابقة"
                >
                  السابقة
                </button>

                {/* أرقام الصفحات */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum
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
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-200'
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
                  className="px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                  title="التالية"
                >
                  التالية
                </button>

                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                  title="الصفحة الأخيرة"
                >
                  الأخيرة
                </button>
              </div>

              {/* اختيار عدد العناصر في الصفحة */}
              <div className="flex items-center gap-2 text-sm">
                <label className="text-gray-600">عدد العناصر:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          )}

          {filteredInvitations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm || dateFilter ? (
                <>
                  <div className="text-5xl mb-3">🔍</div>
                  <p>لا توجد نتائج تطابق البحث</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">🎟️</div>
                  <p>لا توجد دعوات مسجلة حتى الآن</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ملاحظة */}
      <div className="mt-6 bg-blue-50 border-r-4 border-blue-500 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>💡 ملاحظة:</strong> هذا السجل يحتوي على جميع الدعوات التي استخدمها الأعضاء لإحضار ضيوف إلى الجيم.
        </p>
      </div>
    </div>
  )
}