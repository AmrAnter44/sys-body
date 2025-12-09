'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '../../hooks/usePermissions'
import PermissionDenied from '../../components/PermissionDenied'
import { useAdminDate } from '../../contexts/AdminDateContext'

interface Staff {
  id: string
  name: string
}

interface Expense {
  id: string
  type: string
  amount: number
  description: string
  notes?: string
  isPaid: boolean
  createdAt: string
  staff?: Staff
}

export default function ExpensesPage() {
  const router = useRouter()
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const { customCreatedAt } = useAdminDate()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'gym_expense' | 'staff_loan'>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; expenseId: string | null; expenseName: string }>({
    show: false,
    expenseId: null,
    expenseName: ''
  })
  
  const [formData, setFormData] = useState({
    type: 'gym_expense' as 'gym_expense' | 'staff_loan',
    amount: 0,
    description: '',
    notes: '',
    staffId: '',
  })

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses')
      const data = await response.json()
      setExpenses(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff')
      const data = await response.json()
      setStaffList(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    fetchExpenses()
    fetchStaff()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // إذا كانت سلفة موظف، ضع اسم الموظف في الوصف تلقائياً
      const dataToSend: any = { ...formData }
      if (formData.type === 'staff_loan' && formData.staffId) {
        const selectedStaff = staffList.find(s => s.id === formData.staffId)
        if (selectedStaff) {
          dataToSend.description = selectedStaff.name
        }
      }

      // ✅ إضافة التاريخ المخصص إذا كان مفعّل
      if (customCreatedAt) {
        dataToSend.customCreatedAt = customCreatedAt.toISOString()
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      })

      if (response.ok) {
        setFormData({
          type: 'gym_expense',
          amount: 0,
          description: '',
          notes: '',
          staffId: '',
        })

        setMessage('✅ تم إضافة المصروف بنجاح!')
        setTimeout(() => setMessage(''), 3000)
        fetchExpenses()
        setShowForm(false)
      } else {
        setMessage('❌ فشل إضافة المصروف')
      }
    } catch (error) {
      console.error(error)
      setMessage('❌ حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (expense: Expense) => {
    setDeleteConfirm({
      show: true,
      expenseId: expense.id,
      expenseName: expense.description
    })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.expenseId) return

    try {
      await fetch(`/api/expenses?id=${deleteConfirm.expenseId}`, { method: 'DELETE' })
      fetchExpenses()
      setMessage('✅ تم حذف المصروف بنجاح')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ فشل حذف المصروف')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setDeleteConfirm({ show: false, expenseId: null, expenseName: '' })
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, expenseId: null, expenseName: '' })
  }

  const togglePaid = async (expense: Expense) => {
    try {
      await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expense.id, isPaid: !expense.isPaid }),
      })
      fetchExpenses()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const filteredExpenses = filterType === 'all' 
    ? expenses 
    : expenses.filter(e => e.type === filterType)

  const getTotalExpenses = () => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  }

  const getTypeLabel = (type: string) => {
    return type === 'gym_expense' ? 'مصروف جيم' : 'سلفة موظف'
  }

  const getTypeColor = (type: string) => {
    return type === 'gym_expense'
      ? 'bg-orange-100 text-orange-800'
      : 'bg-purple-100 text-purple-800'
  }

  // ✅ التحقق من الصلاحيات
  if (permissionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    )
  }

  if (!hasPermission('canViewFinancials')) {
    return <PermissionDenied message="ليس لديك صلاحية عرض المصروفات" />
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">💸 المصروفات</h1>
          <p className="text-gray-600">إدارة مصروفات الجيم وسلف الموظفين</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
        >
          {showForm ? 'إخفاء النموذج' : '➕ إضافة مصروف جديد'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">إجمالي المصروفات</p>
              <p className="text-3xl font-bold text-orange-600">{getTotalExpenses()} ج.م</p>
            </div>
            <div className="text-4xl">💸</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">مصروفات الجيم</p>
              <p className="text-3xl font-bold text-orange-600">
                {expenses.filter(e => e.type === 'gym_expense').reduce((sum, e) => sum + e.amount, 0)} ج.م
              </p>
            </div>
            <div className="text-4xl">🔧</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">سلف الموظفين</p>
              <p className="text-3xl font-bold text-purple-600">
                {expenses.filter(e => e.type === 'staff_loan').reduce((sum, e) => sum + e.amount, 0)} ج.م
              </p>
            </div>
            <div className="text-4xl">💵</div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">إضافة مصروف جديد</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">نوع المصروف *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any, staffId: '' })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="gym_expense">مصروف جيم</option>
                  <option value="staff_loan">سلفة موظف</option>
                </select>
              </div>

              {formData.type === 'staff_loan' && (
                <div>
                  <label className="block text-sm font-medium mb-1">الموظف *</label>
                  <select
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">اختر الموظف</option>
                    {(staffList || []).map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">المبلغ *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>

              {formData.type === 'gym_expense' && (
                <div>
                  <label className="block text-sm font-medium mb-1">الوصف *</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="وصف المصروف"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ملاحظات</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="ملاحظات إضافية..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
            >
              {loading ? 'جاري الحفظ...' : 'إضافة مصروف'}
            </button>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">جميع المصروفات</option>
          <option value="gym_expense">مصروفات الجيم</option>
          <option value="staff_loan">سلف الموظفين</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-right">النوع</th>
                <th className="px-4 py-3 text-right">الموظف</th>
                <th className="px-4 py-3 text-right">الوصف</th>
                <th className="px-4 py-3 text-right">المبلغ</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">التاريخ</th>
                <th className="px-4 py-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded text-sm ${getTypeColor(expense.type)}`}>
                      {getTypeLabel(expense.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {expense.staff ? expense.staff.name : '-'}
                  </td>
                  <td className="px-4 py-3">{expense.description}</td>
                  <td className="px-4 py-3 font-bold text-orange-600">{expense.amount} ج.م</td>
                  <td className="px-4 py-3">
                    {expense.type === 'staff_loan' && (
                      <button
                        onClick={() => togglePaid(expense)}
                        className={`px-3 py-1 rounded text-sm ${
                          expense.isPaid 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {expense.isPaid ? '✅ مدفوعة' : '❌ غير مدفوعة'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(expense.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(expense)}
                      className="text-red-600 hover:text-red-800 font-bold"
                    >
                      🗑️ حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredExpenses.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              لا توجد مصروفات حالياً
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {deleteConfirm.show && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-[9998] animate-fadeIn"
            onClick={cancelDelete}
          />

          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-md px-4 animate-scaleIn">
            <div className="bg-white rounded-2xl shadow-2xl p-6 border-4 border-red-500">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-5xl">🗑️</span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-center mb-3 text-red-600">
                تأكيد الحذف
              </h2>

              {/* Message */}
              <p className="text-center text-gray-700 mb-2">
                هل أنت متأكد من حذف المصروف؟
              </p>
              <p className="text-center text-lg font-bold text-gray-900 mb-6 bg-gray-100 p-3 rounded-lg">
                {deleteConfirm.expenseName}
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-bold"
                >
                  ✕ إلغاء
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold"
                >
                  🗑️ حذف
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}