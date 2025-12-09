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

  // البحث عن بيانات الزائر/العضو المختار
  const getSelectedVisitorInfo = () => {
    if (!formData.visitorId) return null

    // البحث في الزوار
    const visitor = visitors.find(v => v.id === formData.visitorId)
    if (visitor) return { name: visitor.name, phone: visitor.phone, type: 'زائر' }

    // البحث في الأعضاء المنتهيين (ID = expired-xxx)
    const expMember = expiredMembers.find((m: any) => m.id === formData.visitorId)
    if (expMember) {
      // إزالة "(عضو منتهي)" من الاسم إذا كان موجود
      const cleanName = expMember.name.replace(' (عضو منتهي)', '').trim()
      return { name: cleanName, phone: expMember.phone, type: 'عضو منتهي' }
    }

    // البحث في Day Use
    const dayUse = dayUseRecords.find(r => `dayuse-${r.id}` === formData.visitorId)
    if (dayUse) return { name: dayUse.name, phone: dayUse.phone, type: 'Day Use' }

    // البحث في Invitations
    const invitation = invitations.find(inv => `invitation-${inv.id}` === formData.visitorId)
    if (invitation) return { name: invitation.guestName, phone: invitation.guestPhone, type: 'دعوة' }

    return null
  }

  const selectedInfo = getSelectedVisitorInfo()

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
          {/* عرض معلومات الزائر/العضو المختار */}
          {selectedInfo ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                  {selectedInfo.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-gray-800">{selectedInfo.name}</h3>
                    <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded-full">
                      {selectedInfo.type}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">📱 {selectedInfo.phone}</p>
                </div>
              </div>
              {/* Hidden input to store visitorId */}
              <input type="hidden" name="visitorId" value={formData.visitorId} />
            </div>
          ) : (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-600 font-medium">⚠️ لم يتم اختيار عضو</p>
              <p className="text-red-500 text-sm mt-1">الرجاء إغلاق النافذة واختيار عضو من القائمة</p>
            </div>
          )}

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
