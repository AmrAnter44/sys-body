'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '../../hooks/usePermissions'
import PermissionDenied from '../../components/PermissionDenied'
import StaffBarcodeWhatsApp from '../../components/StaffBarcodeWhatsApp'

interface Staff {
  id: string
  staffCode: string  // ✅ الرقم مع s في البداية (مثل s001, s022)
  name: string
  phone?: string
  position?: string
  salary?: number
  notes?: string
  isActive: boolean
  createdAt: string
}

interface Attendance {
  id: string
  staffId: string
  staff: Staff
  checkIn: string
  checkOut: string | null
  duration: number | null
  createdAt: string
}

const POSITIONS = [
  { value: 'مدرب', label: '💪 مدرب', icon: '💪' },
  { value: 'ريسبشن', label: '👔 ريسبشن', icon: '👔' },
  { value: 'بار', label: '☕ بار', icon: '☕' },
  { value: 'HK', label: '🧹 HK (نظافة)', icon: '🧹' },
  { value: 'مدير', label: '👨‍💼 مدير', icon: '👨‍💼' },
  { value: 'محاسب', label: '💼 محاسب', icon: '💼' },
  { value: 'صيانة', label: '🔧 صيانة', icon: '🔧' },
  { value: 'أمن', label: '🛡️ أمن', icon: '🛡️' },
  { value: 'other', label: '📝 أخرى...', icon: '📝' },
]

export default function StaffPage() {
  const router = useRouter()
  const { hasPermission, loading: permissionsLoading } = usePermissions()

  const [staff, setStaff] = useState<Staff[]>([])
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showOtherPosition, setShowOtherPosition] = useState(false)
  
  // ✅ حالة Scanner
  const [scannerInput, setScannerInput] = useState('')
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null)
  const [scanMessage, setScanMessage] = useState('')
  const scannerRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const [formData, setFormData] = useState({
    staffCode: '',  // ✅ الرقم البسيط
    name: '',
    phone: '',
    position: '',
    customPosition: '',
    salary: 0,
    notes: '',
  })

  // ✅ توليد رقم عشوائي من 9 أرقام للموظف
  const [randomStaffCode, setRandomStaffCode] = useState('')

  useEffect(() => {
    // ✅ توليد رقم عشوائي فقط عند فتح النموذج لإضافة موظف جديد
    if (showForm && !editingStaff) {
      const randomNum = Math.floor(Math.random() * 999) + 1
      const nineDigitCode = (100000000 + randomNum).toString()
      setRandomStaffCode(nineDigitCode)
      setFormData(prev => ({ ...prev, staffCode: nineDigitCode }))
    }
  }, [showForm, editingStaff])

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff')
      const data = await response.json()
      setStaff(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTodayAttendance = async () => {
    try {
      const response = await fetch('/api/attendance?today=true')
      const data = await response.json()
      setTodayAttendance(data)
    } catch (error) {
      console.error('Error fetching attendance:', error)
    }
  }

  useEffect(() => {
    fetchStaff()
    fetchTodayAttendance()
    
    const interval = setInterval(fetchTodayAttendance, 60000)
    return () => clearInterval(interval)
  }, [])

  // ✅ دوال الصوت
  const playSuccessSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      const times = [0, 0.15, 0.3]
      const frequencies = [523.25, 659.25, 783.99]
      
      times.forEach((time, index) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequencies[index], ctx.currentTime + time)
        gainNode.gain.setValueAtTime(0.7, ctx.currentTime + time)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.3)
        oscillator.start(ctx.currentTime + time)
        oscillator.stop(ctx.currentTime + time + 0.3)
      })
    } catch (error) {
      console.error('Error playing sound:', error)
    }
  }

  const playErrorSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(200, ctx.currentTime)
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
    } catch (error) {
      console.error('Error playing sound:', error)
    }
  }

  // ✅ معالجة السكان بالرقم
const handleScan = async (staffCode: string) => {
  try {
    // 🟢 تنظيف الكود فقط (إزالة المسافات)
    let cleanCode = staffCode.trim();

    // ✅ لو الكود رقم من 9 خانات (100000000+)، فهو موظف
    if (/^\d+$/.test(cleanCode)) {
      const numericCode = parseInt(cleanCode, 10);
      if (numericCode >= 100000000) {
        // موظف: مثلاً 100000022 -> s022
        const staffNumber = numericCode - 100000000;
        cleanCode = `s${staffNumber.toString().padStart(3, '0')}`;
      } else {
        // عضو: نستخدم الرقم كما هو
        cleanCode = cleanCode;
      }
    }

    const response = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffCode: cleanCode }),
    });

    const data = await response.json();

    if (response.ok) {
      playSuccessSound();
      setScanMessage(data.message);
      setLastScanTime(new Date());
      fetchTodayAttendance();
      setTimeout(() => setScanMessage(''), 5000);
    } else {
      playErrorSound();
      setScanMessage(`❌ ${data.error || 'فشل تسجيل الحضور'}`);
      setTimeout(() => setScanMessage(''), 5000);
    }
  } catch (error) {
    console.error('Scan error:', error);
    playErrorSound();
    setScanMessage('❌ حدث خطأ في تسجيل الحضور');
    setTimeout(() => setScanMessage(''), 5000);
  }
};


  // ✅ معالجة إدخال Scanner
  const handleScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannerInput.trim()) {
      handleScan(scannerInput.trim())
      setScannerInput('')
    }
  }

  // ✅ حساب مدة الحضور
  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    const start = new Date(checkIn)
    const end = checkOut ? new Date(checkOut) : new Date()
    const diffMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return `${hours}س ${minutes}د`
  }

  // ✅ التحقق من حالة الموظف
  const isStaffPresent = (staffId: string) => {
    return todayAttendance.some(
      (att) => att.staffId === staffId && !att.checkOut
    )
  }

  const resetForm = () => {
    setFormData({
      staffCode: '',
      name: '',
      phone: '',
      position: '',
      customPosition: '',
      salary: 0,
      notes: '',
    })
    setShowOtherPosition(false)
    setEditingStaff(null)
    setShowForm(false)
  }

  const handleEdit = (staffMember: Staff) => {
    const isStandardPosition = POSITIONS.some(
      (pos) => pos.value === staffMember.position && pos.value !== 'other'
    )

    setFormData({
      staffCode: staffMember.staffCode,
      name: staffMember.name,
      phone: staffMember.phone || '',
      position: isStandardPosition ? staffMember.position || '' : 'other',
      customPosition: isStandardPosition ? '' : staffMember.position || '',
      salary: staffMember.salary || 0,
      notes: staffMember.notes || '',
    })
    setShowOtherPosition(!isStandardPosition)
    setEditingStaff(staffMember)
    setShowForm(true)
  }

  const handlePositionChange = (value: string) => {
    setFormData({ ...formData, position: value, customPosition: '' })
    setShowOtherPosition(value === 'other')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const finalPosition =
      formData.position === 'other' ? formData.customPosition : formData.position

    if (!finalPosition) {
      setMessage('❌ يرجى تحديد الوظيفة')
      setLoading(false)
      return
    }

    if (!formData.staffCode) {
      setMessage('❌ يرجى إدخال رقم الموظف')
      setLoading(false)
      return
    }

    // ✅ التحقق من أن الرقم 9 أرقام
    const numericCode = formData.staffCode.replace(/[sS]/g, '')
    if (!/^\d{9}$/.test(numericCode)) {
      setMessage('❌ رقم الموظف يجب أن يكون 9 أرقام بالضبط (مثل: 100000022)')
      setLoading(false)
      return
    }

    try {
      const url = '/api/staff'
      const method = editingStaff ? 'PUT' : 'POST'

      // ✅ نحول الرقم من 9 خانات إلى s + رقم بسيط
      // مثال: 100000022 -> s022
      const staffNumber = parseInt(numericCode, 10) - 100000000
      const staffCodeWithS = `s${staffNumber.toString().padStart(3, '0')}`

      const body = editingStaff
        ? { id: editingStaff.id, ...formData, position: finalPosition, staffCode: staffCodeWithS }
        : { ...formData, position: finalPosition, staffCode: staffCodeWithS }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(editingStaff ? '✅ تم تحديث الموظف بنجاح!' : '✅ تم إضافة الموظف بنجاح!')
        setTimeout(() => setMessage(''), 3000)
        fetchStaff()
        resetForm()
      } else {
        setMessage(`❌ ${data.error || 'فشلت العملية'}`)
        setTimeout(() => setMessage(''), 5000)
      }
    } catch (error) {
      console.error(error)
      setMessage('❌ حدث خطأ')
    } finally {
      setLoading(false)
    }
  }



  const toggleActive = async (staffMember: Staff) => {
    try {
      await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: staffMember.id,
          isActive: !staffMember.isActive,
        }),
      })
      fetchStaff()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDelete = async (staffMember: Staff) => {
    const confirmDelete = window.confirm(
      `هل أنت متأكد من حذف الموظف: ${staffMember.name}؟\nهذه العملية لا يمكن التراجع عنها!`
    )

    if (!confirmDelete) return

    try {
      const response = await fetch(`/api/staff?id=${staffMember.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('✅ تم حذف الموظف بنجاح!')
        setTimeout(() => setMessage(''), 3000)
        fetchStaff()
      } else {
        setMessage(`❌ ${data.error || 'فشل حذف الموظف'}`)
        setTimeout(() => setMessage(''), 5000)
      }
    } catch (error) {
      console.error('Error deleting staff:', error)
      setMessage('❌ حدث خطأ أثناء حذف الموظف')
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const getPositionIcon = (position: string): string => {
    const pos = POSITIONS.find((p) => p.value === position)
    return pos ? pos.icon : '👤'
  }

  const getPositionColor = (position: string): string => {
    const colors: { [key: string]: string } = {
      مدرب: 'bg-green-100 text-green-800',
      ريسبشن: 'bg-blue-100 text-blue-800',
      بار: 'bg-orange-100 text-orange-800',
      HK: 'bg-purple-100 text-purple-800',
      مدير: 'bg-red-100 text-red-800',
      محاسب: 'bg-indigo-100 text-indigo-800',
      صيانة: 'bg-yellow-100 text-yellow-800',
      أمن: 'bg-gray-100 text-gray-800',
    }
    return colors[position] || 'bg-gray-100 text-gray-800'
  }

  const getStaffByPosition = () => {
    const counts: { [key: string]: number } = {}
    ;(staff || []).forEach((s) => {
      if (s.position && s.isActive) {
        counts[s.position] = (counts[s.position] || 0) + 1
      }
    })
    return counts
  }

  const staffByPosition = getStaffByPosition()
  const presentStaff = todayAttendance.filter((att) => !att.checkOut).length
  const totalCheckedIn = todayAttendance.length

  // ✅ التحقق من الصلاحيات
  if (permissionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    )
  }

  if (!hasPermission('canViewStaff')) {
    return <PermissionDenied message="ليس لديك صلاحية عرض الموظفين" />
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      {/* ✅ قسم Scanner للحضور والانصراف */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <span className="text-5xl">🔢</span>
              <span>سكانر الحضور والانصراف</span>
            </h2>
            <p className="text-blue-100">اكتب رقم الموظف للتسجيل التلقائي</p>
          </div>
          {lastScanTime && (
            <div className="bg-white/20 backdrop-blur px-6 py-3 rounded-xl">
              <p className="text-sm">آخر تسجيل</p>
              <p className="text-xl font-bold">{lastScanTime.toLocaleTimeString('ar-EG')}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6">
          <input
            ref={scannerRef}
            type="text"
            value={scannerInput}
            onChange={(e) => setScannerInput(e.target.value)}
            onKeyPress={handleScannerInput}
            className="w-full px-6 py-6 border-4 border-blue-400 rounded-xl text-4xl font-bold text-center focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition text-gray-800"
            placeholder="22"
            autoFocus
          />
          <p className="text-center text-gray-600 mt-3 text-sm">
            💡 اكتب الرقم واضغط Enter أو استخدم Scanner | الموظفين: 9 أرقام (100000xxx)
          </p>
        </div>

        {scanMessage && (
          <div
            className={`mt-4 p-6 rounded-xl text-center font-bold text-2xl animate-pulse ${
              scanMessage.includes('✅')
                ? 'bg-green-500'
                : 'bg-red-500'
            }`}
          >
            {scanMessage}
          </div>
        )}
      </div>

      {/* ✅ قسم حضور اليوم */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-4 border-green-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <span>📊</span>
            <span>حضور اليوم</span>
          </h3>
          <div className="flex gap-4">
            <div className="bg-green-100 px-6 py-3 rounded-xl text-center">
              <p className="text-sm text-green-700">موجودين الآن</p>
              <p className="text-3xl font-bold text-green-800">{presentStaff}</p>
            </div>
            <div className="bg-blue-100 px-6 py-3 rounded-xl text-center">
              <p className="text-sm text-blue-700">إجمالي الحضور</p>
              <p className="text-3xl font-bold text-blue-800">{totalCheckedIn}</p>
            </div>
          </div>
        </div>

        {todayAttendance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right">الرقم</th>
                  <th className="px-4 py-3 text-right">الاسم</th>
                  <th className="px-4 py-3 text-right">الوظيفة</th>
                  <th className="px-4 py-3 text-right">وقت الحضور</th>
                  <th className="px-4 py-3 text-right">وقت الانصراف</th>
                  <th className="px-4 py-3 text-right">المدة</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance.map((att) => (
                  <tr key={att.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-lg font-bold">
                        #{att.staff.staffCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">{att.staff.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${getPositionColor(
                          att.staff.position || ''
                        )}`}
                      >
                        {getPositionIcon(att.staff.position || '')} {att.staff.position || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(att.checkIn).toLocaleTimeString('ar-EG')}
                    </td>
                    <td className="px-4 py-3">
                      {att.checkOut
                        ? new Date(att.checkOut).toLocaleTimeString('ar-EG')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {calculateDuration(att.checkIn, att.checkOut)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          att.checkOut
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-green-500 text-white animate-pulse'
                        }`}
                      >
                        {att.checkOut ? '👋 انصرف' : '✅ موجود'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">😴</div>
            <p className="text-xl">لا يوجد حضور مسجل اليوم</p>
          </div>
        )}
      </div>

      {/* باقي الصفحة - إدارة الموظفين */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">👥 إدارة الموظفين</h1>

        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(!showForm)
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition transform hover:scale-105"
        >
          {showForm ? 'إخفاء النموذج' : '➕ إضافة موظف جديد'}
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message}
        </div>
      )}

      {/* نموذج الإضافة/التعديل */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg mb-6 border-2 border-blue-100">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            {editingStaff ? (
              <>
                <span>✏️</span>
                <span>تعديل موظف</span>
              </>
            ) : (
              <>
                <span>➕</span>
                <span>إضافة موظف جديد</span>
              </>
            )}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ✅ رقم الموظف */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">
                  رقم الموظف <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.staffCode}
                  onChange={(e) => setFormData({ ...formData, staffCode: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition text-2xl font-bold"
                  placeholder={randomStaffCode || "100000022"}
                  minLength={9}
                  maxLength={9}
                  pattern="\d{9}"
                  disabled={!!editingStaff}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editingStaff
                    ? '⚠️ لا يمكن تغيير الرقم بعد الإنشاء'
                    : '💡 يجب إدخال 9 أرقام بالضبط (مثال: 100000022 → s022, 100000444 → s444)'}
                </p>
              </div>

              {/* الاسم */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">
                  الاسم <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  placeholder="محمد أحمد"
                />
              </div>

              {/* رقم الهاتف */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  placeholder="01xxxxxxxxx"
                />
              </div>

              {/* الوظيفة */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">
                  الوظيفة <span className="text-red-600">*</span>
                </label>
                <select
                  required={!showOtherPosition}
                  value={formData.position}
                  onChange={(e) => handlePositionChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition text-lg"
                >
                  <option value="">-- اختر الوظيفة --</option>
                  {POSITIONS.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* حقل الوظيفة المخصصة */}
              {showOtherPosition && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <label className="block text-sm font-bold mb-2 text-gray-700">
                    اكتب الوظيفة <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customPosition}
                    onChange={(e) =>
                      setFormData({ ...formData, customPosition: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-yellow-400 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition"
                    placeholder="مثال: مساعد مدير، مصور..."
                  />
                </div>
              )}

              {/* المرتب */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">
                  المرتب (ج.م)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* ملاحظات */}
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">ملاحظات</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition resize-none"
                rows={3}
                placeholder="ملاحظات إضافية..."
              />
            </div>

            {/* أزرار التحكم */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 font-bold text-lg shadow-lg transform transition hover:scale-105 active:scale-95"
              >
                {loading ? '⏳ جاري الحفظ...' : editingStaff ? '✅ تحديث' : '➕ إضافة موظف'}
              </button>
              {editingStaff && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-8 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 py-4 rounded-lg hover:from-gray-300 hover:to-gray-400 font-bold shadow-lg transform transition hover:scale-105 active:scale-95"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">إجمالي الموظفين</p>
              <p className="text-4xl font-bold">{staff.length}</p>
            </div>
            <div className="text-5xl opacity-20">👥</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">الموظفين النشطين</p>
              <p className="text-4xl font-bold">{staff.filter((s) => s.isActive).length}</p>
            </div>
            <div className="text-5xl opacity-20">✅</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">إجمالي المرتبات</p>
              <p className="text-3xl font-bold">
                {staff.reduce((sum, s) => sum + (s.salary || 0), 0).toFixed(0)} ج.م
              </p>
            </div>
            <div className="text-5xl opacity-20">💰</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-1">عدد المدربين</p>
              <p className="text-4xl font-bold">{staffByPosition['مدرب'] || 0}</p>
            </div>
            <div className="text-5xl opacity-20">💪</div>
          </div>
        </div>
      </div>

      {/* جدول الموظفين */}
      {loading ? (
        <div className="text-center py-12">جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="px-4 py-3 text-right">الرقم</th>
                  <th className="px-4 py-3 text-right">الاسم</th>
                  <th className="px-4 py-3 text-right">الهاتف</th>
                  <th className="px-4 py-3 text-right">الوظيفة</th>
                  <th className="px-4 py-3 text-right">المرتب</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((staffMember) => (
                  <tr
                    key={staffMember.id}
                    className={`border-t hover:bg-gray-50 transition ${
                      !staffMember.isActive ? 'opacity-60' : ''
                    } ${isStaffPresent(staffMember.id) ? 'bg-green-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xl">
                        #{staffMember.staffCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{staffMember.name}</span>
                        {isStaffPresent(staffMember.id) && (
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                            ✅ موجود
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{staffMember.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${getPositionColor(
                          staffMember.position || ''
                        )}`}
                      >
                        <span>{getPositionIcon(staffMember.position || '')}</span>
                        <span>{staffMember.position || '-'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600">
                      {staffMember.salary ? `${staffMember.salary} ج.م` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(staffMember)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold transition transform hover:scale-105 ${
                          staffMember.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {staffMember.isActive ? '✅ نشط' : '❌ غير نشط'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => handleEdit(staffMember)}
                          className="text-blue-600 hover:text-blue-800 font-semibold transition hover:underline"
                        >
                          ✏️ تعديل
                        </button>

                        {hasPermission('canDeleteStaff') && (
                          <button
                            onClick={() => handleDelete(staffMember)}
                            className="text-red-600 hover:text-red-800 font-semibold transition hover:underline"
                          >
                            🗑️ حذف
                          </button>
                        )}

                        {staffMember.phone && (
                          <StaffBarcodeWhatsApp
                            staffCode={staffMember.staffCode}
                            staffName={staffMember.name}
                            staffPhone={staffMember.phone}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {staff.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">😕</div>
              <p className="text-xl">لا يوجد موظفين حالياً</p>
              <p className="text-sm mt-2">ابدأ بإضافة موظف جديد</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}