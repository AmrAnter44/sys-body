'use client'

import { useState } from 'react'

interface BarcodeWhatsAppProps {
  memberNumber: number
  memberName: string
  memberPhone: string
}

export default function BarcodeWhatsApp({ memberNumber, memberName, memberPhone }: BarcodeWhatsAppProps) {
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [barcodeImage, setBarcodeImage] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // توليد الباركود عن طريق API
  const handleGenerateBarcode = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: memberNumber.toString() }),
      })

      const data = await res.json()
      if (data.barcode) {
        setBarcodeImage(data.barcode)
        setShowBarcodeModal(true)
      } else {
        alert('حدث خطأ أثناء توليد الباركود')
      }
    } catch (error) {
      console.error('Error generating barcode:', error)
      alert('حدث خطأ أثناء توليد الباركود')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadBarcode = () => {
    if (!barcodeImage) return
    const a = document.createElement('a')
    a.href = barcodeImage
    a.download = `barcode-${memberNumber}.png`
    a.click()
  }

  const handleSendBarcode = () => {
    if (!barcodeImage) return alert('يجب توليد الباركود أولاً')

    handleDownloadBarcode()

    setTimeout(() => {
      const message = `Barcode العضوية #${memberNumber} للعضو ${memberName}\n\n🌐 *الموقع الإلكتروني:*\nhttps://www.xgym.website/`
      const phone = memberPhone.replace(/\D/g, '') // تنظيف رقم الهاتف
      const url = `https://wa.me/2${phone}?text=${encodeURIComponent(message)}`
      window.open(url, '_blank')

      alert('✅ تم تحميل صورة الباركود!\n📱 سيتم فتح واتساب الآن، قم بإرفاق الصورة المحملة مع الرسالة.')
    }, 500)
  }

  return (
    <>
      {/* زر عرض/إرسال الباركود */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <span className="text-3xl">📱</span>
          </div>
          <div>
            <h3 className="text-xl font-bold">Barcode العضوية</h3>
            <p className="text-sm text-gray-600">عرض أو إرسال باركود رقم العضوية</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGenerateBarcode}
            disabled={loading}
            className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-2"
          >
            <span>🔢</span>
            <span>عرض Barcode</span>
          </button>
          
          <button
            onClick={handleSendBarcode}
            disabled={loading}
            className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-2"
          >
            <span>📲</span>
            <span>تحميل وإرسال واتساب</span>
          </button>
        </div>
      </div>

      {/* Modal عرض الباركود */}
      {showBarcodeModal && barcodeImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBarcodeModal(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">🔢 Barcode العضوية</h3>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                type="button"
              >
                ×
              </button>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm text-blue-600 mb-2">العضو</p>
              <p className="text-xl font-bold text-blue-800">{memberName}</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">#{memberNumber}</p>
            </div>

            <div className="bg-white border-2 border-blue-200 rounded-lg p-6 mb-6 flex justify-center">
              <div className="relative inline-block">
                {/* Barcode */}
                <img
                  src={barcodeImage}
                  alt={`Barcode ${memberNumber}`}
                  className="max-w-full h-auto"
                  style={{ minWidth: '300px' }}
                />

                {/* Logo في نص الباركود */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-white rounded-lg shadow-lg p-3 border-2 border-blue-400">
                    <img
                      src="/icon.png"
                      alt="Gym Logo"
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleDownloadBarcode}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-bold flex items-center justify-center gap-2"
              >
                <span>💾</span>
                <span>تحميل الصورة</span>
              </button>

              <button
                onClick={() => {
                  handleSendBarcode()
                  setShowBarcodeModal(false)
                }}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold flex items-center justify-center gap-2"
              >
                <span>📲</span>
                <span>تحميل وإرسال عبر واتساب</span>
              </button>

              <button
                onClick={() => setShowBarcodeModal(false)}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
