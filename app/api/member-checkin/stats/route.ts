import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

// GET: الحصول على إحصائيات اليوم
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    // إذا لم يتم توفير تاريخ، استخدم اليوم
    const targetDate = dateParam ? new Date(dateParam) : new Date()

    // بداية اليوم (00:00:00)
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)

    // نهاية اليوم (23:59:59)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // عدد الأعضاء الذين سجلوا دخول اليوم
    const todayCheckIns = await prisma.memberCheckIn.count({
      where: {
        checkInTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    })

    // عدد الأعضاء الموجودين حالياً
    const currentCount = await prisma.memberCheckIn.count({
      where: {
        isActive: true,
      },
    })

    // إحصائيات إضافية: عدد الأعضاء الفريدين اليوم
    const uniqueMembers = await prisma.memberCheckIn.findMany({
      where: {
        checkInTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        memberId: true,
      },
      distinct: ['memberId'],
    })

    // متوسط مدة البقاء (للأعضاء الذين خرجوا)
    const completedSessions = await prisma.memberCheckIn.findMany({
      where: {
        checkInTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        isActive: false,
        actualCheckOutTime: {
          not: null,
        },
      },
      select: {
        checkInTime: true,
        actualCheckOutTime: true,
      },
    })

    let averageDuration = 0
    if (completedSessions.length > 0) {
      const totalDuration = completedSessions.reduce((sum, session) => {
        const duration = session.actualCheckOutTime!.getTime() - session.checkInTime.getTime()
        return sum + duration
      }, 0)
      averageDuration = Math.round(totalDuration / completedSessions.length / 1000 / 60) // بالدقائق
    }

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      stats: {
        totalCheckIns: todayCheckIns,
        uniqueMembers: uniqueMembers.length,
        currentlyInside: currentCount,
        averageDurationMinutes: averageDuration,
      },
    })
  } catch (error) {
    console.error('Error getting stats:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء الاستعلام' },
      { status: 500 }
    )
  }
}
