import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// POST: تسجيل دخول عضو
export async function POST(request: Request) {
  try {
    const { memberId, method = 'scan' } = await request.json()

    if (!memberId) {
      return NextResponse.json(
        { error: 'يجب توفير رقم العضو' },
        { status: 400 }
      )
    }

    // التحقق من وجود العضو وأن اشتراكه نشط
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'العضو غير موجود' },
        { status: 404 }
      )
    }

    if (!member.isActive) {
      return NextResponse.json(
        { error: 'اشتراك العضو منتهي' },
        { status: 400 }
      )
    }

    // التحقق من وجود تسجيل دخول نشط
    const existingCheckIn = await prisma.memberCheckIn.findFirst({
      where: {
        memberId,
        isActive: true,
      },
    })

    if (existingCheckIn) {
      return NextResponse.json({
        success: true,
        checkIn: existingCheckIn,
        message: 'العضو مسجل دخول بالفعل',
        alreadyCheckedIn: true,
      })
    }

    // إنشاء تسجيل دخول جديد
    const now = new Date()
    const expectedCheckOut = new Date(now.getTime() + 2 * 60 * 60 * 1000) // +2 ساعة

    const checkIn = await prisma.memberCheckIn.create({
      data: {
        memberId,
        checkInMethod: method,
        expectedCheckOutTime: expectedCheckOut,
      },
    })

    return NextResponse.json({
      success: true,
      checkIn,
      message: 'تم تسجيل الدخول بنجاح',
      alreadyCheckedIn: false,
    })
  } catch (error) {
    console.error('Error in member check-in:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الدخول' },
      { status: 500 }
    )
  }
}

// GET: الحصول على حالة تسجيل دخول عضو معين
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json(
        { error: 'يجب توفير رقم العضو' },
        { status: 400 }
      )
    }

    const activeCheckIn = await prisma.memberCheckIn.findFirst({
      where: {
        memberId,
        isActive: true,
      },
      include: {
        member: {
          select: {
            name: true,
            memberNumber: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      checkIn: activeCheckIn,
      isCheckedIn: !!activeCheckIn,
    })
  } catch (error) {
    console.error('Error getting check-in status:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء الاستعلام' },
      { status: 500 }
    )
  }
}
