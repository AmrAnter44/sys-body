import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requirePermission } from '../../../../lib/auth'

// POST - دفع المبلغ المتبقي
export async function POST(request: Request) {
  try {
    // ✅ التحقق من صلاحية التعديل
    await requirePermission(request, 'canEditPT')

    const body = await request.json()
    const {
      ptNumber,
      paymentAmount,
      paymentMethod,
      staffName
    } = body

    if (!ptNumber) {
      return NextResponse.json(
        { error: 'رقم PT مطلوب' },
        { status: 400 }
      )
    }

    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'مبلغ الدفع يجب أن يكون أكبر من صفر' },
        { status: 400 }
      )
    }

    // البحث عن جلسة PT
    const pt = await prisma.pT.findUnique({
      where: { ptNumber: parseInt(ptNumber) }
    })

    if (!pt) {
      return NextResponse.json(
        { error: 'جلسة PT غير موجودة' },
        { status: 404 }
      )
    }

    // التحقق من أن المبلغ المدفوع لا يتجاوز المتبقي
    const currentRemaining = pt.remainingAmount || 0
    if (paymentAmount > currentRemaining) {
      return NextResponse.json(
        { error: `المبلغ المدفوع (${paymentAmount}) أكبر من المتبقي (${currentRemaining})` },
        { status: 400 }
      )
    }

    // تحديث المبلغ المتبقي
    const newRemainingAmount = currentRemaining - paymentAmount
    const updatedPT = await prisma.pT.update({
      where: { ptNumber: parseInt(ptNumber) },
      data: { remainingAmount: newRemainingAmount }
    })

    console.log(`✅ تم تحديث PT #${ptNumber}: الباقي من ${currentRemaining} إلى ${newRemainingAmount}`)

    // إنشاء إيصال للدفعة
    try {
      let counter = await prisma.receiptCounter.findUnique({ where: { id: 1 } })

      if (!counter) {
        counter = await prisma.receiptCounter.create({
          data: { id: 1, current: 1000 }
        })
      }

      const receipt = await prisma.receipt.create({
        data: {
          receiptNumber: counter.current,
          type: 'دفع باقي برايفت',
          amount: paymentAmount,
          paymentMethod: paymentMethod || 'cash',
          staffName: staffName || '',
          itemDetails: JSON.stringify({
            ptNumber: pt.ptNumber,
            clientName: pt.clientName,
            phone: pt.phone,
            coachName: pt.coachName,
            paymentAmount,
            previousRemaining: currentRemaining,
            newRemaining: newRemainingAmount,
            paymentType: 'remaining_amount_payment'
          }),
        },
      })

      console.log('✅ تم إنشاء إيصال الدفع:', receipt.receiptNumber)

      await prisma.receiptCounter.update({
        where: { id: 1 },
        data: { current: counter.current + 1 }
      })

      return NextResponse.json({
        success: true,
        pt: updatedPT,
        receipt,
        message: 'تم دفع المبلغ المتبقي بنجاح'
      })
    } catch (receiptError) {
      console.error('❌ خطأ في إنشاء الإيصال:', receiptError)

      // إرجاع PT المحدث حتى لو فشل الإيصال
      return NextResponse.json({
        success: true,
        pt: updatedPT,
        message: 'تم تحديث المبلغ ولكن فشل إنشاء الإيصال'
      })
    }
  } catch (error: any) {
    console.error('❌ خطأ في دفع المبلغ المتبقي:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية تعديل جلسات PT' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'فشل دفع المبلغ المتبقي' },
      { status: 500 }
    )
  }
}
