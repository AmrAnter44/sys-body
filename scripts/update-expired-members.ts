// scripts/update-expired-members.ts
// سكريبت لتحديث حالة الأعضاء المنتهيين وتعيين isActive = false

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 بدء تحديث حالة الأعضاء المنتهيين...\n')

  try {
    // جلب جميع الأعضاء
    const allMembers = await prisma.member.findMany({
      select: {
        id: true,
        name: true,
        memberNumber: true,
        expiryDate: true,
        isActive: true,
      }
    })

    console.log(`📊 إجمالي الأعضاء في قاعدة البيانات: ${allMembers.length}`)

    // الأعضاء المنتهيين
    const today = new Date()
    const expiredMembers = allMembers.filter(m => {
      if (!m.expiryDate) return false
      return new Date(m.expiryDate) < today && m.isActive === true
    })

    console.log(`❌ عدد الأعضاء المنتهيين (isActive = true): ${expiredMembers.length}\n`)

    if (expiredMembers.length === 0) {
      console.log('✅ لا يوجد أعضاء منتهيين يحتاجون تحديث')
      return
    }

    // تحديث حالة الأعضاء المنتهيين
    let updatedCount = 0
    for (const member of expiredMembers) {
      await prisma.member.update({
        where: { id: member.id },
        data: { isActive: false }
      })
      updatedCount++

      if (updatedCount % 100 === 0) {
        console.log(`⏳ تم تحديث ${updatedCount} من ${expiredMembers.length}...`)
      }
    }

    console.log(`\n✅ تم تحديث ${updatedCount} عضو منتهي بنجاح!`)

    // إحصائيات نهائية
    const finalStats = await prisma.member.groupBy({
      by: ['isActive'],
      _count: true
    })

    console.log('\n📊 الإحصائيات النهائية:')
    finalStats.forEach(stat => {
      const status = stat.isActive ? 'نشطين' : 'منتهيين'
      console.log(`   ${status}: ${stat._count}`)
    })

  } catch (error) {
    console.error('❌ حدث خطأ:', error)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
