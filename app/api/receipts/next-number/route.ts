import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET() {
  try {
    // الحصول على آخر رقم إيصال من العداد
    let counter = await prisma.receiptCounter.findFirst()

    if (!counter) {
      // إنشاء عداد جديد إذا لم يكن موجوداً
      counter = await prisma.receiptCounter.create({
        data: { current: 1000 }
      })
    }

    // الرقم التالي هو current + 1
    const nextNumber = counter.current + 1

    return NextResponse.json({ nextNumber })
  } catch (error) {
    console.error('Error fetching next receipt number:', error)
    return NextResponse.json({ nextNumber: 1001 })
  }
}
