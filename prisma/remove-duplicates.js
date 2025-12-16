// Remove duplicate attendance records (keep latest)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Removing duplicate attendance records...\n')

  // Find duplicates
  const duplicates = await prisma.$queryRaw`
    SELECT staffId, date
    FROM Attendance
    GROUP BY staffId, date
    HAVING COUNT(*) > 1
  `

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found')
    return
  }

  console.log(`Found ${duplicates.length} duplicate groups`)

  let totalRemoved = 0

  for (const dup of duplicates) {
    // Get all records for this staffId + date combination
    const dateStr = new Date(dup.date).toISOString().split('T')[0]
    const records = await prisma.$queryRaw`
      SELECT id, createdAt, date
      FROM Attendance
      WHERE staffId = ${dup.staffId}
        AND date(date) = date(${dup.date})
      ORDER BY createdAt DESC
    `

    console.log(`\n📅 staffId: ${dup.staffId.substring(0, 8)}... date: ${dateStr}`)
    console.log(`   Found ${records.length} records, keeping latest, removing ${records.length - 1}`)

    // Keep the first one (latest), delete the rest
    for (let i = 1; i < records.length; i++) {
      await prisma.$executeRaw`
        DELETE FROM Attendance WHERE id = ${records[i].id}
      `
      totalRemoved++
    }
  }

  console.log(`\n✅ Removed ${totalRemoved} duplicate records`)

  // Verify no duplicates remain
  const remainingDuplicates = await prisma.$queryRaw`
    SELECT staffId, date, COUNT(*) as count
    FROM Attendance
    GROUP BY staffId, date
    HAVING COUNT(*) > 1
  `

  if (remainingDuplicates.length === 0) {
    console.log('✅ All duplicates removed successfully')

    // Now create the unique index
    console.log('\n🔧 Creating unique index...')
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_staffId_date_key" ON "Attendance"("staffId", "date")`
    console.log('✅ Unique index created')
  } else {
    console.log('❌ Still have duplicates:', remainingDuplicates.length)
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
