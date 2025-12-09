import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requirePermission } from '../../../lib/auth'

export async function GET(request: Request) {
  try {
    // ✅ التحقق من صلاحية عرض الإيصالات
    await requirePermission(request, 'canViewReceipts')
    
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const ptNumber = searchParams.get('ptNumber')
    const dayUseId = searchParams.get('dayUseId')
    const limit = searchParams.get('limit')

    let receipts

    if (memberId) {
      receipts = await prisma.receipt.findMany({
        where: { memberId },
        orderBy: { receiptNumber: 'desc' }
      })
    } else if (ptNumber) {
      receipts = await prisma.receipt.findMany({
        where: { ptNumber: parseInt(ptNumber) },
        orderBy: { receiptNumber: 'desc' }
      })
    } else if (dayUseId) {
      receipts = await prisma.receipt.findMany({
        where: { dayUseId },
        orderBy: { receiptNumber: 'desc' }
      })
    } else {
      // جلب كل الإيصالات أو عدد محدد
      receipts = await prisma.receipt.findMany({
        orderBy: { receiptNumber: 'desc' },
        take: limit ? parseInt(limit) : undefined
      })
    }

    return NextResponse.json(receipts)
  } catch (error: any) {
    console.error('Error fetching receipts:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية عرض الإيصالات' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ error: 'فشل جلب الإيصالات' }, { status: 500 })
  }
}