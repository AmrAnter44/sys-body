'use client'

import { useEffect, useState } from 'react'
import ExcelJS from 'exceljs'

interface DailyData {
  date: string
  floor: number
  pt: number
  expenses: number
  expenseDetails: string
  visa: number
  instapay: number
  cash: number
  wallet: number
  staffLoans: { [key: string]: number }
  receipts: any[]
  expensesList: any[]
}

interface Staff {
  id: string
  name: string
}

export default function ClosingPage() {
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('monthly')
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  
  const [totals, setTotals] = useState({
    floor: 0,
    pt: 0,
    expenses: 0,
    visa: 0,
    instapay: 0,
    cash: 0,
    wallet: 0,
    totalRevenue: 0,
    netProfit: 0
  })

  const fetchData = async () => {
    try {
      setLoading(true)

      const staffRes = await fetch('/api/staff')
      const staff = await staffRes.json()
      setStaffList(staff)

      const receiptsRes = await fetch('/api/receipts')
      const receipts = await receiptsRes.json()

      const expensesRes = await fetch('/api/expenses')
      const expenses = await expensesRes.json()

      const now = new Date()
      const filterDate = (dateString: string) => {
        const d = new Date(dateString)
        
        if (viewMode === 'daily') {
          // في الوضع اليومي، نعرض اليوم المحدد فقط
          const selectedDate = new Date(selectedDay)
          return d.toDateString() === selectedDate.toDateString()
        } else {
          // في الوضع الشهري، نعرض الشهر المحدد
          const [year, month] = selectedMonth.split('-')
          return d.getFullYear() === parseInt(year) && d.getMonth() === parseInt(month) - 1
        }
      }

      const filteredReceipts = receipts.filter((r: any) => filterDate(r.createdAt))
      const filteredExpenses = expenses.filter((e: any) => filterDate(e.createdAt))

      const dailyMap: { [key: string]: DailyData } = {}

      filteredReceipts.forEach((receipt: any) => {
        const date = new Date(receipt.createdAt).toISOString().split('T')[0]
        
        if (!dailyMap[date]) {
          dailyMap[date] = {
            date,
            floor: 0,
            pt: 0,
            expenses: 0,
            expenseDetails: '',
            visa: 0,
            instapay: 0,
            cash: 0,
            wallet: 0,
            staffLoans: {},
            receipts: [],
            expensesList: []
          }
        }

        dailyMap[date].receipts.push(receipt)

        if (receipt.type === 'Member') {
          dailyMap[date].floor += receipt.amount
        } else if (receipt.type === 'PT') {
          dailyMap[date].pt += receipt.amount
        }

        const paymentMethod = receipt.paymentMethod || 'cash'
        if (paymentMethod === 'visa') {
          dailyMap[date].visa += receipt.amount
        } else if (paymentMethod === 'instapay') {
          dailyMap[date].instapay += receipt.amount
        } else if (paymentMethod === 'wallet') {
          dailyMap[date].wallet += receipt.amount
        } else {
          dailyMap[date].cash += receipt.amount
        }
      })

      filteredExpenses.forEach((expense: any) => {
        const date = new Date(expense.createdAt).toISOString().split('T')[0]
        
        if (!dailyMap[date]) {
          dailyMap[date] = {
            date,
            floor: 0,
            pt: 0,
            expenses: 0,
            expenseDetails: '',
            visa: 0,
            instapay: 0,
            cash: 0,
            wallet: 0,
            staffLoans: {},
            receipts: [],
            expensesList: []
          }
        }

        dailyMap[date].expensesList.push(expense)
        dailyMap[date].expenses += expense.amount
        
        if (expense.type === 'staff_loan' && expense.staff) {
          const staffName = expense.staff.name
          if (!dailyMap[date].staffLoans[staffName]) {
            dailyMap[date].staffLoans[staffName] = 0
          }
          dailyMap[date].staffLoans[staffName] += expense.amount
        }

        if (dailyMap[date].expenseDetails) {
          dailyMap[date].expenseDetails += ' + '
        }
        dailyMap[date].expenseDetails += `${expense.amount}${expense.description}`
      })

      const sortedData = Object.values(dailyMap).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      setDailyData(sortedData)

      const newTotals = sortedData.reduce((acc, day) => {
        acc.floor += day.floor
        acc.pt += day.pt
        acc.expenses += day.expenses
        acc.visa += day.visa
        acc.instapay += day.instapay
        acc.cash += day.cash
        acc.wallet += day.wallet
        return acc
      }, {
        floor: 0,
        pt: 0,
        expenses: 0,
        visa: 0,
        instapay: 0,
        cash: 0,
        wallet: 0,
        totalRevenue: 0,
        netProfit: 0
      })

      newTotals.totalRevenue = newTotals.floor + newTotals.pt
      newTotals.netProfit = newTotals.totalRevenue - newTotals.expenses

      setTotals(newTotals)

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [viewMode, selectedDay, selectedMonth])

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'X-GYM'
      workbook.created = new Date()

      const mainSheet = workbook.addWorksheet('التقفيل المالي', {
        views: [{ rightToLeft: true }],
        properties: { defaultColWidth: 12 }
      })

      const headerRow = mainSheet.addRow([
        'التاريخ',
        'Floor',
        'PT',
        'كاش',
        'فيزا',
        'إنستاباي',
        'محفظة',
        'مصاريف',
        'تفاصيل المصاريف',
        'إجمالي السلف',
        ...staffList.map(staff => staff.name)
      ])

      headerRow.font = { bold: true, size: 12, name: 'Arial' }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      }
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
      headerRow.height = 25
      headerRow.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }

      dailyData.forEach((day, index) => {
        const totalStaffLoans = Object.values(day.staffLoans).reduce((a, b) => a + b, 0)
        const row = mainSheet.addRow([
          new Date(day.date).toLocaleDateString('ar-EG'),
          day.floor > 0 ? day.floor : 0,
          day.pt > 0 ? day.pt : 0,
          day.cash > 0 ? day.cash : 0,
          day.visa > 0 ? day.visa : 0,
          day.instapay > 0 ? day.instapay : 0,
          day.wallet > 0 ? day.wallet : 0,
          day.expenses > 0 ? day.expenses : 0,
          day.expenseDetails || '-',
          totalStaffLoans > 0 ? totalStaffLoans : 0,
          ...staffList.map(staff => day.staffLoans[staff.name] || 0)
        ])

        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' }
          }
        }

        row.alignment = { horizontal: 'right', vertical: 'middle' }
        row.font = { name: 'Arial', size: 11 }
        
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        })
      })

      const totalStaffLoansAll = dailyData.reduce((sum, day) => 
        sum + Object.values(day.staffLoans).reduce((a, b) => a + b, 0), 0
      )
      const totalsRow = mainSheet.addRow([
        'الإجمالي',
        totals.floor,
        totals.pt,
        totals.cash,
        totals.visa,
        totals.instapay,
        totals.wallet,
        totals.expenses,
        '',
        totalStaffLoansAll,
        ...staffList.map(staff => {
          const total = dailyData.reduce((sum, day) => 
            sum + (day.staffLoans[staff.name] || 0), 0
          )
          return total
        })
      ])

      totalsRow.font = { bold: true, size: 13, name: 'Arial' }
      totalsRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD700' }
      }
      totalsRow.alignment = { horizontal: 'right', vertical: 'middle' }
      totalsRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'medium' },
          left: { style: 'thin' },
          bottom: { style: 'medium' },
          right: { style: 'thin' }
        }
      })

      mainSheet.addRow([])
      const profitRow = mainSheet.addRow(['صافي الربح', totals.netProfit])
      profitRow.font = { bold: true, size: 14, name: 'Arial' }
      profitRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF90EE90' }
      }
      profitRow.alignment = { horizontal: 'right', vertical: 'middle' }

      mainSheet.addRow([])
      const summaryTitle = mainSheet.addRow(['الملخص المالي'])
      summaryTitle.font = { bold: true, size: 13, name: 'Arial' }
      summaryTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      }
      
      mainSheet.addRow(['إجمالي الإيرادات', totals.totalRevenue])
      mainSheet.addRow(['إجمالي المصروفات', totals.expenses])
      mainSheet.addRow(['صافي الربح', totals.netProfit])
      mainSheet.addRow(['عدد الأيام', dailyData.length])
      mainSheet.addRow(['متوسط اليوم', dailyData.length > 0 ? Math.round(totals.totalRevenue / dailyData.length) : 0])

      mainSheet.addRow([])
      const paymentTitle = mainSheet.addRow(['طرق الدفع'])
      paymentTitle.font = { bold: true, size: 13, name: 'Arial' }
      paymentTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      }
      
      mainSheet.addRow(['كاش', totals.cash])
      mainSheet.addRow(['فيزا', totals.visa])
      mainSheet.addRow(['إنستاباي', totals.instapay])
      mainSheet.addRow(['محفظة', totals.wallet])

      mainSheet.columns = [
        { width: 15 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 14 },
        { width: 12 },
        { width: 12 },
        { width: 45 },
        { width: 14 },
        ...staffList.map(() => ({ width: 14 }))
      ]

      if (dailyData.some(day => day.receipts.length > 0)) {
        const receiptsSheet = workbook.addWorksheet('تفاصيل الإيصالات', {
          views: [{ rightToLeft: true }]
        })

        const receiptsHeader = receiptsSheet.addRow([
          'التاريخ', 'الوقت', 'رقم الإيصال', 'النوع', 'المبلغ', 'طريقة الدفع', 'التفاصيل'
        ])
        receiptsHeader.font = { bold: true, size: 12, name: 'Arial' }
        receiptsHeader.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF87CEEB' }
        }
        receiptsHeader.alignment = { horizontal: 'center', vertical: 'middle' }
        receiptsHeader.height = 25

        dailyData.forEach(day => {
          day.receipts.forEach((receipt: any) => {
            const details = JSON.parse(receipt.itemDetails)
            const detailsText = details.memberName || details.clientName || details.name || '-'
            const row = receiptsSheet.addRow([
              new Date(receipt.createdAt).toLocaleDateString('ar-EG'),
              new Date(receipt.createdAt).toLocaleTimeString('ar-EG'),
              receipt.receiptNumber,
              receipt.type === 'Member' ? 'عضوية' : receipt.type === 'PT' ? 'تدريب شخصي' : receipt.type,
              receipt.amount,
              receipt.paymentMethod === 'visa' ? 'فيزا' : receipt.paymentMethod === 'instapay' ? 'إنستاباي' : receipt.paymentMethod === 'wallet' ? 'محفظة' : 'كاش',
              detailsText
            ])
            row.alignment = { horizontal: 'right', vertical: 'middle' }
            row.font = { name: 'Arial', size: 10 }
          })
        })

        receiptsSheet.columns = [
          { width: 15 },
          { width: 12 },
          { width: 15 },
          { width: 18 },
          { width: 12 },
          { width: 15 },
          { width: 35 }
        ]
      }

      if (dailyData.some(day => day.expensesList.length > 0)) {
        const expensesSheet = workbook.addWorksheet('تفاصيل المصروفات', {
          views: [{ rightToLeft: true }]
        })

        const expensesHeader = expensesSheet.addRow([
          'التاريخ', 'الوقت', 'النوع', 'الوصف', 'الموظف', 'المبلغ', 'الحالة'
        ])
        expensesHeader.font = { bold: true, size: 12, name: 'Arial' }
        expensesHeader.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFA07A' }
        }
        expensesHeader.alignment = { horizontal: 'center', vertical: 'middle' }
        expensesHeader.height = 25

        dailyData.forEach(day => {
          day.expensesList.forEach((expense: any) => {
            const row = expensesSheet.addRow([
              new Date(expense.createdAt).toLocaleDateString('ar-EG'),
              new Date(expense.createdAt).toLocaleTimeString('ar-EG'),
              expense.type === 'gym_expense' ? 'مصروف جيم' : 'سلفة',
              expense.description,
              expense.staff ? expense.staff.name : '-',
              expense.amount,
              expense.type === 'staff_loan' ? (expense.isPaid ? 'مدفوعة' : 'غير مدفوعة') : '-'
            ])
            row.alignment = { horizontal: 'right', vertical: 'middle' }
            row.font = { name: 'Arial', size: 10 }
          })
        })

        expensesSheet.columns = [
          { width: 15 },
          { width: 12 },
          { width: 15 },
          { width: 35 },
          { width: 18 },
          { width: 12 },
          { width: 15 }
        ]
      }

      let fileName = 'تقفيل_مالي'
      if (viewMode === 'daily') {
        fileName += `_${selectedDay}`
      } else {
        fileName += `_${selectedMonth}`
      }
      fileName += '.xlsx'

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      window.URL.revokeObjectURL(url)

      console.log('✅ تم تصدير ملف Excel بنجاح!')

    } catch (error) {
      console.error('❌ خطأ في التصدير:', error)
      alert('حدث خطأ أثناء التصدير. يرجى المحاولة مرة أخرى.')
    }
  }

  const toggleDayDetails = (date: string) => {
    setExpandedDay(expandedDay === date ? null : date)
  }

  const getTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'Member': 'عضوية',
      'PT': 'تدريب شخصي',
      'DayUse': 'يوم استخدام',
      'InBody': 'InBody'
    }
    return types[type] || type
  }

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      'cash': 'كاش 💵',
      'visa': 'فيزا 💳',
      'instapay': 'إنستاباي 📱',
      'wallet': 'محفظة 💰'
    }
    return methods[method] || 'كاش 💵'
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="mb-6 no-print">
        <h1 className="text-3xl font-bold mb-2">💰 التقفيل المالي التفصيلي</h1>
        <p className="text-gray-600">تقرير يومي شامل مع تفصيل كل العمليات</p>
        
        {/* View Mode Tabs */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              viewMode === 'daily'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📅 التقفيل اليومي
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              viewMode === 'monthly'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📆 التقفيل الشهري
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 bg-white p-6 rounded-lg shadow-md no-print">
        <div className="space-y-4">
          {viewMode === 'daily' ? (
            /* اختيار اليوم للعرض اليومي */
            <div>
              <label className="block text-sm font-medium mb-2">📅 اختر اليوم</label>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-4 py-2 border-2 rounded-lg font-mono text-lg"
              />
              <p className="text-sm text-gray-600 mt-2">
                عرض تفاصيل يوم {new Date(selectedDay).toLocaleDateString('ar-EG', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          ) : (
            /* اختيار الشهر للعرض الشهري */
            <div>
              <label className="block text-sm font-medium mb-2">📅 اختر الشهر</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border-2 rounded-lg font-mono text-lg"
              />
              <p className="text-sm text-gray-600 mt-2">
                عرض جميع أيام شهر {new Date(selectedMonth + '-01').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              🖨️ طباعة
            </button>
            <button
              onClick={handleExportExcel}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              📊 تصدير Excel
            </button>
            <button
              onClick={fetchData}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
            >
              🔄 تحديث
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">جاري التحميل...</p>
        </div>
      ) : (
        <>
          {/* Header للطباعة */}
          <div className="text-center mb-6 print-only" style={{ display: 'none' }}>
            <h1 className="text-3xl font-bold mb-2">X - GYM</h1>
            <p className="text-lg text-gray-600">
              {viewMode === 'daily' 
                ? `التقفيل اليومي - ${new Date(selectedDay).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                : `التقفيل الشهري - ${new Date(selectedMonth + '-01').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`
              }
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 no-print">
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">إجمالي الإيرادات</p>
              <p className="text-3xl font-bold">{totals.totalRevenue.toFixed(0)}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-4 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">إجمالي المصروفات</p>
              <p className="text-3xl font-bold">{totals.expenses.toFixed(0)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">صافي الربح</p>
              <p className="text-3xl font-bold">{totals.netProfit.toFixed(0)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">عدد الأيام</p>
              <p className="text-3xl font-bold">{dailyData.length}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg shadow-lg">
              <p className="text-sm opacity-90">متوسط اليوم</p>
              <p className="text-3xl font-bold">
                {dailyData.length > 0 ? (totals.totalRevenue / dailyData.length).toFixed(0) : 0}
              </p>
            </div>
          </div>

          {/* Payment Methods Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 no-print">
            <div className="bg-white border-2 border-green-300 p-4 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">كاش 💵</p>
                  <p className="text-2xl font-bold text-green-600">{totals.cash.toFixed(0)}</p>
                </div>
                <span className="text-4xl">💵</span>
              </div>
            </div>
            <div className="bg-white border-2 border-blue-300 p-4 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">فيزا 💳</p>
                  <p className="text-2xl font-bold text-blue-600">{totals.visa.toFixed(0)}</p>
                </div>
                <span className="text-4xl">💳</span>
              </div>
            </div>
            <div className="bg-white border-2 border-purple-300 p-4 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إنستاباي 📱</p>
                  <p className="text-2xl font-bold text-purple-600">{totals.instapay.toFixed(0)}</p>
                </div>
                <span className="text-4xl">📱</span>
              </div>
            </div>
            <div className="bg-white border-2 border-orange-300 p-4 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">محفظة 💰</p>
                  <p className="text-2xl font-bold text-orange-600">{totals.wallet.toFixed(0)}</p>
                </div>
                <span className="text-4xl">💰</span>
              </div>
            </div>
          </div>

          {/* Excel-like Table */}
          <div className="bg-white rounded-lg shadow-lg overflow-x-auto mb-6">
            {viewMode === 'daily' ? (
              /* عرض تفاصيل اليوم المحدد مباشرة */
              dailyData.length > 0 ? (
                <div className="p-6 space-y-6">
                  {dailyData.map((day) => (
                    <div key={day.date} className="space-y-4">
                      {/* معلومات اليوم */}
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold mb-2">
                          📅 {new Date(day.date).toLocaleDateString('ar-EG', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="bg-white/20 p-3 rounded-lg">
                            <p className="text-sm opacity-90">Floor</p>
                            <p className="text-xl font-bold">{day.floor > 0 ? day.floor.toFixed(0) : '0'} ج.م</p>
                          </div>
                          <div className="bg-white/20 p-3 rounded-lg">
                            <p className="text-sm opacity-90">PT</p>
                            <p className="text-xl font-bold">{day.pt > 0 ? day.pt.toFixed(0) : '0'} ج.م</p>
                          </div>
                          <div className="bg-white/20 p-3 rounded-lg">
                            <p className="text-sm opacity-90">المصروفات</p>
                            <p className="text-xl font-bold">{day.expenses > 0 ? day.expenses.toFixed(0) : '0'} ج.م</p>
                          </div>
                          <div className="bg-white/20 p-3 rounded-lg">
                            <p className="text-sm opacity-90">الإجمالي</p>
                            <p className="text-xl font-bold">{((day.floor + day.pt) - day.expenses).toFixed(0)} ج.م</p>
                          </div>
                        </div>
                      </div>

                      {/* طرق الدفع */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-bold text-lg mb-3">💳 طرق الدفع</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-white p-3 rounded-lg border-2 border-green-200">
                            <p className="text-sm text-gray-600">كاش 💵</p>
                            <p className="text-lg font-bold text-green-600">{day.cash > 0 ? day.cash.toFixed(0) : '0'}</p>
                          </div>
                          <div className="bg-white p-3 rounded-lg border-2 border-blue-200">
                            <p className="text-sm text-gray-600">فيزا 💳</p>
                            <p className="text-lg font-bold text-blue-600">{day.visa > 0 ? day.visa.toFixed(0) : '0'}</p>
                          </div>
                          <div className="bg-white p-3 rounded-lg border-2 border-purple-200">
                            <p className="text-sm text-gray-600">إنستاباي 📱</p>
                            <p className="text-lg font-bold text-purple-600">{day.instapay > 0 ? day.instapay.toFixed(0) : '0'}</p>
                          </div>
                          <div className="bg-white p-3 rounded-lg border-2 border-orange-200">
                            <p className="text-sm text-gray-600">محفظة 💰</p>
                            <p className="text-lg font-bold text-orange-600">{day.wallet > 0 ? day.wallet.toFixed(0) : '0'}</p>
                          </div>
                        </div>
                      </div>

                      {/* السلف */}
                      {Object.keys(day.staffLoans).length > 0 && (
                        <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                          <h3 className="font-bold text-lg mb-3">💰 سلف الموظفين</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(day.staffLoans).map(([staffName, amount]) => (
                              <div key={staffName} className="bg-white p-3 rounded-lg">
                                <p className="text-sm text-gray-600">{staffName}</p>
                                <p className="text-lg font-bold text-red-600">{amount.toFixed(0)} ج.م</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* الإيصالات */}
                      {day.receipts.length > 0 ? (
                        <div>
                          <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <span>🧾</span>
                            <span>الإيصالات ({day.receipts.length})</span>
                          </h4>
                          <div className="bg-white rounded-lg overflow-hidden border-2 border-blue-200">
                            <table className="w-full text-sm">
                              <thead className="bg-blue-100">
                                <tr>
                                  <th className="px-3 py-2 text-right">الوقت</th>
                                  <th className="px-3 py-2 text-right">رقم الإيصال</th>
                                  <th className="px-3 py-2 text-right">النوع</th>
                                  <th className="px-3 py-2 text-right">التفاصيل</th>
                                  <th className="px-3 py-2 text-right">المبلغ</th>
                                  <th className="px-3 py-2 text-right">طريقة الدفع</th>
                                </tr>
                              </thead>
                              <tbody>
                                {day.receipts.map((receipt: any) => {
                                  const details = JSON.parse(receipt.itemDetails)
                                  return (
                                    <tr key={receipt.id} className="border-t hover:bg-blue-50">
                                      <td className="px-3 py-2 font-mono text-xs">
                                        {new Date(receipt.createdAt).toLocaleTimeString('ar-EG')}
                                      </td>
                                      <td className="px-3 py-2 font-bold text-green-600">
                                        #{receipt.receiptNumber}
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                          {getTypeLabel(receipt.type)}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2">
                                        {details.memberName && (
                                          <div>
                                            {details.memberName}
                                            {details.memberNumber && (
                                              <span className="text-xs text-gray-600"> (#{details.memberNumber})</span>
                                            )}
                                          </div>
                                        )}
                                        {details.clientName && <div>{details.clientName}</div>}
                                        {details.name && <div>{details.name}</div>}
                                      </td>
                                      <td className="px-3 py-2 font-bold text-green-600">
                                        {receipt.amount} ج.م
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className="text-xs">
                                          {getPaymentMethodLabel(receipt.paymentMethod)}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-8 rounded-lg text-center">
                          <p className="text-gray-500 text-lg">📭 لا توجد إيصالات في هذا اليوم</p>
                        </div>
                      )}

                      {/* المصروفات */}
                      {day.expensesList.length > 0 ? (
                        <div>
                          <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <span>💸</span>
                            <span>المصروفات ({day.expensesList.length})</span>
                          </h4>
                          <div className="bg-white rounded-lg overflow-hidden border-2 border-red-200">
                            <table className="w-full text-sm">
                              <thead className="bg-red-100">
                                <tr>
                                  <th className="px-3 py-2 text-right">الوقت</th>
                                  <th className="px-3 py-2 text-right">النوع</th>
                                  <th className="px-3 py-2 text-right">الوصف</th>
                                  <th className="px-3 py-2 text-right">الموظف</th>
                                  <th className="px-3 py-2 text-right">المبلغ</th>
                                  <th className="px-3 py-2 text-right">الحالة</th>
                                </tr>
                              </thead>
                              <tbody>
                                {day.expensesList.map((expense: any) => (
                                  <tr key={expense.id} className="border-t hover:bg-red-50">
                                    <td className="px-3 py-2 font-mono text-xs">
                                      {new Date(expense.createdAt).toLocaleTimeString('ar-EG')}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        expense.type === 'gym_expense' 
                                          ? 'bg-orange-100 text-orange-800' 
                                          : 'bg-purple-100 text-purple-800'
                                      }`}>
                                        {expense.type === 'gym_expense' ? 'مصروف جيم' : 'سلفة'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">{expense.description}</td>
                                    <td className="px-3 py-2">
                                      {expense.staff ? expense.staff.name : '-'}
                                    </td>
                                    <td className="px-3 py-2 font-bold text-red-600">
                                      {expense.amount} ج.م
                                    </td>
                                    <td className="px-3 py-2">
                                      {expense.type === 'staff_loan' && (
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          expense.isPaid 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {expense.isPaid ? '✅ مدفوعة' : '❌ غير مدفوعة'}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-8 rounded-lg text-center">
                          <p className="text-gray-500 text-lg">📭 لا توجد مصروفات في هذا اليوم</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500 text-lg">📭 لا توجد بيانات لهذا اليوم</p>
                </div>
              )
            ) : (
              /* الجدول العادي للعرض الشهري */
            <table className="w-full border-collapse text-sm excel-table">
              <thead>
                <tr className="bg-gray-200 border-2 border-gray-400">
                  <th className="border border-gray-400 px-3 py-2 text-center font-bold">التاريخ</th>
                  <th className="border border-gray-400 px-3 py-2 text-center font-bold bg-blue-100">Floor</th>
                  <th className="border border-gray-400 px-3 py-2 text-center font-bold bg-green-100">PT</th>
                  <th className="border border-gray-400 px-3 py-2 text-center font-bold bg-green-50">كاش 💵</th>
                  <th className="border border-gray-400 px-3 py-2 text-center font-bold bg-blue-50">فيزا 💳</th>
                  <th className="border border-gray-400 px-3 py-2 text-center font-bold bg-purple-50">إنستاباي 📱</th>
                  <th className="border border-gray-400 px-3 py-2 text-center font-bold bg-orange-50">محفظة 💰</th>
                  <th className="border border-gray-400 px-3 py-2 text-center font-bold bg-orange-100">مصاريف</th>
                  <th className="border border-gray-400 px-3 py-2 text-center font-bold min-w-[300px]">تفاصيل المصاريف</th>
                  <th className="border border-gray-400 px-3 py-2 text-center font-bold bg-yellow-50">السلف</th>
                  {staffList.map(staff => (
                    <th key={staff.id} className="border border-gray-400 px-3 py-2 text-center font-bold bg-red-50 min-w-[80px]">
                      {staff.name}
                    </th>
                  ))}
                  <th className="border border-gray-400 px-3 py-2 text-center font-bold no-print">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((day, index) => (
                  <>
                    <tr 
                      key={day.date} 
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} cursor-pointer hover:bg-blue-50`}
                      onClick={() => toggleDayDetails(day.date)}
                    >
                      <td className="border border-gray-300 px-3 py-2 text-center font-mono">
                        {new Date(day.date).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-bold text-blue-600">
                        {day.floor > 0 ? day.floor.toFixed(0) : '-'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-bold text-green-600">
                        {day.pt > 0 ? day.pt.toFixed(0) : '-'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-bold text-green-700">
                        {day.cash > 0 ? day.cash.toFixed(0) : '-'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-bold text-blue-700">
                        {day.visa > 0 ? day.visa.toFixed(0) : '-'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-bold text-purple-700">
                        {day.instapay > 0 ? day.instapay.toFixed(0) : '-'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-bold text-orange-700">
                        {day.wallet > 0 ? day.wallet.toFixed(0) : '-'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-bold text-red-600">
                        {day.expenses > 0 ? day.expenses.toFixed(0) : '-'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-xs">
                        {day.expenseDetails || '-'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-bold text-orange-600">
                        {Object.values(day.staffLoans).reduce((a, b) => a + b, 0).toFixed(0) || '-'}
                      </td>
                      {staffList.map(staff => (
                        <td key={staff.id} className="border border-gray-300 px-3 py-2 text-right text-red-600">
                          {day.staffLoans[staff.name] ? day.staffLoans[staff.name].toFixed(0) : '-'}
                        </td>
                      ))}
                      <td className="border border-gray-300 px-3 py-2 text-center no-print">
                        <button className="text-blue-600 hover:text-blue-800 font-bold">
                          {expandedDay === day.date ? '▼ إخفاء' : '▶ عرض'}
                        </button>
                      </td>
                    </tr>

                    {/* تفاصيل اليوم */}
                    {expandedDay === day.date && (
                      <tr className="bg-blue-50 no-print">
                        <td colSpan={staffList.length + 12} className="border border-gray-400 p-4">
                          <div className="space-y-4">
                            {/* الإيصالات */}
                            {day.receipts.length > 0 && (
                              <div>
                                <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                                  <span>🧾</span>
                                  <span>الإيصالات ({day.receipts.length})</span>
                                </h4>
                                <div className="bg-white rounded-lg overflow-hidden border-2 border-blue-200">
                                  <table className="w-full text-sm">
                                    <thead className="bg-blue-100">
                                      <tr>
                                        <th className="px-3 py-2 text-right">الوقت</th>
                                        <th className="px-3 py-2 text-right">رقم الإيصال</th>
                                        <th className="px-3 py-2 text-right">النوع</th>
                                        <th className="px-3 py-2 text-right">التفاصيل</th>
                                        <th className="px-3 py-2 text-right">المبلغ</th>
                                        <th className="px-3 py-2 text-right">طريقة الدفع</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {day.receipts.map((receipt: any) => {
                                        const details = JSON.parse(receipt.itemDetails)
                                        return (
                                          <tr key={receipt.id} className="border-t hover:bg-blue-50">
                                            <td className="px-3 py-2 font-mono text-xs">
                                              {new Date(receipt.createdAt).toLocaleTimeString('ar-EG')}
                                            </td>
                                            <td className="px-3 py-2 font-bold text-green-600">
                                              #{receipt.receiptNumber}
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                                {getTypeLabel(receipt.type)}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">
                                              {details.memberName && (
                                                <div>
                                                  {details.memberName}
                                                  {details.memberNumber && (
                                                    <span className="text-xs text-gray-600"> (#{details.memberNumber})</span>
                                                  )}
                                                </div>
                                              )}
                                              {details.clientName && <div>{details.clientName}</div>}
                                              {details.name && <div>{details.name}</div>}
                                            </td>
                                            <td className="px-3 py-2 font-bold text-green-600">
                                              {receipt.amount} ج.م
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className="text-xs">
                                                {getPaymentMethodLabel(receipt.paymentMethod)}
                                              </span>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* المصروفات */}
                            {day.expensesList.length > 0 && (
                              <div>
                                <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                                  <span>💸</span>
                                  <span>المصروفات ({day.expensesList.length})</span>
                                </h4>
                                <div className="bg-white rounded-lg overflow-hidden border-2 border-red-200">
                                  <table className="w-full text-sm">
                                    <thead className="bg-red-100">
                                      <tr>
                                        <th className="px-3 py-2 text-right">الوقت</th>
                                        <th className="px-3 py-2 text-right">النوع</th>
                                        <th className="px-3 py-2 text-right">الوصف</th>
                                        <th className="px-3 py-2 text-right">الموظف</th>
                                        <th className="px-3 py-2 text-right">المبلغ</th>
                                        <th className="px-3 py-2 text-right">الحالة</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {day.expensesList.map((expense: any) => (
                                        <tr key={expense.id} className="border-t hover:bg-red-50">
                                          <td className="px-3 py-2 font-mono text-xs">
                                            {new Date(expense.createdAt).toLocaleTimeString('ar-EG')}
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                              expense.type === 'gym_expense' 
                                                ? 'bg-orange-100 text-orange-800' 
                                                : 'bg-purple-100 text-purple-800'
                                            }`}>
                                              {expense.type === 'gym_expense' ? 'مصروف جيم' : 'سلفة'}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2">{expense.description}</td>
                                          <td className="px-3 py-2">
                                            {expense.staff ? expense.staff.name : '-'}
                                          </td>
                                          <td className="px-3 py-2 font-bold text-red-600">
                                            {expense.amount} ج.م
                                          </td>
                                          <td className="px-3 py-2">
                                            {expense.type === 'staff_loan' && (
                                              <span className={`px-2 py-1 rounded text-xs ${
                                                expense.isPaid 
                                                  ? 'bg-green-100 text-green-800' 
                                                  : 'bg-red-100 text-red-800'
                                              }`}>
                                                {expense.isPaid ? '✅ مدفوعة' : '❌ غير مدفوعة'}
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                
                {/* Totals Row */}
                <tr className="bg-yellow-100 border-t-4 border-yellow-600 font-bold">
                  <td className="border border-gray-400 px-3 py-3 text-center">الإجمالي</td>
                  <td className="border border-gray-400 px-3 py-3 text-right text-blue-700 text-lg">
                    {totals.floor.toFixed(0)}
                  </td>
                  <td className="border border-gray-400 px-3 py-3 text-right text-green-700 text-lg">
                    {totals.pt.toFixed(0)}
                  </td>
                  <td className="border border-gray-400 px-3 py-3 text-right text-green-800 text-lg">
                    {totals.cash.toFixed(0)}
                  </td>
                  <td className="border border-gray-400 px-3 py-3 text-right text-blue-800 text-lg">
                    {totals.visa.toFixed(0)}
                  </td>
                  <td className="border border-gray-400 px-3 py-3 text-right text-purple-800 text-lg">
                    {totals.instapay.toFixed(0)}
                  </td>
                  <td className="border border-gray-400 px-3 py-3 text-right text-orange-800 text-lg">
                    {totals.wallet.toFixed(0)}
                  </td>
                  <td className="border border-gray-400 px-3 py-3 text-right text-red-700 text-lg">
                    {totals.expenses.toFixed(0)}
                  </td>
                  <td className="border border-gray-400 px-3 py-3"></td>
                  <td className="border border-gray-400 px-3 py-3 text-right text-orange-700 text-lg">
                    {dailyData.reduce((sum, day) => 
                      sum + Object.values(day.staffLoans).reduce((a, b) => a + b, 0), 0
                    ).toFixed(0)}
                  </td>
                  {staffList.map(staff => {
                    const total = dailyData.reduce((sum, day) => 
                      sum + (day.staffLoans[staff.name] || 0), 0
                    )
                    return (
                      <td key={staff.id} className="border border-gray-400 px-3 py-3 text-right text-red-700">
                        {total > 0 ? total.toFixed(0) : '-'}
                      </td>
                    )
                  })}
                  <td className="border border-gray-400 px-3 py-3 no-print"></td>
                </tr>

                {/* Net Profit Row */}
                <tr className="bg-green-100 border-t-2 border-green-600 font-bold">
                  <td colSpan={3} className="border border-gray-400 px-3 py-3 text-center text-lg">
                    صافي الربح
                  </td>
                  <td colSpan={staffList.length + 9} className="border border-gray-400 px-3 py-3 text-right text-2xl text-green-700">
                    {totals.netProfit.toFixed(0)} ج.م
                  </td>
                </tr>
              </tbody>
            </table>
            )}
          </div>
        </>
      )}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .excel-table {
            font-size: 10px;
          }
          .excel-table th,
          .excel-table td {
            padding: 4px 6px !important;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
        
        .excel-table {
          font-family: 'Arial', sans-serif;
        }
        
        .excel-table th {
          background-color: #e5e7eb;
          font-weight: 700;
        }
        
        .excel-table td,
        .excel-table th {
          white-space: nowrap;
        }
      `}</style>
    </div>
  )
}