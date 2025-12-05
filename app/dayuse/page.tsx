'use client'

import { useEffect, useState } from 'react'
import { ReceiptToPrint } from '../../components/ReceiptToPrint'
import PaymentMethodSelector from '../../components/Paymentmethodselector'
import { usePermissions } from '../../hooks/usePermissions'

interface DayUseEntry {
  id: string
  name: string
  phone: string
  serviceType: string
  price: number
  staffName: string
  createdAt: string
}

export default function DayUsePage() {
  const { user } = usePermissions()
  const [entries, setEntries] = useState<DayUseEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    serviceType: 'DayUse',
    price: 0,
    staffName: user?.name || '',
    paymentMethod: 'cash',
  })
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  const fetchEntries = async () => {
    try {
      const response = await fetch('/api/dayuse')
      const data = await response.json()
      setEntries(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [])

  useEffect(() => {
    if (user && !formData.staffName) {
      setFormData(prev => ({ ...prev, staffName: user.name }))
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/dayuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          staffName: user?.name || ''
        }),
      })

      if (response.ok) {
        const entry = await response.json()
        
        try {
          const receiptsResponse = await fetch(`/api/receipts?dayUseId=${entry.id}`)
          const receipts = await receiptsResponse.json()
          
          if (receipts.length > 0) {
            const receipt = receipts[0]
            setReceiptData({
              receiptNumber: receipt.receiptNumber,
              type: receipt.type,
              amount: receipt.amount,
              details: JSON.parse(receipt.itemDetails),
              date: new Date(receipt.createdAt),
              paymentMethod: formData.paymentMethod  // ✅ تمرير paymentMethod من الفورم
            })
            setShowReceipt(true)
          }
        } catch (err) {
          console.error('Error fetching receipt:', err)
        }

        setFormData({
          name: '',
          phone: '',
          serviceType: 'DayUse',
          price: 0,
          staffName: user?.name || '',
          paymentMethod: 'cash',
        })
        
        setMessage('✅ تم التسجيل بنجاح!')
        setTimeout(() => setMessage(''), 3000)
        fetchEntries()
        setShowForm(false)
      } else {
        setMessage('❌ فشل التسجيل')
      }
    } catch (error) {
      console.error(error)
      setMessage('❌ حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">يوم استخدام / InBody</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
        >
          {showForm ? 'إخفاء النموذج' : 'إضافة عملية جديدة'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">إضافة عملية جديدة</h2>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">الاسم</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="اسم الزائر"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="01xxxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">نوع الخدمة</label>
                <select
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="DayUse">يوم استخدام</option>
                  <option value="InBody">InBody</option>
                  <option value="LockerRental">تأجير لوجر</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">السعر</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">اسم الموظف</label>
                <input
                  type="text"
                  required
                  value={formData.staffName}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                  placeholder="اسم الموظف"
                />
              </div>
            </div>

            {/* قسم طريقة الدفع */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-5">
              <PaymentMethodSelector
                value={formData.paymentMethod}
                onChange={(method) => setFormData({ ...formData, paymentMethod: method })}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري الحفظ...' : 'إضافة'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-right">الاسم</th>
                <th className="px-4 py-3 text-right">الهاتف</th>
                <th className="px-4 py-3 text-right">نوع الخدمة</th>
                <th className="px-4 py-3 text-right">السعر</th>
                <th className="px-4 py-3 text-right">الموظف</th>
                <th className="px-4 py-3 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{entry.name}</td>
                  <td className="px-4 py-3">{entry.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      entry.serviceType === 'DayUse'
                        ? 'bg-blue-100 text-blue-800'
                        : entry.serviceType === 'InBody'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {entry.serviceType === 'DayUse' ? 'يوم استخدام' :
                       entry.serviceType === 'InBody' ? 'InBody' : 'تأجير لوجر'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{entry.price} ج.م</td>
                  <td className="px-4 py-3">{entry.staffName}</td>
                  <td className="px-4 py-3">
                    {new Date(entry.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {entries.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              لا توجد عمليات حالياً
            </div>
          )}
        </div>
      )}

      {receiptData && (
        <div className="mt-6">
          <button
            onClick={() => setShowReceipt(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            🖨️ طباعة آخر إيصال
          </button>
        </div>
      )}

      {showReceipt && receiptData && (
        <ReceiptToPrint
          receiptNumber={receiptData.receiptNumber}
          type={receiptData.type}
          amount={receiptData.amount}
          details={receiptData.details}
          date={receiptData.date}
          paymentMethod={receiptData.paymentMethod}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  )
}