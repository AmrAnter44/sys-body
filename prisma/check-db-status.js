// Check database status
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking database status...\n')

  // Check if Attendance table exists
  try {
    const attendances = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Attendance`
    console.log(`✅ Attendance table exists with ${attendances[0].count} records`)

    // Check columns
    const pragma = await prisma.$queryRaw`PRAGMA table_info(Attendance)`
    console.log('\nColumns in Attendance table:')
    pragma.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'}`)
    })
  } catch (error) {
    console.log('❌ Attendance table does not exist or error:', error.message)
  }

  // Check if Attendance_new exists
  try {
    const attendancesNew = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Attendance_new`
    console.log(`\n✅ Attendance_new table exists with ${attendancesNew[0].count} records`)

    // Check columns
    const pragma = await prisma.$queryRaw`PRAGMA table_info(Attendance_new)`
    console.log('\nColumns in Attendance_new table:')
    pragma.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'}`)
    })
  } catch (error) {
    console.log('\nℹ️ Attendance_new table does not exist')
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
