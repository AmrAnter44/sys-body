'use client'

import { useEffect, useState } from 'react'
import { printReceiptFromData } from '../../lib/printSystem'
import ReceiptWhatsApp from '../../components/ReceiptWhatsApp'

interface ReceiptData {
  id: string
  receiptNumber: number
  type: string
  amount: number
  itemDetails: string
  paymentMethod: string
  staffName?: string
  createdAt: string
  memberId?: string
  ptId?: string
  dayUseId?: string
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptData[]>([])
  const [filteredReceipts, setFilteredReceipts] = useState<ReceiptData[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [nextReceiptNumber, setNextReceiptNumber] = useState<number>(1000)
  
  // حالات Modal التعديل
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<ReceiptData | null>(null)
  const [editFormData, setEditFormData] = useState({
    receiptNumber: '',
    amount: '',
    paymentMethod: '',
    staffName: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateMessage, setUpdateMessage] = useState('')

  // حالات Modal التفاصيل
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptData | null>(null)

  // حالات Modal الحذف
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingReceipt, setDeletingReceipt] = useState<ReceiptData | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchReceipts = async () => {
    try {
      const response = await fetch('/api/receipts')
      const data = await response.json()
      setReceipts(data)
      setFilteredReceipts(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNextReceiptNumber = async () => {
    try {
      const response = await fetch('/api/receipts/next-number')
      const data = await response.json()
      setNextReceiptNumber(data.nextNumber)
    } catch (error) {
      console.error('Error fetching next receipt number:', error)
    }
  }

  // فتح Modal التعديل
  const handleOpenEditModal = (receipt: ReceiptData) => {
    setEditingReceipt(receipt)
    setEditFormData({
      receiptNumber: receipt.receiptNumber.toString(),
      amount: receipt.amount.toString(),
      paymentMethod: receipt.paymentMethod,
      staffName: receipt.staffName || ''
    })
    setShowEditModal(true)
    setUpdateMessage('')
  }

  // تحديث الإيصال
  const handleUpdateReceipt = async () => {
    if (!editingReceipt) return

    const receiptNum = parseInt(editFormData.receiptNumber)
    const amount = parseFloat(editFormData.amount)

    if (!receiptNum || receiptNum < 1) {
      setUpdateMessage('⚠️ رقم الإيصال غير صحيح')
      return
    }

    if (!amount || amount <= 0) {
      setUpdateMessage('⚠️ المبلغ غير صحيح')
      return
    }

    setIsUpdating(true)
    setUpdateMessage('')

    try {
      const response = await fetch('/api/receipts/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: editingReceipt.id,
          receiptNumber: receiptNum,
          amount: amount,
          paymentMethod: editFormData.paymentMethod,
          staffName: editFormData.staffName || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        setUpdateMessage('✅ تم تحديث الإيصال بنجاح')
        await fetchReceipts()
        
        setTimeout(() => {
          setShowEditModal(false)
          setUpdateMessage('')
          setEditingReceipt(null)
        }, 2000)
      } else {
        setUpdateMessage(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating receipt:', error)
      setUpdateMessage('❌ حدث خطأ أثناء التحديث')
    } finally {
      setIsUpdating(false)
    }
  }

  // فتح Modal الحذف
  const handleOpenDeleteModal = (receipt: ReceiptData) => {
    setDeletingReceipt(receipt)
    setShowDeleteModal(true)
  }

  // حذف الإيصال
  const handleDeleteReceipt = async () => {
    if (!deletingReceipt) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/receipts/update?id=${deletingReceipt.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        await fetchReceipts()
        setShowDeleteModal(false)
        setDeletingReceipt(null)
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting receipt:', error)
      alert('❌ حدث خطأ أثناء الحذف')
    } finally {
      setIsDeleting(false)
    }
  }

  // فتح Modal التفاصيل
  const handleOpenDetailsModal = (receipt: ReceiptData) => {
    setViewingReceipt(receipt)
    setShowDetailsModal(true)
  }

  useEffect(() => {
    fetchReceipts()
    fetchNextReceiptNumber()
  }, [])

  useEffect(() => {
    let filtered = receipts

    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.type === filterType)
    }

    if (filterPaymentMethod !== 'all') {
      filtered = filtered.filter(r => r.paymentMethod === filterPaymentMethod)
    }

    if (searchTerm) {
      filtered = filtered.filter(r => {
        const details = JSON.parse(r.itemDetails)
        return (
          r.receiptNumber.toString().includes(searchTerm) ||
          details.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          details.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          details.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (details.memberNumber && details.memberNumber.toString().includes(searchTerm)) ||
          r.staffName?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    if (dateFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter(r => {
        const receiptDate = new Date(r.createdAt)
        
        if (dateFilter === 'today') {
          return receiptDate.toDateString() === now.toDateString()
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return receiptDate >= weekAgo
        } else if (dateFilter === 'month') {
          return receiptDate.getMonth() === now.getMonth() && 
                 receiptDate.getFullYear() === now.getFullYear()
        }
        return true
      })
    }

    setFilteredReceipts(filtered)
  }, [filterType, filterPaymentMethod, searchTerm, dateFilter, receipts])

  const getTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'Member': 'اشتراك عضوية',
      'PT': 'تدريب شخصي',
      'DayUse': 'يوم استخدام',
      'InBody': 'InBody',
      'Payment': 'دفع متبقي'
    }
    return types[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'Member': 'bg-blue-100 text-blue-800',
      'PT': 'bg-green-100 text-green-800',
      'DayUse': 'bg-purple-100 text-purple-800',
      'InBody': 'bg-orange-100 text-orange-800',
      'Payment': 'bg-yellow-100 text-yellow-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      'cash': 'كاش 💵',
      'visa': 'فيزا 💳',
      'instapay': 'إنستا باي 📱',
      'wallet': 'محفظة 💰'
    }
    return methods[method] || 'كاش 💵'
  }

  const getPaymentMethodColor = (method: string) => {
    const colors: { [key: string]: string } = {
      'cash': 'bg-green-100 text-green-800 border-green-300',
      'visa': 'bg-blue-100 text-blue-800 border-blue-300',
      'instapay': 'bg-purple-100 text-purple-800 border-purple-300',
      'wallet': 'bg-orange-100 text-orange-800 border-orange-300'
    }
    return colors[method] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getTotalRevenue = () => {
    return filteredReceipts.reduce((sum, r) => sum + r.amount, 0)
  }

  const getTodayCount = () => {
    const today = new Date().toDateString()
    return receipts.filter(r => new Date(r.createdAt).toDateString() === today).length
  }

  const getRevenueByPaymentMethod = (method: string) => {
    return receipts
      .filter(r => r.paymentMethod === method)
      .reduce((sum, r) => sum + r.amount, 0)
  }

  const handlePrintReceipt = (receipt: ReceiptData) => {
    const details = JSON.parse(receipt.itemDetails)
    printReceiptFromData(
      receipt.receiptNumber,
      receipt.type,
      receipt.amount,
      details,
      receipt.createdAt,
      receipt.paymentMethod
    )
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🧾 سجل الإيصالات</h1>
        <p className="text-gray-600">متابعة وإدارة جميع الإيصالات الصادرة</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm opacity-90">إجمالي الإيصالات</p>
            <span className="text-3xl">📊</span>
          </div>
          <p className="text-3xl font-bold">{filteredReceipts.length}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm opacity-90">الإيرادات المعروضة</p>
            <span className="text-3xl">💰</span>
          </div>
          <p className="text-3xl font-bold">{getTotalRevenue().toFixed(0)} ج.م</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm opacity-90">إيصالات اليوم</p>
            <span className="text-3xl">📅</span>
          </div>
          <p className="text-3xl font-bold">{getTodayCount()}</p>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm opacity-90">الإيصال التالي</p>
            <span className="text-3xl">🔢</span>
          </div>
          <p className="text-3xl font-bold">#{nextReceiptNumber}</p>
        </div>
      </div>

      {/* Payment Methods Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border-2 border-green-200 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-gray-600">كاش</p>
              <p className="text-2xl font-bold text-green-600">
                {getRevenueByPaymentMethod('cash').toFixed(0)} ج.م
              </p>
            </div>
            <span className="text-4xl">💵</span>
          </div>
          <p className="text-xs text-gray-500">
            {receipts.filter(r => r.paymentMethod === 'cash').length} إيصال
          </p>
        </div>

        <div className="bg-white border-2 border-blue-200 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-gray-600">فيزا</p>
              <p className="text-2xl font-bold text-blue-600">
                {getRevenueByPaymentMethod('visa').toFixed(0)} ج.م
              </p>
            </div>
            <span className="text-4xl">💳</span>
          </div>
          <p className="text-xs text-gray-500">
            {receipts.filter(r => r.paymentMethod === 'visa').length} إيصال
          </p>
        </div>

        <div className="bg-white border-2 border-purple-200 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-gray-600">إنستا باي</p>
              <p className="text-2xl font-bold text-purple-600">
                {getRevenueByPaymentMethod('instapay').toFixed(0)} ج.م
              </p>
            </div>
            <span className="text-4xl">📱</span>
          </div>
          <p className="text-xs text-gray-500">
            {receipts.filter(r => r.paymentMethod === 'instapay').length} إيصال
          </p>
        </div>

        <div className="bg-white border-2 border-orange-200 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-gray-600">محفظة</p>
              <p className="text-2xl font-bold text-orange-600">
                {getRevenueByPaymentMethod('wallet').toFixed(0)} ج.م
              </p>
            </div>
            <span className="text-4xl">💰</span>
          </div>
          <p className="text-xs text-gray-500">
            {receipts.filter(r => r.paymentMethod === 'wallet').length} إيصال
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">🔍 البحث</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="رقم، اسم، موظف..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">📋 نوع العملية</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الأنواع</option>
              <option value="Member">اشتراكات العضوية</option>
              <option value="PT">التدريب الشخصي</option>
              <option value="DayUse">يوم استخدام</option>
              <option value="InBody">InBody</option>
              <option value="Payment">دفع متبقي</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">💳 طريقة الدفع</label>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الطرق</option>
              <option value="cash">كاش 💵</option>
              <option value="visa">فيزا 💳</option>
              <option value="instapay">إنستا باي 📱</option>
              <option value="wallet">محفظة 💰</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">📅 الفترة الزمنية</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">كل الفترات</option>
              <option value="today">اليوم</option>
              <option value="week">آخر أسبوع</option>
              <option value="month">هذا الشهر</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterType('all')
                setFilterPaymentMethod('all')
                setDateFilter('all')
              }}
              className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              🔄 إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">جاري تحميل الإيصالات...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="px-6 py-4 text-right font-bold">رقم الإيصال</th>
                  <th className="px-6 py-4 text-right font-bold">النوع</th>
                  <th className="px-6 py-4 text-right font-bold">التفاصيل</th>
                  <th className="px-6 py-4 text-right font-bold">المبلغ</th>
                  <th className="px-6 py-4 text-right font-bold">طريقة الدفع</th>
                  <th className="px-6 py-4 text-right font-bold">الموظف</th>
                  <th className="px-6 py-4 text-right font-bold">التاريخ</th>
                  <th className="px-6 py-4 text-right font-bold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => {
                  const details = JSON.parse(receipt.itemDetails)
                  return (
                    <tr key={receipt.id} className="border-t hover:bg-blue-50 transition">
                      <td className="px-6 py-4">
                        <span className="font-bold text-xl text-green-600">
                          #{receipt.receiptNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(receipt.type)}`}>
                          {getTypeLabel(receipt.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {details.memberNumber && (
                          <div className="mb-1">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                              عضوية #{details.memberNumber}
                            </span>
                          </div>
                        )}
                        {details.memberName && (
                          <div>
                            <p className="font-semibold text-gray-800">{details.memberName}</p>
                          </div>
                        )}
                        {details.clientName && (
                          <div>
                            <p className="font-semibold text-gray-800">{details.clientName}</p>
                            <p className="text-sm text-gray-600">{details.sessionsPurchased} جلسة - {details.coachName}</p>
                          </div>
                        )}
                        {details.name && (
                          <div>
                            <p className="font-semibold text-gray-800">{details.name}</p>
                            <p className="text-sm text-gray-600">{details.serviceType === 'DayUse' ? 'يوم استخدام' : 'InBody'}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-xl text-green-600">{receipt.amount} ج.م</span>
                          {details.remainingAmount > 0 && (
                            <p className="text-xs text-red-600 mt-1">
                              متبقي: {details.remainingAmount} ج.م
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-2 rounded-lg text-sm font-bold border-2 ${getPaymentMethodColor(receipt.paymentMethod)}`}>
                          {getPaymentMethodLabel(receipt.paymentMethod)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {receipt.staffName ? (
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">👷</span>
                            <span className="font-medium text-gray-800">{receipt.staffName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">
                            {new Date(receipt.createdAt).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(receipt.createdAt).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ReceiptWhatsApp 
                          receipt={receipt}
                          onDetailsClick={() => handleOpenDetailsModal(receipt)}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handlePrintReceipt(receipt)}
                            className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition font-medium shadow-md hover:shadow-lg flex items-center gap-1"
                            title="طباعة"
                          >
                            <span>🖨️</span>
                          </button>
                          
                          <button
                            onClick={() => handleOpenEditModal(receipt)}
                            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition font-medium shadow-md hover:shadow-lg flex items-center gap-1"
                            title="تعديل"
                          >
                            <span>✏️</span>
                          </button>
                          
                          <button
                            onClick={() => handleOpenDeleteModal(receipt)}
                            className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition font-medium shadow-md hover:shadow-lg flex items-center gap-1"
                            title="حذف"
                          >
                            <span>🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredReceipts.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl font-medium">لا توجد إيصالات تطابق البحث</p>
              <p className="text-sm mt-2">جرّب تغيير معايير البحث أو الفلترة</p>
            </div>
          )}
        </div>
      )}

      {/* Modal تفاصيل الإيصال */}
      {showDetailsModal && viewingReceipt && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false)
              setViewingReceipt(null)
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🧾</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">تفاصيل الإيصال</h2>
                  <p className="text-sm text-gray-500">إيصال #{viewingReceipt.receiptNumber}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setViewingReceipt(null)
                }}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            {/* معلومات الإيصال الأساسية */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">رقم الإيصال</p>
                  <p className="text-3xl font-bold text-green-600">#{viewingReceipt.receiptNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">النوع</p>
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold ${getTypeColor(viewingReceipt.type)}`}>
                    {getTypeLabel(viewingReceipt.type)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">المبلغ</p>
                  <p className="text-3xl font-bold text-green-600">{viewingReceipt.amount} ج.م</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">طريقة الدفع</p>
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${getPaymentMethodColor(viewingReceipt.paymentMethod)}`}>
                    {getPaymentMethodLabel(viewingReceipt.paymentMethod)}
                  </span>
                </div>
              </div>
            </div>

            {/* تفاصيل العميل */}
            {(() => {
              const details = JSON.parse(viewingReceipt.itemDetails)
              return (
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>👤</span>
                    <span>تفاصيل العميل</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {details.memberNumber && (
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-gray-600">رقم العضوية:</span>
                        <span className="font-bold text-blue-600">#{details.memberNumber}</span>
                      </div>
                    )}
                    
                    {(details.memberName || details.clientName || details.name) && (
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-gray-600">الاسم:</span>
                        <span className="font-bold text-gray-800">
                          {details.memberName || details.clientName || details.name}
                        </span>
                      </div>
                    )}
                    
                    {details.phone && (
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-gray-600">الهاتف:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800 dir-ltr">{details.phone}</span>
                          <button
                            onClick={() => {
                              const receiptMessage = `السلام عليكم ورحمة الله وبركاته\n\nإيصالك:\n\nرقم الإيصال: #${viewingReceipt.receiptNumber}\nالمبلغ: ${viewingReceipt.amount} ج.م\nطريقة الدفع: ${getPaymentMethodLabel(viewingReceipt.paymentMethod)}\nالتاريخ: ${new Date(viewingReceipt.createdAt).toLocaleDateString('ar-EG')}\n\nشكراً لك 🙏`
                              window.open(`https://wa.me/${details.phone}?text=${encodeURIComponent(receiptMessage)}`, '_blank')
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                          >
                            <span>📱</span>
                            <span>أرسل</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {details.coachName && (
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-gray-600">المدرب:</span>
                        <span className="font-bold text-gray-800">{details.coachName}</span>
                      </div>
                    )}

                    {details.sessionsPurchased && (
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-gray-600">الجلسات المشتراة:</span>
                        <span className="font-bold text-gray-800">{details.sessionsPurchased} جلسة</span>
                      </div>
                    )}

                    {details.serviceType && (
                      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-gray-600">نوع الخدمة:</span>
                        <span className="font-bold text-gray-800">
                          {details.serviceType === 'DayUse' ? 'يوم استخدام' : 'InBody'}
                        </span>
                      </div>
                    )}

                    {details.remainingAmount > 0 && (
                      <div className="flex items-center justify-between bg-red-50 p-3 rounded-lg border border-red-200">
                        <span className="text-red-600 font-bold">المبلغ المتبقي:</span>
                        <span className="font-bold text-red-600">{details.remainingAmount} ج.م</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* معلومات العملية */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>⚙️</span>
                <span>معلومات العملية</span>
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-gray-600">التاريخ والوقت:</span>
                  <span className="font-bold text-gray-800">
                    {new Date(viewingReceipt.createdAt).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                {viewingReceipt.staffName && (
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                    <span className="text-gray-600">الموظف المسؤول:</span>
                    <span className="font-bold text-gray-800 flex items-center gap-2">
                      <span>👷</span>
                      {viewingReceipt.staffName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex gap-3">
              {(() => {
                const details = JSON.parse(viewingReceipt.itemDetails)
                return details.phone ? (
                  <button
                    onClick={() => {
                      const receiptMessage = `السلام عليكم ورحمة الله وبركاته\n\nإيصالك:\n\nرقم الإيصال: #${viewingReceipt.receiptNumber}\nالمبلغ: ${viewingReceipt.amount} ج.م\nطريقة الدفع: ${getPaymentMethodLabel(viewingReceipt.paymentMethod)}\nالتاريخ: ${new Date(viewingReceipt.createdAt).toLocaleDateString('ar-EG')}\n\nشكراً لك 🙏`
                      window.open(`https://wa.me/${details.phone}?text=${encodeURIComponent(receiptMessage)}`, '_blank')
                    }}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition flex items-center justify-center gap-2"
                  >
                    <span>📱</span>
                    <span>إرسال واتساب</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 bg-gray-300 text-gray-600 px-6 py-3 rounded-lg font-bold cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>📱</span>
                    <span>لا يوجد رقم هاتف</span>
                  </button>
                )
              })()}
              
              <button
                onClick={() => handlePrintReceipt(viewingReceipt)}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:from-blue-600 hover:to-blue-700 transition flex items-center justify-center gap-2"
              >
                <span>🖨️</span>
                <span>طباعة</span>
              </button>
              
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setViewingReceipt(null)
                  handleOpenEditModal(viewingReceipt)
                }}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:from-orange-600 hover:to-orange-700 transition flex items-center justify-center gap-2"
              >
                <span>✏️</span>
                <span>تعديل</span>
              </button>
              
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setViewingReceipt(null)
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal تعديل الإيصال */}
      {showEditModal && editingReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">✏️</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">تعديل الإيصال</h2>
                  <p className="text-sm text-gray-500">تعديل بيانات الإيصال #{editingReceipt.receiptNumber}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setUpdateMessage('')
                }}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            {/* معلومات الإيصال الأصلية */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>📋</span>
                <span>البيانات الأصلية:</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">النوع:</span>
                  <span className="font-bold mr-2">{getTypeLabel(editingReceipt.type)}</span>
                </div>
                <div>
                  <span className="text-gray-600">التاريخ:</span>
                  <span className="font-bold mr-2">
                    {new Date(editingReceipt.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>
            </div>

            {/* نموذج التعديل */}
            <div className="space-y-4 mb-6">
              {/* رقم الإيصال */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  🔢 رقم الإيصال
                </label>
                <input
                  type="number"
                  value={editFormData.receiptNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, receiptNumber: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                  min="1"
                />
              </div>

              {/* المبلغ */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  💰 المبلغ (ج.م)
                </label>
                <input
                  type="number"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* طريقة الدفع */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  💳 طريقة الدفع
                </label>
                <select
                  value={editFormData.paymentMethod}
                  onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold"
                >
                  <option value="cash">كاش 💵</option>
                  <option value="visa">فيزا 💳</option>
                  <option value="instapay">إنستا باي 📱</option>
                  <option value="wallet">محفظة 💰</option>
                </select>
              </div>

              {/* اسم الموظف */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  👷 اسم الموظف (اختياري)
                </label>
                <input
                  type="text"
                  value={editFormData.staffName}
                  onChange={(e) => setEditFormData({ ...editFormData, staffName: e.target.value })}
                  placeholder="اسم الموظف المسؤول"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* رسالة النتيجة */}
            {updateMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-medium text-center ${
                updateMessage.includes('✅') 
                  ? 'bg-green-100 text-green-800 border border-green-300' 
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {updateMessage}
              </div>
            )}

            {/* أزرار الإجراءات */}
            <div className="flex gap-3">
              <button
                onClick={handleUpdateReceipt}
                disabled={isUpdating}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>حفظ التعديلات</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setUpdateMessage('')
                }}
                disabled={isUpdating}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal تأكيد الحذف */}
      {showDeleteModal && deletingReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" dir="rtl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">تأكيد الحذف</h2>
              <p className="text-gray-600">
                هل أنت متأكد من حذف الإيصال <span className="font-bold text-red-600">#{deletingReceipt.receiptNumber}</span>؟
              </p>
              <p className="text-sm text-red-600 mt-2">⚠️ هذا الإجراء لا يمكن التراجع عنه</p>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-6">
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-gray-600">النوع:</span>
                  <span className="font-bold mr-2">{getTypeLabel(deletingReceipt.type)}</span>
                </div>
                <div>
                  <span className="text-gray-600">المبلغ:</span>
                  <span className="font-bold mr-2 text-green-600">{deletingReceipt.amount} ج.م</span>
                </div>
                <div>
                  <span className="text-gray-600">طريقة الدفع:</span>
                  <span className="font-bold mr-2">{getPaymentMethodLabel(deletingReceipt.paymentMethod)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteReceipt}
                disabled={isDeleting}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg font-bold hover:from-red-600 hover:to-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>حذف نهائي</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingReceipt(null)
                }}
                disabled={isDeleting}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 bg-blue-50 border-r-4 border-blue-500 p-5 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-3xl">💡</div>
          <div className="flex-1">
            <h4 className="font-bold text-blue-800 mb-2">نصائح سريعة</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• استخدم البحث للعثور على إيصال محدد برقمه أو باسم العميل أو الموظف</li>
              <li>• فلّتر حسب طريقة الدفع لمعرفة الإيرادات من كل وسيلة</li>
              <li>• اطبع الإيصال مباشرة من زر 🖨️</li>
              <li>• عدّل أي إيصال من زر ✏️</li>
              <li>• احذف إيصال خاطئ من زر 🗑️</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}