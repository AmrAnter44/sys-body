'use client'

import { useState } from 'react'
import { sendWhatsAppMessage, prepareReceiptMessage } from '../lib/barcodeUtils'

interface ReceiptWhatsAppProps {
  receipt: {
    id: string
    receiptNumber: number
    type: string
    amount: number
    itemDetails: string
    paymentMethod: string
    staffName?: string
    createdAt: string
    memberId?: string
    ptNumber?: number
    dayUseId?: string
  }
  onDetailsClick?: () => void
}

export default function ReceiptWhatsApp({ receipt, onDetailsClick }: ReceiptWhatsAppProps) {
  const [showSendModal, setShowSendModal] = useState(false)
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)

  const details = JSON.parse(receipt.itemDetails)

  const handleSendWhatsApp = () => {
    if (!phone || phone.trim().length < 10) {
      alert('⚠️ يرجى إدخال رقم هاتف صحيح')
      return
    }

    setSending(true)

    const receiptMessage = prepareReceiptMessage({
      receiptNumber: receipt.receiptNumber,
      type: receipt.type,
      amount: receipt.amount,
      memberName: details.memberName || details.clientName || details.name,
      memberNumber: details.memberNumber,
      date: receipt.createdAt,
      paymentMethod: receipt.paymentMethod,
      details: details
    })

    sendWhatsAppMessage(phone, receiptMessage)

    setTimeout(() => {
      setSending(false)
      setShowSendModal(false)
      setPhone('')
    }, 1000)
  }

  const handleAutoSend = () => {
    // البحث عن رقم الهاتف في التفاصيل
    const phoneNumber = details.phone || details.memberPhone || details.clientPhone
    
    if (!phoneNumber) {
      alert('⚠️ رقم الهاتف غير متوفر في تفاصيل الإيصال')
      return
    }

    const receiptMessage = prepareReceiptMessage({
      receiptNumber: receipt.receiptNumber,
      type: receipt.type,
      amount: receipt.amount,
      memberName: details.memberName || details.clientName || details.name,
      memberNumber: details.memberNumber,
      date: receipt.createdAt,
      paymentMethod: receipt.paymentMethod,
      details: details
    })

    sendWhatsAppMessage(phoneNumber, receiptMessage)
  }

  return (
    <>
      {/* أزرار الإجراءات */}
      <div className="flex gap-2">
        {/* زر التفاصيل */}
        {onDetailsClick && (
          <button
            onClick={onDetailsClick}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition font-medium shadow-md hover:shadow-lg flex items-center gap-1"
            title="عرض التفاصيل"
          >
            <span>👁️</span>
          </button>
        )}

        {/* زر إرسال واتساب سريع (إذا كان رقم الهاتف متوفر) */}
        {(details.phone || details.memberPhone || details.clientPhone) && (
          <button
            onClick={handleAutoSend}
            className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition font-medium shadow-md hover:shadow-lg flex items-center gap-1"
            title="إرسال للعميل"
          >
            <span>📲</span>
          </button>
        )}

        {/* زر إرسال واتساب يدوي */}
        <button
          onClick={() => setShowSendModal(true)}
          className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700 transition font-medium shadow-md hover:shadow-lg flex items-center gap-1"
          title="إرسال لرقم آخر"
        >
          <span>📱</span>
        </button>
      </div>

      {/* Modal إدخال رقم الهاتف */}
      {showSendModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSendModal(false)
              setPhone('')
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">📱</span>
                <div>
                  <h3 className="text-2xl font-bold">إرسال تفاصيل الإيصال</h3>
                  <p className="text-sm text-gray-500">إيصال #{receipt.receiptNumber}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSendModal(false)
                  setPhone('')
                }}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                type="button"
              >
                ×
              </button>
            </div>

            {/* معاينة الإيصال */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">رقم الإيصال:</span>
                  <span className="font-bold mr-2">#{receipt.receiptNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">المبلغ:</span>
                  <span className="font-bold mr-2 text-green-600">{receipt.amount} ج.م</span>
                </div>
                {details.memberName && (
                  <div className="col-span-2">
                    <span className="text-gray-600">العميل:</span>
                    <span className="font-bold mr-2">{details.memberName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* إدخال رقم الهاتف */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📞 رقم الهاتف <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-lg"
                dir="ltr"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 أدخل رقم الهاتف بصيغة 01xxxxxxxxx
              </p>
            </div>

            {/* معاينة الرسالة */}
            <div className="bg-green-50 border-r-4 border-green-500 rounded-lg p-4 mb-6">
              <p className="text-xs text-gray-600 mb-2">📝 معاينة الرسالة:</p>
              <div className="bg-white rounded-lg p-3 text-xs max-h-40 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans text-right">
{prepareReceiptMessage({
  receiptNumber: receipt.receiptNumber,
  type: receipt.type,
  amount: receipt.amount,
  memberName: details.memberName || details.clientName || details.name,
  memberNumber: details.memberNumber,
  date: receipt.createdAt,
  paymentMethod: receipt.paymentMethod,
  details: details
}).split('\n').slice(0, 10).join('\n')}
...
                </pre>
              </div>
            </div>

            {/* الأزرار */}
            <div className="flex gap-3">
              <button
                onClick={handleSendWhatsApp}
                disabled={sending || !phone || phone.trim().length < 10}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <span>📲</span>
                    <span>إرسال عبر واتساب</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setShowSendModal(false)
                  setPhone('')
                }}
                disabled={sending} 
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}