const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // إنشاء عداد الإيصالات
  await prisma.receiptCounter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, current: 1000 }
  })

  console.log('✅ Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })