'use client'

import { useState, useEffect } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

interface Offer {
  id: string
  name: string
  duration: number
  price: number
  freePTSessions: number
  inBodyScans: number
  invitations: number
  icon: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirm()

  const [formData, setFormData] = useState({
    name: '',
    duration: '',
    price: '',
    freePTSessions: '',
    inBodyScans: '',
    invitations: '',
    icon: '📅'
  })

  useEffect(() => {
    fetchOffers()
  }, [])

  const fetchOffers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/offers')
      const data = await response.json()
      // التأكد من أن البيانات array
      if (Array.isArray(data)) {
        setOffers(data)
      } else {
        console.warn('⚠️ البيانات المستلمة ليست array:', data)
        setOffers([])
        setError('البيانات المستلمة غير صحيحة')
      }
    } catch (error) {
      console.error('Error fetching offers:', error)
      setOffers([])
      setError('فشل جلب العروض')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const url = '/api/offers'
      const method = editingOffer ? 'PUT' : 'POST'
      const body = editingOffer
        ? { ...formData, id: editingOffer.id }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'فشل في حفظ العرض')
      }

      setSuccess(editingOffer ? '✅ تم تحديث العرض بنجاح' : '✅ تم إضافة العرض بنجاح')
      resetForm()
      fetchOffers()
    } catch (error: any) {
      setError(error.message || 'حدث خطأ أثناء حفظ العرض')
    }
  }

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer)
    setFormData({
      name: offer.name,
      duration: offer.duration.toString(),
      price: offer.price.toString(),
      freePTSessions: offer.freePTSessions.toString(),
      inBodyScans: offer.inBodyScans.toString(),
      invitations: offer.invitations.toString(),
      icon: offer.icon
    })
    setShowForm(true)
  }

  const handleDelete = async (offer: Offer) => {
    const confirmed = await confirm({
      title: '⚠️ حذف العرض',
      message: `هل أنت متأكد من حذف عرض "${offer.name}"؟\nلا يمكن التراجع عن هذا الإجراء!`,
      confirmText: 'نعم، احذف',
      cancelText: 'إلغاء',
      type: 'danger'
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/offers?id=${offer.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'فشل في حذف العرض')
      }

      setSuccess('✅ تم حذف العرض بنجاح')
      fetchOffers()
    } catch (error: any) {
      setError(error.message || 'حدث خطأ أثناء حذف العرض')
    }
  }

  const toggleActive = async (offer: Offer) => {
    try {
      const response = await fetch('/api/offers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...offer,
          isActive: !offer.isActive
        })
      })

      if (!response.ok) {
        throw new Error('فشل في تحديث حالة العرض')
      }

      setSuccess('✅ تم تحديث حالة العرض')
      fetchOffers()
    } catch (error: any) {
      setError(error.message || 'حدث خطأ أثناء تحديث حالة العرض')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      duration: '',
      price: '',
      freePTSessions: '',
      inBodyScans: '',
      invitations: '',
      icon: '📅'
    })
    setEditingOffer(null)
    setShowForm(false)
  }

  const iconOptions = ['📅', '⭐', '🎁', '💎', '🔥', '✨', '🏆', '💪']

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">🎁 إدارة العروض</h1>
              <p className="text-gray-600">إضافة وتعديل وحذف عروض الاشتراكات</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              {showForm ? '✖ إلغاء' : '➕ إضافة عرض جديد'}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 bg-green-50 border-2 border-green-200 text-green-700 px-6 py-4 rounded-xl">
              {success}
            </div>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <div className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border-2 border-purple-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingOffer ? '✏️ تعديل العرض' : '➕ عرض جديد'}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-bold mb-2">اسم العرض *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="مثال: شهر، شهرين، 3 شهور"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2">المدة (بالأيام) *</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="مثال: 30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2">السعر (جنيه) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="مثال: 800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2">حصص PT مجانية</label>
                  <input
                    type="number"
                    value={formData.freePTSessions}
                    onChange={(e) => setFormData({ ...formData, freePTSessions: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2">InBody مجاني</label>
                  <input
                    type="number"
                    value={formData.inBodyScans}
                    onChange={(e) => setFormData({ ...formData, inBodyScans: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2">دعوات مجانية</label>
                  <input
                    type="number"
                    value={formData.invitations}
                    onChange={(e) => setFormData({ ...formData, invitations: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-700 font-bold mb-2">الأيقونة</label>
                  <div className="flex gap-3">
                    {iconOptions.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`text-3xl p-3 rounded-lg border-2 transition-all ${
                          formData.icon === icon
                            ? 'border-purple-500 bg-purple-100 scale-110'
                            : 'border-gray-300 hover:border-purple-300'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-bold hover:scale-105 transition-transform"
                  >
                    {editingOffer ? '💾 حفظ التعديلات' : '➕ إضافة العرض'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-8 bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Offers Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">جاري التحميل...</p>
            </div>
          ) : !Array.isArray(offers) || offers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-2xl text-gray-400 mb-2">🎁</p>
              <p className="text-gray-600">لا توجد عروض حالياً</p>
              <p className="text-gray-500 text-sm mt-2">قم بإضافة عرض جديد للبدء</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className={`bg-white border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                    offer.isActive ? 'border-purple-200' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{offer.icon}</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{offer.name}</h3>
                        <p className="text-sm text-gray-500">{offer.duration} يوم</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(offer)}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        offer.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {offer.isActive ? '✓ نشط' : '✕ معطل'}
                    </button>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">السعر:</span>
                      <span className="text-2xl font-bold text-purple-600">{offer.price} جنيه</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">حصص PT:</span>
                      <span className="font-bold text-gray-800">{offer.freePTSessions}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">InBody:</span>
                      <span className="font-bold text-gray-800">{offer.inBodyScans}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">دعوات:</span>
                      <span className="font-bold text-gray-800">{offer.invitations}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(offer)}
                      className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
                    >
                      ✏️ تعديل
                    </button>
                    <button
                      onClick={() => handleDelete(offer)}
                      className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        type={options.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  )
}
