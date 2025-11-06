import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// GET - جلب سجلات الحضور
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')
    const today = searchParams.get('today')
    const date = searchParams.get('date')

    let whereClause: any = {}

    if (staffId) {
      whereClause.staffId = staffId
    }

    if (today === 'true') {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      whereClause.checkIn = {
        gte: todayStart,
        lte: todayEnd,
      }
    } else if (date) {
      const targetDate = new Date(date)
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      whereClause.checkIn = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    const attendance = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        staff: true,
      },
      orderBy: { checkIn: 'desc' },
    })

    return NextResponse.json(attendance)
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json({ error: 'فشل جلب سجلات الحضور' }, { status: 500 })
  }
}

// POST - تسجيل حضور أو انصراف
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { staffCode } = body

    if (!staffCode) {
      return NextResponse.json({ error: 'رقم الموظف مطلوب' }, { status: 400 })
    }

    // ✅ البحث عن الموظف بالرقم
    const staff = await prisma.staff.findUnique({
      where: { staffCode: parseInt(staffCode) },
    })

    if (!staff) {
      return NextResponse.json({ 
        error: `❌ الموظف رقم ${staffCode} غير موجود`,
        action: 'error' 
      }, { status: 404 })
    }

    if (!staff.isActive) {
      return NextResponse.json({ 
        error: `❌ الموظف ${staff.name} غير نشط`,
        action: 'error'
      }, { status: 400 })
    }

    // البحث عن آخر سجل حضور اليوم
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const lastAttendance = await prisma.attendance.findFirst({
      where: {
        staffId: staff.id,
        checkIn: {
          gte: todayStart,
        },
      },
      orderBy: { checkIn: 'desc' },
    })

    // ✅ سيناريو 1: لا يوجد حضور اليوم
    if (!lastAttendance) {
      const newAttendance = await prisma.attendance.create({
        data: {
          staffId: staff.id,
          checkIn: new Date(),
        },
        include: {
          staff: true,
        },
      })

      return NextResponse.json({
        action: 'check-in',
        message: `✅ مرحباً ${staff.name}! تم تسجيل حضورك`,
        staffCode: staff.staffCode,
        staffName: staff.name,
        time: new Date().toLocaleTimeString('ar-EG'),
        attendance: newAttendance,
      })
    }

    // ✅ سيناريو 2: آخر سجل تم الانصراف منه
    if (lastAttendance.checkOut) {
      const newAttendance = await prisma.attendance.create({
        data: {
          staffId: staff.id,
          checkIn: new Date(),
          notes: 'عودة بعد الانصراف',
        },
        include: {
          staff: true,
        },
      })

      return NextResponse.json({
        action: 'check-in',
        message: `✅ مرحباً مرة أخرى ${staff.name}!`,
        staffCode: staff.staffCode,
        staffName: staff.name,
        time: new Date().toLocaleTimeString('ar-EG'),
        attendance: newAttendance,
      })
    }

    // ✅ سيناريو 3: تسجيل انصراف
    const checkOutTime = new Date()
    const duration = Math.floor(
      (checkOutTime.getTime() - lastAttendance.checkIn.getTime()) / (1000 * 60)
    )

    if (duration < 1) {
      return NextResponse.json(
        { 
          error: 'يرجى الانتظار دقيقة على الأقل!',
          action: 'error',
        },
        { status: 400 }
      )
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: lastAttendance.id },
      data: {
        checkOut: checkOutTime,
        duration,
      },
      include: {
        staff: true,
      },
    })

    const hours = Math.floor(duration / 60)
    const minutes = duration % 60

    return NextResponse.json({
      action: 'check-out',
      message: `👋 مع السلامة ${staff.name}!`,
      staffCode: staff.staffCode,
      staffName: staff.name,
      time: checkOutTime.toLocaleTimeString('ar-EG'),
      duration: `${hours} ساعة و ${minutes} دقيقة`,
      totalMinutes: duration,
      attendance: updatedAttendance,
    })
  } catch (error) {
    console.error('Error recording attendance:', error)
    return NextResponse.json(
      { error: 'فشل تسجيل الحضور/الانصراف', action: 'error' },
      { status: 500 }
    )
  }
}

// DELETE - حذف سجل حضور
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'معرف السجل مطلوب' }, { status: 400 })
    }

    await prisma.attendance.delete({ where: { id } })
    return NextResponse.json({ message: 'تم حذف السجل بنجاح' })
  } catch (error) {
    console.error('Error deleting attendance:', error)
    return NextResponse.json({ error: 'فشل حذف السجل' }, { status: 500 })
  }
}