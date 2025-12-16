// Delete specific duplicate records (keep the latest)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🗑️ Deleting duplicate records...\n')

  // Delete the older duplicate for staffId cmiyv1mdv00029d60x0el23tw (2025-12-09)
  // Keep: cmiyv6elj00069d605ab06o7f (created 17:38:29)
  // Delete: cmiyv2h1c00049d607nboatj6 (created 17:35:25)
  await prisma.$executeRaw`
    DELETE FROM Attendance WHERE id = 'cmiyv2h1c00049d607nboatj6'
  `
  console.log('✅ Deleted older record for staffId cmiyv1md... on 2025-12-09')

  // Delete the older duplicate for staffId cmiyw6opp00019jllxhqijh0u (2025-12-10)
  // Keep: cmj02nsky000b1m84k80d3b9w (created 13:55:43)
  // Delete: cmizyfbb7000zjp8b9c2g9vkx (created 11:57:09)
  await prisma.$executeRaw`
    DELETE FROM Attendance WHERE id = 'cmizyfbb7000zjp8b9c2g9vkx'
  `
  console.log('✅ Deleted older record for staffId cmiyw6op... on 2025-12-10')

  // Verify no duplicates remain
  const duplicates = await prisma.$queryRaw`
    SELECT staffId, date, COUNT(*) as count
    FROM Attendance
    GROUP BY staffId, date
    HAVING COUNT(*) > 1
  `

  if (duplicates.length === 0) {
    console.log('\n✅ All duplicates removed successfully')
    console.log('🔧 Creating unique index...')

    // Create the unique index
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_staffId_date_key" ON "Attendance"("staffId", "date")`
    console.log('✅ Unique index created')

    // Verify final count
    const finalCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Attendance`
    console.log(`\n📊 Final record count: ${finalCount[0].count}`)
  } else {
    console.log('\n❌ Still have duplicates:', duplicates)
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
