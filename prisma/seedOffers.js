import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultOffers = [
  {
    name: 'شهر',
    duration: 30,
    price: 800,
    freePTSessions: 2,
    inBodyScans: 2,
    invitations: 2,
    icon: '📅'
  },
  {
    name: 'شهرين',
    duration: 60,
    price: 1500,
    freePTSessions: 4,
    inBodyScans: 3,
    invitations: 3,
    icon: '📅'
  },
  {
    name: '3 شهور',
    duration: 90,
    price: 2100,
    freePTSessions: 6,
    inBodyScans: 4,
    invitations: 4,
    icon: '🎯'
  },
  {
    name: '6 شهور',
    duration: 180,
    price: 4000,
    freePTSessions: 12,
    inBodyScans: 8,
    invitations: 6,
    icon: '⭐'
  },
  {
    name: 'سنة',
    duration: 365,
    price: 7500,
    freePTSessions: 24,
    inBodyScans: 15,
    invitations: 12,
    icon: '👑'
  }
]

async function seedOffers() {
  console.log('🌱 بدء إضافة العروض الافتراضية...\n')

  try {
    // حذف جميع العروض الموجودة
    const deletedCount = await prisma.offer.deleteMany({})
    console.log(`🗑️  تم حذف ${deletedCount.count} عرض موجود مسبقاً\n`)

    // إضافة العروض الجديدة
    let count = 0
    for (const offer of defaultOffers) {
      const created = await prisma.offer.create({
        data: offer
      })
      count++
      console.log(`✅ تم إضافة عرض: ${created.name} - ${created.price} جنيه`)
    }

    console.log(`\n🎉 تم إضافة ${count} عرض بنجاح!`)
  } catch (error) {
    console.error('❌ خطأ في إضافة العروض:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedOffers()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
