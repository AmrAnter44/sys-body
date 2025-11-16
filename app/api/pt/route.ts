import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requirePermission } from '../../../lib/auth'

// GET - جلب كل جلسات PT
export async function GET(request: Request) {
  try {
    // ✅ التحقق من صلاحية عرض PT
    await requirePermission(request, 'canViewPT')
    
    const ptSessions = await prisma.pT.findMany({
      orderBy: { createdAt: 'desc' },
      include: { receipts: true }
    })
    return NextResponse.json(ptSessions)
  } catch (error: any) {
    console.error('Error fetching PT sessions:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية عرض جلسات PT' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ error: 'فشل جلب جلسات PT' }, { status: 500 })
  }
}

// POST - إضافة جلسة PT جديدة
export async function POST(request: Request) {
  try {
    // ✅ التحقق من صلاحية إنشاء PT
    await requirePermission(request, 'canCreatePT')
    
    const body = await request.json()
    const { 
      ptNumber, 
      clientName, 
      phone, 
      sessionsPurchased, 
      coachName, 
      pricePerSession,
      startDate,
      expiryDate,
      paymentMethod
    } = body

    console.log('📝 إضافة جلسة PT جديدة:', { ptNumber, clientName, sessionsPurchased })

    // التحقق من أن رقم PT مُدخل
    if (!ptNumber) {
      return NextResponse.json(
        { error: 'رقم PT مطلوب' }, 
        { status: 400 }
      )
    }

    // التحقق من أن رقم PT غير مستخدم
    const existingPT = await prisma.pT.findUnique({
      where: { ptNumber: parseInt(ptNumber) }
    })
    
    if (existingPT) {
      console.error('❌ رقم PT مستخدم:', ptNumber)
      return NextResponse.json(
        { error: `رقم PT ${ptNumber} مستخدم بالفعل` }, 
        { status: 400 }
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

    // إنشاء جلسة PT
    const pt = await prisma.pT.create({
      data: {
        ptNumber: parseInt(ptNumber),
        clientName,
        phone,
        sessionsPurchased,
        sessionsRemaining: sessionsPurchased,
        coachName,
        pricePerSession,
        startDate: startDate ? new Date(startDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    })

    console.log('✅ تم إنشاء جلسة PT:', pt.ptNumber)

    // إنشاء إيصال
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
          type: 'اشتراك برايفت',
          amount: totalAmount,
          paymentMethod: paymentMethod || 'cash',
          itemDetails: JSON.stringify({
            ptNumber: pt.ptNumber,
            clientName,
            sessionsPurchased,
            pricePerSession,
            totalAmount,
            coachName,
            startDate: startDate,
            expiryDate: expiryDate,
            subscriptionDays: subscriptionDays,
            phone: phone
          }),
        },
      })

      console.log('✅ تم إنشاء الإيصال:', receipt.receiptNumber)

      await prisma.receiptCounter.update({
        where: { id: 1 },
        data: { current: counter.current + 1 }
      })

    } catch (receiptError) {
      console.error('❌ خطأ في إنشاء الإيصال:', receiptError)
    }

    return NextResponse.json(pt, { status: 201 })
  } catch (error: any) {
    console.error('❌ خطأ في إضافة جلسة PT:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية إضافة جلسات PT' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ error: 'فشل إضافة جلسة PT' }, { status: 500 })
  }
}

// PUT - تحديث جلسة PT
export async function PUT(request: Request) {
  try {
    // ✅ التحقق من صلاحية تعديل PT
    await requirePermission(request, 'canEditPT')
    
    const body = await request.json()
    const { ptNumber, action, ...data } = body

    if (action === 'use_session') {
      const pt = await prisma.pT.findUnique({ where: { ptNumber: parseInt(ptNumber) } })
      
      if (!pt) {
        return NextResponse.json({ error: 'جلسة PT غير موجودة' }, { status: 404 })
      }

      if (pt.sessionsRemaining <= 0) {
        return NextResponse.json({ error: 'لا توجد جلسات متبقية' }, { status: 400 })
      }

      const updatedPT = await prisma.pT.update({
        where: { ptNumber: parseInt(ptNumber) },
        data: { sessionsRemaining: pt.sessionsRemaining - 1 },
      })

      return NextResponse.json(updatedPT)
    } else {
      const updateData: any = { ...data }
      
      if (data.startDate) {
        updateData.startDate = new Date(data.startDate)
      }
      if (data.expiryDate) {
        updateData.expiryDate = new Date(data.expiryDate)
      }

      const pt = await prisma.pT.update({
        where: { ptNumber: parseInt(ptNumber) },
        data: updateData,
      })

      return NextResponse.json(pt)
    }
  } catch (error: any) {
    console.error('Error updating PT:', error)
    
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
    
    return NextResponse.json({ error: 'فشل تحديث جلسة PT' }, { status: 500 })
  }
}

// DELETE - حذف جلسة PT
export async function DELETE(request: Request) {
  try {
    // ✅ التحقق من صلاحية حذف PT
    await requirePermission(request, 'canDeletePT')
    
    const { searchParams } = new URL(request.url)
    const ptNumber = searchParams.get('ptNumber')

    if (!ptNumber) {
      return NextResponse.json({ error: 'رقم PT مطلوب' }, { status: 400 })
    }

    await prisma.pT.delete({ where: { ptNumber: parseInt(ptNumber) } })
    return NextResponse.json({ message: 'تم الحذف بنجاح' })
  } catch (error: any) {
    console.error('Error deleting PT:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية حذف جلسات PT' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ error: 'فشل حذف جلسة PT' }, { status: 500 })
  }
}