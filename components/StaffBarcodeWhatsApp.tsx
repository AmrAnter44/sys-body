'use client'

import { useState } from 'react'

interface StaffBarcodeWhatsAppProps {
  staffCode: number
  staffName: string
  staffPhone: string
}

export default function StaffBarcodeWhatsApp({ staffCode, staffName, staffPhone }: StaffBarcodeWhatsAppProps) {
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [barcodeImage, setBarcodeImage] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // توليد الباركود عن طريق API مع إضافة S قبل الرقم
  const handleGenerateBarcode = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `S${staffCode}` }), // ✅ إضافة S قبل الرقم
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
    a.download = `barcode-staff-${staffCode}.png`
    a.click()
  }

  const handleSendBarcode = () => {
    if (!barcodeImage) return alert('يجب توليد الباركود أولاً')

    handleDownloadBarcode()

    setTimeout(() => {
      const message = `Barcode الموظف #${staffCode} (${staffName})`
      const phone = staffPhone.replace(/\D/g, '') // تنظيف رقم الهاتف
      const url = `https://wa.me/2${phone}?text=${encodeURIComponent(message)}`
      window.open(url, '_blank')

      alert('✅ تم تحميل صورة الباركود!\n📱 سيتم فتح واتساب الآن، قم بإرفاق الصورة المحملة مع الرسالة.')
    }, 500)
  }

  return (
    <>
      {/* أزرار مدمجة صغيرة */}
      <div className="flex gap-2">
        <button
          onClick={handleGenerateBarcode}
          disabled={loading}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm flex items-center gap-1"
          title="عرض Barcode"
        >
          🔢
        </button>

        <button
          onClick={handleSendBarcode}
          disabled={loading}
          className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm flex items-center gap-1"
          title="إرسال Barcode عبر واتساب"
        >
          📲
        </button>
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
              <h3 className="text-2xl font-bold">🔢 Barcode الموظف</h3>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                type="button"
              >
                ×
              </button>
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm text-purple-600 mb-2">الموظف</p>
              <p className="text-xl font-bold text-purple-800">{staffName}</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">#S{staffCode}</p>
            </div>

            <div className="bg-white border-2 border-purple-200 rounded-lg p-6 mb-6 flex justify-center">
              <div className="relative inline-block">
                {/* Barcode */}
                <img
                  src={barcodeImage}
                  alt={`Barcode S${staffCode}`}
                  className="max-w-full h-auto"
                  style={{ minWidth: '300px' }}
                />

                {/* Logo في نص الباركود */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-white rounded-lg shadow-lg p-3 border-2 border-purple-400">
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
