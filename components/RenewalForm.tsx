'use client'

import { useState, useEffect } from 'react'
import PaymentMethodSelector from './Paymentmethodselector'
import { calculateDaysBetween, formatDateYMD } from '../lib/dateFormatter'
import { usePermissions } from '../hooks/usePermissions'

interface Member {
  id: string
  memberNumber: number
  name: string
  phone: string
  inBodyScans: number
  invitations: number
  freePTSessions?: number
  subscriptionPrice: number
  remainingAmount: number
  notes?: string
  isActive: boolean
  startDate?: string
  expiryDate?: string
  createdAt: string
}

interface Receipt {
  receiptNumber: number
  amount: number
  paymentMethod: string
  createdAt: string
  itemDetails: {
    memberNumber?: number
    memberName?: string
    subscriptionPrice?: number
    paidAmount?: number
    remainingAmount?: number
    freePTSessions?: number
    inBodyScans?: number
    invitations?: number
    startDate?: string
    expiryDate?: string
    subscriptionDays?: number
    staffName?: string
    [key: string]: any
  }
}

interface RenewalFormProps {
  member: Member
  onSuccess: (receipt?: Receipt) => void
  onClose: () => void
}

export default function RenewalForm({ member, onSuccess, onClose }: RenewalFormProps) {
  const { user } = usePermissions()
  const [subscriptionPrice, setSubscriptionPrice] = useState('')
  const [remainingAmount, setRemainingAmount] = useState('0')
  const [freePTSessions, setFreePTSessions] = useState('0')
  const [inBodyScans, setInBodyScans] = useState('0')
  const [invitations, setInvitations] = useState('0')
  const [startDate, setStartDate] = useState(formatDateYMD(new Date()))
  const [expiryDate, setExpiryDate] = useState('')
  const [notes, setNotes] = useState(member.notes || '')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [staffName, setStaffName] = useState(user?.name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && !staffName) {
      setStaffName(user.name)
    }
  }, [user])

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0
    return calculateDaysBetween(start, end)
  }

  const calculateExpiryFromMonths = (months: number) => {
    if (!startDate) return
    
    const start = new Date(startDate)
    const expiry = new Date(start)
    expiry.setMonth(expiry.getMonth() + months)
    
    setExpiryDate(formatDateYMD(expiry))
  }

  const calculatePaidAmount = () => {
    const price = parseInt(subscriptionPrice) || 0
    const remaining = parseInt(remainingAmount) || 0
    return price - remaining
  }

  const handleRenewal = async () => {
    if (!subscriptionPrice || parseInt(subscriptionPrice) <= 0) {
      setError('⚠️ يرجى إدخال سعر اشتراك صحيح')
      return
    }

    if (!startDate || !expiryDate) {
      setError('⚠️ يرجى تحديد تاريخ البداية والانتهاء')
      return
    }

    if (new Date(expiryDate) <= new Date(startDate)) {
      setError('⚠️ تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('📄 إرسال طلب التجديد...')

      const response = await fetch('/api/members/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          subscriptionPrice: parseInt(subscriptionPrice),
          remainingAmount: parseInt(remainingAmount) || 0,
          freePTSessions: parseInt(freePTSessions) || 0,
          inBodyScans: parseInt(inBodyScans) || 0,
          invitations: parseInt(invitations) || 0,
          startDate,
          expiryDate,
          notes,
          paymentMethod,
          staffName: user?.name || ''
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        console.log('✅ تم التجديد بنجاح:', data)
        
        if (data.receipt) {
          onSuccess(data.receipt)
        } else {
          onSuccess()
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || '❌ فشل تجديد الاشتراك')
      }
    } catch (error) {
      console.error('❌ خطأ في التجديد:', error)
      setError('❌ حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  const duration = calculateDays(startDate, expiryDate)
  const totalAmount = subscriptionPrice ? parseInt(subscriptionPrice) : 0
  const totalSessions = (member.freePTSessions || 0) + (parseInt(freePTSessions) || 0)

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <span>🔄</span>
            <span>تجديد اشتراك</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded-lg mb-6">
          <h4 className="font-bold text-blue-900 mb-2">معلومات العضو</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <p className="text-blue-800">
              <strong>الاسم:</strong> {member.name}
            </p>
            <p className="text-blue-800">
              <strong>رقم العضوية:</strong> #{member.memberNumber}
            </p>
            <p className="text-blue-800">
              <strong>حصص PT الحالية:</strong> {member.freePTSessions || 0}
            </p>
            <p className="text-blue-800">
              <strong>InBody الحالي:</strong> {member.inBodyScans || 0}
            </p>
            <p className="text-blue-800">
              <strong>الدعوات الحالية:</strong> {member.invitations || 0}
            </p>
            {member.expiryDate && (
              <p className="text-blue-800">
                <strong>تاريخ الانتهاء السابق:</strong> {formatDateYMD(member.expiryDate)}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg mb-4">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleRenewal(); }} className="space-y-6">
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>💰</span>
              <span>تفاصيل التجديد</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  سعر الاشتراك <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={subscriptionPrice}
                  onChange={(e) => setSubscriptionPrice(e.target.value)}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="مثال: 1000"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  المبلغ المتبقي
                </label>
                <input
                  type="number"
                  value={remainingAmount}
                  onChange={(e) => setRemainingAmount(e.target.value)}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  اسم الموظف <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={staffName}
                  readOnly
                  className="w-full px-3 py-2 md:px-4 md:py-3 border-2 rounded-lg bg-gray-100 cursor-not-allowed"
                  placeholder="اسم الموظف المجدد"
                />
              </div>
            </div>

            {subscriptionPrice && (
              <div className="mt-4 bg-green-50 border-2 border-green-300 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  💵 <strong>المبلغ المدفوع:</strong> {calculatePaidAmount()} جنيه
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>🎁</span>
              <span>الحصص الإضافية (اختياري)</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  🏋️ حصص PT إضافية
                </label>
                <input
                  type="number"
                  value={freePTSessions}
                  onChange={(e) => setFreePTSessions(e.target.value)}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border-2 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="0"
                  min="0"
                />
                {parseInt(freePTSessions) > 0 && (
                  <p className="text-xs text-purple-600 mt-1">
                    ✅ الإجمالي: {(member.freePTSessions || 0) + parseInt(freePTSessions)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  ⚖️ InBody Scans إضافية
                </label>
                <input
                  type="number"
                  value={inBodyScans}
                  onChange={(e) => setInBodyScans(e.target.value)}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border-2 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="0"
                  min="0"
                />
                {parseInt(inBodyScans) > 0 && (
                  <p className="text-xs text-purple-600 mt-1">
                    ✅ الإجمالي: {(member.inBodyScans || 0) + parseInt(inBodyScans)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  🎟️ دعوات إضافية
                </label>
                <input
                  type="number"
                  value={invitations}
                  onChange={(e) => setInvitations(e.target.value)}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border-2 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="0"
                  min="0"
                />
                {parseInt(invitations) > 0 && (
                  <p className="text-xs text-purple-600 mt-1">
                    ✅ الإجمالي: {(member.invitations || 0) + parseInt(invitations)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>📅</span>
              <span>فترة الاشتراك</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  تاريخ البداية <span className="text-red-600">*</span> <span className="text-xs text-gray-500">(yyyy-mm-dd)</span>
                </label>
                <input
                  type="text"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm md:text-base"
                  placeholder="2025-11-18"
                  pattern="\d{4}-\d{2}-\d{2}"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  تاريخ الانتهاء <span className="text-red-600">*</span> <span className="text-xs text-gray-500">(yyyy-mm-dd)</span>
                </label>
                <input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm md:text-base"
                  placeholder="2025-12-18"
                  pattern="\d{4}-\d{2}-\d{2}"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
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

            {duration > 0 && expiryDate && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  ⏱️ <strong>مدة الاشتراك:</strong> {duration} يوم
                  {duration >= 30 && 
                    ` (${Math.floor(duration / 30)} ${Math.floor(duration / 30) === 1 ? 'شهر' : 'أشهر'})`
                  }
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>💳</span>
              <span>طريقة الدفع</span>
            </h4>
            <PaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              📝 ملاحظات (اختياري)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 md:px-4 md:py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500"
              rows={3}
              placeholder="أي ملاحظات إضافية..."
            />
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>📊</span>
              <span>ملخص التجديد</span>
            </h4>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">الجلسات الحالية:</span>
                <span className="font-bold">{member.freePTSessions || 0} جلسة</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">الجلسات الجديدة:</span>
                <span className="font-bold text-green-600">+ {parseInt(freePTSessions) || 0} جلسة</span>
              </div>
              <div className="border-t-2 border-gray-300 pt-3">
                <div className="flex justify-between text-xl">
                  <span className="font-bold">الإجمالي بعد التجديد:</span>
                  <span className="font-bold text-orange-600">{totalSessions} جلسة</span>
                </div>
              </div>
              <div className="bg-green-100 border-r-4 border-green-500 p-3 rounded mt-3">
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-gray-800">المبلغ المدفوع:</span>
                  <span className="font-bold text-green-600">{calculatePaidAmount()} ج.م</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 sticky bottom-0 bg-white pt-4 border-t">
            <button
              type="submit"
              disabled={loading || duration <= 0}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 font-bold text-lg shadow-lg transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span>جاري التجديد...</span>
                </span>
              ) : (
                '✅ تأكيد التجديد'
              )}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-8 bg-gray-200 text-gray-700 py-4 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 font-bold"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}