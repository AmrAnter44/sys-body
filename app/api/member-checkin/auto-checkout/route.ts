import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

// POST: تسجيل خروج تلقائي للأعضاء الذين مر على دخولهم ساعتين
export async function POST() {
  try {
    const now = new Date()

    // البحث عن جميع التسجيلات النشطة التي تجاوزت مدة الساعتين
    const expiredCheckIns = await prisma.memberCheckIn.findMany({
      where: {
        isActive: true,
        expectedCheckOutTime: {
          lte: now,
        },
      },
    })

    if (expiredCheckIns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'لا توجد تسجيلات تحتاج خروج تلقائي',
        checkedOut: 0,
      })
    }

    // تحديث جميع التسجيلات المنتهية
    const result = await prisma.memberCheckIn.updateMany({
      where: {
        isActive: true,
        expectedCheckOutTime: {
          lte: now,
        },
      },
      data: {
        isActive: false,
        actualCheckOutTime: now,
      },
    })

    return NextResponse.json({
      success: true,
      message: `تم تسجيل خروج ${result.count} عضو تلقائياً`,
      checkedOut: result.count,
      members: expiredCheckIns.map((c) => c.memberId),
    })
  } catch (error) {
    console.error('Error in auto-checkout:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التسجيل التلقائي' },
      { status: 500 }
    )
  }
}

// GET: معاينة الأعضاء الذين سيتم تسجيل خروجهم
export async function GET() {
  try {
    const now = new Date()

    const expiredCheckIns = await prisma.memberCheckIn.findMany({
      where: {
        isActive: true,
        expectedCheckOutTime: {
          lte: now,
        },
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
      count: expiredCheckIns.length,
      checkIns: expiredCheckIns,
    })
  } catch (error) {
    console.error('Error getting expired check-ins:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء الاستعلام' },
      { status: 500 }
    )
  }
}
