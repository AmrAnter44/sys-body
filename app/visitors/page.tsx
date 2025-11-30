'use client'

import { useEffect, useState } from 'react'

interface Visitor {
  id: string
  name: string
  phone: string
  notes?: string
  source: string
  interestedIn?: string
  status: string
  createdAt: string
}

interface Stats {
  status: string
  _count: number
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [stats, setStats] = useState<Stats[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
    source: 'walk-in',
    interestedIn: '',
  })

  const fetchVisitors = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (sourceFilter !== 'all') params.append('source', sourceFilter)

      const response = await fetch(`/api/visitors?${params}`)
      const data = await response.json()

      // ✅ فلترة الدعوات - الدعوات تظهر في صفحة /invitations فقط
      const nonInvitationVisitors = (data.visitors || []).filter(
        (v: Visitor) => v.source !== 'invitation' && v.source !== 'member-invitation'
      )

      setVisitors(nonInvitationVisitors)
      setStats(data.stats || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVisitors()
  }, [searchTerm, statusFilter, sourceFilter])

  // إعادة تعيين الصفحة عند تغيير الفلاتر
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, sourceFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setFormData({ name: '', phone: '', notes: '', source: 'walk-in', interestedIn: '' })
        setMessage('✅ تم إضافة الزائر بنجاح!')
        setTimeout(() => setMessage(''), 3000)
        fetchVisitors()
        setShowForm(false)
      } else {
        setMessage(`❌ ${data.error || 'فشل إضافة الزائر'}`)
        setTimeout(() => setMessage(''), 5000)
      }
    } catch (error) {
      console.error(error)
      setMessage('❌ حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch('/api/visitors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      fetchVisitors()
      setMessage('✅ تم تحديث الحالة بنجاح!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error updating status:', error)
      setMessage('❌ فشل تحديث الحالة')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الزائر؟')) return

    try {
      await fetch(`/api/visitors?id=${id}`, { method: 'DELETE' })
      fetchVisitors()
      setMessage('✅ تم حذف الزائر بنجاح!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error deleting visitor:', error)
      setMessage('❌ فشل حذف الزائر')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      contacted: 'bg-blue-100 text-blue-800',
      subscribed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    const labels = {
      pending: 'معلق',
      contacted: 'تم التواصل',
      subscribed: 'مشترك',
      rejected: 'مرفوض',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const getSourceLabel = (source: string) => {
    const labels = {
      'walk-in': 'زيارة مباشرة',
      'facebook': 'فيسبوك',
      'instagram': 'إنستجرام',
      'friend': 'صديق',
      'other': 'أخرى',
    }
    return labels[source as keyof typeof labels] || source
  }

  // Pagination calculations
  const totalPages = Math.ceil(visitors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentVisitors = visitors.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold">إدارة الزوار</h1>
            <p className="text-gray-600 mt-2">قاعدة بيانات الزوار والعملاء المحتملين</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
          >
            {showForm ? 'إخفاء النموذج' : '➕ إضافة زائر جديد'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-5 shadow-lg">
            <div className="text-sm opacity-90 mb-1">إجمالي الزوار</div>
            <div className="text-4xl font-bold">{visitors.length}</div>
          </div>
          {stats.map((stat) => (
            <div key={stat.status} className="bg-white p-5 rounded-xl shadow-lg border-2">
              <div className="text-gray-500 text-sm font-medium mb-1">
                {stat.status === 'pending' && '⏳ معلق'}
                {stat.status === 'contacted' && '📞 تم التواصل'}
                {stat.status === 'subscribed' && '✅ مشترك'}
                {stat.status === 'rejected' && '❌ مرفوض'}
              </div>
              <div className="text-3xl font-bold">{stat._count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Add Visitor Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">إضافة زائر جديد</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">الاسم *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="اسم الزائر"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="01xxxxxxxxx"
                  pattern="^(010|011|012|015)[0-9]{8}$"
                  title="يجب أن يبدأ الرقم بـ 010، 011، 012، أو 015 ويتكون من 11 رقم"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">مصدر الزائر</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="walk-in">زيارة مباشرة</option>
                  <option value="facebook">فيسبوك</option>
                  <option value="instagram">إنستجرام</option>
                  <option value="friend">صديق</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">مهتم بـ</label>
                <input
                  type="text"
                  value={formData.interestedIn}
                  onChange={(e) => setFormData({ ...formData, interestedIn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="مثال: جيم، كلاسات، تدريب شخصي"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ملاحظات</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="أي ملاحظات عن الزائر..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الحفظ...' : 'إضافة زائر'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">بحث</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="ابحث بالاسم أو رقم الهاتف..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">فلتر حسب المصدر</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">الكل</option>
              <option value="walk-in">زيارة مباشرة</option>
              <option value="facebook">فيسبوك</option>
              <option value="instagram">إنستجرام</option>
              <option value="friend">صديق</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">فلتر حسب الحالة</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">الكل</option>
              <option value="pending">معلق</option>
              <option value="contacted">تم التواصل</option>
              <option value="subscribed">مشترك</option>
              <option value="rejected">مرفوض</option>
            </select>
          </div>
        </div>
      </div>

      {/* Visitors Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">جاري التحميل...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-right">الاسم</th>
                <th className="px-4 py-3 text-right">رقم الهاتف</th>
                <th className="px-4 py-3 text-right">المصدر</th>
                <th className="px-4 py-3 text-right">مهتم بـ</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">تاريخ الزيارة</th>
                <th className="px-4 py-3 text-right">ملاحظات</th>
                <th className="px-4 py-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {currentVisitors.map((visitor) => (
                <tr key={visitor.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{visitor.name}</td>
                  <td className="px-4 py-3 font-mono text-sm">{visitor.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {getSourceLabel(visitor.source)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {visitor.interestedIn || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={visitor.status}
                      onChange={(e) => handleUpdateStatus(visitor.id, e.target.value)}
                      className="text-xs px-2 py-1 rounded border"
                    >
                      <option value="pending">معلق</option>
                      <option value="contacted">تم التواصل</option>
                      <option value="subscribed">مشترك</option>
                      <option value="rejected">مرفوض</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(visitor.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {visitor.notes ? (
                      <p className="text-gray-600 max-w-xs truncate" title={visitor.notes}>
                        {visitor.notes}
                      </p>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(visitor.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {visitors.length > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 py-3 bg-gray-50 rounded-lg">
              {/* معلومات الصفحة */}
              <div className="text-sm text-gray-600">
                عرض {startIndex + 1} - {Math.min(endIndex, visitors.length)} من {visitors.length} زائر
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

          {visitors.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-3">🚶</div>
              <p>لا يوجد زوار حالياً</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
