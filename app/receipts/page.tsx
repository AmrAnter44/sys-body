'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '../../hooks/usePermissions'
import PermissionDenied from '../../components/PermissionDenied'
import ReceiptWhatsApp from '../../components/ReceiptWhatsApp'
import { ReceiptDetailModal } from '../../components/ReceiptDetailModal'
import { printReceiptFromData } from '../../lib/printSystem'
import { useConfirm } from '../../hooks/useConfirm'
import ConfirmDialog from '../../components/ConfirmDialog'

interface Receipt {
  id: string
  receiptNumber: number
  type: string
  amount: number
  paymentMethod: string
  staffName?: string
  itemDetails: string
  createdAt: string
  memberId?: string
  ptNumber?: number
  dayUseId?: string
}

export default function ReceiptsPage() {
  const router = useRouter()
  const { hasPermission, loading: permissionsLoading, user } = usePermissions()
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirm()

  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    receiptNumber: 0,
    amount: 0,
    paymentMethod: 'cash',
    staffName: ''
  })
  const [nextReceiptNumber, setNextReceiptNumber] = useState(1000)
  const [showReceiptNumberEdit, setShowReceiptNumberEdit] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // ✅ جميع الـ hooks يجب أن تكون قبل أي return
  const canEdit = hasPermission('canEditReceipts')
  const canDelete = hasPermission('canDeleteReceipts')

  // ✅ تعريف الدوال قبل استخدامها في useEffect
  const applyFilters = () => {
    if (!Array.isArray(receipts)) {
      setFilteredReceipts([])
      return
    }

    let filtered = [...receipts]

    // فلتر البحث
    if (searchTerm) {
      filtered = filtered.filter(r => {
        try {
          const details = JSON.parse(r.itemDetails)
          return (
            r.receiptNumber.toString().includes(searchTerm) ||
            details.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            details.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            details.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            details.memberNumber?.toString().includes(searchTerm) ||
            details.ptNumber?.toString().includes(searchTerm) ||
            details.phone?.includes(searchTerm) ||
            r.staffName?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        } catch {
          return false
        }
      })
    }

    // فلتر النوع
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.type === filterType)
    }

    // فلتر طريقة الدفع
    if (filterPayment !== 'all') {
      filtered = filtered.filter(r => r.paymentMethod === filterPayment)
    }

    setFilteredReceipts(filtered)
    setCurrentPage(1) // إعادة تعيين الصفحة للأولى عند الفلترة
  }

  // حساب الصفحات
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentReceipts = filteredReceipts.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const fetchReceipts = async () => {
    try {
      const response = await fetch('/api/receipts')
      
      if (response.status === 401) {
        setMessage('❌ يجب تسجيل الدخول أولاً')
        setTimeout(() => router.push('/login'), 2000)
        return
      }
      
      if (response.status === 403) {
        setMessage('❌ ليس لديك صلاحية عرض الإيصالات')
        setReceipts([])
        setFilteredReceipts([])
        return
      }

      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setReceipts(data)
          setFilteredReceipts(data)
        } else {
          console.error('البيانات المستلمة ليست array:', data)
          setReceipts([])
          setFilteredReceipts([])
        }
      } else {
        const error = await response.json()
        setMessage(`❌ ${error.error || 'فشل جلب الإيصالات'}`)
        setReceipts([])
        setFilteredReceipts([])
      }
    } catch (error) {
      console.error('Error fetching receipts:', error)
      setMessage('❌ حدث خطأ أثناء جلب الإيصالات')
      setReceipts([])
      setFilteredReceipts([])
    } finally {
      setLoading(false)
    }
  }

  // ✅ useEffect بعد تعريف الدوال
  useEffect(() => {
    if (!permissionsLoading && hasPermission('canViewReceipts')) {
      fetchReceipts()
    }
  }, [permissionsLoading])

  useEffect(() => {
    applyFilters()
  }, [receipts, searchTerm, filterType, filterPayment])

  // جلب رقم الإيصال التالي
  useEffect(() => {
    const fetchNextNumber = async () => {
      try {
        const response = await fetch('/api/receipts/next-number')
        const data = await response.json()
        setNextReceiptNumber(data.nextNumber)
      } catch (error) {
        console.error('Error fetching next receipt number:', error)
      }
    }
    if (!permissionsLoading && hasPermission('canViewReceipts')) {
      fetchNextNumber()
    }
  }, [permissionsLoading])

  // ✅ التحقق من الصلاحيات بعد كل الـ hooks
  if (permissionsLoading) {
    return (
      <div className="container mx-auto p-6 text-center" dir="rtl">
        <div className="text-6xl mb-4">⏳</div>
        <p className="text-xl">جاري التحميل...</p>
      </div>
    )
  }

  // ✅ إذا لم يكن لديه صلاحية العرض
  if (!hasPermission('canViewReceipts')) {
    return <PermissionDenied message="ليس لديك صلاحية عرض الإيصالات" />
  }

  const getTotalRevenue = () => {
    if (!Array.isArray(filteredReceipts)) return 0
    return filteredReceipts.reduce((sum, r) => sum + r.amount, 0)
  }

  const getTodayCount = () => {
    if (!Array.isArray(filteredReceipts)) return 0
    const today = new Date().toDateString()
    return filteredReceipts.filter(r => 
      new Date(r.createdAt).toDateString() === today
    ).length
  }

  const getTodayRevenue = () => {
    if (!Array.isArray(filteredReceipts)) return 0
    const today = new Date().toDateString()
    return filteredReceipts
      .filter(r => new Date(r.createdAt).toDateString() === today)
      .reduce((sum, r) => sum + r.amount, 0)
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'Member': '🆕 عضو جديد',
      'تجديد عضويه': '🔄 تجديد عضوية',
      'اشتراك برايفت': '💪 PT جديد',
      'تجديد برايفت': '🔄 تجديد PT',
      'PT': '💪 PT',
      'DayUse': '📅 Day Use',
      'Payment': '💰 دفع متبقي',
      'InBody': '⚖️ InBody'
    }
    return labels[type] || type
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'cash': '💵 كاش',
      'visa': '💳 فيزا',
      'vodafone_cash': '📱 فودافون كاش',
      'instapay': '💸 إنستاباي'
    }
    return labels[method] || method
  }

  const handleDelete = async (receiptId: string) => {
    if (!canDelete) {
      setMessage('❌ ليس لديك صلاحية حذف الإيصالات')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    const confirmed = await confirm({
      title: '⚠️ حذف الإيصال',
      message: 'هل أنت متأكد من حذف هذا الإيصال؟\nلا يمكن التراجع عن هذا الإجراء!',
      confirmText: 'نعم، احذف',
      cancelText: 'إلغاء',
      type: 'danger'
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/receipts/update?id=${receiptId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage('✅ تم حذف الإيصال بنجاح')
        fetchReceipts()
      } else {
        const error = await response.json()
        setMessage(`❌ ${error.error || 'فشل حذف الإيصال'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ حدث خطأ في الحذف')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handleOpenEdit = (receipt: Receipt) => {
    if (!canEdit) {
      setMessage('❌ ليس لديك صلاحية تعديل الإيصالات')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setEditingReceipt(receipt)
    setEditFormData({
      receiptNumber: receipt.receiptNumber,
      amount: receipt.amount,
      paymentMethod: receipt.paymentMethod,
      staffName: receipt.staffName || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingReceipt) return

    try {
      const response = await fetch('/api/receipts/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: editingReceipt.id,
          receiptNumber: editFormData.receiptNumber,
          amount: editFormData.amount,
          paymentMethod: editFormData.paymentMethod,
          staffName: editFormData.staffName
        })
      })

      if (response.ok) {
        setMessage('✅ تم تحديث الإيصال بنجاح')
        setShowEditModal(false)
        setEditingReceipt(null)
        fetchReceipts()
      } else {
        const error = await response.json()
        setMessage(`❌ ${error.error || 'فشل تحديث الإيصال'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ حدث خطأ في التحديث')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const handlePrint = (receipt: Receipt) => {
    try {
      const details = JSON.parse(receipt.itemDetails)

      // استخدام نظام الطباعة القديم من printSystem.ts
      printReceiptFromData(
        receipt.receiptNumber,
        receipt.type,
        receipt.amount,
        details,
        receipt.createdAt,
        receipt.paymentMethod
      )
    } catch (error) {
      console.error('Error printing receipt:', error)
      alert('❌ حدث خطأ في الطباعة')
    }
  }

  const handleUpdateNextReceiptNumber = async () => {
    if (nextReceiptNumber < 1) {
      alert('رقم الإيصال يجب أن يكون أكبر من 0')
      return
    }

    try {
      const response = await fetch('/api/receipts/next-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startNumber: nextReceiptNumber })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ ${data.message}`)
        setShowReceiptNumberEdit(false)
      } else {
        setMessage(`❌ ${data.error}`)
      }
    } catch (error) {
      setMessage('❌ حدث خطأ في التحديث')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 text-center" dir="rtl">
        <div className="text-6xl mb-4">⏳</div>
        <p className="text-xl">جاري التحميل...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">🧾 الإيصالات</h1>
          <p className="text-gray-600">عرض وإدارة جميع الإيصالات</p>
          {user && (
            <p className="text-sm text-gray-500 mt-1">
              👤 {user.name} - {user.role === 'ADMIN' ? '👑 مدير' : user.role === 'MANAGER' ? '📊 مشرف' : '👷 موظف'}
            </p>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{filteredReceipts.length}</div>
              <div className="text-sm opacity-90">إجمالي الإيصالات</div>
            </div>
            <div className="text-5xl opacity-20">📊</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{getTotalRevenue().toLocaleString()}</div>
              <div className="text-sm opacity-90">إجمالي الإيرادات (ج.م)</div>
            </div>
            <div className="text-5xl opacity-20">💰</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{getTodayCount()}</div>
              <div className="text-sm opacity-90">إيصالات اليوم</div>
            </div>
            <div className="text-5xl opacity-20">📅</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{getTodayRevenue().toLocaleString()}</div>
              <div className="text-sm opacity-90">إيرادات اليوم (ج.م)</div>
            </div>
            <div className="text-5xl opacity-20">💵</div>
          </div>
        </div>
      </div>

      {/* تعديل رقم الإيصال التالي - قسم صغير */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔢</span>
            <div>
              <p className="font-bold text-sm">رقم الإيصال التالي</p>
              <p className="text-xs text-gray-600">#{nextReceiptNumber}</p>
            </div>
          </div>
          <button
            onClick={() => setShowReceiptNumberEdit(!showReceiptNumberEdit)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
          >
            {showReceiptNumberEdit ? '✕ إلغاء' : '✏️ تعديل'}
          </button>
        </div>

        {showReceiptNumberEdit && (
          <div className="mt-4 pt-4 border-t flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 text-gray-700">
                الرقم الجديد
              </label>
              <input
                type="number"
                value={nextReceiptNumber}
                onChange={(e) => setNextReceiptNumber(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="1000"
              />
            </div>
            <button
              onClick={handleUpdateNextReceiptNumber}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition"
            >
              ✓ حفظ
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">🔍 البحث والفلاتر</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">🔍 بحث</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="رقم الإيصال، اسم العميل، الهاتف، الموظف..."
              className="w-full px-3 py-2 md:px-4 border-2 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">📋 نوع الإيصال</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 md:px-4 border-2 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">الكل</option>
              <option value="Member">عضو جديد</option>
              <option value="تجديد عضويه">تجديد عضوية</option>
              <option value="اشتراك برايفت">PT جديد</option>
              <option value="تجديد برايفت">تجديد PT</option>
              <option value="DayUse">Day Use</option>
              <option value="InBody">InBody</option>
              <option value="Payment">دفع متبقي</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">💳 طريقة الدفع</label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="w-full px-3 py-2 md:px-4 border-2 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">الكل</option>
              <option value="cash">كاش</option>
              <option value="visa">فيزا</option>
              <option value="vodafone_cash">فودافون كاش</option>
              <option value="instapay">إنستاباي</option>
            </select>
          </div>
        </div>

        {(searchTerm || filterType !== 'all' || filterPayment !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('')
              setFilterType('all')
              setFilterPayment('all')
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ❌ مسح الفلاتر
          </button>
        )}
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="px-6 py-4 text-right font-bold">رقم الإيصال</th>
                <th className="px-6 py-4 text-right font-bold">النوع</th>
                <th className="px-6 py-4 text-right font-bold">العميل</th>
                <th className="px-6 py-4 text-right font-bold">المبلغ</th>
                <th className="px-6 py-4 text-right font-bold">طريقة الدفع</th>
                <th className="px-6 py-4 text-right font-bold">الموظف</th>
                <th className="px-6 py-4 text-right font-bold">التاريخ</th>
                <th className="px-6 py-4 text-right font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {currentReceipts.map((receipt) => {
                let details: any = {}
                try {
                  details = JSON.parse(receipt.itemDetails)
                } catch {}

                const clientName = details.memberName || details.clientName || details.name || '-'

                return (
                  <tr key={receipt.id} className="border-t hover:bg-blue-50 transition">
                    <td className="px-6 py-4">
                      <span className="font-bold text-blue-600">#{receipt.receiptNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        {getTypeLabel(receipt.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold">{clientName}</p>
                        {details.phone && (
                          <p className="text-xs text-gray-600">{details.phone}</p>
                        )}
                        {details.memberNumber && (
                          <p className="text-xs text-blue-600">عضوية #{details.memberNumber}</p>
                        )}
                        {details.ptNumber && (
                          <p className="text-xs text-green-600">PT #{details.ptNumber}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-green-600">{receipt.amount.toLocaleString()} ج.م</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{getPaymentMethodLabel(receipt.paymentMethod)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{receipt.staffName || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(receipt.createdAt).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {/* ✅ WhatsApp Component */}
                        <ReceiptWhatsApp 
                          receipt={receipt} 
                          onDetailsClick={() => setSelectedReceipt(receipt)}
                        />
                        
                        <button
                          onClick={() => handlePrint(receipt)}
                          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm transition shadow-md hover:shadow-lg"
                          title="طباعة"
                        >
                          🖨️
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(receipt)}
                            className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 text-sm transition shadow-md hover:shadow-lg"
                            title="تعديل"
                          >
                            ✏️
                          </button>
                        )}
                        
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(receipt.id)}
                            className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm transition shadow-md hover:shadow-lg"
                            title="حذف"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredReceipts.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 py-3 bg-gray-50 rounded-lg">
            {/* معلومات الصفحة */}
            <div className="text-sm text-gray-600">
              عرض {startIndex + 1} - {Math.min(endIndex, filteredReceipts.length)} من {filteredReceipts.length} إيصال
            </div>

            {/* أزرار التنقل */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                title="الصفحة الأولى"
              >
                الأولى
              </button>

              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                title="السابقة"
              >
                السابقة
              </button>

              {/* أرقام الصفحات */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                title="التالية"
              >
                التالية
              </button>

              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                title="الصفحة الأخيرة"
              >
                الأخيرة
              </button>
            </div>

            {/* اختيار عدد العناصر في الصفحة */}
            <div className="flex items-center gap-2 text-sm">
              <label className="text-gray-600">عدد العناصر:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}

        {filteredReceipts.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-6xl mb-4">🧾</div>
            <p className="text-xl font-medium mb-2">
              {searchTerm || filterType !== 'all' || filterPayment !== 'all' 
                ? 'لا توجد نتائج للبحث' 
                : 'لا توجد إيصالات'}
            </p>
            {(searchTerm || filterType !== 'all' || filterPayment !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterType('all')
                  setFilterPayment('all')
                }}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReceipt && (
        <ReceiptDetailModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">✏️ تعديل الإيصال</h2>
                <p className="text-sm text-gray-600">إيصال رقم #{editingReceipt.receiptNumber}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingReceipt(null)
                }}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            {/* معلومات الإيصال الأساسية */}
            <div className="bg-blue-50 border-r-4 border-blue-500 rounded-lg p-4 mb-6">
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

            <div className="space-y-4">
              {/* رقم الإيصال */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  رقم الإيصال <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={editFormData.receiptNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, receiptNumber: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1000"
                />
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ تأكد من عدم تكرار رقم الإيصال
                </p>
              </div>

              {/* المبلغ */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  المبلغ (ج.م) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* طريقة الدفع */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  طريقة الدفع <span className="text-red-600">*</span>
                </label>
                <select
                  value={editFormData.paymentMethod}
                  onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="cash">💵 كاش</option>
                  <option value="visa">💳 فيزا</option>
                  <option value="vodafone_cash">📱 فودافون كاش</option>
                  <option value="instapay">💸 إنستاباي</option>
                </select>
              </div>

              {/* اسم الموظف */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  اسم الموظف (اختياري)
                </label>
                <input
                  type="text"
                  value={editFormData.staffName}
                  onChange={(e) => setEditFormData({ ...editFormData, staffName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="اسم الموظف المسؤول"
                />
              </div>

              {/* ملاحظة تحذيرية */}
              <div className="bg-yellow-50 border-r-4 border-yellow-500 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <p className="font-bold text-yellow-800 mb-1">تنبيه هام</p>
                    <p className="text-sm text-yellow-700">
                      تعديل الإيصال سيؤثر فقط على البيانات المعروضة في النظام. 
                      لن يتم تعديل التفاصيل المرتبطة بالعضوية أو جلسات PT.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* الأزرار */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-bold shadow-lg hover:shadow-xl"
              >
                ✅ حفظ التعديلات
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingReceipt(null)
                }}
                className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        type={options.type}
      />
    </div>
  )
}