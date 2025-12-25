// app/members/[id]/page.tsx - إصلاح الأرقام العشرية
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ReceiptToPrint } from '../../../components/ReceiptToPrint'
import PaymentMethodSelector from '../../../components/Paymentmethodselector'
import RenewalForm from '../../../components/RenewalForm'
import UpgradeForm from '../../../components/UpgradeForm'
import { formatDateYMD, calculateRemainingDays } from '../../../lib/dateFormatter'
import BarcodeWhatsApp from '../../../components/BarcodeWhatsApp'
import { usePermissions } from '../../../hooks/usePermissions'
import PermissionDenied from '../../../components/PermissionDenied'
import { FlexibilityAssessment, ExerciseTestData, MedicalQuestions, FitnessTestData } from '../../../types/fitness-test'
import { useLanguage } from '../../../contexts/LanguageContext'

interface Member {
  id: string
  memberNumber: number
  name: string
  phone: string
  inBodyScans: number
  invitations: number
  freePTSessions?: number
  remainingFreezeDays: number
  subscriptionPrice: number
  remainingAmount: number
  notes?: string
  isActive: boolean
  startDate?: string
  expiryDate?: string
  createdAt: string
}

interface Receipt {
  receiptNumber: number
  amount: number
  paymentMethod: string
  createdAt: string
  itemDetails: {
    memberNumber?: number
    memberName?: string
    subscriptionPrice?: number
    paidAmount?: number
    remainingAmount?: number
    freePTSessions?: number
    inBodyScans?: number
    invitations?: number
    startDate?: string
    expiryDate?: string
    subscriptionDays?: number
    [key: string]: any
  }
}

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const { t, direction } = useLanguage()

  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [showRenewalForm, setShowRenewalForm] = useState(false)
  const [showUpgradeForm, setShowUpgradeForm] = useState(false)
  const [lastReceiptNumber, setLastReceiptNumber] = useState<number | null>(null)
  const [ptSubscription, setPtSubscription] = useState<any>(null)

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'cash',
    notes: ''
  })

  const [freezeData, setFreezeData] = useState({
    days: 0,
    reason: ''
  })

  const [invitationData, setInvitationData] = useState({
    guestName: '',
    guestPhone: '',
    notes: ''
  })

  const [editBasicInfoData, setEditBasicInfoData] = useState({
    name: '',
    phone: '',
    subscriptionPrice: 0,
    inBodyScans: 0,
    invitations: 0,
    freePTSessions: 0,
    remainingFreezeDays: 0,
    notes: '',
    startDate: '',
    expiryDate: ''
  })

  const [addRemainingAmountData, setAddRemainingAmountData] = useState({
    amount: 0,
    notes: ''
  })

  const [activeModal, setActiveModal] = useState<string | null>(null)

  // Fitness Test
  const [fitnessTestExists, setFitnessTestExists] = useState(false)
  const [fitnessTestData, setFitnessTestData] = useState<FitnessTestData | null>(null)
  const [coaches, setCoaches] = useState<any[]>([])
  const [selectedCoachId, setSelectedCoachId] = useState<string>('')

  const [fitnessTestForm, setFitnessTestForm] = useState({
    testDate: formatDateYMD(new Date()),
    medicalQuestions: {
      firstTimeGym: false,
      inDietPlan: false,
      hernia: false,
      familyHeartHistory: false,
      heartProblem: false,
      backPain: false,
      surgery: false,
      breathingProblems: false,
      bloodPressure: false,
      kneeProblem: false,
      diabetes: false,
      smoker: false,
      highCholesterol: false,
    } as MedicalQuestions,
    flexibility: {
      shoulder: 'FAIR',
      hip: 'FAIR',
      elbow: 'FAIR',
      wrist: 'FAIR',
      spine: 'FAIR',
      scapula: 'FAIR',
      knee: 'FAIR',
      ankle: 'FAIR',
    } as FlexibilityAssessment,
    exercises: {
      pushup: { sets: 0, reps: 0 },
      situp: { sets: 0, reps: 0 },
      pullup: { sets: 0, reps: 0 },
      squat: { sets: 0, reps: 0 },
      plank: { sets: 0, reps: 0 },
      legpress: { sets: 0, reps: 0 },
      chestpress: { sets: 0, reps: 0 },
    } as ExerciseTestData,
  })

  // سجل الحضور
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceStartDate, setAttendanceStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30) // آخر 30 يوم
    return date.toISOString().split('T')[0]
  })
  const [attendanceEndDate, setAttendanceEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const fetchMember = async () => {
    try {
      const response = await fetch('/api/members')
      const members = await response.json()
      const foundMember = members.find((m: Member) => m.id === memberId)

      if (foundMember) {
        // ✅ تحويل كل الأرقام لـ integers
        const memberWithDefaults = {
          ...foundMember,
          memberNumber: parseInt(foundMember.memberNumber?.toString() || '0'),
          freePTSessions: parseInt(foundMember.freePTSessions?.toString() || '0'),
          inBodyScans: parseInt(foundMember.inBodyScans?.toString() || '0'),
          invitations: parseInt(foundMember.invitations?.toString() || '0'),
          subscriptionPrice: parseInt(foundMember.subscriptionPrice?.toString() || '0'),
          remainingAmount: parseInt(foundMember.remainingAmount?.toString() || '0')
        }

        console.log('Member data:', memberWithDefaults)
        setMember(memberWithDefaults)

        // جلب آخر إيصال للعضو
        fetchLastReceipt(memberId)
      } else {
        setMessage(`❌ ${t('memberDetails.memberNotFound')}`)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage(`❌ ${t('memberDetails.errorLoadingData')}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceHistory = async () => {
    setAttendanceLoading(true)
    try {
      const response = await fetch(
        `/api/member-checkin/history?memberId=${memberId}&startDate=${attendanceStartDate}&endDate=${attendanceEndDate}`
      )
      const data = await response.json()

      if (data.success) {
        setAttendanceHistory(data.checkIns || [])
      } else {
        console.error('Error fetching attendance history')
        setAttendanceHistory([])
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error)
      setAttendanceHistory([])
    } finally {
      setAttendanceLoading(false)
    }
  }

  const fetchLastReceipt = async (memberId: string) => {
    try {
      const response = await fetch(`/api/receipts?memberId=${memberId}`)
      if (response.ok) {
        const receipts = await response.json()
        if (receipts && receipts.length > 0) {
          // أول إيصال في القائمة هو الأحدث (orderBy createdAt desc)
          setLastReceiptNumber(receipts[0].receiptNumber)
        }
      }
    } catch (error) {
      console.error('Error fetching last receipt:', error)
    }
  }

  const fetchFitnessTest = async () => {
    try {
      const response = await fetch(`/api/members/${memberId}/fitness-test`)
      if (response.ok) {
        const data = await response.json()
        setFitnessTestExists(true)
        setFitnessTestData(data)
      } else {
        setFitnessTestExists(false)
        setFitnessTestData(null)
      }
    } catch (error) {
      console.error('Error fetching fitness test:', error)
      setFitnessTestExists(false)
      setFitnessTestData(null)
    }
  }

  const fetchCoaches = async () => {
    try {
      const response = await fetch('/api/coaches')
      if (response.ok) {
        const coaches = await response.json()
        setCoaches(coaches)
        console.log('Fetched coaches:', coaches)
      } else {
        console.error('Failed to fetch coaches:', response.status)
        setCoaches([])
      }
    } catch (error) {
      console.error('Error fetching coaches:', error)
      setCoaches([])
    }
  }

  const fetchPTSubscription = async () => {
    if (!member) return

    try {
      const response = await fetch('/api/pt')
      if (response.ok) {
        const allPTs = await response.json()
        // البحث عن PT نشط للعضو بناءً على رقم الهاتف
        const activePT = allPTs.find((pt: any) =>
          pt.phone === member.phone &&
          pt.sessionsRemaining > 0 &&
          (!pt.expiryDate || new Date(pt.expiryDate) > new Date())
        )
        setPtSubscription(activePT || null)
      }
    } catch (error) {
      console.error('Error fetching PT subscription:', error)
      setPtSubscription(null)
    }
  }

  useEffect(() => {
    fetchMember()
    fetchAttendanceHistory()
    fetchFitnessTest()
  }, [memberId])

  useEffect(() => {
    if (member) {
      fetchPTSubscription()
    }
  }, [member])

  const handlePayment = async () => {
    if (!member || paymentData.amount <= 0) {
      setMessage(`⚠️ ${t('memberDetails.paymentModal.enterValidAmount')}`)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    if (paymentData.amount > member.remainingAmount) {
      setMessage(`⚠️ ${t('memberDetails.paymentModal.amountExceedsRemaining')}`)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // ✅ تحويل لـ integer
      const cleanAmount = parseInt(paymentData.amount.toString())
      const newRemaining = member.remainingAmount - cleanAmount

      const response = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: member.id,
          remainingAmount: newRemaining
        })
      })

      if (response.ok) {
        const receiptResponse = await fetch('/api/receipts/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: member.id,
            amount: cleanAmount,
            paymentMethod: paymentData.paymentMethod,
            notes: paymentData.notes
          })
        })

        if (receiptResponse.ok) {
          const receipt = await receiptResponse.json()
          setReceiptData({
            receiptNumber: receipt.receiptNumber,
            type: 'Payment',
            amount: receipt.amount,
            details: JSON.parse(receipt.itemDetails),
            date: new Date(receipt.createdAt),
            paymentMethod: paymentData.paymentMethod
          })
          setShowReceipt(true)
          setLastReceiptNumber(receipt.receiptNumber)
        }

        setMessage(`✅ ${t('memberDetails.paymentModal.paymentSuccess')}`)
        setTimeout(() => setMessage(''), 3000)

        setPaymentData({ amount: 0, paymentMethod: 'cash', notes: '' })
        setActiveModal(null)
        fetchMember()
      } else {
        setMessage(`❌ ${t('memberDetails.paymentModal.paymentFailed')}`)
      }
    } catch (error) {
      console.error(error)
      setMessage(`❌ ${t('memberDetails.error')}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUseInBody = async () => {
    if (!member || (member.inBodyScans ?? 0) <= 0) {
      setMessage(`⚠️ ${t('memberDetails.noInBodyRemaining')}`)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setConfirmModal({
      show: true,
      title: `⚖️ ${t('memberDetails.useInBody')}`,
      message: t('memberDetails.confirmUseInBody'),
      onConfirm: async () => {
        setConfirmModal(null)
        setLoading(true)
        try {
          const response = await fetch('/api/members', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: member.id,
              inBodyScans: (member.inBodyScans ?? 0) - 1
            })
          })

          if (response.ok) {
            setMessage(`✅ ${t('memberDetails.inBodyUsed')}`)
            setTimeout(() => setMessage(''), 3000)
            fetchMember()
          }
        } catch (error) {
          setMessage(`❌ ${t('memberDetails.error')}`)
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const handleUseInvitation = async () => {
    if (!member || (member.invitations ?? 0) <= 0) {
      setMessage(`⚠️ ${t('memberDetails.noInvitationsRemaining')}`)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setActiveModal('invitation')
  }

  const handleSubmitInvitation = async () => {
    if (!member) return

    if (!invitationData.guestName.trim() || !invitationData.guestPhone.trim()) {
      setMessage(`⚠️ ${t('memberDetails.invitationModal.enterGuestInfo')}`)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          guestName: invitationData.guestName.trim(),
          guestPhone: invitationData.guestPhone.trim(),
          notes: invitationData.notes.trim() || undefined
        })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`✅ ${t('memberDetails.invitationModal.invitationSuccess')}`)
        setTimeout(() => setMessage(''), 3000)

        setInvitationData({
          guestName: '',
          guestPhone: '',
          notes: ''
        })
        setActiveModal(null)

        fetchMember()
      } else {
        setMessage(`❌ ${result.error || t('memberDetails.invitationModal.invitationFailed')}`)
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error(error)
      setMessage(`❌ ${t('memberDetails.connectionError')}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleUseFreePT = async () => {
    if (!member || (member.freePTSessions ?? 0) <= 0) {
      setMessage(`⚠️ ${t('memberDetails.noFreePTRemaining')}`)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setConfirmModal({
      show: true,
      title: `💪 ${t('memberDetails.useFreePT')}`,
      message: t('memberDetails.confirmUseFreePT'),
      onConfirm: async () => {
        setConfirmModal(null)
        setLoading(true)
        try {
          const response = await fetch('/api/members', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: member.id,
              freePTSessions: (member.freePTSessions ?? 0) - 1
            })
          })

          if (response.ok) {
            setMessage(`✅ ${t('memberDetails.freePTUsed')}`)
            setTimeout(() => setMessage(''), 3000)
            fetchMember()
          }
        } catch (error) {
          setMessage(`❌ ${t('memberDetails.error')}`)
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const handleEditBasicInfo = async () => {
    if (!member || !editBasicInfoData.name.trim() || !editBasicInfoData.phone.trim()) {
      setMessage(`⚠️ ${t('memberDetails.editModal.enterNameAndPhone')}`)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: member.id,
          name: editBasicInfoData.name.trim(),
          phone: editBasicInfoData.phone.trim(),
          subscriptionPrice: parseInt(editBasicInfoData.subscriptionPrice.toString()),
          inBodyScans: parseInt(editBasicInfoData.inBodyScans.toString()),
          invitations: parseInt(editBasicInfoData.invitations.toString()),
          freePTSessions: parseInt(editBasicInfoData.freePTSessions.toString()),
          remainingFreezeDays: parseInt(editBasicInfoData.remainingFreezeDays.toString()),
          notes: editBasicInfoData.notes.trim() || null,
          startDate: editBasicInfoData.startDate || null,
          expiryDate: editBasicInfoData.expiryDate || null
        })
      })

      if (response.ok) {
        setMessage(`✅ ${t('memberDetails.editModal.updateSuccess')}`)
        setTimeout(() => setMessage(''), 3000)

        setEditBasicInfoData({
          name: '',
          phone: '',
          subscriptionPrice: 0,
          inBodyScans: 0,
          invitations: 0,
          freePTSessions: 0,
          remainingFreezeDays: 0,
          notes: '',
          startDate: '',
          expiryDate: ''
        })
        setActiveModal(null)
        fetchMember()
      } else {
        const result = await response.json()
        setMessage(`❌ ${result.error || t('memberDetails.editModal.updateFailed')}`)
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error(error)
      setMessage(`❌ ${t('memberDetails.connectionError')}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRemainingAmount = async () => {
    if (!member || addRemainingAmountData.amount <= 0) {
      setMessage(`⚠️ ${t('memberDetails.addRemainingAmountModal.enterValidAmount')}`)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const cleanAmount = parseInt(addRemainingAmountData.amount.toString())
      const newRemaining = member.remainingAmount + cleanAmount

      const response = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: member.id,
          remainingAmount: newRemaining
        })
      })

      if (response.ok) {
        setMessage(`✅ ${t('memberDetails.addRemainingAmountModal.amountAdded', { amount: cleanAmount.toString() })}`)
        setTimeout(() => setMessage(''), 3000)

        setAddRemainingAmountData({ amount: 0, notes: '' })
        setActiveModal(null)
        fetchMember()
      } else {
        const result = await response.json()
        setMessage(`❌ ${result.error || t('memberDetails.addRemainingAmountModal.updateFailed')}`)
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error(error)
      setMessage(`❌ ${t('memberDetails.connectionError')}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleFreeze = async () => {
    if (!member || !member.expiryDate || freezeData.days <= 0) {
      setMessage(`⚠️ ${t('memberDetails.freezeModal.enterValidDays')}`)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    // التحقق من رصيد الفريز الكافي
    if (freezeData.days > member.remainingFreezeDays) {
      setMessage(`❌ رصيد الفريز غير كافٍ. المتاح: ${member.remainingFreezeDays} يوم`)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/members/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          freezeDays: freezeData.days
        })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`✅ تم تجميد الاشتراك لمدة ${freezeData.days} يوم بنجاح`)
        setTimeout(() => setMessage(''), 3000)

        setFreezeData({ days: 0, reason: '' })
        setActiveModal(null)
        fetchMember()
      } else {
        setMessage(`❌ ${result.error || 'فشل التجميد'}`)
        setTimeout(() => setMessage(''), 5000)
      }
    } catch (error) {
      setMessage(`❌ ${t('memberDetails.error')}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!member) return

    setConfirmModal({
      show: true,
      title: `⚠️ ${t('memberDetails.deleteModal.title')}`,
      message: t('memberDetails.deleteModal.confirmMessage', { name: member.name, number: member.memberNumber.toString() }),
      onConfirm: async () => {
        setConfirmModal(null)
        setLoading(true)
        try {
          const response = await fetch(`/api/members?id=${member.id}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            setMessage(`✅ ${t('memberDetails.deleteModal.deleteSuccess')}`)
            setTimeout(() => {
              router.push('/members')
            }, 1500)
          } else {
            setMessage(`❌ ${t('memberDetails.deleteModal.deleteFailed')}`)
          }
        } catch (error) {
          console.error(error)
          setMessage(`❌ ${t('memberDetails.deleteModal.deleteError')}`)
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const handleOpenFitnessTest = async () => {
    console.log('handleOpenFitnessTest called')
    console.log('fitnessTestExists:', fitnessTestExists)

    if (fitnessTestExists) {
      setActiveModal('view-fitness-test')
    } else {
      // Auto-select coach if current user is coach
      try {
        const userStr = localStorage.getItem('user')
        console.log('User from localStorage:', userStr)

        if (userStr) {
          const user = JSON.parse(userStr)
          console.log('Parsed user:', user)

          if (user.role === 'COACH' && user.staffId) {
            console.log('Opening form directly for coach')
            router.push(`/fitness-tests/new?memberId=${memberId}&coachId=${user.staffId}`)
            return
          }
        }
      } catch (error) {
        console.error('Error parsing user from localStorage:', error)
      }

      // Default: show coach selection modal
      console.log('Fetching coaches and opening selection modal')
      await fetchCoaches()
      setActiveModal('fitness-test-coach-select')
    }
  }

  const handleSubmitFitnessTest = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/members/${memberId}/fitness-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId: selectedCoachId,
          testDate: fitnessTestForm.testDate,
          medicalQuestions: fitnessTestForm.medicalQuestions,
          flexibility: fitnessTestForm.flexibility,
          exercises: fitnessTestForm.exercises,
        }),
      })

      if (response.ok) {
        setMessage(`✅ ${t('memberDetails.fitnessTest.saveSuccess')}`)
        setTimeout(() => setMessage(''), 3000)
        setActiveModal(null)
        fetchFitnessTest()
      } else {
        const result = await response.json()
        setMessage(`❌ ${result.error || t('memberDetails.fitnessTest.saveFailed')}`)
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage(`❌ ${t('memberDetails.fitnessTest.saveError')}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !member) {
    return (
      <div className="container mx-auto p-6 text-center" dir="rtl">
        <div className="text-6xl mb-4">⏳</div>
        <p className="text-xl">{t('memberDetails.loading')}</p>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="container mx-auto p-6 text-center" dir="rtl">
        <div className="text-6xl mb-4">❌</div>
        <p className="text-xl mb-4">{t('memberDetails.memberNotFound')}</p>
        <button
          onClick={() => router.push('/members')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {t('memberDetails.back')}
        </button>
      </div>
    )
  }

  const isExpired = member.expiryDate ? new Date(member.expiryDate) < new Date() : false
  const daysRemaining = calculateRemainingDays(member.expiryDate)

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">👤 {t('memberDetails.title')}</h1>
          <p className="text-gray-600">{t('memberDetails.subtitle')}</p>
        </div>
        <button
          onClick={() => router.push('/members')}
          className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
        >
          ← {t('memberDetails.back')}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.includes('✅') ? 'bg-green-100 text-green-800' : message.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-2xl p-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm opacity-90 mb-2">{t('memberDetails.membershipNumber')}</p>
            <p className="text-5xl font-bold">#{member.memberNumber}</p>
          </div>
          <div>
            <p className="text-sm opacity-90 mb-2">{t('memberDetails.memberName')}</p>
            <p className="text-3xl font-bold">{member.name}</p>
          </div>
          <div>
            <p className="text-sm opacity-90 mb-2">{t('memberDetails.phoneNumber')}</p>
            <p className="text-2xl font-mono">{member.phone}</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white border-opacity-20">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-90">{t('memberDetails.status')}</p>
              <p className="text-lg font-bold">
                {member.isActive && !isExpired ? `✅ ${t('memberDetails.active')}` : `❌ ${t('memberDetails.expired')}`}
              </p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-90">{t('common.startDate')}</p>
              <p className="text-lg font-mono">
                {formatDateYMD(member.startDate)}
              </p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-90">{t('memberDetails.expiryDate')}</p>
              <p className="text-lg font-mono">
                {formatDateYMD(member.expiryDate)}
              </p>
              {daysRemaining !== null && daysRemaining > 0 && (
                <p className="text-xs opacity-75 mt-1">{t('memberDetails.daysRemaining', { days: daysRemaining.toString() })}</p>
              )}
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-90">{t('memberDetails.subscriptionPrice')}</p>
              <p className="text-2xl font-bold">{member.subscriptionPrice} {t('memberDetails.egp')}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-90">{t('memberDetails.remainingAmount')}</p>
              <p className="text-2xl font-bold text-yellow-300">{member.remainingAmount} {t('memberDetails.egp')}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-sm opacity-90">{t('memberDetails.lastReceipt')}</p>
              <p className="text-2xl font-bold text-green-300">
                {lastReceiptNumber ? `#${lastReceiptNumber}` : '---'}
              </p>
            </div>
          </div>
        </div>

        {/* عرض الملاحظات */}
        {member.notes && (
          <div className="mt-6 pt-6 border-t border-white border-opacity-20">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📝</span>
                <p className="text-sm opacity-90 font-semibold">{t('memberDetails.notes')}</p>
              </div>
              <p className="text-base leading-relaxed whitespace-pre-wrap">{member.notes}</p>
            </div>
          </div>
        )}
      </div>

            <div className="mb-6">
              <BarcodeWhatsApp
                memberNumber={member.memberNumber}
                memberName={member.name}
                memberPhone={member.phone}
              />
            </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-r-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm">{t('memberDetails.inBody')}</p>
              <p className="text-4xl font-bold text-green-600">{member.inBodyScans ?? 0}</p>
            </div>
            <div className="text-5xl">⚖️</div>
          </div>
          <button
            onClick={handleUseInBody}
            disabled={(member.inBodyScans ?? 0) <= 0 || loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {t('memberDetails.useSession')}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-r-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm">{t('memberDetails.invitations')}</p>
              <p className="text-4xl font-bold text-purple-600">{member.invitations ?? 0}</p>
            </div>
            <div className="text-5xl">🎟️</div>
          </div>
          <button
            onClick={handleUseInvitation}
            disabled={(member.invitations ?? 0) <= 0 || loading}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {t('memberDetails.useInvitation')}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-r-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm">{t('memberDetails.freePTSessions')}</p>
              <p className="text-4xl font-bold text-orange-600">{member.freePTSessions ?? 0}</p>
            </div>
            <div className="text-5xl">💪</div>
          </div>
          <button
            onClick={handleUseFreePT}
            disabled={(member.freePTSessions ?? 0) <= 0 || loading}
            className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {t('memberDetails.useSession')}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-r-4 border-cyan-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm">{t('memberDetails.freezeDays')}</p>
              <p className="text-4xl font-bold text-cyan-600">{member.remainingFreezeDays ?? 0}</p>
            </div>
            <div className="text-5xl">❄️</div>
          </div>
          <button
            onClick={() => setActiveModal('freeze')}
            disabled={!member.expiryDate || loading || (member.remainingFreezeDays ?? 0) <= 0}
            className="w-full bg-cyan-600 text-white py-2 rounded-lg hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {t('memberDetails.freezeSubscription')}
          </button>
        </div>
      </div>

      {/* PT Subscription Card */}
      {ptSubscription && (
        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-xl shadow-2xl p-6 mb-6 border-4 border-teal-300">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <div className="bg-white/20 p-3 rounded-full w-fit">
              <span className="text-4xl">🏋️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold">اشتراك التدريب الشخصي (PT)</h3>
              <p className="text-sm opacity-90">معلومات مبسطة عن اشتراك PT</p>
            </div>
            <div className="bg-green-500 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 w-fit">
              <span>✅</span>
              <span>نشط</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4">
            <div className="bg-white/10 rounded-lg p-3 md:p-4 backdrop-blur-sm hover:bg-white/20 transition">
              <p className="text-xs opacity-80 mb-1">رقم PT</p>
              <p className="text-xl md:text-2xl font-bold">#{ptSubscription.ptNumber}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-3 md:p-4 backdrop-blur-sm hover:bg-white/20 transition">
              <p className="text-xs opacity-80 mb-1">الكوتش</p>
              <p className="text-base md:text-lg font-bold truncate">{ptSubscription.coachName}</p>
            </div>

            <div className="bg-white/10 rounded-lg p-3 md:p-4 backdrop-blur-sm hover:bg-white/20 transition">
              <p className="text-xs opacity-80 mb-1">الجلسات المتبقية</p>
              <p className="text-xl md:text-2xl font-bold text-yellow-300">
                {ptSubscription.sessionsRemaining} / {ptSubscription.sessionsPurchased}
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-3 md:p-4 backdrop-blur-sm hover:bg-white/20 transition">
              <p className="text-xs opacity-80 mb-1">المبلغ المتبقي</p>
              <p className="text-xl md:text-2xl font-bold text-yellow-300">
                {ptSubscription.remainingAmount} ج.م
              </p>
            </div>
          </div>

          {ptSubscription.expiryDate && (
            <div className="mt-4 bg-white/10 rounded-lg p-3 backdrop-blur-sm hover:bg-white/20 transition">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm opacity-90">📅 تاريخ الانتهاء</span>
                <span className="font-bold">{new Date(ptSubscription.expiryDate).toLocaleDateString('ar-EG')}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/pt')}
            className="w-full mt-4 bg-white text-teal-600 py-3 rounded-lg hover:bg-gray-100 font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <span>📊</span>
            <span>عرض تفاصيل PT الكاملة</span>
          </button>
        </div>
      )}

      {/* Payment & Edit Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Payment Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-3xl">💰</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('memberDetails.paymentModal.title')}</h3>
              <p className="text-sm text-gray-600">{t('memberDetails.paymentModal.remainingLabel', { amount: member.remainingAmount.toString() })}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('payment')}
            disabled={member.remainingAmount <= 0 || loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold"
          >
            {t('memberDetails.paymentModal.payButton')}
          </button>
        </div>

        {/* Edit Card */}
        {hasPermission('canEditMembers') && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <span className="text-3xl">✏️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">{t('memberDetails.editModal.title')}</h3>
                <p className="text-sm text-gray-600">{t('memberDetails.editModal.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditBasicInfoData({
                  name: member.name,
                  phone: member.phone,
                  subscriptionPrice: member.subscriptionPrice,
                  inBodyScans: member.inBodyScans ?? 0,
                  invitations: member.invitations ?? 0,
                  freePTSessions: member.freePTSessions ?? 0,
                  remainingFreezeDays: member.remainingFreezeDays ?? 0,
                  notes: member.notes || '',
                  startDate: member.startDate ? formatDateYMD(member.startDate) : '',
                  expiryDate: member.expiryDate ? formatDateYMD(member.expiryDate) : ''
                })
                setActiveModal('edit-basic-info')
              }}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold"
            >
              {t('memberDetails.editModal.editButton')}
            </button>
          </div>
        )}
      </div>

      {/* Fitness Test Section */}
      {(hasPermission('canCreateFitnessTest') || hasPermission('canViewFitnessTests')) && (
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-teal-500 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-teal-100 p-3 rounded-full">
              <span className="text-3xl">📋</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('memberDetails.fitnessTest.title')}</h3>
              <p className="text-sm text-gray-600">
                {fitnessTestExists
                  ? t('memberDetails.fitnessTest.createdBy', { coachName: fitnessTestData?.coachName || t('memberDetails.fitnessTest.coach') })
                  : t('memberDetails.fitnessTest.notCreated')}
              </p>
            </div>
          </div>
          {hasPermission('canCreateFitnessTest') && (
            <button
              onClick={handleOpenFitnessTest}
              disabled={loading}
              className={`w-full ${
                fitnessTestExists ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'
              } text-white py-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed font-bold`}
            >
              {fitnessTestExists ? t('memberDetails.fitnessTest.viewTest') : t('memberDetails.fitnessTest.createTest')}
            </button>
          )}
          {!hasPermission('canCreateFitnessTest') && hasPermission('canViewFitnessTests') && fitnessTestExists && (
            <button
              onClick={handleOpenFitnessTest}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed font-bold"
            >
              {t('memberDetails.fitnessTest.viewTest')}
            </button>
          )}
        </div>
      )}

      {/* Upgrade Package - Show only for active members with subscription */}
      {member?.isActive && member?.startDate && (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-200 p-3 rounded-full">
              <span className="text-3xl">🚀</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-orange-800">{t('upgrade.upgradePackage')}</h3>
              <p className="text-sm text-orange-700">{t('upgrade.upgradeDescription')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowUpgradeForm(true)}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-lg hover:from-orange-700 hover:to-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-lg shadow-md hover:shadow-lg transition-all"
          >
            🚀 {t('upgrade.upgradePackage')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-200 p-3 rounded-full">
              <span className="text-3xl">🔄</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-800">{t('renewall.title')}</h3>
              <p className="text-sm text-green-700">{t('renewall.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowRenewalForm(true)}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-lg shadow-md hover:shadow-lg"
          >
            🔄 {t('renewall.renewButton')}
          </button>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-200 p-3 rounded-full">
              <span className="text-3xl">🗑️</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-800">{t('memberDetails.deleteModal.title')}</h3>
              <p className="text-sm text-red-700">{t('memberDetails.deleteModal.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-lg shadow-md hover:shadow-lg"
          >
            🗑️ {t('memberDetails.deleteModal.deleteButton')}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.show && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" dir={direction}>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-3">{confirmModal.title}</h3>
              <p className="text-gray-600 text-lg">{confirmModal.message}</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm()
                }}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-bold"
              >
                ✅ {t('memberDetails.confirmModal.yes')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-bold"
              >
                ✖️ {t('memberDetails.confirmModal.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: دفع المبلغ */}
      {activeModal === 'payment' && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null)
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">💰 {t('memberDetails.paymentModal.title')}</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                type="button"
              >
                ×
              </button>
            </div>

            <div className="bg-yellow-50 border-r-4 border-yellow-500 p-4 rounded-lg mb-6">
              <p className="font-bold text-yellow-800">
                {t('memberDetails.paymentModal.remainingLabel', { amount: member.remainingAmount.toString() })}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('memberDetails.paymentModal.amountPaid')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={paymentData.amount || ''}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: parseInt(e.target.value) || 0 })}
                  max={member.remainingAmount}
                  className="w-full px-4 py-3 border-2 rounded-lg text-xl focus:outline-none focus:border-blue-500"
                  placeholder="0"
                  autoFocus
                />
              </div>

              <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-5">
                <PaymentMethodSelector
                  value={paymentData.paymentMethod}
                  onChange={(method) => setPaymentData({ ...paymentData, paymentMethod: method })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('memberDetails.paymentModal.notes')}</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500"
                  rows={3}
                  placeholder={t('memberDetails.paymentModal.notesPlaceholder')}
                />
              </div>

              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <div className="flex justify-between text-lg">
                  <span>{t('memberDetails.paymentModal.remainingAfterPayment')}:</span>
                  <span className="font-bold text-green-600">
                    {member.remainingAmount - paymentData.amount} {t('memberDetails.egp')}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={loading || paymentData.amount <= 0}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-bold"
                >
                  {loading ? t('memberDetails.paymentModal.processing') : `✅ ${t('memberDetails.paymentModal.confirmPayment')}`}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300"
                >
                  {t('memberDetails.confirmModal.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: تعديل البيانات الأساسية */}
      {activeModal === 'edit-basic-info' && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null)
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-4 my-4" onClick={(e) => e.stopPropagation()} dir={direction}>
            <div className="flex justify-between items-center mb-3 pb-2 border-b">
              <h3 className="text-base font-bold">✏️ {t('memberDetails.editModal.title')} #{member.memberNumber}</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                type="button"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  📋 {t('memberDetails.editModal.fields.name')} *
                </label>
                <input
                  type="text"
                  value={editBasicInfoData.name}
                  onChange={(e) => setEditBasicInfoData({ ...editBasicInfoData, name: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  placeholder={t('memberDetails.editModal.fields.namePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  📞 {t('memberDetails.editModal.fields.phone')} *
                </label>
                <input
                  type="tel"
                  value={editBasicInfoData.phone}
                  onChange={(e) => setEditBasicInfoData({ ...editBasicInfoData, phone: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm font-mono"
                  placeholder={t('memberDetails.editModal.fields.phonePlaceholder')}
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  💰 {t('memberDetails.editModal.fields.subscriptionPrice')}
                </label>
                <input
                  type="number"
                  value={editBasicInfoData.subscriptionPrice || ''}
                  onChange={(e) => setEditBasicInfoData({ ...editBasicInfoData, subscriptionPrice: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  📅 {t('memberDetails.editModal.fields.startDate')}
                </label>
                <input
                  type="date"
                  value={editBasicInfoData.startDate}
                  onChange={(e) => setEditBasicInfoData({ ...editBasicInfoData, startDate: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  🏁 {t('memberDetails.editModal.fields.expiryDate')}
                </label>
                <input
                  type="date"
                  value={editBasicInfoData.expiryDate}
                  onChange={(e) => setEditBasicInfoData({ ...editBasicInfoData, expiryDate: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  ⚖️ {t('memberDetails.editModal.fields.inBodyScans')}
                </label>
                <input
                  type="number"
                  value={editBasicInfoData.inBodyScans || ''}
                  onChange={(e) => setEditBasicInfoData({ ...editBasicInfoData, inBodyScans: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  🎟️ {t('memberDetails.editModal.fields.invitations')}
                </label>
                <input
                  type="number"
                  value={editBasicInfoData.invitations || ''}
                  onChange={(e) => setEditBasicInfoData({ ...editBasicInfoData, invitations: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  💪 {t('memberDetails.editModal.fields.freePTSessions')}
                </label>
                <input
                  type="number"
                  value={editBasicInfoData.freePTSessions || ''}
                  onChange={(e) => setEditBasicInfoData({ ...editBasicInfoData, freePTSessions: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  ❄️ أيام الفريز
                </label>
                <input
                  type="number"
                  value={editBasicInfoData.remainingFreezeDays || ''}
                  onChange={(e) => setEditBasicInfoData({ ...editBasicInfoData, remainingFreezeDays: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="col-span-2 md:col-span-3">
                <label className="block text-xs font-medium mb-1">
                  📝 {t('memberDetails.editModal.fields.additionalNotes')}
                </label>
                <textarea
                  value={editBasicInfoData.notes}
                  onChange={(e) => setEditBasicInfoData({ ...editBasicInfoData, notes: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  placeholder={t('memberDetails.editModal.fields.notesPlaceholder')}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t">
              <button
                type="button"
                onClick={handleEditBasicInfo}
                disabled={loading || !editBasicInfoData.name.trim() || !editBasicInfoData.phone.trim()}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold text-sm"
              >
                {loading ? t('memberDetails.editModal.buttons.saving') : `✅ ${t('memberDetails.editModal.buttons.save')}`}
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-6 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-bold text-sm"
              >
                {t('memberDetails.editModal.buttons.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: إدخال تفاصيل الضيف (الدعوة) */}
      {activeModal === 'invitation' && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveModal(null)
              setInvitationData({ guestName: '', guestPhone: '', notes: '' })
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()} dir={direction}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <span>🎟️</span>
                <span>{t('memberDetails.invitationModal.title')}</span>
              </h3>
              <button
                onClick={() => {
                  setActiveModal(null)
                  setInvitationData({ guestName: '', guestPhone: '', notes: '' })
                }}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                type="button"
              >
                ×
              </button>
            </div>

            <div className={`bg-purple-50 ${direction === 'rtl' ? 'border-r-4' : 'border-l-4'} border-purple-500 p-4 rounded-lg mb-6`}>
              <p className="font-bold text-purple-800">
                {t('memberDetails.invitationModal.memberLabel', { name: member.name, number: member.memberNumber.toString() })}
              </p>
              <p className="text-sm text-purple-700 mt-1">
                {t('memberDetails.invitationModal.invitationsRemaining', { count: (member.invitations ?? 0).toString() })}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('memberDetails.invitationModal.guestName')} <span className="text-red-600">{t('memberDetails.invitationModal.required')}</span>
                </label>
                <input
                  type="text"
                  value={invitationData.guestName}
                  onChange={(e) => setInvitationData({ ...invitationData, guestName: e.target.value })}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder={t('memberDetails.invitationModal.guestNamePlaceholder')}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('memberDetails.invitationModal.guestPhone')} <span className="text-red-600">{t('memberDetails.invitationModal.required')}</span>
                </label>
                <input
                  type="tel"
                  value={invitationData.guestPhone}
                  onChange={(e) => setInvitationData({ ...invitationData, guestPhone: e.target.value })}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-purple-500 font-mono"
                  placeholder={t('memberDetails.invitationModal.guestPhonePlaceholder')}
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('memberDetails.invitationModal.notes')}</label>
                <textarea
                  value={invitationData.notes}
                  onChange={(e) => setInvitationData({ ...invitationData, notes: e.target.value })}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-purple-500"
                  rows={3}
                  placeholder={t('memberDetails.invitationModal.notesPlaceholder')}
                />
              </div>

              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <span className="text-xl">✅</span>
                  <div>
                    <p className="font-semibold">{t('memberDetails.invitationModal.actionsSummary')}</p>
                    <p className="text-sm">{t('memberDetails.invitationModal.action1')}</p>
                    <p className="text-sm">{t('memberDetails.invitationModal.action2')}</p>
                    <p className="text-sm">{t('memberDetails.invitationModal.action3')}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSubmitInvitation}
                  disabled={loading || !invitationData.guestName.trim() || !invitationData.guestPhone.trim()}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-bold"
                >
                  {loading ? t('memberDetails.invitationModal.saving') : `✅ ${t('memberDetails.invitationModal.registerInvitation')}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null)
                    setInvitationData({ guestName: '', guestPhone: '', notes: '' })
                  }}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300"
                >
                  {t('memberDetails.invitationModal.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Freeze Modal */}
      {activeModal === 'freeze' && member && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" dir={direction}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">❄️ {t('memberDetails.freezeModal.title')}</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600 text-3xl"
              >
                ×
              </button>
            </div>

            <div className="bg-cyan-50 border-r-4 border-cyan-500 p-4 rounded-lg mb-4">
              <p className="text-sm text-cyan-800 mb-2">
                ❄️ {t('memberDetails.freezeModal.availableFreezeDays')}: <strong className="text-xl">{member.remainingFreezeDays} {t('common.day')}</strong>
              </p>
              <p className="text-xs text-cyan-600">{t('memberDetails.freezeModal.canUseInBatches')}</p>
            </div>

            <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded-lg mb-6">
              <p className="text-sm text-blue-800 mb-2">
                {t('memberDetails.freezeModal.currentExpiryDate')}: <strong>{formatDateYMD(member.expiryDate)}</strong>
              </p>
              {daysRemaining !== null && (
                <p className="text-sm text-blue-800">
                  {t('memberDetails.freezeModal.remainingDays')}: <strong>{daysRemaining > 0 ? daysRemaining : 0} {t('common.day')}</strong>
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('memberDetails.freezeModal.freezeDays')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={freezeData.days}
                  onChange={(e) => setFreezeData({ ...freezeData, days: parseInt(e.target.value) || 0 })}
                  min="1"
                  max={member.remainingFreezeDays}
                  className="w-full px-4 py-3 border-2 rounded-lg text-xl"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('memberDetails.freezeModal.canFreezeUpTo')} {member.remainingFreezeDays} {t('common.day')}
                </p>
              </div>

              {freezeData.days > 0 && member.expiryDate && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                  <p className="text-sm text-green-800 mb-2">
                    📅 {t('memberDetails.freezeModal.newExpiryDate')}:
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {formatDateYMD(new Date(new Date(member.expiryDate).getTime() + freezeData.days * 24 * 60 * 60 * 1000))}
                  </p>
                  <div className="mt-3 pt-3 border-t border-green-300">
                    <p className="text-xs text-green-700">
                      ✅ {t('memberDetails.freezeModal.willFreeze')} {freezeData.days} {t('common.day')}
                    </p>
                    <p className="text-xs text-green-700">
                      ❄️ {t('memberDetails.freezeModal.remainingBalance')}: {member.remainingFreezeDays - freezeData.days} {t('common.day')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleFreeze}
                  disabled={loading || freezeData.days <= 0 || freezeData.days > member.remainingFreezeDays}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold"
                >
                  {loading ? t('common.processing') : `✅ ${t('memberDetails.freezeModal.confirmFreeze')}`}
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fitness Test Modals */}
      {activeModal === 'fitness-test-coach-select' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold mb-4 text-center">اختيار المدرب</h3>
            <select
              value={selectedCoachId}
              onChange={(e) => setSelectedCoachId(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-lg mb-4 text-lg"
            >
              <option value="">-- اختر المدرب --</option>
              {coaches.map(coach => (
                <option key={coach.id} value={coach.id}>{coach.name}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (selectedCoachId) {
                    setLoading(true)
                    try {
                      const response = await fetch('/api/fitness-test-requests', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          memberId: memberId,
                          coachId: selectedCoachId,
                        }),
                      })

                      if (response.ok) {
                        setMessage('✅ تم إرسال الطلب للمدرب بنجاح!')
                        setTimeout(() => setMessage(''), 3000)
                        setActiveModal(null)
                        setSelectedCoachId('')
                      } else {
                        const result = await response.json()
                        setMessage(`❌ ${result.error || 'فشل إرسال الطلب'}`)
                        setTimeout(() => setMessage(''), 3000)
                      }
                    } catch (error) {
                      console.error('Error:', error)
                      setMessage('❌ حدث خطأ في إرسال الطلب')
                      setTimeout(() => setMessage(''), 3000)
                    } finally {
                      setLoading(false)
                    }
                  }
                }}
                disabled={!selectedCoachId || loading}
                className="flex-1 bg-teal-600 text-white py-3 rounded-lg disabled:bg-gray-400"
              >
                {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-6 bg-gray-200 py-3 rounded-lg"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'fitness-test-form' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="sticky top-0 bg-white pb-4 border-b mb-6 z-10">
              <h3 className="text-2xl font-bold text-center">📋 نموذج تقييم اللياقة</h3>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-bold mb-3 text-lg">معلومات العضو</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">رقم العضوية</p>
                  <p className="font-bold text-lg">#{member?.memberNumber}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">الاسم</p>
                  <p className="font-bold text-lg">{member?.name}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">الهاتف</p>
                  <p className="font-bold text-lg">{member?.phone}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block font-bold mb-2 text-lg">تاريخ الاختبار</label>
              <input
                type="date"
                value={fitnessTestForm.testDate}
                onChange={(e) => setFitnessTestForm({...fitnessTestForm, testDate: e.target.value})}
                className="w-full px-4 py-3 border-2 rounded-lg text-lg"
              />
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <h4 className="font-bold mb-4 text-lg">الأسئلة الطبية</h4>
              <div className="space-y-3">
                {[
                  { key: 'firstTimeGym', label: 'هل هذه أول مرة في النادي؟' },
                  { key: 'inDietPlan', label: 'هل أنت على نظام غذائي؟' },
                  { key: 'hernia', label: 'هل تعاني من فتق أو أي حالة قد تتفاقم بسبب رفع الأثقال؟' },
                  { key: 'familyHeartHistory', label: 'هل يوجد تاريخ عائلي لأمراض القلب؟' },
                  { key: 'heartProblem', label: 'هل لديك أي مشاكل في القلب؟' },
                  { key: 'backPain', label: 'هل تعاني من آلام في الظهر؟' },
                  { key: 'surgery', label: 'هل أجريت أي عملية جراحية؟' },
                  { key: 'breathingProblems', label: 'هل لديك تاريخ من مشاكل التنفس أو الرئة؟' },
                  { key: 'bloodPressure', label: 'هل تعاني من ضغط الدم؟' },
                  { key: 'kneeProblem', label: 'هل لديك مشاكل في الركبة؟' },
                  { key: 'diabetes', label: 'هل تعاني من السكري؟' },
                  { key: 'smoker', label: 'هل أنت مدخن؟' },
                  { key: 'highCholesterol', label: 'هل لديك مستوى عالي من الكوليسترول؟' },
                ].map((q) => (
                  <label key={q.key} className="flex items-center gap-3 cursor-pointer hover:bg-yellow-100 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={fitnessTestForm.medicalQuestions[q.key as keyof MedicalQuestions]}
                      onChange={(e) => setFitnessTestForm({
                        ...fitnessTestForm,
                        medicalQuestions: {
                          ...fitnessTestForm.medicalQuestions,
                          [q.key]: e.target.checked
                        }
                      })}
                      className="w-5 h-5"
                    />
                    <span className="text-base">{q.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">حصص PT المجانية للعضو</span>
                <span className="text-4xl font-bold text-orange-600">
                  {member?.freePTSessions || 0}
                </span>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg mb-6">
              <h4 className="font-bold mb-4 text-lg">اختبار المرونة</h4>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'shoulder', label: 'الكتف (Shoulder)' },
                  { key: 'hip', label: 'الورك (Hip)' },
                  { key: 'elbow', label: 'الكوع (Elbow)' },
                  { key: 'wrist', label: 'المعصم (Wrist)' },
                  { key: 'spine', label: 'العمود الفقري (Spine)' },
                  { key: 'scapula', label: 'لوح الكتف (Scapula)' },
                  { key: 'knee', label: 'الركبة (Knee)' },
                  { key: 'ankle', label: 'الكاحل (Ankle)' },
                ].map((part) => (
                  <div key={part.key}>
                    <label className="block font-medium mb-2">{part.label}</label>
                    <select
                      value={fitnessTestForm.flexibility[part.key as keyof FlexibilityAssessment]}
                      onChange={(e) => setFitnessTestForm({
                        ...fitnessTestForm,
                        flexibility: {...fitnessTestForm.flexibility, [part.key]: e.target.value}
                      })}
                      className="w-full px-3 py-2 border-2 rounded-lg"
                    >
                      <option value="FAIR">Fair</option>
                      <option value="GOOD">Good</option>
                      <option value="EXCELLENT">Excellent</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h4 className="font-bold mb-4 text-lg">اختبار التمارين</h4>
              <div className="space-y-4">
                {[
                  { key: 'pushup', label: 'الضغط (Push up)' },
                  { key: 'situp', label: 'البطن (Sit-up)' },
                  { key: 'pullup', label: 'العقلة (Pull up)' },
                  { key: 'squat', label: 'القرفصاء (Squat)' },
                  { key: 'plank', label: 'البلانك (Plank)' },
                  { key: 'legpress', label: 'ضغط الأرجل (Leg press)' },
                  { key: 'chestpress', label: 'ضغط الصدر (Chest press)' },
                ].map((ex) => (
                  <div key={ex.key} className="flex items-center gap-4">
                    <div className="w-48 font-medium">{ex.label}</div>
                    <input
                      type="number"
                      placeholder="Sets"
                      value={fitnessTestForm.exercises[ex.key as keyof ExerciseTestData].sets}
                      onChange={(e) => setFitnessTestForm({
                        ...fitnessTestForm,
                        exercises: {
                          ...fitnessTestForm.exercises,
                          [ex.key]: {...fitnessTestForm.exercises[ex.key as keyof ExerciseTestData], sets: parseInt(e.target.value) || 0}
                        }
                      })}
                      className="w-24 px-3 py-2 border-2 rounded-lg"
                      min="0"
                    />
                    <span>×</span>
                    <input
                      type="number"
                      placeholder="Reps"
                      value={fitnessTestForm.exercises[ex.key as keyof ExerciseTestData].reps}
                      onChange={(e) => setFitnessTestForm({
                        ...fitnessTestForm,
                        exercises: {
                          ...fitnessTestForm.exercises,
                          [ex.key]: {...fitnessTestForm.exercises[ex.key as keyof ExerciseTestData], reps: parseInt(e.target.value) || 0}
                        }
                      })}
                      className="w-24 px-3 py-2 border-2 rounded-lg"
                      min="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white pt-4 border-t flex gap-3">
              <button
                onClick={handleSubmitFitnessTest}
                disabled={loading}
                className="flex-1 bg-teal-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-teal-700 disabled:bg-gray-400"
              >
                {loading ? 'جاري الحفظ...' : 'حفظ الاختبار'}
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-8 bg-gray-200 py-4 rounded-lg font-bold hover:bg-gray-300"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'view-fitness-test' && fitnessTestData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="sticky top-0 bg-white pb-4 border-b mb-6">
              <h3 className="text-2xl font-bold text-center">📋 عرض اختبار اللياقة</h3>
              <p className="text-center text-gray-600 mt-2">تم إنشاؤه بواسطة: {fitnessTestData.coachName}</p>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-bold mb-3">معلومات العضو</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">رقم العضوية</p>
                    <p className="font-bold">#{fitnessTestData.memberNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">الاسم</p>
                    <p className="font-bold">{fitnessTestData.memberName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">تاريخ الاختبار</p>
                    <p className="font-bold">{new Date(fitnessTestData.testDate).toLocaleDateString(direction === 'rtl' ? 'ar-EG' : 'en-US')}</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-bold">حصص PT المجانية</span>
                  <span className="text-3xl font-bold text-orange-600">{fitnessTestData.freePTSessions}</span>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-bold mb-3">الحالة الطبية</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(fitnessTestData.medicalQuestions).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span>{value ? '✅' : '❌'}</span>
                      <span className="text-gray-700">{key}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-bold mb-3">تقييم المرونة</h4>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  {Object.entries(fitnessTestData.flexibility).map(([key, value]) => (
                    <div key={key} className="bg-white p-2 rounded">
                      <p className="text-gray-600 text-xs">{key}</p>
                      <p className="font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-bold mb-3">نتائج التمارين</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(fitnessTestData.exercises).map(([key, value]) => (
                    <div key={key} className="flex justify-between bg-white p-2 rounded">
                      <span className="font-medium">{key}</span>
                      <span className="font-bold text-green-600">{value.sets} × {value.reps}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white pt-4 border-t mt-6">
              <button
                onClick={() => setActiveModal(null)}
                className="w-full bg-gray-600 text-white py-3 rounded-lg font-bold hover:bg-gray-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* سجل الحضور */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-blue-100" dir={direction}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg">
              <span className="text-3xl">📊</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{t('memberDetails.attendanceLog.title')}</h2>
              <p className="text-sm text-gray-500">{t('memberDetails.attendanceLog.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-5 rounded-xl mb-6 border border-blue-200">
          <h3 className="text-sm font-bold text-gray-700 mb-3">🔍 {t('memberDetails.attendanceLog.filterByPeriod')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('memberDetails.attendanceLog.dateFrom')}</label>
              <input
                type="date"
                value={attendanceStartDate}
                onChange={(e) => setAttendanceStartDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('memberDetails.attendanceLog.dateTo')}</label>
              <input
                type="date"
                value={attendanceEndDate}
                onChange={(e) => setAttendanceEndDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchAttendanceHistory}
                disabled={attendanceLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:bg-gray-400 font-semibold shadow-md transition-all transform hover:scale-105"
              >
                {attendanceLoading ? `⏳ ${t('memberDetails.attendanceLog.loading')}` : `✓ ${t('memberDetails.attendanceLog.applyFilter')}`}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {attendanceLoading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">{t('memberDetails.attendanceLog.loadingData')}</p>
          </div>
        ) : attendanceHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-xl text-gray-600">{t('memberDetails.attendanceLog.noRecordsForPeriod')}</p>
          </div>
        ) : (
          <>
            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-semibold mb-1">{t('memberDetails.attendanceLog.totalVisits')}</p>
                    <p className="text-3xl font-bold text-blue-700">{attendanceHistory.length}</p>
                  </div>
                  <div className="text-4xl opacity-50">📊</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-semibold mb-1">{t('memberDetails.attendanceLog.lastVisit')}</p>
                    <p className="text-lg font-bold text-green-700">
                      {new Date(attendanceHistory[0].checkInTime).toLocaleDateString(direction === 'rtl' ? 'ar-EG' : 'en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-4xl opacity-50">📅</div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-blue-600">
                <tr>
                  <th className={`px-6 py-4 ${direction === 'rtl' ? 'text-right' : 'text-left'} text-white font-bold`}>#</th>
                  <th className={`px-6 py-4 ${direction === 'rtl' ? 'text-right' : 'text-left'} text-white font-bold`}>{t('memberDetails.attendanceLog.date')}</th>
                  <th className={`px-6 py-4 ${direction === 'rtl' ? 'text-right' : 'text-left'} text-white font-bold`}>{t('memberDetails.attendanceLog.checkInTime')}</th>
                </tr>
              </thead>
              <tbody>
                {attendanceHistory.map((checkIn, index) => {
                  const checkInTime = new Date(checkIn.checkInTime)

                  return (
                    <tr key={checkIn.id} className="border-t hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-700">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-700">
                          {checkInTime.toLocaleDateString(direction === 'rtl' ? 'ar-EG' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-bold text-sm">
                          {checkInTime.toLocaleTimeString(direction === 'rtl' ? 'ar-EG' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* نموذج التجديد */}
      {showRenewalForm && (
        <RenewalForm
          member={member}
          onSuccess={(receipt?: Receipt) => {
            if (receipt) {
              setReceiptData({
                receiptNumber: receipt.receiptNumber,
                type: t('renewall.membershipRenewal'),
                amount: receipt.amount,
                details: receipt.itemDetails,
                date: new Date(receipt.createdAt),
                paymentMethod: receipt.paymentMethod || 'cash'
              })
              setShowReceipt(true)
              setLastReceiptNumber(receipt.receiptNumber)
            }

            fetchMember()
            setShowRenewalForm(false)
            setMessage(`✅ ${t('renewall.renewalSuccessMessage')}`)
            setTimeout(() => setMessage(''), 3000)
          }}
          onClose={() => setShowRenewalForm(false)}
        />
      )}

      {/* نموذج الترقية */}
      {showUpgradeForm && member && (
        <UpgradeForm
          member={member}
          onSuccess={() => {
            setShowUpgradeForm(false)
            fetchMember()
            setMessage(`✅ ${t('upgrade.upgradeSuccess')}`)
            setTimeout(() => setMessage(''), 3000)
          }}
          onClose={() => setShowUpgradeForm(false)}
        />
      )}

      {/* الإيصال */}
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