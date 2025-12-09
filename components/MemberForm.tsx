'use client'

import { useState, useRef, useEffect } from 'react'
import PaymentMethodSelector from '../components/Paymentmethodselector'
import { calculateDaysBetween, formatDateYMD } from '../lib/dateFormatter'
import { printReceiptFromData } from '../lib/printSystem'
import { usePermissions } from '../hooks/usePermissions'

interface MemberFormProps {
  onSuccess: () => void
  customCreatedAt?: Date | null
}

export default function MemberForm({ onSuccess, customCreatedAt }: MemberFormProps) {
  const { user } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [nextMemberNumber, setNextMemberNumber] = useState<number | null>(null)
  const [nextReceiptNumber, setNextReceiptNumber] = useState<number | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [offers, setOffers] = useState<any[]>([])
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
    isOther: false,
    skipReceipt: false  // ✅ خيار عدم إنشاء إيصال
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

    const fetchNextReceiptNumber = async () => {
      try {
        const response = await fetch('/api/receipts/next-number')
        const data = await response.json()
        if (data.nextNumber !== undefined && data.nextNumber !== null) {
          setNextReceiptNumber(data.nextNumber)
        }
      } catch (error) {
        console.error('❌ خطأ في جلب رقم الإيصال:', error)
      }
    }

    const fetchOffers = async () => {
      try {
        const response = await fetch('/api/offers?activeOnly=true')
        const data = await response.json()
        // التأكد من أن البيانات array
        if (Array.isArray(data)) {
          setOffers(data)
        } else {
          console.warn('⚠️ البيانات المستلمة ليست array:', data)
          setOffers([])
        }
      } catch (error) {
        console.error('❌ خطأ في جلب العروض:', error)
        setOffers([])
      }
    }

    fetchNextNumber()
    fetchNextReceiptNumber()
    fetchOffers()
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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // تصغير الصورة إذا كانت كبيرة جداً
          const maxDimension = 1200
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension
              width = maxDimension
            } else {
              width = (width / height) * maxDimension
              height = maxDimension
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          // ضغط الصورة بجودة 0.7
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const reader = new FileReader()
                reader.readAsDataURL(blob)
                reader.onloadend = () => {
                  resolve(reader.result as string)
                }
              } else {
                reject(new Error('فشل ضغط الصورة'))
              }
            },
            'image/jpeg',
            0.7
          )
        }
        img.onerror = () => reject(new Error('فشل تحميل الصورة'))
      }
      reader.onerror = () => reject(new Error('فشل قراءة الملف'))
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      setMessage('🔄 جاري ضغط الصورة...')
      const compressedBase64 = await compressImage(file)
      setImagePreview(compressedBase64)
      setFormData(prev => ({ ...prev, profileImage: compressedBase64 }))
      setMessage('')
    } catch (error) {
      console.error('خطأ في ضغط الصورة:', error)
      setMessage('❌ فشل ضغط الصورة، حاول مرة أخرى')
    }
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
      staffName: user?.name || '',
      customCreatedAt: customCreatedAt ? customCreatedAt.toISOString() : null
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
        if (formData.skipReceipt) {
          setMessage('✅ تم إضافة العضو بنجاح! (بدون إيصال)')
        } else {
          setMessage('✅ تم إضافة العضو بنجاح!')
        }

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
        
        // تحديث رقم الإيصال التالي
        const receiptResponse = await fetch('/api/receipts/next-number')
        const receiptData = await receiptResponse.json()
        if (receiptData.nextNumber) {
          setNextReceiptNumber(receiptData.nextNumber)
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

  // دالة تطبيق العرض
  const applyOffer = (offer: any) => {
    const startDate = formData.startDate || formatDateYMD(new Date())
    const expiryDate = new Date(startDate)
    expiryDate.setDate(expiryDate.getDate() + offer.duration)

    setFormData(prev => ({
      ...prev,
      subscriptionPrice: offer.price,
      freePTSessions: offer.freePTSessions,
      inBodyScans: offer.inBodyScans,
      invitations: offer.invitations,
      startDate,
      expiryDate: formatDateYMD(expiryDate)
    }))

    setMessage(`✅ تم تطبيق عرض: ${offer.name}`)
    setTimeout(() => setMessage(''), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg text-center font-medium ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* قسم العروض */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
        <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-purple-800">
          <span>🎁</span>
          <span>العروض المتاحة</span>
        </h3>
        <p className="text-sm text-gray-600 mb-4">اختر عرض لملء البيانات تلقائياً</p>

        {!Array.isArray(offers) || offers.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-sm">لا توجد عروض متاحة حالياً</p>
            <p className="text-xs text-gray-400 mt-2">يمكن للأدمن إضافة عروض من صفحة العروض</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {offers.map(offer => (
              <button
                key={offer.id}
                type="button"
                onClick={() => applyOffer(offer)}
                className="bg-white border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 rounded-xl p-4 transition transform hover:scale-105 hover:shadow-lg group"
              >
                <div className="text-3xl mb-2">{offer.icon}</div>
                <div className="font-bold text-purple-800 mb-1">{offer.name}</div>
                <div className="text-2xl font-bold text-green-600 mb-2">{offer.price} ج.م</div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>💪 {offer.freePTSessions} PT</div>
                  <div>⚖️ {offer.inBodyScans} InBody</div>
                  <div>🎟️ {offer.invitations} دعوات</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 bg-blue-100 border-r-4 border-blue-500 p-3 rounded">
          <p className="text-xs text-blue-800">
            <strong>💡 ملاحظة:</strong> يمكنك تعديل القيم بعد اختيار العرض
          </p>
        </div>
      </div>

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

        {nextReceiptNumber && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🧾</span>
              <div>
                <p className="text-sm font-medium text-green-800">رقم الإيصال التالي</p>
                <p className="text-2xl font-bold text-green-600">#{nextReceiptNumber}</p>
              </div>
            </div>
          </div>
        )}

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
            <label className="block text-sm font-medium mb-1">
              رقم الهاتف <span className="text-red-600">*</span>
            </label>
            <input
              type="tel"
              required
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

        {/* ✅ خيار عدم إنشاء إيصال */}
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
            <input
              type="checkbox"
              checked={formData.skipReceipt}
              onChange={(e) => setFormData({ ...formData, skipReceipt: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300"
            />
            <span className="text-sm font-bold text-yellow-800">
              🚫 عدم إنشاء إيصال (للأدمن فقط)
            </span>
          </label>
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
