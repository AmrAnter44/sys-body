import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      ptNumber,
      phone,
      sessionsPurchased,
      coachName,
      pricePerSession,
      startDate,
      expiryDate,
      paymentMethod,
      staffName
    } = body

    console.log('🔄 تجديد جلسات PT:', { ptNumber, sessionsPurchased })

    // التحقق من وجود جلسة PT
    const existingPT = await prisma.pT.findUnique({
      where: { ptNumber: parseInt(ptNumber) }
    })
    
    if (!existingPT) {
      return NextResponse.json(
        { error: 'جلسة PT غير موجودة' }, 
        { status: 404 }
      )
    }

    // التحقق من التواريخ
    if (startDate && expiryDate) {
      const start = new Date(startDate)
      const end = new Date(expiryDate)
      
      if (end <= start) {
        return NextResponse.json(
          { error: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية' },
          { status: 400 }
        )
      }
    }

    // تحديث جلسة PT (إضافة الجلسات الجديدة للجلسات المتبقية)
    const updatedPT = await prisma.pT.update({
      where: { ptNumber: parseInt(ptNumber) },
      data: {
        phone,
        sessionsPurchased: existingPT.sessionsPurchased + sessionsPurchased,
        sessionsRemaining: existingPT.sessionsRemaining + sessionsPurchased,
        coachName,
        pricePerSession,
        startDate: startDate ? new Date(startDate) : existingPT.startDate,
        expiryDate: expiryDate ? new Date(expiryDate) : existingPT.expiryDate,
      },
    })

    console.log('✅ تم تحديث جلسة PT:', updatedPT.ptNumber)

    // إنشاء إيصال للتجديد
    try {
      let counter = await prisma.receiptCounter.findUnique({ where: { id: 1 } })
      
      if (!counter) {
        counter = await prisma.receiptCounter.create({
          data: { id: 1, current: 1000 }
        })
      }

      const totalAmount = sessionsPurchased * pricePerSession

      let subscriptionDays = null
      if (startDate && expiryDate) {
        const start = new Date(startDate)
        const end = new Date(expiryDate)
        subscriptionDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      }

      const receipt = await prisma.receipt.create({
        data: {
          receiptNumber: counter.current,
          type: 'تجديد برايفت',
          amount: totalAmount,
          paymentMethod: paymentMethod || 'cash',
          staffName: staffName || '',
          itemDetails: JSON.stringify({
            ptNumber: updatedPT.ptNumber,
            clientName: existingPT.clientName,
            phone: phone,
            sessionsPurchased,
            pricePerSession,
            totalAmount,
            coachName,
            startDate: startDate,
            expiryDate: expiryDate,
            subscriptionDays: subscriptionDays,
            oldSessionsRemaining: existingPT.sessionsRemaining,
            newSessionsRemaining: updatedPT.sessionsRemaining,
          }),
          ptNumber: updatedPT.ptNumber,
        },
      })

      console.log('✅ تم إنشاء إيصال التجديد:', receipt.receiptNumber)

      await prisma.receiptCounter.update({
        where: { id: 1 },
        data: { current: counter.current + 1 }
      })

      return NextResponse.json({ 
        pt: updatedPT, 
        receipt: {
          receiptNumber: receipt.receiptNumber,
          amount: receipt.amount,
          itemDetails: receipt.itemDetails,
          createdAt: receipt.createdAt
        }
      }, { status: 200 })

    } catch (receiptError) {
      console.error('❌ خطأ في إنشاء الإيصال:', receiptError)
      return NextResponse.json({ pt: updatedPT }, { status: 200 })
    }

  } catch (error) {
    console.error('❌ خطأ في تجديد جلسة PT:', error)
    return NextResponse.json({ error: 'فشل تجديد جلسة PT' }, { status: 500 })
  }
}