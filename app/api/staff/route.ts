import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// GET - جلب كل الموظفين
export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        expenses: {
          where: { type: 'staff_loan', isPaid: false }
        },
        // ✅ جلب حضور اليوم
        attendance: {
          where: {
            checkIn: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          },
          orderBy: { checkIn: 'desc' }
        }
      }
    })
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'فشل جلب الموظفين' }, { status: 500 })
  }
}

// POST - إضافة موظف جديد
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { staffCode, name, phone, position, salary, notes } = body

    // ✅ التحقق من وجود staffCode
    if (!staffCode) {
      return NextResponse.json({ error: 'رقم الموظف مطلوب' }, { status: 400 })
    }

    // ✅ التحقق من عدم تكرار الرقم
    const existingStaff = await prisma.staff.findUnique({
      where: { staffCode: parseInt(staffCode) }
    })

    if (existingStaff) {
      return NextResponse.json({ 
        error: `رقم ${staffCode} مستخدم بالفعل للموظف: ${existingStaff.name}` 
      }, { status: 400 })
    }

    const staff = await prisma.staff.create({
      data: {
        staffCode: parseInt(staffCode),
        name,
        phone,
        position,
        salary,
        notes,
      },
    })

    return NextResponse.json(staff, { status: 201 })
  } catch (error) {
    console.error('Error creating staff:', error)
    return NextResponse.json({ error: 'فشل إضافة الموظف' }, { status: 500 })
  }
}

// PUT - تحديث موظف
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, staffCode, ...data } = body

    // ✅ إذا كان في تحديث للـ staffCode، تحقق من عدم التكرار
    if (staffCode) {
      const existingStaff = await prisma.staff.findUnique({
        where: { staffCode: parseInt(staffCode) }
      })

      if (existingStaff && existingStaff.id !== id) {
        return NextResponse.json({ 
          error: `رقم ${staffCode} مستخدم بالفعل` 
        }, { status: 400 })
      }

      data.staffCode = parseInt(staffCode)
    }

    const staff = await prisma.staff.update({
      where: { id },
      data,
    })

    return NextResponse.json(staff)
  } catch (error) {
    console.error('Error updating staff:', error)
    return NextResponse.json({ error: 'فشل تحديث الموظف' }, { status: 500 })
  }
}

// DELETE - حذف موظف
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'رقم الموظف مطلوب' }, { status: 400 })
    }

    await prisma.staff.delete({ where: { id } })
    return NextResponse.json({ message: 'تم الحذف بنجاح' })
  } catch (error) {
    console.error('Error deleting staff:', error)
    return NextResponse.json({ error: 'فشل حذف الموظف' }, { status: 500 })
  }
}