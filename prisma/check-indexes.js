// Check indexes
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking indexes...\n')

  const indexes = await prisma.$queryRaw`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'index' AND tbl_name = 'Attendance'
  `

  if (indexes.length === 0) {
    console.log('❌ No indexes found on Attendance table')
    console.log('\n🔧 Creating indexes...')

    // Create indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Attendance_staffId_idx" ON "Attendance"("staffId")`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Attendance_date_idx" ON "Attendance"("date")`
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_staffId_date_key" ON "Attendance"("staffId", "date")`

    console.log('✅ Indexes created successfully')
  } else {
    console.log('Found indexes on Attendance table:')
    indexes.forEach(idx => {
      console.log(`  ✅ ${idx.name}`)
      if (idx.sql) console.log(`     ${idx.sql}\n`)
    })
  }

  // Show unique date combinations
  const records = await prisma.$queryRaw`
    SELECT staffId, date, COUNT(*) as count
    FROM Attendance
    GROUP BY staffId, date
    HAVING COUNT(*) > 1
  `

  if (records.length > 0) {
    console.log('\n⚠️ Found duplicate staffId + date combinations:')
    records.forEach(r => {
      console.log(`  - staffId: ${r.staffId}, date: ${r.date}, count: ${r.count}`)
    })
  } else {
    console.log('\n✅ No duplicate staffId + date combinations')
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
