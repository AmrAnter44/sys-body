import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

// GET: الحصول على عدد الأعضاء الموجودين حالياً في الجيم
export async function GET() {
  try {
    const currentCount = await prisma.memberCheckIn.count({
      where: {
        isActive: true,
      },
    })

    // الحصول على قائمة بأسماء الأعضاء الموجودين
    const currentMembers = await prisma.memberCheckIn.findMany({
      where: {
        isActive: true,
      },
      include: {
        member: {
          select: {
            name: true,
            memberNumber: true,
            phone: true,
          },
        },
      },
      orderBy: {
        checkInTime: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      count: currentCount,
      members: currentMembers,
    })
  } catch (error) {
    console.error('Error getting current count:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء الاستعلام' },
      { status: 500 }
    )
  }
}
