'use client'

import { useState, useRef, useEffect } from 'react'
import PaymentMethodSelector from '../components/Paymentmethodselector'
import { calculateDaysBetween, formatDateYMD } from '../lib/dateFormatter'
import { printReceiptFromData } from '../lib/printSystem'
import { usePermissions } from '../hooks/usePermissions'

interface MemberFormProps {
  onSuccess: () => void
}

export default function MemberForm({ onSuccess }: MemberFormProps) {
  const { user } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [nextMemberNumber, setNextMemberNumber] = useState<number | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    memberNumber: '',
    name: '',
    phone: '',
    profileImage: '',
    inBodyScans: 0,
    invitations: 0,
    freePTSessions: 0,
    subscriptionPrice: 0,
    remainingAmount: 0,
    notes: '',
    startDate: formatDateYMD(new Date()),
    expiryDate: '',
    paymentMethod: 'cash' as 'cash' | 'visa' | 'instapay' | 'wallet',
    staffName: user?.name || '',
    isOther: false
  })

  useEffect(() => {
    const fetchNextNumber = async () => {
      try {
        const response = await fetch('/api/members/next-number')
        const data = await response.json()

        console.log('📊 استجابة API:', data)

        if (data.nextNumber !== undefined && data.nextNumber !== null) {
          setNextMemberNumber(data.nextNumber)
          setFormData(prev => ({ ...prev, memberNumber: data.nextNumber.toString() }))
        } else {
          console.warn('⚠️ لم يتم إرجاع nextNumber، استخدام 1001')
          setNextMemberNumber(1001)
          setFormData(prev => ({ ...prev, memberNumber: '1001' }))
        }
      } catch (error) {
        console.error('❌ خطأ في جلب رقم العضوية:', error)
        setNextMemberNumber(1001)
        setFormData(prev => ({ ...prev, memberNumber: '1001' }))
        setMessage('⚠️ تعذر جلب رقم العضوية التالي، سيتم استخدام 1001')
        setTimeout(() => setMessage(''), 3000)
      }
    }

    fetchNextNumber()
  }, [])

  useEffect(() => {
    if (user && !formData.staffName) {
      setFormData(prev => ({ ...prev, staffName: user.name }))
    }
  }, [user])

  const handleOtherChange = (checked: boolean) => {
    console.log('🔄 تغيير Other:', checked)
    setFormData(prev => ({
      ...prev,
      isOther: checked,
      memberNumber: checked ? '' : (nextMemberNumber?.toString() || '')
    }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage('❌ يرجى اختيار صورة فقط')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ حجم الصورة يجب أن يكون أقل من 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setImagePreview(base64String)
      setFormData(prev => ({ ...prev, profileImage: base64String }))
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview('')
    setFormData(prev => ({ ...prev, profileImage: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const calculateExpiryFromMonths = (months: number) => {
    if (!formData.startDate) return
    
    const start = new Date(formData.startDate)
    const expiry = new Date(start)
    expiry.setMonth(expiry.getMonth() + months)
    
    setFormData(prev => ({ 
      ...prev, 
      expiryDate: formatDateYMD(expiry)
    }))
  }

  const calculateDuration = () => {
    if (!formData.startDate || !formData.expiryDate) return null
    return calculateDaysBetween(formData.startDate, formData.expiryDate)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (formData.startDate && formData.expiryDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.expiryDate)

      if (end <= start) {
        setMessage('❌ تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية')
        setLoading(false)
        return
      }
    }

    const cleanedData = {
      ...formData,
      isOther: formData.isOther,
      memberNumber: formData.isOther
        ? null
        : (formData.memberNumber ? parseInt(formData.memberNumber) : nextMemberNumber),
      inBodyScans: parseInt(formData.inBodyScans.toString()),
      invitations: parseInt(formData.invitations.toString()),
      freePTSessions: parseInt(formData.freePTSessions.toString()),
      subscriptionPrice: parseInt(formData.subscriptionPrice.toString()),
      remainingAmount: parseInt(formData.remainingAmount.toString()),
      staffName: user?.name || ''
    }

    console.log('📤 إرسال البيانات:', {
      isOther: cleanedData.isOther,
      memberNumber: cleanedData.memberNumber
    })

    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('✅ تم إضافة العضو بنجاح!')
        
        if (data.receipt) {
          console.log('🖨️ طباعة الإيصال باستخدام النظام الموحد...')
          
          setTimeout(() => {
            const subscriptionDays = formData.startDate && formData.expiryDate 
              ? calculateDaysBetween(formData.startDate, formData.expiryDate)
              : null

            const paidAmount = cleanedData.subscriptionPrice - cleanedData.remainingAmount

            const receiptDetails = {
              memberNumber: data.member.memberNumber,
              memberName: data.member.name,
              phone: data.member.phone,
              startDate: formData.startDate,
              expiryDate: formData.expiryDate,
              subscriptionDays: subscriptionDays,
              subscriptionPrice: cleanedData.subscriptionPrice,
              paidAmount: paidAmount,
              remainingAmount: cleanedData.remainingAmount,
              inBodyScans: cleanedData.inBodyScans,
              invitations: cleanedData.invitations,
              freePTSessions: cleanedData.freePTSessions,
              paymentMethod: formData.paymentMethod,
              staffName: formData.staffName
            }

            printReceiptFromData(
              data.receipt.receiptNumber,
              'Member',
              cleanedData.subscriptionPrice,
              receiptDetails,
              new Date(data.receipt.createdAt),
              formData.paymentMethod
            )
          }, 500)
        }
        
        setTimeout(() => {
          onSuccess()
        }, 2000)
      } else {
        setMessage(`❌ ${data.error || 'حدث خطأ'}`)
      }
    } catch (error) {
      setMessage('❌ حدث خطأ في الاتصال')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const duration = calculateDuration()
  const paidAmount = formData.subscriptionPrice - formData.remainingAmount

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg text-center font-medium ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span>👤</span>
          <span>المعلومات الأساسية</span>
        </h3>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">
              رقم العضوية {!formData.isOther && '*'}
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isOther}
                onChange={(e) => handleOtherChange(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Other (بدون رقم)</span>
            </label>
          </div>
          
          {formData.isOther ? (
            <div className="w-full px-3 py-2 border-2 border-dashed rounded-lg bg-gray-100 text-gray-500 text-center">
              لا يوجد رقم عضوية (Other)
            </div>
          ) : (
            <input
              type="number"
              required={!formData.isOther}
              value={formData.memberNumber}
              onChange={(e) => setFormData({ ...formData, memberNumber: e.target.value })}
              className="w-full px-3 py-2 border-2 rounded-lg"
              placeholder="مثال: 1001"
              disabled={formData.isOther}
            />
          )}
          
          {!formData.isOther && nextMemberNumber && (
            <p className="text-xs text-gray-500 mt-1">
              💡 الرقم التالي المقترح: {nextMemberNumber}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border-2 rounded-lg"
              placeholder="أحمد محمد"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border-2 rounded-lg"
              placeholder="01234567890"
              dir="ltr"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">اسم الموظف *</label>
          <input
            type="text"
            required
            value={formData.staffName}
            readOnly
            className="w-full px-3 py-2 border-2 rounded-lg bg-gray-100 cursor-not-allowed"
            placeholder="محمد علي"
          />
          <p className="text-xs text-gray-500 mt-1">
            👤 اسم الموظف الذي قام بإضافة العضو
          </p>
        </div>
      </div>

      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span>📷</span>
          <span>صورة البروفايل</span>
        </h3>

        <div className="flex flex-col items-center gap-4">
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-purple-400"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full border-4 border-dashed border-purple-300 flex items-center justify-center bg-purple-100">
              <span className="text-4xl text-purple-400">👤</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="profileImage"
          />
          
          <label
            htmlFor="profileImage"
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition"
          >
            {imagePreview ? '📷 تغيير الصورة' : '📷 رفع صورة'}
          </label>
          
          <p className="text-xs text-gray-500 text-center">
            يُفضل صورة بحجم 500×500 بكسل أو أكبر<br/>
            الحد الأقصى: 5MB
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
          <span>📅</span>
          <span>فترة الاشتراك</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              تاريخ البداية <span className="text-xs text-gray-500">(yyyy-mm-dd)</span>
            </label>
            <input
              type="text"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border-2 rounded-lg font-mono text-sm md:text-base"
              placeholder="2025-11-18"
              pattern="\d{4}-\d{2}-\d{2}"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              تاريخ الانتهاء <span className="text-xs text-gray-500">(yyyy-mm-dd)</span>
            </label>
            <input
              type="text"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="w-full px-3 py-2 border-2 rounded-lg font-mono text-sm md:text-base"
              placeholder="2025-12-18"
              pattern="\d{4}-\d{2}-\d{2}"
            />
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm font-medium mb-2">⚡ إضافة سريعة:</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 6, 9, 12].map(months => (
              <button
                key={months}
                type="button"
                onClick={() => calculateExpiryFromMonths(months)}
                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-sm transition"
              >
                + {months} {months === 1 ? 'شهر' : 'أشهر'}
              </button>
            ))}
          </div>
        </div>

        {duration !== null && (
          <div className="bg-white border-2 border-blue-300 rounded-lg p-3">
            <p className="text-sm">
              <span className="font-medium">📊 مدة الاشتراك: </span>
              <span className="font-bold text-blue-600">
                {duration} يوم
                {duration >= 30 && ` (${Math.floor(duration / 30)} ${Math.floor(duration / 30) === 1 ? 'شهر' : 'أشهر'})`}
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span>🎁</span>
          <span>الخدمات الإضافية</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">⚖️ InBody</label>
            <input
              type="number"
              min="0"
              value={formData.inBodyScans}
              onChange={(e) => setFormData({ ...formData, inBodyScans: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border-2 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">🎟️ دعوات</label>
            <input
              type="number"
              min="0"
              value={formData.invitations}
              onChange={(e) => setFormData({ ...formData, invitations: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border-2 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">💪 حصص PT مجانية</label>
            <input
              type="number"
              min="0"
              value={formData.freePTSessions}
              onChange={(e) => setFormData({ ...formData, freePTSessions: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border-2 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span>💰</span>
          <span>المعلومات المالية</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">سعر الاشتراك *</label>
            <input
              type="number"
              required
              min="0"
              value={formData.subscriptionPrice}
              onChange={(e) => setFormData({ ...formData, subscriptionPrice: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border-2 rounded-lg"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">المبلغ المتبقي</label>
            <input
              type="number"
              min="0"
              value={formData.remainingAmount}
              onChange={(e) => setFormData({ ...formData, remainingAmount: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border-2 rounded-lg"
              placeholder="0"
            />
          </div>
        </div>

        <div className="bg-white border-2 border-yellow-300 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">المبلغ المدفوع:</span>
            <span className="font-bold text-green-600 text-lg">
              {paidAmount} ج.م
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">المتبقي:</span>
            <span className="font-bold text-red-600 text-lg">
              {formData.remainingAmount} ج.م
            </span>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">طريقة الدفع</label>
          <PaymentMethodSelector
            value={formData.paymentMethod}
            onChange={(method) => setFormData({ 
              ...formData, 
              paymentMethod: method as 'cash' | 'visa' | 'instapay' | 'wallet'
            })}
          />
        </div>
      </div>

      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium mb-2">📝 ملاحظات</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border-2 rounded-lg"
          rows={3}
          placeholder="ملاحظات إضافية..."
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-bold text-lg transition"
        >
          {loading ? '⏳ جاري الحفظ...' : '✅ حفظ العضو'}
        </button>
      </div>

      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center">
        <p className="text-sm text-blue-800">
          🖨️ <strong>ملاحظة:</strong> سيتم طباعة الإيصال تلقائياً بعد إضافة العضو بنجاح
        </p>
      </div>
    </form>
  )
}
