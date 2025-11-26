'use client'

import React, { useState, useEffect } from 'react'

interface FollowUpFormProps {
  visitors: any[]
  expiredMembers: any[]
  dayUseRecords: any[]
  invitations: any[]
  initialVisitorId?: string
  onSubmit: (formData: {
    visitorId: string
    salesName: string
    notes: string
    result: string
    nextFollowUpDate: string
    contacted: boolean
  }) => Promise<void>
  onClose: () => void
}

export default function FollowUpForm({
  visitors,
  expiredMembers,
  dayUseRecords,
  invitations,
  initialVisitorId = '',
  onSubmit,
  onClose
}: FollowUpFormProps) {
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    visitorId: initialVisitorId,
    salesName: '',
    notes: '',
    result: '',
    nextFollowUpDate: '',
    contacted: false
  })

  // تحديث visitorId لما يتغير من الخارج
  useEffect(() => {
    if (initialVisitorId) {
      setFormData(prev => ({ ...prev, visitorId: initialVisitorId }))
    }
  }, [initialVisitorId])

  // فلترة الأعضاء المنتهيين بناءً على البحث (نعرض أول 50 بس)
  const filteredExpiredMembers = searchTerm
    ? expiredMembers
        .filter((m: any) =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.phone.includes(searchTerm)
        )
        .slice(0, 50)
    : expiredMembers.slice(0, 50) // أول 50 عضو بس لو مفيش بحث

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
      // Reset form
      setFormData({
        visitorId: '',
        salesName: '',
        notes: '',
        result: '',
        nextFollowUpDate: '',
        contacted: false
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>📝</span>
            <span>متابعة جديدة</span>
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Search Field */}
          <div>
            <label className="block text-sm font-medium mb-1">🔍 بحث عن عضو منتهي</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {expiredMembers.length > 50 && !searchTerm && (
              <p className="text-xs text-gray-500 mt-1">
                💡 يوجد {expiredMembers.length} عضو منتهي - استخدم البحث للوصول السريع
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الزائر *</label>
            <select
              required
              value={formData.visitorId}
              onChange={(e) => setFormData({ ...formData, visitorId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">اختر زائر</option>

              {/* الزوار */}
              {visitors.length > 0 && (
                <optgroup label="👤 زوار">
                  {visitors.map(visitor => (
                    <option key={visitor.id} value={visitor.id}>
                      {visitor.name} - {visitor.phone}
                    </option>
                  ))}
                </optgroup>
              )}

              {/* الأعضاء المنتهيين - نعرض النتائج المفلترة بس */}
              {filteredExpiredMembers.length > 0 && (
                <optgroup label={`❌ أعضاء منتهيين (${filteredExpiredMembers.length}${searchTerm ? ' من ' + expiredMembers.length : ''})`}>
                  {filteredExpiredMembers.map((member: any) => (
                    <option key={member.id} value={member.id}>
                      {member.name} - {member.phone}
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Day Use */}
              {dayUseRecords.length > 0 && (
                <optgroup label="🎁 استخدام يوم (Day Use)">
                  {dayUseRecords.map(record => (
                    <option key={`dayuse-${record.id}`} value={`dayuse-${record.id}`}>
                      {record.name} - {record.phone} ({record.serviceType})
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Invitations */}
              {invitations.length > 0 && (
                <optgroup label="👥 دعوات من أعضاء">
                  {invitations.map(inv => (
                    <option key={`invitation-${inv.id}`} value={`invitation-${inv.id}`}>
                      {inv.guestName} - {inv.guestPhone} (دعوة من {inv.member?.name || 'عضو'})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">اسم البائع *</label>
            <input
              type="text"
              required
              value={formData.salesName}
              onChange={(e) => setFormData({ ...formData, salesName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="اسم البائع"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الملاحظات *</label>
            <textarea
              required
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={3}
              placeholder="ماذا حدث؟"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">النتيجة</label>
              <select
                value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">اختر</option>
                <option value="interested">✅ مهتم</option>
                <option value="not-interested">❌ غير مهتم</option>
                <option value="postponed">⏸️ مؤجل</option>
                <option value="subscribed">🎉 اشترك</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">المتابعة القادمة</label>
              <input
                type="date"
                value={formData.nextFollowUpDate}
                onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer p-2 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              checked={formData.contacted}
              onChange={(e) => setFormData({ ...formData, contacted: e.target.checked })}
              className="rounded w-4 h-4"
            />
            <span className="text-sm font-medium">تم التواصل بالفعل</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
          >
            {loading ? 'جاري الحفظ...' : '✅ حفظ'}
          </button>
        </form>
      </div>
    </div>
  )
}
